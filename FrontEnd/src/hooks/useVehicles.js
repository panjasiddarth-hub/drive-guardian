import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export default function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addVehicle = async (vehicle) => {
    const res = await apiFetch('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) throw new Error('Failed to add vehicle');
    const newVehicle = await res.json();
    setVehicles((prev) => [...prev, newVehicle]);
  };

  const updateVehicle = async (vehicle) => {
    const res = await apiFetch(`/api/vehicles/${vehicle._id}`, {
      method: 'PUT',
      body: JSON.stringify(vehicle),
    });
    if (!res.ok) throw new Error('Failed to update vehicle');
    const updated = await res.json();
    setVehicles((prev) =>
      prev.map((v) => (v._id === updated._id ? updated : v))
    );
  };

  const deleteVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    const res = await apiFetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    setVehicles((prev) => prev.filter((v) => v._id !== id));
  };

  return { vehicles, loading, error, fetchVehicles, addVehicle, updateVehicle, deleteVehicle };
}
