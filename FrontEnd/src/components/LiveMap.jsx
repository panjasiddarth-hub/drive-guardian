import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiFetch } from '../utils/api';

export default function LiveMap() {
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current);
    }

    const loadVehicles = async () => {
      try {
        const res = await apiFetch('/api/vehicles/live');
        const vehicles = await res.json();
        if (!Array.isArray(vehicles)) return;

        vehicles.forEach((v) => {
          if (!v?.lat || !v?.lng) return;
          const id = v._id;
          const popup = `<strong>${v.vehicleNumber}</strong><br>Speed: ${v.speed} km/h`;
          if (markersRef.current[id]) {
            markersRef.current[id].setLatLng([v.lat, v.lng]).setPopupContent(popup);
          } else {
            markersRef.current[id] = L.marker([v.lat, v.lng])
              .addTo(mapRef.current)
              .bindPopup(popup);
          }
        });
      } catch (err) {
        console.error('LiveMap error:', err);
      }
    };

    loadVehicles();
    const interval = setInterval(loadVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  return <div id="map" style={{ width: '100%', height: '400px' }} />;
}
