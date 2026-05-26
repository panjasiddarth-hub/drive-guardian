import express from "express";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";
import DriverPerformance from "../models/DriverPerformance.js";
import { getChannel } from "../config/rabbit.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

// ==================== RabbitMQ Safe Producer ====================
function sendToQueue(queue, data) {
  const ch = getChannel();
  if (!ch) return;

  try {
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  } catch (err) {
    console.log("RabbitMQ send error:", err.message);
  }
}

// ==================== REDIS HELPERS ====================
import redis from "../config/redisClient.js";

async function redisGet(key) {
  try { return await redis.get(key); } catch { return null; }
}
async function redisSet(key, value, ttl = 10) {
  try { await redis.set(key, value, { EX: ttl }); } catch {}
}
async function redisDel(key) {
  try { await redis.del(key); } catch {}
}

/* ============================================================
   GET ALL VEHICLES
============================================================ */
router.get("/", async (req, res) => {
  try {
    const cacheKey = `vehicles:list:${req.user._id}`;

    const cached = await redisGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const vehicles = await Vehicle.find(
      { owner: req.user._id },
      "vehicleNumber model status lat lng speed lastUpdated fuel driver"
    )
      .populate("driver", "driver phone")
      .lean();

    await redisSet(cacheKey, JSON.stringify(vehicles), 10);

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
});

/* ============================================================
   ADD VEHICLE
============================================================ */
router.post("/", async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      owner: req.user._id
    });

    sendToQueue("vehicle_events", {
      type: "vehicle_created",
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
    });

    await redisDel(`vehicles:list:${req.user._id}`);

    res.json({ success: true, vehicle });
  } catch (err) {
    res.status(400).json({ error: "Failed to add vehicle", details: err });
  }
});

/* ============================================================
   GET VEHICLE TRIP HISTORY
============================================================ */
router.get("/:id/history", async (req, res) => {
  try {
    const key = `vehicle:history:${req.user._id}:${req.params.id}`;

    const cached = await redisGet(key);
    if (cached) return res.json(JSON.parse(cached));

    const vehicle = await Vehicle.findOne(
      { _id: req.params.id, owner: req.user._id },
      "tripHistory"
    )
      .populate("tripHistory.tripId")
      .lean();

    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    const history = vehicle.tripHistory || [];

    await redisSet(key, JSON.stringify(history), 20);

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trip history" });
  }
});

/* ============================================================
   ASSIGN DRIVER
============================================================ */
router.post("/assign-driver", async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      owner: req.user._id
    });

    const driver = await Driver.findOne({
      _id: driverId,
      owner: req.user._id
    });

    if (!vehicle || !driver) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    vehicle.driver = driverId;
    await vehicle.save();

    driver.assignedVehicle = vehicleId;
    driver.status = "reserved";
    await driver.save();

    await redisDel(`vehicles:list:${req.user._id}`);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Driver assignment failed" });
  }
});

/* ============================================================
   LIVE LOCATION UPDATE
============================================================ */
router.post("/update-location/:id", async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { lat, lng, speed, fuelLevel, status, driverId } = req.body;

    if (!global.lastStates) global.lastStates = {};
    if (!global.lastStates[vehicleId]) {
      global.lastStates[vehicleId] = {
        lastSpeed: speed,
        lastFuel: fuelLevel,
        idleStart: null,
        driveStart: null
      };
    }

    const state = global.lastStates[vehicleId];

    const driver = await Driver.findOne({
      _id: driverId,
      owner: req.user._id
    });

    if (!driver) {
      return res.status(403).json({ error: "Unauthorized driver access" });
    }

    const perf = await DriverPerformance.findOne({
      driver: driverId
    });

    const SPEED_LIMIT = 80;
    const speedDiff = speed - state.lastSpeed;
    const now = Date.now();

    if (speed > SPEED_LIMIT) perf.overspeedCount++;
    if (speedDiff <= -12) perf.harshBrakingCount++;
    if (speedDiff >= 14) perf.harshAccelerationCount++;

    if (speed <= 5) {
      if (!state.idleStart) state.idleStart = now;
    } else {
      if (state.idleStart) {
        const idleMinutes = (now - state.idleStart) / 60000;
        if (idleMinutes >= 2) perf.idleTimeMinutes += idleMinutes;
        state.idleStart = null;
      }
    }

    if (speed > 5) {
      if (!state.driveStart) state.driveStart = now;
    } else {
      if (state.driveStart) {
        const driveMinutes = (now - state.driveStart) / 60000;
        perf.drivingMinutesToday += driveMinutes;

        if (perf.drivingMinutesToday >= 240) {
          perf.fatigueAlerts++;
        }

        state.driveStart = null;
      }
    }

    await perf.save();

    state.lastSpeed = speed;
    state.lastFuel = fuelLevel;

    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, owner: req.user._id },
      {
        lat,
        lng,
        speed,
        status,
        lastUpdated: new Date(),
        $push: { tripHistory: { lat, lng, time: new Date() } }
      },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(403).json({ error: "Unauthorized vehicle update" });
    }

    sendToQueue("vehicle_events", {
      type: "location_update",
      vehicleId,
      lat,
      lng,
      speed,
      status,
    });

    await redisDel(`vehicles:list:${req.user._id}`);
    await redisDel(`vehicle:${req.user._id}:${vehicleId}`);
    await redisDel(`vehicle:history:${req.user._id}:${vehicleId}`);

    res.json({ success: true, vehicle: updatedVehicle });

  } catch (err) {
    res.status(500).json({ error: "Failed to update location", details: err });
  }
});

/* ============================================================
   GET VEHICLE BY ID
============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const key = `vehicle:${req.user._id}:${req.params.id}`;

    const cached = await redisGet(key);
    if (cached) return res.json(JSON.parse(cached));

    const vehicle = await Vehicle.findOne(
      { _id: req.params.id, owner: req.user._id },
      "vehicleNumber model status lat lng speed lastUpdated fuel driver"
    )
      .populate("driver", "driver phone")
      .lean();

    if (!vehicle)
      return res.status(404).json({ error: "Vehicle not found" });

    await redisSet(key, JSON.stringify(vehicle), 10);

    res.json(vehicle);
  } catch (err) {
    res.status(400).json({ error: "Invalid vehicle ID" });
  }
});

/* ============================================================
   UPDATE VEHICLE
============================================================ */
router.put("/:id", async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedVehicle)
      return res.status(404).json({ error: "Vehicle not found" });

    await redisDel(`vehicles:list:${req.user._id}`);
    await redisDel(`vehicle:${req.user._id}:${req.params.id}`);

    res.json({ success: true, vehicle: updatedVehicle });

  } catch (err) {
    res.status(400).json({ error: "Failed to update vehicle", details: err });
  }
});

/* ============================================================
   DELETE VEHICLE
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ error: "Vehicle not found or unauthorized" });
    }

    await redisDel(`vehicles:list:${req.user._id}`);
    await redisDel(`vehicle:${req.user._id}:${req.params.id}`);

    res.json({ success: true, message: "Vehicle deleted" });

  } catch (err) {
    res.status(400).json({ error: "Failed to delete vehicle" });
  }
});

export default router;