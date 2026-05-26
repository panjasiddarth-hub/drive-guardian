import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import client from "prom-client";
import connectDB from "./config/db.js";
import { protect } from "./middleware/authMiddleware.js";
import User from "./models/User.js";
import redis from "./config/redisClient.js";
import { connectRabbit, getChannel } from "./config/rabbit.js";
import { sendRiskAlertEmail } from "./utils/sendRiskAlertEmail.js"; // ← ADDED THIS IMPORT

// ROUTES
import authRoutes from "./routes/auth.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import driverRoutes from "./routes/driverRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

// MODELS
import Alert from "./models/Alert.js";
import Vehicle from "./models/Vehicle.js";
import Trip from "./models/Trip.js";
import Driver from "./models/Driver.js";

// UTILS
import { fetchOSRMRoute } from "./routes/tripRoutes.js";

dotenv.config({ path: "./.env" });

await connectDB();
//await connectRabbit();
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : "*" },
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on("connection", (socket) => {
  socket.on("register-user", (userId) => {
    socket.join(userId);
  });
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : "*",
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, "UserInterface")));

// Prometheus metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const apiRequestCount = new client.Counter({
  name: "api_request_total",
  help: "Total number of API requests",
  labelNames: ["method", "route", "status"],
});

const apiResponseTime = new client.Histogram({
  name: "api_response_time_seconds",
  help: "API response time in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.7, 1, 2, 5],
});

app.use((req, res, next) => {
  const start = process.hrtime();
  res.on("finish", () => {
    const diff = process.hrtime(start);
    const timeInSeconds = diff[0] + diff[1] / 1e9;
    apiRequestCount.labels(req.method, req.path, res.statusCode).inc();
    apiResponseTime.labels(req.method, req.path, res.statusCode).observe(timeInSeconds);
  });
  next();
});

app.get("/metrics", async (req, res) => {
  const key = req.headers["x-metrics-key"];
  if (process.env.METRICS_KEY && key !== process.env.METRICS_KEY) {
    return res.status(403).send("Forbidden");
  }
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// RabbitMQ helper
function sendToQueue(queue, data) {
  try {
    const ch = getChannel();
    if (!ch) return;
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: false });
  } catch (err) {
    console.log("RabbitMQ send FAILED:", err.message);
  }
}

const DEMO_MODE = true;

// =============================================================================
// ALERT CREATION + BROADCAST HELPER (NOW WITH EMAIL)
// =============================================================================
async function createAndBroadcastAlert(vehicle, driver, title, message, type = "Warning", riskScore = 0, riskLevel = "low") {
  try {
const alert = await Alert.create({
  title,
  message,
  type,
  vehicle: vehicle.vehicleNumber,
  driver: driver?.driver || "Unassigned",
  status: "Unresolved",
  createdAt: new Date(),
  riskScore,
  riskLevel,
  owner: vehicle.owner   // ✅ ADD THIS
});

    // Broadcast to frontend (real-time UI update)
io.to(vehicle.owner.toString()).emit("new-alert", {
        _id: alert._id.toString(),
      title: alert.title,
      message: alert.message,
      type: alert.type,
      vehicle: alert.vehicle,
      driver: alert.driver,
      createdAt: alert.createdAt.toISOString(),
      riskScore: alert.riskScore,
      riskLevel: alert.riskLevel
    });

    console.log(`[ALERT] ${type.toUpperCase()} - ${title} → ${vehicle.vehicleNumber} | Risk: ${riskLevel} (${riskScore})`);

    // Send email using your existing sendRiskAlertEmail (with cooldown for medium)
const ownerUser = await User.findById(vehicle.owner).lean();

if (ownerUser?.email) {
  await sendRiskAlertEmail(
    {
      title: finalRiskLevel === "high"
        ? "🚨 High Driving Risk Escalation"
        : "⚠️ Medium Driving Risk Escalation",

      message: `... same message ...`,

      vehicle: vehicle.vehicleNumber,
      driver: driver.driver,
      createdAt: new Date(),
      type: finalRiskLevel === "high" ? "Critical" : "Warning",
      riskLevel: finalRiskLevel,
      riskScore: finalRiskScore
    },
    ownerUser.email
  );
}
  } catch (err) {
    console.error("[ALERT CREATION FAILED]", err.message);
  }
}

