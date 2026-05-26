import express from "express";
import redis from "../config/redisClient.js";
import { getChannel } from "../config/rabbit.js";
import Trip from "../models/Trip.js";
import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";
import DriverPerformance from "../models/DriverPerformance.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

// ---------------------------------------------------------------------------
// Safe RabbitMQ producer
// ---------------------------------------------------------------------------
function sendToQueue(queue, data) {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  } catch (err) {
    console.log("RabbitMQ send error:", err.message);
  }
}

// ---------------------------------------------------------------------------
// ARCHIVE TRIP INTO DRIVER HISTORY (OWNER SAFE)
// ---------------------------------------------------------------------------
export async function archiveTripToDriver(trip) {
  const distanceKm = trip.distanceKm || 0;

  await Driver.findOneAndUpdate(
    { _id: trip.driver, owner: trip.owner },
    {
      $push: {
        tripHistory: {
          tripId: trip._id,
          startTime: trip.startTime,
          endTime: trip.endTime || new Date(),
          date: trip.startTime,
          origin: trip.origin || "Unknown",
          destination: trip.destination || "Unknown",
          distanceKm,
          durationMin: trip.duration,
          vehicle: trip.vehicle ? String(trip.vehicle) : null,
          status: "completed"
        }
      }
    }
  );

  return distanceKm;
}

// ---------------------------------------------------------------------------
// REDIS HELPERS
// ---------------------------------------------------------------------------
async function redisGet(key) {
  try { return await redis.get(key); } catch { return null; }
}
async function redisSet(key, value, ttl = 10) {
  try { await redis.set(key, value, { EX: ttl }); } catch {}
}
async function redisDel(key) {
  try { await redis.del(key); } catch {}
}

// ---------------------------------------------------------------------------
// STATUS CALCULATOR
// ---------------------------------------------------------------------------
function computeStatus(trip) {
  if (trip.status === "completed") return "completed";
  if (trip.status === "scheduled") return "scheduled";
  if (trip.status === "ongoing") return "ongoing";

  const now = new Date();
  const start = new Date(trip.startTime);
  const end = new Date(start.getTime() + trip.duration * 60000);

  if (now < start) return "scheduled";
  if (now >= start && now <= end) return "ongoing";
  return "completed";
}

// ---------------------------------------------------------------------------
// FETCH OSRM ROUTE
// ---------------------------------------------------------------------------
export async function fetchOSRMRoute(originCoords, destinationCoords) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${originCoords.lng},${originCoords.lat};` +
      `${destinationCoords.lng},${destinationCoords.lat}` +
      `?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes?.length) return [];

    return data.routes[0].geometry.coordinates.map(c => ({
      lat: c[1],
      lng: c[0],
    }));
  } catch (err) {
    console.log("OSRM route fetch failed:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// CREATE TRIP (FULL LOGIC PRESERVED + OWNER SAFE)
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  try {
    const { 
      driver, vehicle, startTime, duration, 
      origin, destination, originCoords, destinationCoords 
    } = req.body;

    const fixedOrigin = typeof origin === "string" ? origin : origin?.label || "Unknown";
    const fixedDestination = typeof destination === "string" ? destination : destination?.label || "Unknown";

    if (!driver || !vehicle || !startTime || !duration || !originCoords || !destinationCoords) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const driverDoc = await Driver.findOne({ _id: driver, owner: req.user._id });
    const vehicleDoc = await Vehicle.findOne({ _id: vehicle, owner: req.user._id });

    if (!driverDoc) return res.status(400).json({ success: false, message: "Driver not found" });
    if (!vehicleDoc) return res.status(400).json({ success: false, message: "Vehicle not found" });

    // Conflict check (OWNER SAFE)
    const newStart = new Date(startTime);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    const overlappingTrips = await Trip.find(
      {
        owner: req.user._id,
        status: { $in: ["scheduled", "ongoing"] },
        $expr: {
          $and: [
            { $lt: ["$startTime", newEnd] },
            { $gt: [{ $add: ["$startTime", { $multiply: ["$duration", 60000] }] }, newStart] }
          ]
        }
      },
      "driver vehicle"
    ).lean();

    const busyDrivers = overlappingTrips.map(t => String(t.driver));
    const busyVehicles = overlappingTrips.map(t => String(t.vehicle));

    if (busyDrivers.includes(String(driver)))
      return res.status(400).json({ success: false, message: "Driver already reserved" });

    if (busyVehicles.includes(String(vehicle)))
      return res.status(400).json({ success: false, message: "Vehicle already reserved" });

    const trip = await Trip.create({
      driver,
      vehicle,
      startTime,
      duration,
      origin: fixedOrigin,
      destination: fixedDestination,
      originCoords,
      destinationCoords,
      status: "scheduled",
      routeIndex: 0,
      tempStats: { overspeed: 0, harshBrake: 0, harshAccel: 0, fatigue: 0 },
      owner: req.user._id
    });

    sendToQueue("trip_events", {
      type: "trip_created",
      tripId: trip._id,
      driver,
      vehicle,
      startTime,
      duration
    });

    try {
      const route = await fetchOSRMRoute(originCoords, destinationCoords);
      if (route.length) {
        trip.route = route;
        await trip.save();
      }
    } catch {}

    await Vehicle.findOneAndUpdate(
      { _id: vehicle, owner: req.user._id },
      {
        lat: originCoords.lat,
        lng: originCoords.lng,
        destinationCoords,
        currentTripId: trip._id,
        status: "running",
        speed: 20
      }
    );

    await Driver.findOneAndUpdate(
      { _id: driver, owner: req.user._id },
      {
        status: "reserved",
        currentTripId: trip._id
      }
    );

    await redisDel(`trips:list:${req.user._id}`);

    res.json({ success: true, message: "Trip created", trip });

  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET TRIPS LIST (OWNER SAFE)
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const cacheKey = `trips:list:${req.user._id}`;

    const cached = await redisGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (req.query.status) return res.json(parsed.filter(t => t.status === req.query.status));
      return res.json(parsed);
    }

    const trips = await Trip.find(
      { owner: req.user._id },
      "driver vehicle startTime duration origin destination originCoords destinationCoords status routeIndex"
    )
      .populate("driver", "driver phone")
      .populate("vehicle", "vehicleNumber model")
      .sort({ startTime: 1 })
      .lean();

    const enhanced = trips.map(t => ({
      ...t,
      status: computeStatus(t)
    }));

    await redisSet(cacheKey, JSON.stringify(enhanced), 10);

    if (req.query.status)
      return res.json(enhanced.filter(t => t.status === req.query.status));

    res.json(enhanced);

  } catch {
    res.status(500).json({ message: "Error fetching trips" });
  }
});

