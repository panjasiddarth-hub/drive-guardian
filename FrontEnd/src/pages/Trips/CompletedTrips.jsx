// src/pages/CompletedTrips.jsx
import { useState, useEffect } from 'react';
import { API_BASE } from "../../utils/api";
import { useNavigate } from 'react-router-dom';

const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

export default function CompletedTrips() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCompletedTrips = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE}/api/trips?status=completed`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // 🔐 Handle expired token
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        if (!res.ok) throw new Error("Failed to load completed trips");

        const data = await res.json();

        // Prevent crash if backend returns non-array
        if (!Array.isArray(data)) {
          throw new Error("Invalid trip data received");
        }

        setTrips(data);
      } catch (err) {
        console.error("Error loading completed trips:", err);
        setError("Failed to load trips. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadCompletedTrips();
  }, [navigate]);

  const handleDeleteTrip = async (id) => {
    if (!window.confirm("Delete this completed trip?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/api/trips/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const data = await res.json();

      if (data.success) {
        setTrips((prev) => prev.filter((t) => t._id !== id));
      } else {
        alert(data.message || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Server error while deleting trip");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`${glass} px-12 py-10 text-center`}>
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-800">
            Loading completed trips...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`${glass} px-12 py-10 text-center`}>
          <i className="fas fa-exclamation-triangle text-6xl text-red-500 mb-6"></i>
          <p className="text-xl font-semibold text-red-700 mb-2">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 p-6 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/trips")}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl"
            >
              ← Back to Trips
            </button>

            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">
              Completed Trips
            </h1>
          </div>

          <span className="px-5 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {trips.length} Completed
          </span>
        </div>

        {trips.length === 0 ? (
          <div className={`${glass} p-12 text-center`}>
            <i className="fas fa-check-circle text-7xl text-green-500/30 mb-6"></i>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No completed trips yet
            </h3>
            <p className="text-gray-600 mb-6">
              Finished trips will appear here once completed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div key={trip._id} className={`${glass} p-6`}>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {trip.name || "Trip Record"}
                </h3>

                <div className="space-y-3 text-gray-700 text-sm">
                  <div className="flex justify-between">
                    <span>From:</span>
                    <span>{trip.origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>To:</span>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver:</span>
                    <span>
                      {trip.driver?.driver ||
                        trip.driver?.name ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vehicle:</span>
                    <span>
                      {trip.vehicle?.vehicleNumber || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => handleDeleteTrip(trip._id)}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}