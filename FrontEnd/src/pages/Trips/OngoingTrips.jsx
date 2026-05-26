// src/pages/OngoingTrips.jsx
import { useState, useEffect } from 'react';
import { API_BASE } from "../../utils/api";
import { useNavigate } from 'react-router-dom';

const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

export default function OngoingTrips() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOngoingTrips = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const res = await fetch(
          `${API_BASE}/api/trips?status=ongoing`,
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

        if (!res.ok) throw new Error("Failed to load ongoing trips");

        const data = await res.json();

        // Prevent crash if backend sends invalid data
        if (!Array.isArray(data)) {
          throw new Error("Invalid trip data received");
        }

        setTrips(data);
      } catch (err) {
        console.error("Error loading ongoing trips:", err);
        setError("Failed to load ongoing trips. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadOngoingTrips();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className={`${glass} px-12 py-10 text-center`}>
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          </div>
          <p className="text-lg font-semibold text-gray-800">
            Loading ongoing trips...
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
            className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/trips')}
              className="
                flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200
                text-gray-800 rounded-xl font-medium transition-all shadow-sm
              "
            >
              <i className="fas fa-arrow-left"></i>
              Back to Trips
            </button>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 tracking-tight">
              Ongoing Trips
            </h1>
          </div>

          <span className="px-5 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {trips.length} Active Now
          </span>
        </div>

        {trips.length === 0 ? (
          <div className={`${glass} p-12 text-center`}>
            <i className="fas fa-truck-moving text-7xl text-green-500/30 mb-6"></i>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              No ongoing trips right now
            </h3>
            <p className="text-gray-600 mb-6">
              Active/live trips will appear here once they start.
            </p>
            <button
              onClick={() => navigate('/trips')}
              className="
                px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white 
                rounded-xl font-medium transition-all shadow-lg
              "
            >
              Back to Trips
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <div
                key={trip._id}
                className={`${glass} p-6 md:p-8 hover:scale-[1.02] hover:shadow-2xl`}
              >
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4">
                  {trip.name || 'Live Trip'}
                </h3>

                <div className="space-y-3 text-gray-700 text-sm md:text-base">
                  <div className="flex justify-between">
                    <span className="font-medium">From:</span>
                    <span>{trip.origin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">To:</span>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Driver:</span>
                    <span>
                      {trip.driver?.driver ||
                        trip.driver?.name ||
                        trip.driver?.driverName ||
                        'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Vehicle:</span>
                    <span>
                      {trip.vehicle?.vehicleNumber ||
                        trip.vehicle ||
                        'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Status:</span>
                    <span className="inline-flex px-4 py-1.5 bg-green-200 text-green-800 rounded-full text-sm font-medium">
                      Ongoing
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}