// =============================================================================
// CONSTANTS & HELPERS
// =============================================================================
const UPDATE_INTERVAL = 5000;
let lastDbSave = Date.now();
const DB_SAVE_INTERVAL = 15000;

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function getMLPrediction(features) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) throw new Error(`ML server error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("ML SERVICE ERROR:", err.message);
    return null;
  }
}

// =============================================================================
// MAIN SIMULATION LOOP – PASS RISK INFO TO ALERTS
// =============================================================================
async function simulationLoop() {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    const ALERT_COOLDOWN_MS = 30000;
    const SPEED_LIMIT = DEMO_MODE ? 75 : 100;
    const HIGH_RISK_THRESHOLD = 70;
const MEDIUM_RISK_THRESHOLD = 40;

const trips = await Trip.find(
  { 
    status: { $ne: "completed" },
    },
      "status startTime duration origin destination originCoords destinationCoords route routeIndex tempStats vehicle driver"
    );

    for (const trip of trips) {
      let needsSave = false;

      if (!trip.tempStats) {
        trip.tempStats = {
          overspeed: 0,
          harshBrake: 0,
          harshAccel: 0,
          lastMLCallTime: 0,
          fatigue: {
            drivingStartTime: null,
            lastBreakTime: null,
            totalDrivingMinutes: 0,
            alertsTriggered: 0
          },
          lastAlertTimes: {
            overspeed: 0,
            harshBrake: 0,
            harshAccel: 0,
            harshJerk: 0,
            harshCornering: 0,
            fatigue: 0,
            idle: 0
          },
          eventWindow: {
  harshBrake: [],
  harshAccel: [],
  overspeed: []
},
          idleStartTime: null,
          metrics: {
            maxSpeed: 0, avgSpeed: 0, stdSpeed: 0,
            avgAcc: 0, stdAcc: 0,
            meanPosAcc: 0, meanNegAcc: 0,
            avgAbsJerk: 0, stdAbsJerk: 0,
            accTimePct: 0, brakeTimePct: 0, decelTimePct: 0, constSpeedPct: 0,
            riskScore: 0,
            riskLevel: "low",
            riskExplanation: ""
          },
          running: null
        };
        needsSave = true;
      }

      if (!trip.tempStats.running) {
        trip.tempStats.running = {
          speed_n: 0,
          speed_mean: 0,
          speed_M2: 0,
          acc_n: 0,
          acc_mean: 0,
          acc_M2: 0,
          jerk_n: 0,
          jerk_mean: 0,
          jerk_M2: 0,
          posAccSum: 0,
          posAccCount: 0,
          negAccSum: 0,
          negAccCount: 0,
          totalSeconds: 0,
          accSeconds: 0,
          brakeSeconds: 0,
          decelSeconds: 0,
          constSeconds: 0,
          lastSpeed: 0,
          lastAcc: 0,
          lastLateralAcc: 0,
          recentSpeedDrops: [],
          harshAccelStartTime: null,
          harshAccelStreak: 0,
          harshBrakeStartTime: null,
          harshBrakeStreak: 0,
          harshJerkStreak: 0,
          harshCorneringStreak: 0,
        };
        needsSave = true;
      }

      const vehicle = await Vehicle.findById(trip.vehicle);
      const driver = await Driver.findById(trip.driver);
      if (!vehicle || !driver) continue;

      // AUTO START TRIP
      const start = new Date(trip.startTime);
      if (trip.status === "scheduled" && now >= start) {
        trip.status = "ongoing";
        trip.routeIndex = 0;

        if (trip.originCoords?.lat && trip.originCoords?.lng) {
          vehicle.lat = Number(trip.originCoords.lat);
          vehicle.lng = Number(trip.originCoords.lng);
          vehicle.speed = 0;
          vehicle.status = "running";
          trip.tempStats.fatigue.drivingStartTime = nowMs;
          needsSave = true;
        }

        needsSave = true;
        sendToQueue("trip_events", { type: "trip_started", tripId: trip._id });
      }

      // ENSURE VALID ROUTE
      if (!trip.route || trip.route.length < 2) {
        const route = await fetchOSRMRoute(trip.originCoords, trip.destinationCoords);
        if (!route || route.length < 2) continue;
        trip.route = route;
        trip.routeIndex = 0;
        needsSave = true;
      }

      // GUARANTEE POSITION
      if (!vehicle.lat || !vehicle.lng || isNaN(vehicle.lat) || isNaN(vehicle.lng)) {
        if (trip.originCoords?.lat && trip.originCoords?.lng) {
          vehicle.lat = Number(trip.originCoords.lat);
          vehicle.lng = Number(trip.originCoords.lng);
          needsSave = true;
        } else {
          continue;
        }
      }

      // ── IMPROVED ACCELERATION + DRAG + MORE FREQUENT RANDOM HARSH EVENTS ──
      const prevSpeed = vehicle.speed ?? 0;
      let accel = 0;

      if (prevSpeed < 30) {
        accel = 2.8 + Math.random() * 2.2;
      } else if (prevSpeed < 70) {
        accel = 1.0 + Math.random() * 1.8;
      } else if (prevSpeed < 95) {
        accel = 0.3 + Math.random() * 0.9 - 0.4;
      } else {
        accel = -1.2 + Math.random() * 1.0;
      }

      const airDrag = 0.00035 * (prevSpeed ** 2);
      const rolling = 0.012 * 9.81;
      accel -= (airDrag + rolling);

      if (DEMO_MODE && Math.random() < 0.35) {
        const isAccel = Math.random() < 0.5;
        if (isAccel && prevSpeed < 105) {
          accel = 5.5 + Math.random() * 6.0;
          trip.tempStats.harshAccel = (trip.tempStats.harshAccel || 0) + 1;
          console.log(`[${vehicle.vehicleNumber}] STRONG HARSH ACCEL! (accel=${accel.toFixed(2)})`);
        } else if (prevSpeed > 20) {
          accel = -8.0 - Math.random() * 7.0;
          trip.tempStats.harshBrake = (trip.tempStats.harshBrake || 0) + 1;
          console.log(`[${vehicle.vehicleNumber}] STRONG HARSH BRAKE! (accel=${accel.toFixed(2)})`);
        }
      }

      let newSpeed = prevSpeed + accel;
      newSpeed = Math.max(0, Math.min(newSpeed, 120));
      vehicle.speed = Math.round(newSpeed);
      const roundedSpeed = vehicle.speed;
      const currentSpeed = roundedSpeed || 0;

      vehicle.status = roundedSpeed < 5 ? "idle" : "running";

      // Movement logic
      const secondsThisTick = UPDATE_INTERVAL / 1000;
      const metersPerSecond = (vehicle.speed || 0) * (1000 / 3600);
      let distanceToTravel = metersPerSecond * secondsThisTick;
      let moved = false;

      while (distanceToTravel > 0 && trip.routeIndex < trip.route.length - 1) {
        const pointA = trip.route[trip.routeIndex];
        const pointB = trip.route[trip.routeIndex + 1];

        const segmentMeters = calculateDistance(
          vehicle.lat, vehicle.lng, pointB.lat, pointB.lng
        ) * 1000;

        if (segmentMeters < 0.5) {
          vehicle.lat = Number(pointB.lat);
          vehicle.lng = Number(pointB.lng);
          trip.routeIndex++;
          moved = true;
          continue;
        }

        if (distanceToTravel >= segmentMeters) {
          vehicle.lat = Number(pointB.lat);
          vehicle.lng = Number(pointB.lng);
          distanceToTravel -= segmentMeters;
          trip.routeIndex++;
          moved = true;
        } else {
          const fraction = distanceToTravel / segmentMeters;
          vehicle.lat = Number((vehicle.lat + (pointB.lat - vehicle.lat) * fraction).toFixed(7));
          vehicle.lng = Number((vehicle.lng + (pointB.lng - vehicle.lng) * fraction).toFixed(7));
          distanceToTravel = 0;
          moved = true;
          break;
        }
      }

      // Remaining distance & trip restart
      let remainingMeters = 0;
      for (let i = trip.routeIndex; i < trip.route.length - 1; i++) {
        remainingMeters += calculateDistance(
          trip.route[i].lat, trip.route[i].lng,
          trip.route[i + 1].lat, trip.route[i + 1].lng
        ) * 1000;
      }

      if (remainingMeters < 20 && vehicle.speed < 5) {
        vehicle.status = "stopped";
      }

     if (
  trip.status === "ongoing" &&
  (trip.routeIndex >= trip.route.length - 1 || remainingMeters <= 40)
) {
  console.log(`🏁 ${vehicle.vehicleNumber} reached destination - COMPLETED`);

  trip.status = "completed";
  vehicle.status = "available";
  vehicle.speed = 0;

  await Promise.all([
    Trip.findByIdAndUpdate(trip._id, {
      status: "completed",
      endTime: new Date()
    }),

    Vehicle.findByIdAndUpdate(vehicle._id, {
      status: "available",
      speed: 0,
      currentTripId: null
    }),

    Driver.findByIdAndUpdate(trip.driver, {
      status: "available",
      currentTripId: null
    })
  ]);

  await redis.del("trips:list"); // 🔥 VERY IMPORTANT (clear cache)

  sendToQueue("trip_events", {
    type: "trip_completed",
    tripId: trip._id
  });

  continue; // 🚀 stop further simulation for this trip
}
      // Physics & metrics
      const r = trip.tempStats.running;
      const m = trip.tempStats.metrics;

      const lastSpeed = r.lastSpeed ?? 0;
      const lastAcc   = r.lastAcc   ?? 0;

      const deltaV_kmh = roundedSpeed - lastSpeed;

      if (deltaV_kmh <= -10) {
        r.recentSpeedDrops = r.recentSpeedDrops || [];
        r.recentSpeedDrops.push(nowMs);
        r.recentSpeedDrops = r.recentSpeedDrops.filter(t => nowMs - t <= 10000);
      }

      const acc = deltaV_kmh / 3.6;
      const noisyAcc = acc + (Math.random() - 0.5) * 0.5;
      const jerk = noisyAcc - lastAcc;
      const absJerk = Math.abs(jerk);

      let lateralAcc = 0;
      if (trip.routeIndex > 0 && trip.routeIndex < trip.route.length - 1) {
        const prev = trip.route[trip.routeIndex - 1];
        const curr = { lat: vehicle.lat, lng: vehicle.lng };
        const next = trip.route[trip.routeIndex + 1];

        const v1x = curr.lng - prev.lng;
        const v1y = curr.lat - prev.lat;
        const v2x = next.lng - curr.lng;
        const v2y = next.lat - curr.lat;

        const cross = v1x * v2y - v1y * v2x;
        lateralAcc = cross * 800 / (metersPerSecond ** 2 + 10);
        lateralAcc = Math.max(-7, Math.min(7, lateralAcc));
      }

            const ACC_TH = 2.0;
      const HARSH_ACC_TH = 2.8;
      const LIGHT_DEC = -1.5;
      const BRAKE_TH = -3.4;
      const HARSH_BRAKE_TH = -6.0;
      const HIGH_JERK_TH = 7.5;
      // UPDATE RUNNING STATISTICS
      r.speed_n = (r.speed_n || 0) + 1;
      const d_speed = roundedSpeed - (r.speed_mean || 0);
      r.speed_mean += d_speed / r.speed_n;
      r.speed_M2 += d_speed * (roundedSpeed - r.speed_mean);

      r.acc_n = (r.acc_n || 0) + 1;
      const d_acc = noisyAcc - (r.acc_mean || 0);
      r.acc_mean += d_acc / r.acc_n;
      r.acc_M2 += d_acc * (noisyAcc - r.acc_mean);

      r.jerk_n = (r.jerk_n || 0) + 1;
      const d_jerk = absJerk - (r.jerk_mean || 0);
      r.jerk_mean += d_jerk / r.jerk_n;
      r.jerk_M2 += d_jerk * (absJerk - r.jerk_mean);

      if (noisyAcc > 0) {
        r.posAccSum = (r.posAccSum || 0) + noisyAcc;
        r.posAccCount = (r.posAccCount || 0) + 1;
      } else if (noisyAcc < 0) {
        r.negAccSum = (r.negAccSum || 0) + noisyAcc;
        r.negAccCount = (r.negAccCount || 0) + 1;
      }

      r.totalSeconds = (r.totalSeconds || 0) + 1;


      if (noisyAcc > ACC_TH) r.accSeconds = (r.accSeconds || 0) + 1;
      else if (noisyAcc < BRAKE_TH) { 
        r.brakeSeconds = (r.brakeSeconds || 0) + 1; 
        r.decelSeconds = (r.decelSeconds || 0) + 1; 
      }
      else if (noisyAcc < LIGHT_DEC) r.decelSeconds = (r.decelSeconds || 0) + 1;
      else r.constSeconds = (r.constSeconds || 0) + 1;

      // UPDATE FINAL METRICS
      m.maxSpeed = Math.max(m.maxSpeed || 0, roundedSpeed);
      m.avgSpeed = r.speed_n >= 1 ? Math.round(r.speed_mean * 10) / 10 : roundedSpeed;
      m.stdSpeed = r.speed_n >= 2 ? Math.round(Math.sqrt(r.speed_M2 / (r.speed_n - 1)) * 10) / 10 : 0;

      m.avgAcc = r.acc_n >= 1 ? Math.round(r.acc_mean * 100) / 100 : noisyAcc;
      m.stdAcc = r.acc_n >= 2 ? Math.round(Math.sqrt(r.acc_M2 / (r.acc_n - 1)) * 100) / 100 : 0;

      m.meanPosAcc = r.posAccCount > 0 ? Math.round((r.posAccSum / r.posAccCount) * 100) / 100 : 0;
      m.meanNegAcc = r.negAccCount > 0 ? Math.round((r.negAccSum / r.negAccCount) * 100) / 100 : 0;

      m.avgAbsJerk = r.jerk_n >= 1 ? Math.round(r.jerk_mean * 100) / 100 : absJerk;
      m.stdAbsJerk = r.jerk_n >= 2 ? Math.round(Math.sqrt(r.jerk_M2 / (r.jerk_n - 1)) * 100) / 100 : 0;

      if (r.totalSeconds > 0) {
        m.accTimePct    = Math.round((r.accSeconds    / r.totalSeconds) * 100);
        m.brakeTimePct  = Math.round((r.brakeSeconds  / r.totalSeconds) * 100);
        m.decelTimePct  = Math.round((r.decelSeconds  / r.totalSeconds) * 100);
        m.constSpeedPct = Math.round((r.constSeconds  / r.totalSeconds) * 100);
      }

      r.lastSpeed = roundedSpeed;
      r.lastAcc = noisyAcc;
      r.lastLateralAcc = lateralAcc;
      // ================= ML RISK PREDICTION =================
if (!trip.tempStats.lastMLCallTime) {
  trip.tempStats.lastMLCallTime = 0;
}

let finalRiskLevel=m.riskLevel;
let finalRiskScore=m.riskScore;
// Always compute event counts (for escalation + email)
const brakeCount = trip.tempStats.eventWindow.harshBrake.length;
const accelCount = trip.tempStats.eventWindow.harshAccel.length;
const overspeedCount = trip.tempStats.eventWindow.overspeed.length;

const totalAggressiveEvents = brakeCount + accelCount + overspeedCount;
if (Date.now() - trip.tempStats.lastMLCallTime > 10000) {

  
const features = {
  maxSpeed: m.maxSpeed || 0,
  avgSpeed: m.avgSpeed || 0,
  stdSpeed: m.stdSpeed || 0,
  avgAcc: m.avgAcc || 0,
  stdAcc: m.stdAcc || 0,
  meanPosAcc: m.meanPosAcc || 0,
  meanNegAcc: m.meanNegAcc || 0,
  avgAbsJerk: m.avgAbsJerk || 0,
  stdAbsJerk: m.stdAbsJerk || 0,
  brakeTimePct: m.brakeTimePct || 0,
  accTimePct: m.accTimePct || 0,
  decelTimePct: m.decelTimePct || 0,
  constSpeedPct: m.constSpeedPct || 0
};

  try {
    const mlResult = await getMLPrediction(features);


    if (mlResult) {
      if (mlResult) {
  m.riskScore = mlResult.risk_score;       // already percentage
  m.riskLevel = mlResult.risk_level;
  m.riskHeadline = mlResult.headline || "";
  m.riskExplanation = (mlResult.detailed_explanation || []).join("\n");
  m.topRiskFactors = mlResult.top_risk_factors || [];
}
      // ================= 2-MINUTE AGGRESSIVE BEHAVIOR ESCALATION ================

finalRiskLevel = m.riskLevel;
finalRiskScore = m.riskScore;

// 6+ events in 2 minutes → FORCE HIGH
if (totalAggressiveEvents >= 8 && m.riskLevel !== "low") {    finalRiskLevel = "high";
    finalRiskScore = Math.max(m.riskScore, 85);
}

// 3–5 events → FORCE MEDIUM
else if (totalAggressiveEvents >= 4) {
    finalRiskLevel = "medium";
    finalRiskScore = Math.max(m.riskScore, 55);
}
    } else {
      // Fallback only if ML fails
      m.riskScore = 20;
      m.riskLevel = "low";
      m.riskExplanation = "ML service unavailable. Default safe risk applied.";
    }

  } catch (err) {
    m.riskScore = 20;
    m.riskLevel = "low";
    m.riskExplanation = "ML prediction error. Default safe risk applied.";
  }

  trip.tempStats.lastMLCallTime = Date.now();
}
// 🚨 EMAIL BASED ON RISK SCORE (Redis Controlled)

const riskStateKey = `risk_state:${vehicle.owner}:${vehicle.vehicleNumber}`;
const previousStateRaw = await redis.get(riskStateKey);
let previousState = previousStateRaw ? JSON.parse(previousStateRaw) : null;

const nowTime = Date.now();
let shouldSend = false;

// Escalation cases
if (!previousState) {
    shouldSend = finalRiskLevel !== "low";
}
else if (
    (previousState.level === "low" && finalRiskLevel !== "low") ||
    (previousState.level === "medium" && finalRiskLevel === "high")
) {
    shouldSend = true;
}
// High persists for 10+ minutes
else if (
    finalRiskLevel === "high" &&
    previousState.level === "high" &&
    nowTime - previousState.timestamp > 600000
) {
    shouldSend = true;
}

if (shouldSend) {
 const explanationText = m.riskExplanation || "No detailed explanation available.";

const topFactorsText = (m.topRiskFactors || [])
  .map(f => 
    `• ${f.feature}: ${f.observed_value} (${f.impact_on_risk} risk)`
  )
  .join("\n");
const ownerUser = await User.findById(vehicle.owner).lean();
if (ownerUser?.email) {
await sendRiskAlertEmail({
  title: finalRiskLevel === "high"
      ? "🚨 High Driving Risk Escalation"
      : "⚠️ Medium Driving Risk Escalation",

  message: `
Vehicle: ${vehicle.vehicleNumber}
Driver: ${driver.driver}

Risk Score: ${finalRiskScore}%
Risk Level: ${finalRiskLevel.toUpperCase()}

━━━━━━━━━━━━━━━━━━
AI Risk Headline:
${m.riskHeadline || ""}
━━━━━━━━━━━━━━━━━━
Top Contributing Factors:
${topFactorsText}

━━━━━━━━━━━━━━━━━━
Detailed Explanation:
${explanationText}

━━━━━━━━━━━━━━━━━━
Aggressive Events (Last 2 min):
Harsh Brake: ${brakeCount}
Harsh Accel: ${accelCount}
Overspeed: ${overspeedCount}
  `,

  vehicle: vehicle.vehicleNumber,
  driver: driver.driver,
  createdAt: new Date(),
  type: finalRiskLevel === "high" ? "Critical" : "Warning",
  riskLevel: finalRiskLevel,
  riskScore: finalRiskScore
},ownerUser.email)
} else {
  console.log("⚠ Owner email not found. Skipping email.");
}
    await redis.set(
        riskStateKey,
        JSON.stringify({
            level: finalRiskLevel,
            timestamp: nowTime
        }),
        { EX: 3600 }
    );

    console.log("📨 Escalation email sent:", finalRiskLevel);
}
      // ── ALERTS ─────────────────────────────────────────────
      if (roundedSpeed > SPEED_LIMIT) {
        const last = trip.tempStats.lastAlertTimes.overspeed || 0;
        if (nowMs - last >= ALERT_COOLDOWN_MS) {
          trip.tempStats.lastAlertTimes.overspeed = nowMs;
          trip.tempStats.overspeed = (trip.tempStats.overspeed || 0) + 1;
          // ✅ Track 2-min window overspeed
trip.tempStats.eventWindow.overspeed.push(nowMs);
trip.tempStats.eventWindow.overspeed =
    trip.tempStats.eventWindow.overspeed.filter(
        t => nowMs - t <= 120000
    );
          await createAndBroadcastAlert(
            vehicle, driver,
            "Overspeed Violation Detected",
            `Vehicle ${vehicle.vehicleNumber} exceeded ${SPEED_LIMIT} km/h (peak ${roundedSpeed} km/h , something problem is going to be occured)`,
            "Critical",
            m.riskScore,   // ← pass to email
            m.riskLevel    // ← pass to email
          );
          needsSave = true;
        }
      }

      if (deltaV_kmh <= -6) {
        r.recentSpeedDrops = r.recentSpeedDrops || [];
        r.recentSpeedDrops.push(nowMs);
        r.recentSpeedDrops = r.recentSpeedDrops.filter(t => nowMs - t <= 10000);

        if (r.recentSpeedDrops.length >= 2) {
          const last = trip.tempStats.lastAlertTimes.harshBrake || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.harshBrake = nowMs;
            r.recentSpeedDrops = [];
            trip.tempStats.harshBrake = (trip.tempStats.harshBrake || 0) + 1;
            // ✅ Track 2-min window harsh brake
trip.tempStats.eventWindow.harshBrake.push(nowMs);
trip.tempStats.eventWindow.harshBrake =
    trip.tempStats.eventWindow.harshBrake.filter(
        t => nowMs - t <= 120000
    );
            await createAndBroadcastAlert(
              vehicle, driver,
              "Harsh Braking Detected",
              `Sudden speed drop of ${Math.abs(deltaV_kmh).toFixed(1)} km/h`,
              "Warning",
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      }

      if (noisyAcc > HARSH_ACC_TH) {
        if (!r.harshAccelStartTime) r.harshAccelStartTime = nowMs;
        r.harshAccelStreak = Math.round((nowMs - r.harshAccelStartTime) / 1000);

        if (r.harshAccelStreak >= 2) {
          const last = trip.tempStats.lastAlertTimes.harshAccel || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.harshAccel = nowMs;

            const severity = r.harshAccelStreak >= 8 ? "Critical" : "Warning";
            const title = severity === "Critical" ? "Severe Harsh Acceleration" : "Harsh Acceleration Detected";
// ✅ Track 2-min window harsh accel
trip.tempStats.eventWindow.harshAccel.push(nowMs);
trip.tempStats.eventWindow.harshAccel =
    trip.tempStats.eventWindow.harshAccel.filter(
        t => nowMs - t <= 120000
    );
            await createAndBroadcastAlert(
              vehicle, driver,
              title,
              `Acceleration reached ${noisyAcc.toFixed(2)} m/s² sustained for ${r.harshAccelStreak} seconds. ` +
              `Risk: Loss of control, tyre wear. ` +
              `Action: Driver coaching required.`,
              severity,
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      } else {
        r.harshAccelStartTime = null;
        r.harshAccelStreak = 0;
      }

      if (noisyAcc < HARSH_BRAKE_TH) {
        if (!r.harshBrakeStartTime) r.harshBrakeStartTime = nowMs;
        r.harshBrakeStreak = Math.round((nowMs - r.harshBrakeStartTime) / 1000);

        if (r.harshBrakeStreak >= 2) {
          const last = trip.tempStats.lastAlertTimes.harshBrake || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.harshBrake = nowMs;

            const severity = r.harshBrakeStreak >= 8 ? "Critical" : "Warning";
            const title = severity === "Critical" ? "Severe Harsh Braking" : "Harsh Braking Detected";

            await createAndBroadcastAlert(
              vehicle, driver,
              title,
              `Deceleration of ${Math.abs(noisyAcc).toFixed(2)} m/s² sustained for ${r.harshBrakeStreak} seconds. ` +
              `Risk: Brake failure risk, collision hazard. ` +
              `Action: Defensive driving training.`,
              severity,
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      } else {
        r.harshBrakeStartTime = null;
        r.harshBrakeStreak = 0;
      }

      if (absJerk > HIGH_JERK_TH) {
        r.harshJerkStreak = (r.harshJerkStreak || 0) + 1;
        if (r.harshJerkStreak >= 2) {
          const last = trip.tempStats.lastAlertTimes.harshJerk || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.harshJerk = nowMs;
            r.harshJerkStreak = 0;

            trip.tempStats.harshJerk = (trip.tempStats.harshJerk || 0) + 1;

            await createAndBroadcastAlert(
              vehicle, driver,
              "Harsh Jerk Detected",
              `Jerk of ${absJerk.toFixed(2)} m/s³ — abrupt input detected. ` +
              `Risk: Loss of control. ` +
              `Action: Smooth driving coaching.`,
              "Warning",
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      } else {
        r.harshJerkStreak = 0;
      }

      if (Math.abs(lateralAcc) > 3.8) {
        r.harshCorneringStreak = (r.harshCorneringStreak || 0) + 1;
        if (r.harshCorneringStreak >= 3) {
          const last = trip.tempStats.lastAlertTimes.harshCornering || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.harshCornering = nowMs;
            r.harshCorneringStreak = 0;

            trip.tempStats.harshCornering = (trip.tempStats.harshCornering || 0) + 1;

            await createAndBroadcastAlert(
              vehicle, driver,
              "Harsh Cornering Detected",
              `Lateral acceleration ${Math.abs(lateralAcc).toFixed(2)} m/s². ` +
              `Risk: Traction loss, rollover. ` +
              `Action: Cornering speed training.`,
              "Warning",
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      } else {
        r.harshCorneringStreak = 0;
      }

      if (trip.tempStats.fatigue.totalDrivingMinutes > 240) {
        const last = trip.tempStats.lastAlertTimes.fatigue || 0;
        if (nowMs - last >= ALERT_COOLDOWN_MS) {
          trip.tempStats.lastAlertTimes.fatigue = nowMs;

          await createAndBroadcastAlert(
            vehicle, driver,
            "Fatigue Risk – Extended Driving",
            `Driving for ${Math.round(trip.tempStats.fatigue.totalDrivingMinutes)} minutes without break. ` +
            `Risk: Accident likelihood doubled. ` +
            `Action: Mandatory 30-min rest now.`,
            "Critical",
            m.riskScore,
            m.riskLevel
          );

          trip.tempStats.fatigue.alertsTriggered += 1;
          needsSave = true;
        }
      }

      if (vehicle.status === "idle" && roundedSpeed < 5) {
        if (!trip.tempStats.idleStartTime) {
          trip.tempStats.idleStartTime = nowMs;
        }
        const idleMinutes = (nowMs - trip.tempStats.idleStartTime) / 60000;

        if (idleMinutes > 10) {
          const last = trip.tempStats.lastAlertTimes.idle || 0;
          if (nowMs - last >= ALERT_COOLDOWN_MS) {
            trip.tempStats.lastAlertTimes.idle = nowMs;

            await createAndBroadcastAlert(
              vehicle, driver,
              "Prolonged Idle Detected",
              `Idling for ${Math.round(idleMinutes)} minutes. ` +
              `Risk: Fuel waste, engine wear. ` +
              `Action: Shut down if >5 min, investigate cause.`,
              "Warning",
              m.riskScore,
              m.riskLevel
            );
            needsSave = true;
          }
        }
      } else {
        trip.tempStats.idleStartTime = null;
      }

      // SAVE
      if (moved || needsSave || (Date.now() - lastDbSave >= DB_SAVE_INTERVAL)) {
        await Promise.allSettled([
          Vehicle.findByIdAndUpdate(vehicle._id, vehicle, { new: true }),
          Trip.findByIdAndUpdate(trip._id, trip, { new: true })
        ]);
        if (moved || needsSave) lastDbSave = Date.now();
      }

      // BROADCAST
      const etaMinutes = metersPerSecond > 0.1
        ? Math.ceil(remainingMeters / metersPerSecond / 60)
        : remainingMeters > 50 ? 999 : 0;
if (vehicle.owner) {
io.to(vehicle.owner.toString()).emit("vehicle-update", {
        _id: vehicle._id.toString(),
        lat: vehicle.lat,
        lng: vehicle.lng,
        speed: vehicle.speed,
        status: vehicle.status,
        eta: etaMinutes,
        remainingDistance: Math.round(remainingMeters / 1000),
        metrics: trip.tempStats?.metrics || {},
        harshEvents: {
          harshAccel: trip.tempStats?.harshAccel || 0,
          harshBrake: trip.tempStats?.harshBrake || 0,
          harshJerk: trip.tempStats?.harshJerk || 0,
          harshCornering: trip.tempStats?.harshCornering || 0
        },
        lateralAcc: Number(lateralAcc.toFixed(2)),
        riskLevel: m.riskLevel,
        riskExplanation: m.riskExplanation || ""
      });
      } else {
  console.log("⚠ Vehicle missing owner. Skipping socket emit.");
}

      console.log(`📍 ${vehicle.vehicleNumber} → ${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)} | Speed: ${vehicle.speed} | Risk: ${m.riskLevel}`);
    }
  } catch (err) {
    console.error("SIMULATION LOOP ERROR:", err.message);
    console.error(err.stack);
  }
}

// Start simulation
async function startSimulation() {
  while (true) {
    const start = Date.now();
    await simulationLoop();
    const elapsed = Date.now() - start;
    await new Promise(res =>
      setTimeout(res, Math.max(0, UPDATE_INTERVAL - elapsed))
    );
  }
}

startSimulation();
console.log("🔥 Simulation engine started");

// =============================================================================
// LIVE VEHICLES API
// =============================================================================
app.get("/api/vehicles/live",protect, async (req, res) => {
  try {
    const trips = await Trip.find(
      { status: { $ne: "completed" } },
      "vehicle driver destinationCoords originCoords route tempStats"
    )
    .populate("vehicle", "vehicleNumber lat lng speed status fuel")
    .populate("driver", "driver")
    .lean();

    const live = trips
      .filter(t => t.vehicle)
      .map(t => ({
        _id: t.vehicle._id,
        vehicleNumber: t.vehicle.vehicleNumber,
        lat: Number(t.vehicle.lat || 0),
        lng: Number(t.vehicle.lng || 0),
        speed: t.vehicle.speed,
        status: t.vehicle.status,
        fuel: t.vehicle.fuel,
        route: t.route || [],
        driverName: t.driver?.driver || "Unassigned",
        destinationCoords: t.destinationCoords,
        originCoords: t.originCoords,
        metrics: {
          ...t.tempStats?.metrics || {},
          riskLevel: t.tempStats?.metrics?.riskLevel || "low",
          riskExplanation: t.tempStats?.metrics?.riskExplanation || ""
        },
        harshEvents: {
          harshAccel: t.tempStats?.harshAccel || 0,
          harshBrake: t.tempStats?.harshBrake || 0,
          harshJerk: t.tempStats?.harshJerk || 0,
          harshCornering: t.tempStats?.harshCornering || 0
        }
      }));

    res.json(live);
  } catch (err) {
    console.error("Live vehicles API error:", err);
    res.json([]);
  }
});

// =============================================================================
// OTHER ROUTES
// =============================================================================
app.use("/api/auth",authRoutes);
app.use("/api/vehicles",protect, vehicleRoutes);
app.use("/api/drivers",protect, driverRoutes);
app.use("/api/trips",protect, tripRoutes);
app.use("/api/alerts",protect, alertRoutes);
app.use("/api/stats",protect, statsRoutes);

app.get("/api/geocode", async (req, res) => {
  try {
    const place = req.query.place;
    if (!place) return res.status(400).json({ message: "place is required" });

    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&q=${encodeURIComponent(place)}`;
    const geo = await fetch(url).then(r => r.json());

    if (!geo.length) return res.status(404).json({ message: "Location not found" });

    res.json({
      lat: Number(geo[0].lat),
      lng: Number(geo[0].lon),
    });
  } catch {
    res.status(500).json({ message: "Geocode failed" });
  }
});

const PORT = 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running → http://localhost:${PORT}`)
);