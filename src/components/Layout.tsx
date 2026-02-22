import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', marginLeft: '260px' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
