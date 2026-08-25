import React, { useEffect, useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, History, MapPin, Eye } from 'lucide-react';

interface Crop {
  id: string;
  name: string;
  variety?: string;
  status: string;
}

interface Farm {
  id: string;
  name: string;
  location_address: string;
  total_area_hectares: number;
  soil_type: string;
  crops: Crop[];
}

interface FarmerProfile {
  id: string;
  user_id: string;
  address?: string;
  city?: string;
  state?: string;
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  verification_notes?: string;
  created_at: string;
  farms: Farm[];
}


export const AdminFarmerManagement: React.FC = () => {
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Selected Farmer for History Modal
  const [selectedFarmerHistory, setSelectedFarmerHistory] = useState<FarmerProfile | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const fetchFarmers = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/farmers/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load farmer profiles');
      const data = await res.json();
      setFarmers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const handleVerifyFarmer = async (farmerId: string) => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/farmers/${farmerId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: actionNotes || 'Verified by Super Admin' })
      });
      if (!res.ok) throw new Error('Failed to verify farmer');
      setMessage('Farmer account verified successfully!');
      setActionNotes('');
      fetchFarmers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSuspendFarmer = async (farmerId: string) => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/farmers/${farmerId}/suspend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: actionNotes || 'Suspended by Super Admin for review' })
      });
      if (!res.ok) throw new Error('Failed to suspend farmer');
      setMessage('Farmer account suspended!');
      setActionNotes('');
      fetchFarmers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Farmer Management Directory...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={26} style={{ color: 'var(--primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Admin Farmer Verification & Management</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review, approve, verify or suspend farmer accounts in the platform.</p>
            </div>
          </div>
          <span className="role-badge role-SUPER_ADMIN">Total Farmers: {farmers.length}</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            className="form-input"
            style={{ maxWidth: '400px', fontSize: '0.85rem' }}
            placeholder="Action verification notes (optional)..."
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Farmer Profile ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Location Address</th>
                <th style={{ padding: '0.75rem 1rem' }}>Verification Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Farms Count</th>
                <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((farmer) => (
                <tr key={farmer.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{farmer.id.substring(0, 8)}...</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={14} style={{ display: 'inline', marginRight: '0.2rem', color: 'var(--primary)' }} />
                    {farmer.address ? `${farmer.address}, ${farmer.city || ''}` : 'Location unconfigured'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`role-badge ${farmer.verification_status === 'VERIFIED' ? 'role-FARMER' : farmer.verification_status === 'SUSPENDED' ? 'role-SUPER_ADMIN' : 'role-WAREHOUSE_MANAGER'}`}>
                      {farmer.verification_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{farmer.farms ? farmer.farms.length : 0} Farms</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{farmer.verification_notes || 'None'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      {farmer.verification_status !== 'VERIFIED' && (
                        <button onClick={() => handleVerifyFarmer(farmer.id)} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Verify
                        </button>
                      )}
                      {farmer.verification_status !== 'SUSPENDED' && (
                        <button onClick={() => handleSuspendFarmer(farmer.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}>
                          <AlertOctagon size={13} /> Suspend
                        </button>
                      )}
                      <button onClick={() => setSelectedFarmerHistory(farmer)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                        <Eye size={13} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Farmer History Modal */}
      {selectedFarmerHistory && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
              <History size={18} style={{ display: 'inline', marginRight: '0.4rem' }} />
              Farmer Activity History ({selectedFarmerHistory.id})
            </h4>
            <button onClick={() => setSelectedFarmerHistory(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
              Close
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Location: {selectedFarmerHistory.address || 'N/A'} | Status: <strong>{selectedFarmerHistory.verification_status}</strong>
          </p>

          <h5 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>Farms & Crops Log</h5>
          {selectedFarmerHistory.farms && selectedFarmerHistory.farms.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {selectedFarmerHistory.farms.map((f) => (
                <div key={f.id} className="glass-card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>{f.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.location_address} ({f.total_area_hectares} Ha, {f.soil_type})</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Crops: {f.crops && f.crops.length > 0 ? f.crops.map(c => c.name).join(', ') : 'None'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No farms registered by this farmer yet.</div>
          )}
        </div>
      )}
    </div>
  );
};
