import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  FileText,
  History,
  LogOut,
  Package,
  ScrollText,
  Store,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useData } from '../store/DataContext';

const ownerLinks = [
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/issue', label: 'Issue Ration', icon: ScrollText },
  { to: '/cards', label: 'Card Holders', icon: Users },
  { to: '/monthly', label: 'Monthly Report', icon: FileText },
  { to: '/history', label: 'Card History', icon: History },
];

const workerLinks = [
  { to: '/distribution', label: 'Distribution', icon: ClipboardCheck },
];

const Sidebar: React.FC = () => {
  const { user, logout, isOnline } = useData();
  const navigate = useNavigate();
  const links = user?.role === 'owner' ? ownerLinks : workerLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Store size={22} />
        </div>
        <div>
          <h1>Ration Manager</h1>
          <p>{user?.role === 'owner' ? 'Shop Owner' : 'Worker'} Panel</p>
        </div>
      </div>

      <nav className="nav-list">
        {links.map(link => {
          const Icon = link.icon;
          return (
            <NavLink key={link.to} to={link.to} className="nav-link">
              <Icon size={19} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="session-card">
          <div>
            <span className="session-label">Signed in as</span>
            <strong>{user?.username}</strong>
          </div>
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          </span>
        </div>
        <button className="btn-secondary full-width" type="button" onClick={handleLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
