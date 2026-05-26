import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    // 🔐 OWNER (CRITICAL FOR ISOLATION)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["Info", "Warning", "Critical"],
      required: true
    },

    severity: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },

    vehicle: String,
    driver: String,

    status: {
      type: String,
      enum: ["Resolved", "Unresolved"],
      default: "Unresolved",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

alertSchema.index({ owner: 1, createdAt: -1 });
alertSchema.index({ owner: 1, status: 1, createdAt: -1 });

export default mongoose.model("Alert", alertSchema);