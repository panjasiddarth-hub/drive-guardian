// src/components/VehicleTable.jsx
export default function VehicleTable({
  vehicles,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddClick,
  onEdit,
  onDelete,
  onViewMap,
  onViewTrips,
}) {
  return (
    <div className="table-section">
      <div className="table-header">
        <div className="table-header-left">
          <h2>Vehicle Fleet</h2>
          <div className="table-header-sub">Search, filter, and manage vehicles</div>
        </div>
        <div className="table-header-right">
          <input
            type="text"
            className="search-input"
            placeholder="Search by vehicle, model, driver, or location..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="stopped">Stopped</option>
          </select>
          <button className="btn-small-primary" onClick={onAddClick}>
            + Add Vehicle
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Vehicle Number</th>
            <th>Model</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                No vehicles found.
              </td>
            </tr>
          ) : (
            vehicles.map((v) => (
              <tr key={v._id}>
                <td>
                  <strong>{v.vehicleNumber}</strong>
                </td>
                <td>{v.model}</td>
                <td>
                  <span className={`status-badge status-${v.status}`}>
                    {v.status?.charAt(0).toUpperCase() + v.status?.slice(1)}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={() => onEdit(v)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => onDelete(v._id)}>
                      Delete
                    </button>
                    {/* Optional: add these if you want map & trips directly from table */}
                    {/* <button className="btn btn-outline" onClick={() => onViewMap(v)}>Map</button> */}
                    {/* <button className="btn btn-outline" onClick={() => onViewTrips(v)}>Trips</button> */}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}