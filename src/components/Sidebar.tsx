import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, History, Store } from 'lucide-react';

const Sidebar: React.FC = () => {
    const linkStyle = ({ isActive }: { isActive: boolean }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        color: isActive ? 'var(--accent-neon)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
        textDecoration: 'none',
        transition: 'var(--transition)',
        fontWeight: isActive ? 600 : 500,
        marginBottom: '0.5rem'
    });

    return (
        <aside className="glass-panel" style={{
            width: '260px',
            height: 'calc(100vh - 2rem)',
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
                <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'var(--accent-neon)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#0f172a'
                }}>
                    <Store size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Ration Manager</h1>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Govt. Shop Panel</p>
                </div>
            </div>

            <nav style={{ flex: 1 }}>
                <NavLink to="/entry" style={linkStyle}>
                    <LayoutDashboard size={20} /> Data Entry
                </NavLink>
                <NavLink to="/daily" style={linkStyle}>
                    <Calendar size={20} /> Daily Report
                </NavLink>
                <NavLink to="/monthly" style={linkStyle}>
                    <Calendar size={20} /> Monthly Report
                </NavLink>
                <NavLink to="/history" style={linkStyle}>
                    <History size={20} /> Buyer History
                </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--panel-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                System v1.0 <br />
                Offline Mode Active
            </div>
        </aside>
    );
};

export default Sidebar;
