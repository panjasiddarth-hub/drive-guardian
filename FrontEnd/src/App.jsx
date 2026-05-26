// src/App.jsx
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { API_BASE, getToken } from "./utils/api";
import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
// Pages
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Trips from "./pages/Trips";
import Auth from "./pages/Auth";
// Nested Trips children
import OngoingTrips from "./pages/Trips/OngoingTrips";
import CompletedTrips from "./pages/Trips/CompletedTrips";
import ScheduledTrips from "./pages/Trips/ScheduledTrips";
import SelectDriver from "./pages/Trips/SelectDriver";
import SelectVehicle from "./pages/Trips/SelectVehicle";

// Full-screen Tracking page (no sidebar)
import Tracking from "./pages/Tracking";
import Alerts from "./pages/Alerts";

// Reusable glass style
export const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;


// ================= STAT CARD =================
// ================= STAT CARD – Professional & Polished =================
function StatCard({ icon, title, value, color = "indigo", delay = 0 }) {
  const colorStyles = {
    indigo: {
      accent: "text-indigo-600",
      bg: "bg-indigo-50/40",
      border: "border-indigo-100/60",
      ring: "ring-indigo-300/40",
      iconBg: "bg-indigo-100/80",
      iconText: "text-indigo-700",
      gradient: "from-indigo-400/10 to-transparent",
      shadow: "shadow-indigo-100/50",
    },
    green: {
      accent: "text-green-600",
      bg: "bg-green-50/40",
      border: "border-green-100/60",
      ring: "ring-green-300/40",
      iconBg: "bg-green-100/80",
      iconText: "text-green-700",
      gradient: "from-green-400/10 to-transparent",
      shadow: "shadow-green-100/50",
    },
    orange: {
      accent: "text-orange-600",
      bg: "bg-orange-50/40",
      border: "border-orange-100/60",
      ring: "ring-orange-300/40",
      iconBg: "bg-orange-100/80",
      iconText: "text-orange-700",
      gradient: "from-orange-400/10 to-transparent",
      shadow: "shadow-orange-100/50",
    },
    red: {
      accent: "text-red-600",
      bg: "bg-red-50/40",
      border: "border-red-100/60",
      ring: "ring-red-300/40",
      iconBg: "bg-red-100/80",
      iconText: "text-red-700",
      gradient: "from-red-400/10 to-transparent",
      shadow: "shadow-red-100/50",
    },
    purple: {
      accent: "text-purple-600",
      bg: "bg-purple-50/40",
      border: "border-purple-100/60",
      ring: "ring-purple-300/40",
      iconBg: "bg-purple-100/80",
      iconText: "text-purple-700",
      gradient: "from-purple-400/10 to-transparent",
      shadow: "shadow-purple-100/50",
    },
  };

  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <div
      className={`
        group relative overflow-hidden
        p-7 ${glass} ${style.bg} ${style.border}
        rounded-3xl
        hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1
        transition-all duration-500 ease-out
        animate-in zoom-in-75 fade-in duration-700
        ring-1 ring-offset-2 ring-transparent hover:ring-2 ${style.ring}
        ${style.shadow}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className={`
          absolute inset-0 bg-gradient-to-br ${style.gradient}
          opacity-0 group-hover:opacity-100 transition-opacity duration-700
          pointer-events-none z-0
        `}
      />

      {/* Icon + Live badge */}
      <div className="relative flex items-center justify-between mb-6 z-10">
        <div
          className={`
            w-14 h-14 rounded-2xl flex items-center justify-center text-3xl
            ${style.iconBg} ${style.iconText}
            transition-all duration-500
            group-hover:scale-110 group-hover:rotate-3 shadow-md
          `}
        >
          <i className={`fas fa-${icon} transition-transform duration-500 group-hover:scale-110`} />
        </div>

        <span
          className={`
            text-xs font-semibold uppercase tracking-wider px-3 py-1.5
            bg-white/70 backdrop-blur-md rounded-full
            border border-white/50 shadow-sm
            ${style.accent}
            animate-pulse-slow
          `}
        >
          Live
        </span>
      </div>

      {/* Title */}
      <p className="text-base font-semibold text-gray-800 tracking-wide mb-1.5 z-10 relative">
        {title}
      </p>

      {/* Value – prominent, dark, professional */}
      <div className="relative z-10">
        <p
          className={`
            text-5xl md:text-4xl font-bold tracking-tight
            text-gray-900 drop-shadow-sm
            animate-in zoom-in duration-900 delay-300
          `}
        >
          {value}
        </p>

        {/* Shine effect on hover */}
        <div
          className="
            absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
            -translate-x-full group-hover:translate-x-full
            transition-transform duration-1000 ease-in-out
            pointer-events-none
          "
        />
      </div>
    </div>
  );
}
// ================= ALERT ITEM =================
function AlertItem({ title, description, time, delay = 0 }) {
  return (
    <div
      className={`
        group ${glass} p-5 
        hover:bg-white/20 hover:shadow-xl hover:-translate-y-0.5
        transition-all duration-400 ease-out
        animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-forwards
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h4 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-300">
        {title}
      </h4>
      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed animate-in fade-in delay-150 duration-600">
        {description}
      </p>
      <span className="text-xs text-gray-500/80 mt-3 block font-medium animate-in fade-in delay-300 duration-700">
        {time}
      </span>
    </div>
  );
}

