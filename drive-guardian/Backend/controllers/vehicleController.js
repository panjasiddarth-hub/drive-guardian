import Vehicle from "../models/Vehicle.js";

// 🔹 GET ALL VEHICLES (ONLY LOGGED-IN USER)
export const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id
    });

    res.status(200).json(vehicles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch vehicles", error });
  }
};

// 🔹 GET SINGLE VEHICLE (ONLY IF OWNED)
export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.status(200).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch vehicle", error });
  }
};

// 🔹 ADD VEHICLE (ATTACH OWNER)
export const addVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({
      ...req.body,
      owner: req.user._id   // 🔥 CRITICAL
    });

    res.status(201).json({
      message: "Vehicle saved successfully",
      vehicle
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to save vehicle", error });
  }
};

// 🔹 UPDATE VEHICLE (ONLY IF OWNED)
export const updateVehicle = async (req, res) => {
  try {
    const updated = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id   // 🔥 PREVENT CROSS-USER UPDATE
      },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Vehicle not found or unauthorized" });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update vehicle", error });
  }
};

// 🔹 DELETE VEHICLE (ONLY IF OWNED)
export const deleteVehicle = async (req, res) => {
  try {
    const deleted = await Vehicle.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id   // 🔥 PREVENT CROSS-USER DELETE
    });

    if (!deleted) {
      return res.status(404).json({ message: "Vehicle not found or unauthorized" });
    }

    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete vehicle", error });
  }
};