import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useData } from '../store/DataContext';

const Layout: React.FC = () => {
  const { user, authLoading } = useData();

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span>Loading ration shop...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
