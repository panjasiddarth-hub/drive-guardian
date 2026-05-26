// src/pages/Alerts.jsx
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";

const glass = `
  backdrop-blur-xl bg-white/10 border border-white/20 
  shadow-2xl shadow-black/10 rounded-3xl overflow-hidden 
  transition-all duration-500
`;

const typeStyles = {
  Critical: { badge: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500" },
  Warning:  { badge: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  Info:     { badge: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500" },
};

const severityStyles = {
  High:   "bg-red-100 text-red-800",
  Medium: "bg-amber-100 text-amber-800",
  Low:    "bg-green-100 text-green-800",
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (search) params.append("search", search);

      const res = await apiFetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data = await res.json();
      setAlerts(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleResolve = async (id) => {
    try {
      const res = await apiFetch(`/api/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Resolved" }),
      });
      if (!res.ok) throw new Error("Failed to resolve");
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: "Resolved" } : a))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      const res = await apiFetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 space-y-8 bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      <header>
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
          Alerts
        </h1>
        <p className="mt-2 text-gray-600">Monitor and manage all fleet alerts</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[200px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="Unresolved">Unresolved</option>
          <option value="Resolved">Resolved</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>
        {pagination.total !== undefined && (
          <span className="ml-auto text-sm text-gray-500">{pagination.total} total</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className={`${glass} p-10 text-center text-red-600`}>
          <p className="text-lg font-semibold">{error}</p>
          <button onClick={fetchAlerts} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className={`${glass} p-16 text-center text-gray-500`}>
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-xl font-semibold">No alerts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const ts = typeStyles[alert.type] || typeStyles.Info;
            const ss = severityStyles[alert.severity] || severityStyles.Low;
            return (
              <div
                key={alert._id}
                className={`${glass} p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-white/60`}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ts.dot}`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-base">{alert.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ts.badge}`}>
                      {alert.type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ss}`}>
                      {alert.severity}
                    </span>
                    {alert.status === "Resolved" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    {alert.vehicle && <span>Vehicle: {alert.vehicle}</span>}
                    {alert.driver && <span>Driver: {alert.driver}</span>}
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {alert.status === "Unresolved" && (
                    <button
                      onClick={() => handleResolve(alert._id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(alert._id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page === pagination.pages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
