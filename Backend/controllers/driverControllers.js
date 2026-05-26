import Driver from "../models/Driver.js";

// 🔹 GET ALL DRIVERS (ONLY LOGGED-IN USER)
export const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({
      owner: req.user._id
    });

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch drivers", error });
  }
};

// 🔹 GET DRIVER BY ID (ONLY IF OWNED)
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found or unauthorized" });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch driver", error });
  }
};

// 🔹 ADD DRIVER (ATTACH OWNER)
export const addDriver = async (req, res) => {
  try {
    const driver = await Driver.create({
      ...req.body,
      owner: req.user._id   // 🔥 CRITICAL
    });

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Failed to create driver", error });
  }
};

// 🔹 UPDATE DRIVER (ONLY IF OWNED)
export const updateDriver = async (req, res) => {
  try {
    const updated = await Driver.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id   // 🔥 Prevent cross-user update
      },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Driver not found or unauthorized" });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update driver", error });
  }
};

// 🔹 DELETE DRIVER (ONLY IF OWNED)
export const deleteDriver = async (req, res) => {
  try {
    const deleted = await Driver.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id   // 🔥 Prevent cross-user delete
    });

    if (!deleted) {
      return res.status(404).json({ message: "Driver not found or unauthorized" });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete driver", error });
  }
};