// src/pages/Drivers.jsx
import { useState, useEffect } from "react";

// Consistent premium glass style (matching Vehicles page)
const glass = `
  backdrop-blur-xl bg-white/8 border border-white/15 
  shadow-[0_8px_32px_rgba(31,38,135,0.12)] rounded-2xl 
  overflow-hidden transition-all duration-400 ease-out
`;

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);

  // Form state (used for both add & edit)
  const [formData, setFormData] = useState({
    driver: "",
    phone: "",
    rating: 4.5,
    trips: 0,
    violations: 0,
    status: "available",
    performanceScore: 80,
    photo: "https://randomuser.me/api/portraits/men/45.jpg", // placeholder
  });

  const BASE_URL = `${API_BASE}/api/drivers`;
  const token = localStorage.getItem("token");

  // Fetch drivers
useEffect(() => {
  if (!token) {
    window.location.href = "/auth";
    return;
  }

  const fetchDrivers = async () => {
    try {
      setLoading(true);

      const res = await fetch(BASE_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 🔐 Handle expired token
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/auth";
        return;
      }

      if (!res.ok) throw new Error("Failed to load drivers");

      const data = await res.json();
      setDrivers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchDrivers();
}, [token]);

  // Submit (add or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.driver.trim() || !formData.phone.trim()) {
      alert("Driver name and phone number are required.");
      return;
    }

    const method = editDriver ? "PUT" : "POST";
    const url = editDriver ? `${BASE_URL}/${editDriver._id}` : BASE_URL;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" ,Authorization: `Bearer ${token}`},
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Operation failed");

      if (editDriver) {
        setDrivers((prev) =>
          prev.map((d) => (d._id === editDriver._id ? data.driver : d))
        );
      } else {
        setDrivers((prev) => [...prev, data.driver]);
      }

      setShowAddModal(false);
      setEditDriver(null);
      resetForm();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      driver: "",
      phone: "",
      rating: 4.5,
      trips: 0,
      violations: 0,
      status: "available",
      performanceScore: 80,
      photo: "https://randomuser.me/api/portraits/men/45.jpg",
    });
  };

  // Delete driver
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;

    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
      if (!res.ok) throw new Error("Delete failed");
      setDrivers((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Open edit modal
  const handleEdit = (driver) => {
    setEditDriver(driver);
    setFormData({ ...driver });
    setShowAddModal(true);
  };

  // Open add modal
  const handleAdd = () => {
    setEditDriver(null);
    resetForm();
    setShowAddModal(true);
  };

  // Filter & sort
  const filteredDrivers = drivers
    .filter((d) => d.driver.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "trips") return b.trips - a.trips;
      return a.driver.localeCompare(b.driver);
    });

  // Status & performance helpers
  const getStatusBadge = (status) => {
    const styles = {
      Active: "bg-green-100 text-green-800 border-green-200",
      "On Trip": "bg-blue-100 text-blue-800 border-blue-200",
      Offline: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return styles[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };
  const getStatusColor = (status) => {
  const colors = {
    available: "bg-green-500",
    reserved: "bg-yellow-500",
    "on-trip": "bg-blue-500",
    "off-duty": "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
};

  const getPerformanceColor = (score) => {
    if (score >= 85) return "text-green-700";
    if (score >= 70) return "text-amber-700";
    return "text-red-700";
  };

  return (
    <div className="min-h-screen p-6 md:p-8 lg:p-10 space-y-10 md:space-y-14 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 to-blue-700 bg-clip-text text-transparent tracking-tight">
            Drivers Management
          </h1>
          <p className="mt-2 text-gray-700 font-medium">
            Monitor performance, safety & availability
          </p>
        </div>

        <button
          onClick={handleAdd}
          className="
            group px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600
            hover:from-indigo-700 hover:to-blue-700 text-white font-semibold
            rounded-xl shadow-lg hover:shadow-xl transition-all duration-300
            transform hover:-translate-y-1 active:scale-95 flex items-center gap-2.5
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Driver
        </button>
      </header>

      {/* Search + Sort + Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Search */}
        <div className={`${glass} flex-1 max-w-md`}>
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full px-5 py-4 bg-transparent text-gray-900 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-400/30 rounded-xl
            "
          />
        </div>

        {/* Sort */}
        <div className="flex flex-wrap gap-3">
          {["name", "rating", "trips"].map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-medium transition-all
                ${sortBy === key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white/10 hover:bg-white/20 text-gray-700 border border-white/20"}
              `}
            >
              Sort by {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading / Error / Empty / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="animate-spin w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full mb-6"></div>
          <p className="text-lg font-medium">Loading drivers...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-600">
          <i className="fas fa-exclamation-triangle text-6xl mb-6"></i>
          <p className="text-xl font-semibold">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-lg"
          >
            Retry
          </button>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className={`${glass} p-16 text-center text-gray-600`}>
          <i className="fas fa-users-slash text-7xl opacity-50 mb-6"></i>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">No drivers found</h3>
          <p className="text-base mb-8">Add your first driver to start managing your team.</p>
          <button
            onClick={handleAdd}
            className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-lg hover:shadow-xl"
          >
            + Add Driver
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => (
            <div
              key={driver._id}
              className={`
                ${glass} p-6 hover:scale-[1.02] hover:shadow-xl group transition-all duration-300
                ring-1 ring-offset-2 ring-transparent hover:ring-2 hover:ring-indigo-300/40
              `}
            >
              {/* Header – photo + name + phone */}
              <div className="flex items-center gap-4 mb-5">
                <div className="relative">
                  <img
                    src={driver.photo}
                    alt={driver.driver}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-200/40 shadow-md"
                  />
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(driver.status)}`}
                  ></span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-950">{driver.driver}</h3>
                  <p className="text-sm text-gray-600">{driver.phone}</p>
                </div>
              </div>

              {/* Status & Performance */}
              <div className="flex justify-between items-center mb-6">
                <span className={`px-4 py-1.5 rounded-full text-xs font-semibold ${getStatusBadge(driver.status)}`}>
                  {driver.status}
                </span>

                <div className="text-right">
                  <div className="text-xs text-gray-500">Performance</div>
                  <div className={`text-xl font-bold ${getPerformanceColor(driver.performanceScore)}`}>
                    {driver.performanceScore}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-600">Rating</div>
                  <div className="text-lg font-bold text-amber-600">{driver.rating} ★</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-600">Trips</div>
                  <div className="text-lg font-bold text-indigo-700">{driver.trips}</div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <div className="text-xs text-gray-600">Violations</div>
                  <div className="text-lg font-bold text-red-600">{driver.violations}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => alert("View details coming soon...")}
                  className="
                    flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white
                    rounded-lg text-sm font-medium transition-all shadow-sm
                    hover:shadow-md hover:-translate-y-0.5 active:scale-95
                  "
                >
                  View
                </button>
                <button
                  onClick={() => handleEdit(driver)}
                  className="
                    flex-1 py-2.5 bg-gray-600 hover:bg-gray-700 text-white
                    rounded-lg text-sm font-medium transition-all shadow-sm
                    hover:shadow-md hover:-translate-y-0.5 active:scale-95
                  "
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(driver._id)}
                  className="
                    flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white
                    rounded-lg text-sm font-medium transition-all shadow-sm
                    hover:shadow-md hover:-translate-y-0.5 active:scale-95
                  "
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Add / Edit Modal ──────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`
            ${glass} w-full max-w-lg md:max-w-xl p-8 md:p-10 space-y-8
            bg-white/75 backdrop-blur-2xl border border-gray-200/40 shadow-2xl
          `}>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                {editDriver ? "Edit Driver" : "Add New Driver"}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditDriver(null);
                }}
                className="text-4xl text-gray-500 hover:text-gray-800 transition hover:scale-110"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="relative">
                  <input
                    type="text"
                    value={formData.driver}
                    onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    className="
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    "
                    placeholder=" "
                    required
                  />
                  <label
                    className="
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                    "
                  >
                    Full Name *
                  </label>
                </div>

                {/* Phone */}
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    "
                    placeholder=" "
                    required
                  />
                  <label
                    className="
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                    "
                  >
                    Phone Number *
                  </label>
                </div>

                {/* Status */}
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 focus:outline-none focus:border-indigo-500
                      focus:ring-4 focus:ring-indigo-200/30 transition-all duration-300
                    "
                  >
                   <option value="available">Available</option>
  <option value="reserved">Reserved</option>
  <option value="on-trip">On trip</option>
  <option value="off-duty">Off duty</option>
                  </select>
                  <label
                    className="
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs
                    "
                  >
                    Status
                  </label>
                  <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                </div>

                {/* Performance Score */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.performanceScore}
                    onChange={(e) => setFormData({ ...formData, performanceScore: Number(e.target.value) })}
                    className="
                      peer w-full px-5 py-4 bg-white/60 border border-gray-300/50 rounded-xl
                      text-gray-900 placeholder-transparent focus:outline-none
                      focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200/30
                      transition-all duration-300
                    "
                    placeholder=" "
                  />
                  <label
                    className="
                      absolute left-4 px-2 -top-2.5 bg-white border border-gray-200 rounded-full
                      text-sm font-medium text-gray-600 transition-all duration-300
                      peer-focus:text-indigo-600 peer-focus:text-xs peer-placeholder-shown:top-4 peer-placeholder-shown:text-base
                    "
                  >
                    Performance Score (0–100)
                  </label>
                </div>
              </div>

              {/* Buttons */}
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
                  {editDriver ? "Save Changes" : "Add Driver"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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