// ---------------------------------------------------------------------------
// ALL OTHER ROUTES BELOW REMAIN SAME BUT OWNER FILTER ADDED
// (GET BY ID, DELETE, UPDATE COORDINATES, ADD ROUTE POINT, AVAILABILITY)
// ---------------------------------------------------------------------------

router.get("/:id", async (req, res) => {
  const trip = await Trip.findOne(
    { _id: req.params.id, owner: req.user._id },
    "-route"
  ).lean();
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  res.json(trip);
});

router.delete("/:id", async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    owner: req.user._id
  });
  if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

  await archiveTripToDriver(trip);
  await Trip.deleteOne({ _id: req.params.id, owner: req.user._id });

  res.json({ success: true, message: "Trip deleted" });
});

router.put("/update-coordinates/:id", async (req, res) => {
  const updatedTrip = await Trip.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { originCoords: req.body.originCoords, destinationCoords: req.body.destinationCoords },
    { new: true }
  );
  if (!updatedTrip) return res.status(404).json({ message: "Trip not found" });
  res.json({ success: true, message: "Coordinates updated", trip: updatedTrip });
});

router.post("/add-route-point/:id", async (req, res) => {
  const trip = await Trip.findOne({
    _id: req.params.id,
    owner: req.user._id
  });
  if (!trip) return res.status(404).json({ message: "Trip not found" });

  trip.route.push({ lat: req.body.lat, lng: req.body.lng, time: new Date() });
  await trip.save();

  res.json({ success: true, message: "Route point added", route: trip.route });
});

router.get("/availability", async (req, res) => {
  const { startTime, duration } = req.query;

  const start = new Date(startTime);
  const end = new Date(start.getTime() + Number(duration) * 60000);

  const conflictingTrips = await Trip.find(
    {
      owner: req.user._id,
      status: { $in: ["scheduled", "ongoing"] },
      $expr: {
        $and: [
          { $lt: ["$startTime", end] },
          { $gt: [{ $add: ["$startTime", { $multiply: ["$duration", 60000] }] }, start] }
        ]
      }
    },
    "driver vehicle"
  ).lean();

  const busyDrivers = conflictingTrips.map(t => String(t.driver));
  const busyVehicles = conflictingTrips.map(t => String(t.vehicle));

  const freeDrivers = await Driver.find(
    { owner: req.user._id, _id: { $nin: busyDrivers } },
    "driver phone status"
  ).lean();

  const freeVehicles = await Vehicle.find(
    { owner: req.user._id, _id: { $nin: busyVehicles } },
    "vehicleNumber model status"
  ).lean();

  res.json({
    success: true,
    drivers: freeDrivers,
    vehicles: freeVehicles
  });
});

export default router;