// src/pages/Vehicles.jsx
import { useState, useEffect } from 'react';

// Unified premium glass style used across the app
const glass = `
  backdrop-blur-xl bg-white/8 border border-white/15 
  shadow-[0_8px_32px_rgba(31,38,135,0.12)] rounded-2xl 
  overflow-hidden transition-all duration-400 ease-out
`;

const token = localStorage.getItem("token");
export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal control
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    model: "",
    status: "idle",
    fuel: 50,
  });

  const BASE_URL = `${API_BASE}/api/vehicles`;

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const res = await fetch(BASE_URL,{headers: {
    Authorization: `Bearer ${token}`
      }});
        if (!res.ok) throw new Error("Failed to load vehicles");
        const data = await res.json();
        setVehicles(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  // Add or Update vehicle
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicleNumber.trim() || !formData.model.trim()) {
      alert("Vehicle Number and Model are required.");
      return;
    }

    const method = editVehicle ? "PUT" : "POST";
    const url = editVehicle ? `${BASE_URL}/${editVehicle._id}` : BASE_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" ,
  Authorization: `Bearer ${localStorage.getItem("token")}`},
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Operation failed");

      if (editVehicle) {
        setVehicles((prev) =>
          prev.map((v) => (v._id === editVehicle._id ? data.vehicle : v))
        );
      } else {
        setVehicles((prev) => [...prev, data.vehicle]);
      }

      setShowModal(false);
      setEditVehicle(null);
      setFormData({ vehicleNumber: "", model: "", status: "idle", fuel: 50 });
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete vehicle
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Open edit modal
  const handleEdit = (vehicle) => {
    setEditVehicle(vehicle);
    setFormData({
      vehicleNumber: vehicle.vehicleNumber,
      model: vehicle.model,
      status: vehicle.status,
      fuel: vehicle.fuel,
    });
    setShowModal(true);
  };

  // Open add modal
  const handleAdd = () => {
    setEditVehicle(null);
    setFormData({ vehicleNumber: "", model: "", status: "idle", fuel: 50 });
    setShowModal(true);
  };

  const lastUpdated = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 space-y-10 md:space-y-14 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent tracking-tight">
            Vehicle Fleet
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-gray-700">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100/80 text-indigo-800 rounded-full text-sm font-semibold shadow-sm">
              <span className="text-lg">{vehicles.length}</span>
              Vehicles
            </span>
            <span className="text-sm text-gray-500">
              Last updated {lastUpdated}
            </span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="
            group px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600
            hover:from-indigo-700 hover:to-blue-700
            text-white font-semibold rounded-xl shadow-lg hover:shadow-xl
            transition-all duration-300 transform hover:-translate-y-1 active:scale-95
            flex items-center gap-2.5 text-base
          "
        >
          <i className="fas fa-plus-circle"></i>
          Add Vehicle
        </button>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
        {[
          { title: "Total", value: vehicles.length, color: "indigo" },
          {
            title: "Running",
            value: vehicles.filter((v) => v.status === "running").length,
            color: "green",
          },
          {
            title: "Idle",
            value: vehicles.filter((v) => v.status === "idle").length,
            color: "amber",
          },
          {
            title: "Stopped",
            value: vehicles.filter((v) => v.status === "stopped").length,
            color: "red",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`
              ${glass} p-6 flex flex-col items-center text-center
              hover:scale-[1.03] hover:shadow-xl transition-all duration-400
              ring-1 ring-offset-2 ring-transparent hover:ring-2
              ${stat.color === "indigo" ? "hover:ring-indigo-400/40" :
                stat.color === "green" ? "hover:ring-green-400/40" :
                stat.color === "amber" ? "hover:ring-amber-400/40" :
                "hover:ring-red-400/40"}
            `}
          >
            <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
              {stat.title}
            </p>
            <p
              className={`
                text-4xl md:text-5xl font-extrabold
                ${stat.color === "indigo" ? "text-indigo-700" :
                  stat.color === "green" ? "text-green-600" :
                  stat.color === "amber" ? "text-amber-600" :
                  "text-red-600"}
              `}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Vehicles Table */}
      <div className={`${glass} overflow-hidden`}>
        {loading ? (
          <div className="p-20 text-center text-gray-500">
            <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-lg font-medium">Loading vehicles...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">
            <i className="fas fa-exclamation-triangle text-5xl mb-4"></i>
            <p className="text-xl font-semibold">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-20 text-center text-gray-600">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner">
              <i className="fas fa-truck text-5xl text-gray-400/60"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No vehicles yet</h3>
            <p className="text-base mb-8 max-w-md mx-auto">
              Start managing your fleet by adding your first vehicle.
            </p>
            <button
              onClick={handleAdd}
              className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
            >
              + Add First Vehicle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gradient-to-r from-gray-900/5 to-gray-800/5 backdrop-blur-md sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle No.</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Model</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fuel</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Driver</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/10">
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle._id}
                    className="group hover:bg-white/5 transition-colors duration-200"
                  >
                    <td className="px-8 py-5 font-semibold text-gray-900">
                      {vehicle.vehicleNumber}
                    </td>
                    <td className="px-8 py-5 text-gray-800 font-medium">
                      {vehicle.model}
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`
                          inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold
                          ${vehicle.status === "running"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : vehicle.status === "idle"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-red-100 text-red-800 border border-red-200"}
                        `}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></span>
                        {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-40 h-3 bg-gray-200/40 rounded-full overflow-hidden ring-1 ring-gray-200/50">
                          <div
                            className={`h-full transition-all duration-1000 ease-out ${
                              vehicle.fuel > 60
                                ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                : vehicle.fuel > 30
                                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                                : "bg-gradient-to-r from-red-400 to-rose-500"
                            }`}
                            style={{ width: `${vehicle.fuel}%` }}
                          />
                        </div>
                        <span className="font-bold text-gray-900">{vehicle.fuel}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-800 font-medium">
                      {vehicle.driver ? (
                        <span className="flex items-center gap-2">
                          <i className="fas fa-user-circle text-indigo-500 text-xl"></i>
                          {vehicle.driver.driver || "Assigned"}
                        </span>
                      ) : (
                        <span className="text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="
                            px-5 py-2 bg-blue-600/90 hover:bg-blue-700 text-white
                            rounded-lg text-sm font-medium transition-all shadow-sm
                            hover:shadow-md hover:-translate-y-0.5 active:scale-95
                          "
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle._id)}
                          className="
                            px-5 py-2 bg-red-600/90 hover:bg-red-700 text-white
                            rounded-lg text-sm font-medium transition-all shadow-sm
                            hover:shadow-md hover:-translate-y-0.5 active:scale-95
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`
            ${glass} w-full max-w-lg md:max-w-xl p-8 md:p-10 space-y-8
            bg-white/70 backdrop-blur-2xl border border-gray-200/40 shadow-2xl
          `}>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                {editVehicle ? "Edit Vehicle" : "Add New Vehicle"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-4xl text-gray-500 hover:text-gray-800 transition-transform hover:scale-110"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Number */}
                <div className="relative">
                  <input
                    id="vehicleNumber"
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    className={`
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    `}
                    placeholder=" "
                    required
                  />
                  <label
                    htmlFor="vehicleNumber"
                    className={`
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:text-base peer-placeholder-shown:top-4
                    `}
                  >
                    Vehicle Number *
                  </label>
                </div>

                {/* Model */}
                <div className="relative">
                  <input
                    id="model"
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className={`
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    `}
                    placeholder=" "
                    required
                  />
                  <label
                    htmlFor="model"
                    className={`
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:text-base peer-placeholder-shown:top-4
                    `}
                  >
                    Model *
                  </label>
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 focus:outline-none focus:border-indigo-500
                      focus:ring-4 focus:ring-indigo-200/30 transition-all duration-300
                    `}
                  >
                    <option value="running">Running</option>
                    <option value="idle">Idle</option>
                    <option value="stopped">Stopped</option>
                  </select>
                  <label
                    htmlFor="status"
                    className={`
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs
                    `}
                  >
                    Status
                  </label>
                  <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                </div>

                {/* Fuel */}
                <div className="relative">
                  <input
                    id="fuel"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.fuel}
                    onChange={(e) => setFormData({ ...formData, fuel: Number(e.target.value) })}
                    className={`
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    `}
                    placeholder=" "
                  />
                  <label
                    htmlFor="fuel"
                    className={`
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:text-base peer-placeholder-shown:top-4
                    `}
                  >
                    Fuel Level (%)
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="
                    flex-1 py-4 bg-gradient-to-r from-indigo-600 to-blue-600
                    hover:from-indigo-700 hover:to-blue-700 text-white font-semibold
                    rounded-xl shadow-lg hover:shadow-xl transition-all duration-300
                    transform hover:-translate-y-1 active:scale-95
                  "
                >
                  {editVehicle ? "Save Changes" : "Add Vehicle"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="
                    flex-1 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold
                    rounded-xl shadow-md hover:shadow-lg transition-all duration-300
                    transform hover:-translate-y-1 active:scale-95
                  "
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}