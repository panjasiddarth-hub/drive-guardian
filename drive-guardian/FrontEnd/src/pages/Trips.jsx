// src/pages/Trips.jsx
import { useState } from 'react';
import { API_BASE } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from 'react';


// Reusable glass style (consistent with Vehicles/Dashboard)
const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

const token = localStorage.getItem("token");


export default function Trips() {

  const navigate = useNavigate();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    tripName: "",
    startPoint: "",
    destination: "",
    startTime: "",
    duration: 60,
    driver: "",
    vehicle: "",
  });

const [selectedDriverName, setSelectedDriverName] = useState(
    localStorage.getItem("selectedDriverName") || "No driver selected"
  );

  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState(
    localStorage.getItem("selectedVehicleNumber") || "No vehicle selected"
  );

  useEffect(() => {
    setSelectedDriverName(
      localStorage.getItem("selectedDriverName") || "No driver selected"
    );

    setSelectedVehicleNumber(
      localStorage.getItem("selectedVehicleNumber") || "No vehicle selected"
    );
  }, [location]);
  const selectedDriverId = localStorage.getItem("selectedDriverId") || "";
  const selectedVehicleId = localStorage.getItem("selectedVehicleId") || "";

  const handleCloseModal = () => {
    setShowAddModal(false);
  };

const handleAddTrip = async (e) => {
  e.preventDefault();

  if (!formData.startPoint || !formData.destination || !formData.startTime) {
    alert("Starting Point, Destination and Start Time are required.");
    return;
  }

  if (!selectedDriverId) {
    alert("Please select a Driver.");
    return;
  }

  if (!selectedVehicleId) {
    alert("Please select a Vehicle.");
    return;
  }

  try {
    // 🔥 Get coordinates first
    const originCoords = await getCoordinates(formData.startPoint);
    const destinationCoords = await getCoordinates(formData.destination);

    if (!originCoords || !destinationCoords) {
      alert("Could not find coordinates for given locations.");
      return;
    }

    const res = await fetch(`${API_BASE}/api/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
    Authorization: `Bearer ${token}`},
      body: JSON.stringify({
        driver: selectedDriverId,
        vehicle: selectedVehicleId,
        startTime: formData.startTime,
        duration: formData.duration,
        origin: formData.startPoint,
        destination: formData.destination,
        originCoords,
        destinationCoords
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      alert("Trip created successfully!");
      setShowAddModal(false);
      navigate("/trips/scheduled"); // optional but better UX
    } else {
      alert(data.message || "Trip creation failed");
    }

  } catch (err) {
    console.error("Trip creation error:", err);
    alert("Server error while creating trip");
  }
};
  const getCoordinates = async (place) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
    );
    const data = await res.json();

    if (!data.length) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (err) {
    console.error("Geocoding failed:", err);
    return null;
  }
};

  return (
    <div className="space-y-10 md:space-y-14 p-6 md:p-8 lg:p-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="
              flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200
              text-gray-800 rounded-xl font-medium transition-all shadow-sm
            "
          >
            <i className="fas fa-arrow-left"></i>
            Back
          </button>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-900 tracking-tight">
            Trips
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="
            px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white 
            rounded-xl font-medium transition-all shadow-lg hover:shadow-xl
            flex items-center gap-2
          "
        >
          <i className="fas fa-plus"></i>
          Add Trip
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* ... (cards remain unchanged) ... */}
        <div
          className={`${glass} p-6 md:p-8 hover:scale-[1.02] hover:shadow-2xl cursor-pointer`}
          onClick={() => navigate('/trips/ongoing')}
        >
          <img src="/Images/ongoing.png" alt="Ongoing" className="w-full h-48 object-cover rounded-2xl mb-5" />
          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Ongoing Trips</h3>
          <p className="text-gray-600 mb-6">Live and active trips currently running.</p>
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all">
            View Details
          </button>
        </div>

        <div
          className={`${glass} p-6 md:p-8 hover:scale-[1.02] hover:shadow-2xl cursor-pointer`}
          onClick={() => navigate('/trips/completed')}
        >
          <img src="/Images/completed.png" alt="Completed" className="w-full h-48 object-cover rounded-2xl mb-5" />
          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Completed Trips</h3>
          <p className="text-gray-600 mb-6">Trips that finished successfully.</p>
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all">
            View Details
          </button>
        </div>

        <div
          className={`${glass} p-6 md:p-8 hover:scale-[1.02] hover:shadow-2xl cursor-pointer`}
          onClick={() => navigate('/trips/scheduled')}
        >
          <img src="/Images/scheduled.jpg" alt="Scheduled" className="w-full h-48 object-cover rounded-2xl mb-5" />
          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Scheduled Trips</h3>
          <p className="text-gray-600 mb-6">Trips planned for upcoming schedules.</p>
          <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all">
            View Details
          </button>
        </div>
      </div>

      {/* Add Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className={`${glass} p-4 md:p-10 w-full max-w-lg space-y-5 relative`}>

            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-4xl text-gray-600 hover:text-gray-900 transition"
            >
              ×
            </button>

            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Add New Trip
            </h2>

            <form onSubmit={handleAddTrip} className="space-y-4">

              {/* Trip Name */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Trip Name (optional)
                </label>
                <input
                  type="text"
                  value={formData.tripName}
                  onChange={(e) => setFormData({ ...formData, tripName: e.target.value })}
                  className="w-full px-5 py-3 bg-white/40 border border-white/30 rounded-xl text-gray-800"
                  placeholder="Enter trip name"
                />
              </div>

              {/* Starting Point */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Starting Point *
                </label>
                <input
                  type="text"
                  value={formData.startPoint}
                  onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                  required
                  className="w-full px-5 py-3 bg-white/40 border border-white/30 rounded-xl text-gray-800"
                  placeholder="e.g. Hyderabad Railway Station"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Destination *
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                  className="w-full px-5 py-3 bg-white/40 border border-white/30 rounded-xl text-gray-800"
                  placeholder="e.g. Bangalore Airport"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                  className="w-full px-5 py-3 bg-white/40 border border-white/30 rounded-xl text-gray-800"
                />
              </div>

              {/* Driver Selection */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Driver *
                </label>
                <button
                  type="button"
onClick={() => {
  setShowAddModal(false);
  navigate('select-driver');
}}                  className="w-full py-3.5 bg-indigo-600/90 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
                >
                  {selectedDriverName === "No driver selected"
                    ? "Select Driver"
                    : `Selected: ${selectedDriverName}`}
                </button>
              </div>

              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1.5">
                  Vehicle *
                </label>
                <button
                  type="button"
onClick={() => {
  setShowAddModal(false);
  navigate('select-vehicle');
}}                  className="w-full py-3.5 bg-indigo-600/90 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all"
                >
                  {selectedVehicleNumber === "No vehicle selected"
                    ? "Select Vehicle"
                    : `Selected: ${selectedVehicleNumber}`}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-semibold text-lg"
              >
                Add Trip
              </button>

            </form>
          </div>
        </div>
      )}
          <Outlet />
    </div>
  );
}