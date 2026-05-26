import Trip from "../models/Trip.js";
import Vehicle from "../models/Vehicle.js";
import Driver from "../models/Driver.js";

// 🔹 GET ALL TRIPS (ONLY LOGGED-IN USER)
export const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      owner: req.user._id
    })
    .populate("vehicle")
    .populate("driver");

    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};

// 🔹 GET SINGLE TRIP (ONLY IF OWNED)
export const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      owner: req.user._id
    })
    .populate("vehicle")
    .populate("driver");

    if (!trip) {
      return res.status(404).json({ error: "Trip not found or unauthorized" });
    }

    res.json(trip);
  } catch {
    res.status(400).json({ error: "Invalid ID format" });
  }
};

// 🔹 ADD TRIP (STRICT VALIDATION + OWNER ATTACH)
export const addTrip = async (req, res) => {
  try {

    // 🔥 Validate vehicle belongs to user
    const vehicle = await Vehicle.findOne({
      _id: req.body.vehicle,
      owner: req.user._id
    });

    if (!vehicle) {
      return res.status(403).json({ error: "Unauthorized vehicle access" });
    }

    // 🔥 Validate driver belongs to user
    const driver = await Driver.findOne({
      _id: req.body.driver,
      owner: req.user._id
    });

    if (!driver) {
      return res.status(403).json({ error: "Unauthorized driver access" });
    }

    const trip = await Trip.create({
      ...req.body,
      owner: req.user._id   // 🔐 CRITICAL
    });

    res.json({ success: true, message: "Trip added", trip });

  } catch (err) {
    res.status(400).json({ error: "Failed to add trip" });
  }
};

// 🔹 UPDATE TRIP (ONLY IF OWNED)
export const updateTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.user._id
      },
      req.body,
      { new: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ error: "Trip not found or unauthorized" });
    }

    res.json({ success: true, message: "Trip updated", updatedTrip });
  } catch {
    res.status(400).json({ error: "Failed to update trip" });
  }
};

// 🔹 DELETE TRIP (ONLY IF OWNED)
export const deleteTrip = async (req, res) => {
  try {
    const deleted = await Trip.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ error: "Trip not found or unauthorized" });
    }

    res.json({ success: true, message: "Trip deleted" });
  } catch {
    res.status(400).json({ error: "Failed to delete trip" });
  }
};