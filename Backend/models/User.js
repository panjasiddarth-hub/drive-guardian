import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
    company: {
        type: String,
        required: true,
        trim: true
    },

    adminName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    otp: String,
    otpExpiry: Date
},
{
    timestamps: true
});

export default mongoose.model("User", userSchema);