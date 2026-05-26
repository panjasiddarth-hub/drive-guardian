// src/pages/SelectVehicle.jsx
import { useState, useEffect } from 'react';
import { API_BASE } from "../../utils/api";
import { useNavigate } from 'react-router-dom';

// Reusable glass style
const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

export default function SelectVehicle() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        const available =
          JSON.parse(localStorage.getItem("availableVehicles")) || [];

        if (available.length > 0) {
          setVehicles(available);
        } else {
          const token = localStorage.getItem("token");

          if (!token) {
            navigate("/login");
            return;
          }

          const res = await fetch(
            `${API_BASE}/api/vehicles`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          // 🔐 Auto logout if token expired
          if (res.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }

          if (!res.ok) throw new Error("Failed to load vehicles");

          const data = await res.json();

          // Safety check
          if (!Array.isArray(data)) {
            throw new Error("Invalid vehicle data received");
          }

          setVehicles(data);
        }
      } catch (err) {
        console.error("Error loading vehicles:", err);
      } finally {
        setLoading(false);
      }
    };

    loadVehicles();
  }, [navigate]);

  // Safe filtering
  const filteredVehicles = Array.isArray(vehicles)
    ? vehicles.filter((vehicle) => {
        const number =
          (vehicle.vehicleNumber || vehicle.number || "").toLowerCase();
        return number.includes(searchQuery.toLowerCase());
      })
    : [];

  const handleSelectVehicle = (vehicle) => {
    const number =
      vehicle.vehicleNumber || vehicle.number || "Unknown";

    localStorage.setItem("selectedVehicleId", vehicle._id);
    localStorage.setItem("selectedVehicleNumber", number);

    navigate("/trips");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`${glass} px-12 py-10 text-center ring-1 ring-indigo-500/20`}>
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-800">
            Loading vehicles...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 p-6 md:p-8 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 tracking-tight">
              Select Vehicle
            </h1>
            <p className="mt-2 text-base md:text-lg text-gray-600">
              Choose a vehicle for your trip
            </p>
          </div>

          <button
            onClick={() => navigate('/trips')}
            className="
              px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white 
              rounded-xl font-medium transition-all shadow-lg flex items-center gap-2
            "
          >
            <i className="fas fa-arrow-left"></i>
            Back to Trips
          </button>
        </div>

        {/* Search */}
        <div className={`${glass} p-4 md:p-6`}>
          <input
            type="text"
            placeholder="Search vehicle number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full px-5 py-4 bg-white/20 border border-white/30 rounded-2xl
              text-gray-800 placeholder-gray-500 focus:outline-none 
              focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 
              transition text-base
            "
          />
        </div>

        {/* Vehicle Grid */}
        {filteredVehicles.length === 0 ? (
          <div className={`${glass} p-12 text-center`}>
            <i className="fas fa-truck text-6xl text-gray-500/50 mb-6"></i>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">
              No vehicles found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or check availability.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => {
              const number =
                vehicle.vehicleNumber || vehicle.number || "Unknown";
              const type = vehicle.type || "—";
              const status = vehicle.status || "Available";

              return (
                <div
                  key={vehicle._id}
                  className={`${glass} p-6 hover:scale-[1.02] hover:shadow-2xl cursor-pointer`}
                  onClick={() => handleSelectVehicle(vehicle)}
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {number}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Type: <span className="font-medium">{type}</span>
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    Status: <span className="font-medium capitalize">{status}</span>
                  </p>

                  <button
                    className="
                      mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 
                      text-white rounded-xl font-medium transition-all shadow-md
                    "
                  >
                    Select Vehicle
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}