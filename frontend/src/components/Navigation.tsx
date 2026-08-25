import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, LogOut, LayoutDashboard, LogIn, UserPlus, Shield, Award, Warehouse, Truck, Store, QrCode } from 'lucide-react';

import { NotificationBell } from './NotificationBell';

export const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState<'online' | 'checking' | 'error'>('checking');

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (res.ok) setHealthStatus('online');
        else setHealthStatus('error');
      })
      .catch(() => setHealthStatus('error'));
  }, []);

  const getRoleNavItems = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'SUPER_ADMIN':
        return [
          { label: 'Users Directory', icon: Shield, path: '/dashboard#users' },
        ];
      case 'FARMER':
        return [
          { label: 'My Batches', icon: Sprout, path: '/dashboard#batches' },
        ];
      case 'QUALITY_OFFICER':
        return [
          { label: 'Inspections', icon: Award, path: '/dashboard#inspections' },
        ];
      case 'WAREHOUSE_MANAGER':
        return [
          { label: 'Storage', icon: Warehouse, path: '/dashboard#storage' },
        ];
      case 'TRANSPORT_MANAGER':
      case 'DRIVER':
        return [
          { label: 'Logistics', icon: Truck, path: '/dashboard#transport' },
        ];
      case 'RETAILER':
        return [
          { label: 'Inventory', icon: Store, path: '/dashboard#retail' },
        ];
      case 'CUSTOMER':
        return [
          { label: 'Verify Provenance', icon: QrCode, path: '/dashboard#verify' },
        ];
      default:
        return [];
    }
  };

  const navItems = getRoleNavItems();

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: '10px', color: 'var(--primary)' }}>
          <Sprout size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>AgriTrace</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Farm-to-Market Traceability Platform</p>
        </div>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link
          to="/"
          className={`btn ${location.pathname === '/' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          Home
        </Link>

        {user ? (
          <>
            <Link
              to="/dashboard"
              className={`btn ${location.pathname === '/dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <LayoutDashboard size={16} /> Dashboard
            </Link>

            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem', color: 'var(--primary)' }}
                >
                  <Icon size={15} /> {item.label}
                </Link>
              );
            })}

            <NotificationBell />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)' }}>
              <span className={`role-badge role-${user.role}`}>{user.role}</span>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <LogIn size={16} /> Sign In
            </Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <UserPlus size={16} /> Get Started
            </Link>
          </>
        )}

        {/* API Health Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthStatus === 'online' ? '#34d399' : healthStatus === 'checking' ? '#f59e0b' : '#f43f5e' }}></span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>API v1</span>
        </div>
      </nav>
    </header>
  );
};
