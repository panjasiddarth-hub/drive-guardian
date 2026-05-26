import Alert from "../models/Alert.js";

// 🔹 GET ALERTS (ONLY LOGGED-IN USER)
export const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({
      owner: req.user._id
    }).sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
};

// 🔹 ADD ALERT (ATTACH OWNER)
export const addAlert = async (req, res) => {
  try {
    const alert = await Alert.create({
      ...req.body,
      owner: req.user._id   // 🔐 CRITICAL
    });

    res.json({ success: true, message: "Alert added", alert });
  } catch (err) {
    res.status(400).json({ error: "Failed to add alert" });
  }
};

// 🔹 UPDATE ALERT (ONLY IF OWNED)
export const updateAlert = async (req, res) => {
  try {
    const updatedAlert = await Alert.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id
      },
      req.body,
      { new: true }
    );

    if (!updatedAlert) {
      return res.status(404).json({ error: "Alert not found or unauthorized" });
    }

    res.json({ success: true, message: "Alert updated", updatedAlert });
  } catch (err) {
    res.status(400).json({ error: "Failed to update alert" });
  }
};

// 🔹 DELETE ALERT (ONLY IF OWNED)
export const deleteAlert = async (req, res) => {
  try {
    const deleted = await Alert.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ error: "Alert not found or unauthorized" });
    }

    res.json({ success: true, message: "Alert deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete alert" });
  }
};