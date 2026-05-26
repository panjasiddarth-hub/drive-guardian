import mongoose from "mongoose";

const tripSubSchema = new mongoose.Schema({
  date: String,
  route: String,
  distance: String,
  duration: String
}, { _id: false });

const geoPointSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  time: { type: Date, default: Date.now }
}, { _id: false });

const vehicleSchema = new mongoose.Schema({

  // 🔐 OWNER (VERY IMPORTANT)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  vehicleNumber: { type: String, required: true },
  model: { type: String, default: "" },

  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
  },

  driverName: { type: String, default: "" },

  lastTrip: { type: String, default: "" },
  lastServiceDate: { type: Date, default: null },

  location: { type: String, default: "" },

  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  speed: { type: Number, default: 0 },

  destinationCoords: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },

  status: {
    type: String,
    enum: ["running", "idle", "stopped"],
    default: "idle"
  },

  fuel: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },

  trips: {
    type: [tripSubSchema],
    default: []
  },

  tripHistory: [
    {
      tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
      date: Date,
      origin: String,
      destination: String,
      distanceKm: Number,
      durationMin: Number,
      driver: String,
      status: String
    }
  ]

}, { timestamps: true });

export default mongoose.model("Vehicle", vehicleSchema);