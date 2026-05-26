// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const navItems = [
    { 
      to: "/dashboard", 
      icon: "📊", // Dashboard / Analytics
      emoji: "📊",
      label: "Dashboard" 
    },
    { 
      to: "/vehicles", 
      icon: "🚛", // Truck / Vehicle
      emoji: "🚛",
      label: "Vehicles" 
    },
    { 
      to: "/drivers", 
      icon: "👤", // User / Driver
      emoji: "🧑‍✈️",
      label: "Drivers" 
    },
    { 
      to: "/trips", 
      icon: "🛣️", // Route / Trip
      emoji: "🛣️",
      label: "Trips" 
    },
    { 
      to: "/tracking", 
      icon: "🗺️", // Map / Tracking
      emoji: "📍",
      label: "Live Tracking" 
    },
    { 
      to: "/alerts", 
      icon: "🔔",
      emoji: "🔔",
      label: "Alerts" 
    },
  ];

  return (
    <aside
      className={`
        hidden md:flex md:w-68 lg:w-75 flex-col fixed inset-y-0 left-0 z-50
        bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl
        border-r border-white/20 shadow-2xl shadow-black/5
        overflow-hidden
      `}
    >
      {/* Brand */}
      <div className="px-6 py-8 border-b border-white/15">
        <div className="flex items-center gap-4">
          {/* Logo emoji + gradient */}
          <div className="
            w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 
            flex items-center justify-center text-indigo-600 shadow-inner ring-1 ring-indigo-200/30
            transition-transform hover:scale-110 duration-300
          ">
            <span className="text-3xl">🚚</span> {/* Truck emoji for fleet */}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Fleet Guard
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Intelligence Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation – with emojis */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {({ isActive }) => (
              <div
                className={`
                  group flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-medium
                  transition-all duration-300 ease-in-out
                  ${isActive
                    ? "bg-white/25 shadow-lg border border-indigo-200/40 text-indigo-900"
                    : "text-gray-800/90 hover:bg-white/20 hover:shadow-md hover:border-white/30"}
                `}
              >
                {/* Emoji + icon container */}
                <div
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-2xl
                    transition-all duration-300 transform group-hover:scale-110
                    ${isActive
                      ? "bg-indigo-100/80 text-indigo-700 ring-2 ring-indigo-200/40 shadow-inner"
                      : "bg-gray-100/70 text-gray-700 group-hover:bg-indigo-50/70 group-hover:text-indigo-600"}
                  `}
                >
                  <span>{item.emoji}</span>
                </div>

                <span className="flex-1">{item.label}</span>

                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-5 py-6 border-t border-white/15 bg-white/5 backdrop-blur-sm">
        <NavLink
          to="/logout"
          className="block"
        >
          <div className="
            flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-medium 
            text-red-700/90 hover:bg-red-50/30 hover:shadow transition-all duration-300
          ">
            <div className="
              w-10 h-10 rounded-xl bg-red-100/60 flex items-center justify-center text-red-600
              transition-transform hover:scale-110
            ">
              <span className="text-2xl">🚪</span> {/* Door emoji for logout */}
            </div>
            <span>Sign Out</span>
          </div>
        </NavLink>
      </div>

      {/* Footer */}
      <div className="
        px-6 py-5 text-xs text-gray-500/70 text-center 
        border-t border-white/10 bg-white/5 backdrop-blur-sm
      ">
        v1.1.0 • © {new Date().getFullYear()} Fleet Intelligence
      </div>
    </aside>
  );
}