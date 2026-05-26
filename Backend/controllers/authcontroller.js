import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

import { generateOTP } from "../utils/generateOTP.js";
import { sendEmail } from "../utils/sendEmail.js";

// ⭐ Import Redis
import redis from "../config/redisClient.js";

// ⭐ JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;


// -------------------------------
// REGISTER
// -------------------------------
export const register = async (req, res) => {
  try {
    const { company, adminName, email, password } = req.body;

    if (!company || !adminName || !email || !password)
      return res.json({ success: false, message: "All fields required" });

    // ✔ lean() allowed (read-only)
    const exists = await User.findOne(
      { email },
      "_id"  // (ADDED PROJECTION)
    ).lean(); // (ADDED LEAN)

    if (exists)
      return res.json({ success: false, message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      company,
      adminName,
      email,
      password: hashed
    });

    res.json({ success: true, message: "Registered successfully" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};


// -------------------------------
// LOGIN
// -------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(200).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(200).json({ 
        success: false, 
        message: "Invalid email or password" 
      });   // ← merged message – more secure
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(200).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Optional: store in redis
    if (redis?.set) {
      await redis.set(`session:${user._id}`, token, { EX: 86400 });
    }

    res.status(200).json({ success: true, token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(200).json({ 
      success: false, 
      message: "Something went wrong. Please try again." 
    });
  }
};

// -------------------------------
// FORGOT PASSWORD
// -------------------------------
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // ✔ lean allowed (read-only)
    const user = await User.findOne(
      { email },
      "_id"  // projection
    ).lean();

    if (!user)
      return res.json({ success: false, message: "User not found" });

    const otp = generateOTP().toString().padStart(6, "0");

    await redis.set(`otp:${email}`, otp, { EX: 300 });

    await sendEmail(email, "FleetTrack OTP", `Your OTP: ${otp}`);

    res.json({ success: true, message: "OTP sent to email" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};


// -------------------------------
// VERIFY OTP
// -------------------------------
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const savedOtp = await redis.get(`otp:${email}`);

    if (!savedOtp)
      return res.json({ success: false, message: "OTP expired" });

    if (savedOtp !== otp)
      return res.json({ success: false, message: "Invalid OTP" });

    res.json({ success: true, message: "OTP verified" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};


// -------------------------------
// RESET PASSWORD
// -------------------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const hashed = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { email },
      { password: hashed }
    );

    res.json({ success: true, message: "Password reset successful" });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};
