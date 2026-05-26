import NotificationBell from './NotificationBell';

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Dashboard Overview</h1>
        <p className="header-subtitle">Welcome back, manage your fleet efficiently</p>
      </div>

      <div className="header-right">
        <NotificationBell />
        <div className="user-profile">
          <img src="https://via.placeholder.com/40" alt="User" />
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-role">Fleet Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
}