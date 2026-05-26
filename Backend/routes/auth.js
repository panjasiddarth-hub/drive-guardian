import express from "express";
import rateLimit from "express-rate-limit";

import {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword
} from "../controllers/authcontroller.js";

const router = express.Router();

/* ============================================================
   RATE LIMITERS (Security Enhancement - No Routes Removed)
============================================================ */

// General limiter (for register + login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per window
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

// Strict limiter for OTP-related routes
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit OTP attempts
  message: {
    success: false,
    message: "Too many OTP attempts. Please try again later."
  }
});

/* ============================================================
   AUTH ROUTES (UNCHANGED — JUST PROTECTED)
============================================================ */

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/forgot-password", otpLimiter, forgotPassword);
router.post("/verify-otp", otpLimiter, verifyOTP);
router.post("/reset", otpLimiter, resetPassword);

export default router;