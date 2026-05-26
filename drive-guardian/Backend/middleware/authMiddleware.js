import jwt from "jsonwebtoken";
import User from "../models/User.js";
import redis from "../config/redisClient.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Check Redis session
    const savedToken = await redis.get(`session:${decoded.id}`);
    if (!savedToken || savedToken !== token) {
      return res.status(401).json({ success: false, message: "Session expired" });
    }

    // ✅ Get full user
    const user = await User.findById(decoded.id).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user; // attach user
    next();

  } catch (err) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};