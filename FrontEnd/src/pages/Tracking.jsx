// src/pages/Tracking.jsx
import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotatedmarker';

delete L.Icon.Default.prototype._getIconUrl;  // disable auto image detection
L.Icon.Default.mergeOptions({
  iconUrl: '',          // empty → no image
  iconRetinaUrl: '',
  shadowUrl: '',
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  shadowSize: [0, 0],
});

const token = localStorage.getItem("token");

// Glass style (same as rest of app)
const glass = `
  bg-gray-600/75 border border-gray-400
  shadow-2xl shadow-black/40
  rounded-2xl overflow-hidden
  transition-all duration-300
`;

export default function Tracking() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const routesRef = useRef({});
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
// Helper to remove ALL markers (your tracked ones + any orphans)

useEffect(() => {
  if (!token) {
    navigate("/login");
  }
}, [token, navigate]);
const clearAllMarkers = () => {
  if (!mapInstance.current) return;

  // Remove tracked markers (your vehicles)
  Object.values(markersRef.current).forEach(marker => {
    if (marker) mapInstance.current.removeLayer(marker);
  });
  markersRef.current = {}; // reset tracking object

  // Also remove any orphan markers Leaflet still knows about
  mapInstance.current.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      mapInstance.current.removeLayer(layer);
    }
  });
};
  // Initialize Leaflet map (full screen)
  useEffect(() => {
    if (!mapRef.current) return;

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([17.3603, 78.4744], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Cleanup on unmount
    return () => {
      clearAllMarkers();
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  // Socket.io real-time updates
useEffect(() => {
const socket = io(API_BASE, {
  auth: {
    token: token
  }
});
  socket.on('connect', () => console.log('Socket connected'));

  socket.on('vehicle-update', (vehicle) => {
    updateMarker(vehicle);

    setVehicles((prev) => {
      const exists = prev.find(v => v._id === vehicle._id);
      if (exists) {
        return prev.map(v =>
          v._id === vehicle._id ? { ...v, ...vehicle } : v
        );
      }
      return [...prev, vehicle];
    });
  });

  socket.on('disconnect', () => console.log('Socket disconnected'));

  return () => socket.disconnect();
}, []);

  // Update/create marker with rotation
const updateMarker = (vehicle) => {
  if (!mapInstance.current) return;

  const { _id, lat, lng, status, heading = 0 } = vehicle;

  if (typeof lat !== 'number' || typeof lng !== 'number') return;

  const color =
    status === 'running' ? '#4CAF50' :
    status === 'idle'   ? '#FFC107' :
    '#F44336';

  let marker = markersRef.current[_id];

  const icon = L.divIcon({
    className: 'vehicle-marker',
    html: `<div style="background:${color}; border:3px solid white; border-radius:50%; width:24px; height:24px; box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  if (!marker) {
    // Only create one marker per _id
    marker = L.marker([lat, lng], {
      icon: icon,
      rotationAngle: heading || 0,
      rotationOrigin: "center center",
      riseOnHover: true,
    }).addTo(mapInstance.current);

    marker.on('click', () => setSelectedVehicle(vehicle));
    markersRef.current[_id] = marker;
  } else {
    // Reuse existing marker; update only
    marker.setLatLng([lat, lng]);
    marker.setIcon(icon);
    marker.setRotationAngle(heading || 0);
  }
};


  // Initial vehicles load
  useEffect(() => {
    const loadInitialVehicles = async () => {
      try {
const res = await fetch(`${API_BASE}/api/vehicles/live`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

if (res.status === 401) {
  localStorage.removeItem("token");
  navigate("/login");
  return;
}        const data = await res.json();
        if (!Array.isArray(data)) return;
        clearAllMarkers();
        setVehicles(data);
        data.forEach(v => updateMarker(v));
      } catch (err) {
        console.error('Failed to load initial vehicles:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialVehicles();
  }, []);

  useEffect(() => {
  if (!selectedVehicle || !mapInstance.current) return;

  const { lat, lng } = selectedVehicle;
  if (typeof lat === "number" && typeof lng === "number") {
    mapInstance.current.setView([lat, lng], 15);
  }
}, [selectedVehicle]);
  // Filtered vehicles (for future use if you want to show list)
  const filteredVehicles = vehicles.filter(v => {
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      (v.vehicleNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Slim Header */}
      <header className="bg-gradient-to-r from-indigo-700 via-blue-700 to-purple-700 shadow-lg z-50">
        <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🚚
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              TrackSecure
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-white font-medium transition-all backdrop-blur-sm"
            >
              <i className="fas fa-home"></i>
              Home
            </button>
            <button className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center text-xl hover:bg-white/25 transition-all backdrop-blur-sm">
              👤
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen Map */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Floating Filter Panel (top-left) */}
      <div className={`${glass} absolute top-20 left-6 w-80 p-6 z-[1000] text-white`}>
        <h3 className="text-xl font-semibold mb-5">Filters</h3>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Filter by Vehicle</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:border-indigo-400 transition text-sm">
              <option value="all">All Vehicles</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Filter by Driver</label>
            <select className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:border-indigo-400 transition text-sm">
              <option value="all">All Drivers</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white focus:outline-none focus:border-indigo-400 transition text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Active</option>
              <option value="idle">Idle</option>
              <option value="stopped">Stopped</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">Search Vehicle Number</label>
            <input
              type="text"
              placeholder="Enter vehicle number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 transition text-sm"
            />
          </div>
        </div>
      </div>

      {/* Floating Vehicle Detail Panel (right side) */}
      {selectedVehicle && (
        <div className={`${glass} absolute top-20 right-6 w-96 p-6 z-[1000] text-white transition-all duration-300`}>
          <button
            onClick={() => setSelectedVehicle(null)}
            className="absolute top-4 right-4 text-3xl text-white/70 hover:text-white transition"
          >
            ×
          </button>

          <h2 className="text-2xl font-bold mb-6 pr-10">
            {selectedVehicle.vehicleNumber || 'Vehicle'}
          </h2>

          <div className="space-y-4 text-gray-200 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-white/90">Status</span>
              <span className={`px-4 py-1 rounded-full text-xs font-medium ${
                selectedVehicle.status === 'running' ? 'bg-green-500/30 text-green-300' :
                selectedVehicle.status === 'idle' ? 'bg-yellow-500/30 text-yellow-300' :
                'bg-red-500/30 text-red-300'
              }`}>
                {selectedVehicle.status?.toUpperCase() || 'Unknown'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-white/90">Driver</span>
              <span>{selectedVehicle.driverName || 'N/A'}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-white/90">Speed</span>
              <span>{selectedVehicle.speed || 0} km/h</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-white/90">ETA</span>
              <span>{selectedVehicle.eta || '--'} min</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium text-white/90">Fuel</span>
              <span>{selectedVehicle.fuel || '--'}%</span>
            </div>
          </div>

          <button className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md">
            Show Trip Route
          </button>
        </div>
      )}

      {/* Legend (bottom-left) */}
      <div className={`${glass} absolute bottom-8 left-6 p-5 z-[1000]`}>
        <h4 className="text-base font-semibold text-white mb-3">Vehicle Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span className="text-white/90">Active (Moving)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500 border-2 border-white shadow"></div>
            <span className="text-white/90">Idle (Stopped)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span className="text-white/90">Offline</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${glass} px-12 py-10 text-center`}>
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <p className="text-lg font-semibold text-white">Loading live fleet data...</p>
          </div>
        </div>
      )}
    </div>
  );
}