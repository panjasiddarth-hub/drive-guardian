import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const alertConfig = {
  Critical: { icon: 'exclamation-circle', severity: 'critical' },
  Warning: { icon: 'exclamation-triangle', severity: 'warning' },
  Info: { icon: 'info-circle', severity: 'info' },
  default: { icon: 'bell', severity: 'info' },
};

export default function AlertsList({ socket }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    apiFetch('/api/alerts/recent?limit=10')
      .then(res => res.json())
      .then(data => {
        if (data.success) setAlerts(data.data || []);
      })
      .catch(console.error);

    if (socket) {
      socket.on('new-alert', (alert) => {
        setAlerts(prev => {
          if (prev.some(a => a._id === alert._id)) return prev;
          return [alert, ...prev].slice(0, 10);
        });
      });
    }

    return () => {
      socket?.off('new-alert');
    };
  }, [socket]);

  return (
    <div className="alerts-container">
      <div className="section-header">
        <h3>Recent Alerts</h3>
        <span className="alerts-count">{alerts.length} Active</span>
      </div>
      <div className="alerts-list">
        {alerts.map(alert => {
          const cfg = alertConfig[alert.type] || alertConfig.default;
          return (
            <div key={alert._id} className={`alert-item ${cfg.severity}`}>
              <div className="alert-icon">
                <i className={`fas fa-${cfg.icon}`}></i>
              </div>
              <div className="alert-content">
                <h4>{alert.title}</h4>
                <p>{alert.message} • {alert.vehicle} ({alert.driver})</p>
                <span className="alert-time">just now</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
