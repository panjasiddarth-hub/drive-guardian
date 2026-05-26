// src/components/VehicleFormModal.jsx
import { useState, useEffect } from 'react';

export default function VehicleFormModal({ isOpen, onClose, vehicle, mode, onSave }) {
  const [form, setForm] = useState({
    vehicleNumber: '',
    model: '',
    lastServiceDate: '',
    status: 'idle',
    fuel: 0,
  });

  useEffect(() => {
    if (vehicle && mode === 'edit') {
      setForm({
        vehicleNumber: vehicle.vehicleNumber || '',
        model: vehicle.model || '',
        lastServiceDate: vehicle.lastServiceDate
          ? new Date(vehicle.lastServiceDate).toISOString().split('T')[0]
          : '',
        status: vehicle.status || 'idle',
        fuel: vehicle.fuel ?? 0,
      });
    } else {
      setForm({
        vehicleNumber: '',
        model: '',
        lastServiceDate: '',
        status: 'idle',
        fuel: 0,
      });
    }
  }, [vehicle, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave({ ...form, _id: vehicle?._id });
      onClose();
    } catch (err) {
      alert('Failed to save vehicle: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{mode === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Vehicle Number (Number Plate)</label>
              <input
                required
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Model</label>
              <input
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Last Service Date</label>
              <input
                type="date"
                value={form.lastServiceDate}
                onChange={(e) => setForm({ ...form, lastServiceDate: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="stopped">Stopped</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fuel (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.fuel}
                onChange={(e) => setForm({ ...form, fuel: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === 'add' ? 'Add Vehicle' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}