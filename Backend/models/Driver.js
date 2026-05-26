import mongoose from "mongoose";

const DriverSchema = new mongoose.Schema({

    // 🔐 OWNER (CRITICAL FOR DATA ISOLATION)
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    driver: String,
    phone: String,
    license: String,
    licenseExpiry: String,
    rating: Number,
    trips: Number,

    violations: {
        type: Number,
        default: 0
    },

    photo: String,
    avgDistance: String,

    // Trip history
    tripHistory: [
        {
            tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
            date: Date,
            origin: String,
            destination: String,
            distanceKm: Number,
            durationMin: Number,
            vehicle: String,
            status: String
        }
    ],

    // Availability system
    status: {
        type: String,
        enum: ["available", "reserved", "on-trip", "off-duty"],
        default: "available"
    },

    currentTripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
        default: null
    },

    assignedVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null
    }

}, { timestamps: true });

export default mongoose.model("Driver", DriverSchema);