// ================= DASHBOARD =================
function Dashboard() {

  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    idleVehicles: 0,
    alertsToday: 0,
    ongoingTrips: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [vehiclePositions, setVehiclePositions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const token = getToken();

  const fetchDashboardData = async () => {
    try {
      const [vehiclesRes, tripsRes] = await Promise.all([
        fetch(`${API_BASE}/api/vehicles`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      fetch(`${API_BASE}/api/trips`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      ]);

      const vehicles = await vehiclesRes.json();
      const trips = await tripsRes.json();

      // VEHICLE STATS
      const totalVehicles = vehicles.length;
      const activeVehicles = vehicles.filter(v => v.status === "running").length;
      const idleVehicles = vehicles.filter(v => v.status === "idle").length;

      // VEHICLE POSITIONS FOR MAP
      setVehiclePositions(
        vehicles
          .filter(v => v.lat && v.lng)
          .map(v => ({
            id: v._id,
            position: [v.lat, v.lng],
            number: v.vehicleNumber,
            status: v.status
          }))
      );

      // TRIP STATS
      const ongoingTrips = trips.filter(t => t.status === "ongoing").length;

      const generatedAlerts = trips
        .filter(t => t.status === "ongoing")
        .slice(0, 5)
        .map((t) => ({
          title: "Trip Running",
          description: `${t.vehicle?.vehicleNumber || "Vehicle"} currently active`,
          time: "Live"
        }));

      setStats({
        totalVehicles,
        activeVehicles,
        idleVehicles,
        alertsToday: generatedAlerts.length,
        ongoingTrips,
      });

      setAlerts(generatedAlerts);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 lg:p-12 space-y-12 md:space-y-16 bg-gradient-to-br from-gray-50/80 via-white to-indigo-50/30">

      {/* HERO */}
      <div className="text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Fleet Intelligence
        </h2>
        <p className="text-lg md:text-xl text-gray-700 mt-5 max-w-3xl mx-auto">
          Real-time visibility • Smarter decisions • Zero unplanned downtime
        </p>
      </div>

      {/* STATS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
        <StatCard icon="car" title="Total Vehicles" value={stats.totalVehicles} />
        <StatCard icon="check-circle" title="Active" value={stats.activeVehicles} color="green" />
        <StatCard icon="pause-circle" title="Idle" value={stats.idleVehicles} color="orange" />
        <StatCard icon="exclamation-triangle" title="Alerts" value={stats.alertsToday} color="red" />
        <StatCard icon="route" title="Trips Ongoing" value={stats.ongoingTrips} color="purple" />
      </section>

      {/* MAP */}
      <div className={`${glass} p-6 md:p-9`}>

        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Live Fleet Map</h3>
          <p className="text-gray-600 mt-2">Real-time positions & status</p>
        </div>

        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          scrollWheelZoom={true}
          className="h-96 md:h-[34rem] rounded-2xl z-0"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {vehiclePositions.map(vehicle => (
            <Marker key={vehicle.id} position={vehicle.position}>
              <Popup>
                <strong>{vehicle.number}</strong><br />
                Status: {vehicle.status}
              </Popup>
            </Marker>
          ))}
        </MapContainer>

      </div>

      {/* ALERTS */}
      <section>
        <div className={`${glass} p-6 md:p-9`}>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Active Alerts
          </h3>

          <div className="space-y-5">
            {alerts.length > 0 ? (
              alerts.map((alert, i) => (
                <AlertItem key={i} {...alert} />
              ))
            ) : (
              <div className="text-gray-600">No active alerts</div>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}

function Logout() {
  localStorage.removeItem("token");
  return <Navigate to="/login" replace />;
}

// ================= MAIN APP =================
export default function App() {
  return (
    <Routes>
      {/* Auth routes – no sidebar */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Auth initialView="login" />} />
      <Route path="/register" element={<Auth initialView="register" />} />

      {/* Protected layout with Sidebar */}
      <Route element={<DefaultLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/alerts" element={<Alerts />} />

        <Route path="/trips" element={<Trips />}>
          <Route path="ongoing" element={<OngoingTrips />} />
          <Route path="completed" element={<CompletedTrips />} />
          <Route path="scheduled" element={<ScheduledTrips />} />
          <Route path="select-driver" element={<SelectDriver />} />
          <Route path="select-vehicle" element={<SelectVehicle />} />
        </Route>
      </Route>

      {/* Full-screen routes – no sidebar */}
      <Route element={<FullScreenLayout />}>
        <Route path="/tracking" element={<Tracking />} />
      </Route>

      {/* Catch-all */}
      <Route path="/logout" element={<Logout />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

// ================= LAYOUT COMPONENTS =================
function DefaultLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-indigo-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-72 lg:ml-80">
        <Outlet />
      </div>
    </div>
  );
}

function FullScreenLayout() {
  return <Outlet />;
}