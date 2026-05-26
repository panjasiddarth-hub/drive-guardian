// src/components/NotificationBell.jsx (example enhanced version)
import { useState } from 'react';

export default function NotificationBell() {
  const [hasAlert, setHasAlert] = useState(false); // you can use real count from alerts

  return (
    <div 
      className={`notification-bell ${hasAlert ? 'has-alert' : ''}`}
      onClick={() => {
        // You could open a dropdown, modal, or just trigger alert refresh
        console.log("Notification bell clicked");
        // Example: setHasAlert(false); or show dropdown
      }}
    >
      <i className="fas fa-bell"></i>
      {hasAlert && <span className="badge">3</span>}
    </div>
  );
}