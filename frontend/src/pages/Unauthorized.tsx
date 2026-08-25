import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Unauthorized: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box fade-in" style={{ maxWidth: '520px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: 'var(--radius-full)', color: '#f43f5e', marginBottom: '1.25rem' }}>
          <ShieldAlert size={48} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
          403 — Unauthorized Access
        </h1>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          You do not have the required Role-Based Access Control (RBAC) permissions to view this resource.
          {user && (
            <span> Your current active role is <strong className={`role-badge role-${user.role}`} style={{ display: 'inline-flex' }}>{user.role}</strong>.</span>
          )}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            <ArrowLeft size={16} /> Go Back
          </button>
          <Link to="/dashboard" className="btn btn-primary">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
