import express from "express";
import redis from "../config/redisClient.js";
import { getChannel } from "../config/rabbit.js";
import Driver from "../models/Driver.js";
import DriverPerformance from "../models/DriverPerformance.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   SAFE QUEUE PRODUCER
============================================================ */
function sendToQueue(queue, data) {
  const ch = getChannel();
  if (!ch) return;

  try {
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  } catch (err) {
    console.log("RabbitMQ send error:", err.message);
  }
}

/* ============================================================
   SAFE REDIS HELPERS
============================================================ */
async function redisGet(key) {
  try { return await redis.get(key); }
  catch { return null; }
}

async function redisSet(key, value, ttl = 10) {
  try { await redis.set(key, value, { EX: ttl }); }
  catch {}
}

async function redisDel(key) {
  try { await redis.del(key); }
  catch {}
}

/* ============================================================
   GET ALL DRIVERS (CACHED)
============================================================ */
router.get("/", async (req, res) => {
  try {
    const cacheKey = `drivers:list:${req.user._id}`;

    const cached = await redisGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const drivers = await Driver.find({ owner: req.user._id })
      .populate("assignedVehicle", "vehicleNumber")
      .lean();

    await redisSet(cacheKey, JSON.stringify(drivers), 10);

    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
});

/* ============================================================
   DRIVER TRIP HISTORY (CACHED)
============================================================ */
router.get("/history/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const cacheKey = `driverHistory:${req.user._id}:${driverId}`;

    const cached = await redisGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const driver = await Driver.findOne(
      { _id: driverId, owner: req.user._id },
      "tripHistory"
    ).lean();

    if (!driver)
      return res.status(404).json({ error: "Driver not found" });

    const history = (driver.tripHistory || []).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    await redisSet(cacheKey, JSON.stringify(history), 20);

    res.json(history);
  } catch (err) {
    console.error("Driver history error:", err);
    res.status(500).json({ error: "Failed to load driver history" });
  }
});

/* ============================================================
   DRIVER PERFORMANCE
============================================================ */
router.get("/performance/:driverId", async (req, res) => {
  try {
    const key = `driver:perf:${req.user._id}:${req.params.driverId}`;

    const cached = await redisGet(key);
    if (cached) {
      return res.json({
        success: true,
        performance: JSON.parse(cached),
      });
    }

    const driver = await Driver.findOne({
      _id: req.params.driverId,
      owner: req.user._id
    });

    if (!driver)
      return res.status(403).json({ success: false, error: "Unauthorized" });

    let perf = await DriverPerformance.findOne({
      driver: req.params.driverId
    }).lean();

    if (!perf) {
      const created = await DriverPerformance.create({
        driver: req.params.driverId
      });
      perf = created.toObject();
    }

    await redisSet(key, JSON.stringify(perf), 10);

    res.json({ success: true, performance: perf });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ============================================================
   ADD DRIVER
============================================================ */
router.post("/", async (req, res) => {
  try {
    const driver = await Driver.create({
      ...req.body,
      owner: req.user._id
    });

    await DriverPerformance.create({ driver: driver._id });

    await redisDel(`drivers:list:${req.user._id}`);

    sendToQueue("driver_events", {
      type: "driver_added",
      driverId: driver._id,
      name: driver.driver,
    });

    res.json({ success: true, message: "Driver added", driver });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ============================================================
   GET DRIVER BY ID
============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const driver = await Driver.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
      .populate("assignedVehicle", "vehicleNumber")
      .lean();

    if (!driver)
      return res.status(404).json({ error: "Driver not found" });

    res.json(driver);
  } catch (err) {
    res.status(400).json({ error: "Invalid driver ID" });
  }
});

/* ============================================================
   UPDATE DRIVER
============================================================ */
router.put("/:id", async (req, res) => {
  try {
    const updated = await Driver.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Driver not found" });

    await redisDel(`drivers:list:${req.user._id}`);

    sendToQueue("driver_events", {
      type: "driver_updated",
      driverId: updated._id,
    });

    res.json({ success: true, message: "Driver updated", updated });
  } catch (err) {
    res.status(400).json({ error: "Failed to update driver" });
  }
});

/* ============================================================
   DELETE DRIVER
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Driver.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!deleted)
      return res.status(404).json({ error: "Driver not found" });

    await redisDel(`drivers:list:${req.user._id}`);

    sendToQueue("driver_events", {
      type: "driver_deleted",
      driverId: deleted._id,
    });

    res.json({ success: true, message: "Driver deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete driver" });
  }
});

export default router;