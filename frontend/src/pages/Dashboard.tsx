import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User } from '../types/auth';
import { FarmerDashboard } from './FarmerDashboard';
import { AdminFarmerManagement } from './AdminFarmerManagement';
import { HarvestBatchManager } from './HarvestBatchManager';
import { QualityOfficerDashboard } from './QualityOfficerDashboard';
import { WarehouseManagerDashboard } from './WarehouseManagerDashboard';
import { TransportManagerDashboard } from './TransportManagerDashboard';
import { RetailerDashboard } from './RetailerDashboard';
import {
  Sprout,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Warehouse,
  QrCode,
  Store,
  Users,
  Activity,
  Award,
  Layers
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'farmer' | 'inspections' | 'warehouse' | 'transport' | 'retail' | 'batches' | 'admin_users' | 'admin_farmers'>('farmer');

  useEffect(() => {
    if (user && user.role === 'SUPER_ADMIN') {
      setLoadingUsers(true);
      api.listUsers()
        .then((data) => setUsersList(data))
        .catch((err) => setUserError(err.message))
        .finally(() => setLoadingUsers(false));
    }
  }, [user]);

  if (!user) return null;

  const workflowSteps = [
    { title: 'Farmer', icon: Sprout, role: 'FARMER', step: 1, color: '#34d399' },
    { title: 'Harvest', icon: Activity, role: 'FARMER', step: 2, color: '#10b981' },
    { title: 'Batch Creation', icon: Award, role: 'FARMER', step: 3, color: '#059669' },
    { title: 'Quality Inspection', icon: ShieldCheck, role: 'QUALITY_OFFICER', step: 4, color: '#60a5fa' },
    { title: 'Warehouse', icon: Warehouse, role: 'WAREHOUSE_MANAGER', step: 5, color: '#fbbf24' },
    { title: 'Transportation', icon: Truck, role: 'TRANSPORT_MANAGER', step: 6, color: '#f472b6' },
    { title: 'Retailer', icon: Store, role: 'RETAILER', step: 7, color: '#c084fc' },
    { title: 'QR Verification', icon: QrCode, role: 'CUSTOMER', step: 8, color: '#38bdf8' }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Welcome & Account Summary Banner */}
      <div className="glass-card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(16, 185, 129, 0.1) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Welcome, {user.full_name}! 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px' }}>
              You are currently authenticated with <strong style={{ color: 'var(--primary)' }}>{user.role}</strong> permissions in the AgriTrace ecosystem.
              {user.organization && ` Associated with ${user.organization}.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACCOUNT STATUS</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <CheckCircle2 size={16} /> Verified Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {user.role === 'FARMER' && (
          <>
            <button
              onClick={() => setActiveTab('farmer')}
              className={`btn ${activeTab === 'farmer' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Sprout size={16} /> Farm & Crop Management
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`btn ${activeTab === 'batches' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Layers size={16} /> Harvest & Traceability Batches
            </button>
          </>
        )}

        {user.role === 'QUALITY_OFFICER' && (
          <button
            onClick={() => setActiveTab('inspections')}
            className="btn btn-primary"
          >
            <ShieldCheck size={16} /> Quality Inspection Workflow
          </button>
        )}

        {user.role === 'WAREHOUSE_MANAGER' && (
          <button
            onClick={() => setActiveTab('warehouse')}
            className="btn btn-primary"
          >
            <Warehouse size={16} /> Warehouse & Inventory Operations
          </button>
        )}

        {(user.role === 'TRANSPORT_MANAGER' || user.role === 'DRIVER') && (
          <button
            onClick={() => setActiveTab('transport')}
            className="btn btn-primary"
          >
            <Truck size={16} /> Transport & Cold-Chain Telemetry
          </button>
        )}

        {user.role === 'RETAILER' && (
          <button
            onClick={() => setActiveTab('retail')}
            className="btn btn-primary"
          >
            <Store size={16} /> Retailer Store & Receiving
          </button>
        )}

        {user.role === 'SUPER_ADMIN' && (
          <>
            <button
              onClick={() => setActiveTab('retail')}
              className={`btn ${activeTab === 'retail' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Store size={16} /> Retail Store Operations
            </button>
            <button
              onClick={() => setActiveTab('transport')}
              className={`btn ${activeTab === 'transport' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Truck size={16} /> Transport & Telemetry
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`btn ${activeTab === 'warehouse' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Warehouse size={16} /> Warehouse & Inventory
            </button>
            <button
              onClick={() => setActiveTab('inspections')}
              className={`btn ${activeTab === 'inspections' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ShieldCheck size={16} /> Quality Inspections
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`btn ${activeTab === 'batches' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Layers size={16} /> Traceability Batches
            </button>
            <button
              onClick={() => setActiveTab('admin_users')}
              className={`btn ${activeTab === 'admin_users' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users size={16} /> System Users
            </button>
            <button
              onClick={() => setActiveTab('admin_farmers')}
              className={`btn ${activeTab === 'admin_farmers' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Sprout size={16} /> Farmer Verification Directory
            </button>
          </>
        )}
      </div>

      {/* Tab Render Views */}
      {user.role === 'FARMER' && activeTab === 'farmer' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <FarmerDashboard />
        </div>
      )}

      {(user.role === 'QUALITY_OFFICER' || (activeTab === 'inspections' && user.role === 'SUPER_ADMIN')) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <QualityOfficerDashboard />
        </div>
      )}

      {(user.role === 'WAREHOUSE_MANAGER' || (activeTab === 'warehouse' && user.role === 'SUPER_ADMIN')) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <WarehouseManagerDashboard />
        </div>
      )}

      {(user.role === 'TRANSPORT_MANAGER' || user.role === 'DRIVER' || (activeTab === 'transport' && user.role === 'SUPER_ADMIN')) && (
        <div style={{ marginBottom: '2.5rem' }}>
          <TransportManagerDashboard />
        </div>
      )}

      {(user.role === 'RETAILER' || activeTab === 'retail') && (
        <div style={{ marginBottom: '2.5rem' }}>
          <RetailerDashboard />
        </div>
      )}

      {(activeTab === 'batches' && user.role !== 'QUALITY_OFFICER' && user.role !== 'WAREHOUSE_MANAGER' && user.role !== 'TRANSPORT_MANAGER' && user.role !== 'DRIVER' && user.role !== 'RETAILER') && (
        <div style={{ marginBottom: '2.5rem' }}>
          <HarvestBatchManager />
        </div>
      )}

      {user.role === 'SUPER_ADMIN' && activeTab === 'admin_farmers' && (
        <div style={{ marginBottom: '2.5rem' }}>
          <AdminFarmerManagement />
        </div>
      )}

      {user.role === 'SUPER_ADMIN' && activeTab === 'admin_users' && (
        <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Registered System Users</h3>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
              Total Users: {usersList.length}
            </span>
          </div>

          {loadingUsers ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading user directory...</div>
          ) : userError ? (
            <div className="alert-error">{userError}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>User</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Organization</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{u.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`role-badge role-${u.role}`}>{u.role}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{u.organization || 'N/A'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Workflow Lifecycle Pipeline */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Farm-to-Market Supply Chain Pipeline
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {workflowSteps.map((step) => {
          const StepIcon = step.icon;
          const isUserRoleStep = user.role === 'SUPER_ADMIN' || user.role === step.role;
          return (
            <div
              key={step.step}
              className="glass-card"
              style={{
                textAlign: 'center',
                padding: '1.25rem 0.75rem',
                borderColor: isUserRoleStep ? step.color : 'var(--border-color)',
                opacity: isUserRoleStep ? 1 : 0.65
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: step.color, marginBottom: '0.5rem' }}>
                STEP 0{step.step}
              </div>
              <div style={{ display: 'inline-flex', padding: '0.6rem', borderRadius: '12px', background: `${step.color}20`, color: step.color, marginBottom: '0.5rem' }}>
                <StepIcon size={22} />
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{step.title}</div>
              {isUserRoleStep && (
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: step.color, marginTop: '0.5rem' }}></span>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};
