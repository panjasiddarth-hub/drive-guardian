import express from "express";
import Alert from "../models/Alert.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

/* =========================================================
   GET ALL ALERTS (Paginated + Filtered + OWNER SAFE)
========================================================= */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { status, type, search } = req.query;

    const query = { owner: req.user._id };

    if (status) query.status = status;
    if (type) query.type = type;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
        { vehicle: { $regex: search, $options: "i" } },
        { driver: { $regex: search, $options: "i" } },
      ];
    }

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Alert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (err) {
    console.error("Fetch all alerts error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
});

/* =========================================================
   GET RECENT ALERTS (OWNER SAFE)
========================================================= */
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { type, status } = req.query;

    const query = { owner: req.user._id };
    if (type) query.type = type;
    if (status) query.status = status;

    const alerts = await Alert.find(query,
      {
        title: 1,
        message: 1,
        type: 1,
        vehicle: 1,
        driver: 1,
        status: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = alerts.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    console.error("Fetch recent alerts error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch recent alerts" });
  }
});

/* =========================================================
   GET ALERT STATS (OWNER SAFE)
========================================================= */
router.get("/stats", async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const baseQuery = { owner: req.user._id };

    const [
      total,
      critical,
      warning,
      info,
      unresolved,
      resolved,
      todayTotal,
    ] = await Promise.all([
      Alert.countDocuments(baseQuery),
      Alert.countDocuments({ ...baseQuery, type: "Critical" }),
      Alert.countDocuments({ ...baseQuery, type: "Warning" }),
      Alert.countDocuments({ ...baseQuery, type: "Info" }),
      Alert.countDocuments({ ...baseQuery, status: "Unresolved" }),
      Alert.countDocuments({ ...baseQuery, status: "Resolved" }),
      Alert.countDocuments({ ...baseQuery, createdAt: { $gte: startOfToday } }),
    ]);

    res.json({
      success: true,
      total,
      byType: { critical, warning, info },
      byStatus: { unresolved, resolved },
      today: todayTotal,
    });
  } catch (err) {
    console.error("Fetch alert stats error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch alert stats" });
  }
});

/* =========================================================
   CREATE NEW ALERT (OWNER SAFE + Duplicate Protection)
========================================================= */
router.post("/", async (req, res) => {
  try {
    const { title, message, vehicle, driver, type = "Warning", status = "Unresolved" } = req.body;

    const existing = await Alert.findOne({
      owner: req.user._id,
      title,
      vehicle,
      message,
      createdAt: { $gte: new Date(Date.now() - 30000) },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        data: existing,
        message: "Duplicate alert prevented",
      });
    }

    const alert = await Alert.create({
      title,
      message,
      vehicle,
      driver: driver || "Unassigned",
      type,
      status,
      owner: req.user._id,
      createdAt: new Date(),
    });

    const io = req.app.get("io");
    if (io) {
      io.emit("new-alert", {
        _id: alert._id.toString(),
        title: alert.title,
        message: alert.message,
        type: alert.type,
        vehicle: alert.vehicle,
        driver: alert.driver,
        status: alert.status,
        createdAt: alert.createdAt.toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      data: alert,
    });
  } catch (err) {
    console.error("Create alert error:", err.message);
    res.status(400).json({ success: false, message: "Failed to create alert" });
  }
});

/* =========================================================
   UPDATE ALERT (OWNER SAFE)
========================================================= */
router.patch("/:id", async (req, res) => {
  try {
    const { status, ...updates } = req.body;

    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { ...updates, status } },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    res.json({ success: true, data: alert });
  } catch (err) {
    console.error("Update alert error:", err.message);
    res.status(400).json({ success: false, message: "Failed to update alert" });
  }
});

/* =========================================================
   DELETE ALERT (OWNER SAFE)
========================================================= */
router.delete("/:id", async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    res.json({ success: true, message: "Alert deleted successfully" });
  } catch (err) {
    console.error("Delete alert error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete alert" });
  }
});

export default router;