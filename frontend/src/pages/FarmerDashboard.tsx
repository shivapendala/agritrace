import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Sprout,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Droplets,
  Building,
  Layers
} from 'lucide-react';

interface Crop {
  id: string;
  name: string;
  variety?: string;
  planting_date: string;
  expected_harvest_date?: string;
  status: 'PLANTED' | 'GROWING' | 'HARVESTED';
}

interface Farm {
  id: string;
  name: string;
  location_address: string;
  latitude?: number;
  longitude?: number;
  total_area_hectares: number;
  soil_type: string;
  irrigation_type: string;
  is_active: boolean;
  crops: Crop[];
}

interface FarmerProfile {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';
  verification_notes?: string;
  farms: Farm[];
}

export const FarmerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Create Farm Modal State
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [totalArea, setTotalArea] = useState<number | ''>(10);
  const [soilType, setSoilType] = useState('Loam');
  const [irrigationType, setIrrigationType] = useState('Drip Irrigation');

  // Add Crop Modal State
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [cropName, setCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchFarmerData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const profileRes = await fetch('/api/v1/farmers/me/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const profData = await profileRes.json();
        setProfile(profData);
        setAddress(profData.address || '');
        setCity(profData.city || '');
        setState(profData.state || '');
      }

      const farmsRes = await fetch('/api/v1/farms/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (farmsRes.ok) {
        const farmsData = await farmsRes.json();
        setFarms(farmsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/farmers/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ address, city, state })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setMessage('Farmer profile updated successfully!');
      setIsEditingProfile(false);
      fetchFarmerData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/farms/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: farmName,
          location_address: locationAddress,
          total_area_hectares: Number(totalArea),
          soil_type: soilType,
          irrigation_type: irrigationType
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create farm');
      }
      setMessage('Farm created successfully!');
      setShowFarmModal(false);
      setFarmName('');
      setLocationAddress('');
      fetchFarmerData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) return;
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/farms/${selectedFarmId}/crops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: cropName,
          variety: cropVariety,
          planting_date: new Date(plantingDate).toISOString(),
          status: 'PLANTED'
        })
      });
      if (!res.ok) throw new Error('Failed to add crop');
      setMessage('Crop recorded successfully!');
      setSelectedFarmId(null);
      setCropName('');
      setCropVariety('');
      fetchFarmerData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Farmer Dashboard...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Farmer Profile Card */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: '10px', color: 'var(--primary)' }}>
                <Sprout size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{user?.full_name}'s Farmer Profile</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user?.organization || 'Independent Organic Farm'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div><MapPin size={16} style={{ display: 'inline', marginRight: '0.3rem', color: 'var(--primary)' }} /> {profile?.address || 'No address set'}, {profile?.city || ''}</div>
              <div><Building size={16} style={{ display: 'inline', marginRight: '0.3rem', color: 'var(--primary)' }} /> Total Farms: {farms.length}</div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>VERIFICATION STATUS</div>
            <span className={`role-badge ${profile?.verification_status === 'VERIFIED' ? 'role-FARMER' : profile?.verification_status === 'SUSPENDED' ? 'role-SUPER_ADMIN' : 'role-WAREHOUSE_MANAGER'}`}>
              {profile?.verification_status === 'VERIFIED' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {profile?.verification_status}
            </span>
            <div style={{ marginTop: '0.75rem' }}>
              <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                <Edit2 size={14} /> {isEditingProfile ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        {isEditingProfile && (
          <form onSubmit={handleUpdateProfile} style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" className="form-input" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">State / Region</label>
                <input type="text" className="form-input" value={state} onChange={(e) => setState(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Save Profile Changes</button>
          </form>
        )}
      </div>

      {/* Farms Section Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Registered Farms ({farms.length})</h3>
        <button onClick={() => setShowFarmModal(true)} className="btn btn-primary">
          <Plus size={18} /> Register New Farm
        </button>
      </div>

      {/* Create Farm Modal Form */}
      {showFarmModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary)' }}>Register New Farm</h4>
          <form onSubmit={handleCreateFarm}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Farm Name</label>
                <input type="text" className="form-input" placeholder="e.g. Green Valley Farm" value={farmName} onChange={(e) => setFarmName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Location Address</label>
                <input type="text" className="form-input" placeholder="e.g. Sector 4, Valley Road" value={locationAddress} onChange={(e) => setLocationAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Area (Hectares)</label>
                <input type="number" step="0.1" min="0.1" className="form-input" value={totalArea} onChange={(e) => setTotalArea(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Soil Type</label>
                <select className="form-select" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                  <option value="Loam">Loam (Optimal Organic)</option>
                  <option value="Clay">Clay</option>
                  <option value="Sandy">Sandy</option>
                  <option value="Silt">Silt</option>
                  <option value="Black Cotton">Black Cotton Soil</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Irrigation System</label>
                <select className="form-select" value={irrigationType} onChange={(e) => setIrrigationType(e.target.value)}>
                  <option value="Drip Irrigation">Drip Irrigation</option>
                  <option value="Sprinkler">Sprinkler System</option>
                  <option value="Canal / Flood">Canal / Flood</option>
                  <option value="Rainfed">Rainfed</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Create Farm</button>
              <button type="button" onClick={() => setShowFarmModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Farms Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {farms.map((farm) => (
          <div key={farm.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>{farm.name}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><MapPin size={14} style={{ display: 'inline' }} /> {farm.location_address}</p>
              </div>
              <span className="role-badge role-FARMER">{farm.total_area_hectares} Hectares</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
              <div><Layers size={14} style={{ display: 'inline', marginRight: '0.2rem', color: 'var(--primary)' }} /> Soil: <strong>{farm.soil_type}</strong></div>
              <div><Droplets size={14} style={{ display: 'inline', marginRight: '0.2rem', color: 'var(--accent-blue)' }} /> Irrigation: <strong>{farm.irrigation_type}</strong></div>
            </div>

            {/* Farm Crops List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Planted Crops ({farm.crops ? farm.crops.length : 0})
                </span>
                <button onClick={() => setSelectedFarmId(farm.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                  <Plus size={12} /> Add Crop
                </button>
              </div>

              {farm.crops && farm.crops.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {farm.crops.map((c) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <div>
                        <strong>{c.name}</strong> {c.variety && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({c.variety})</span>}
                      </div>
                      <span className="role-badge role-QUALITY_OFFICER" style={{ fontSize: '0.7rem' }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No active crops recorded yet.</div>
              )}
            </div>

            {/* Add Crop Inline Form */}
            {selectedFarmId === farm.id && (
              <form onSubmit={handleAddCrop} style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>Add New Crop</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input type="text" className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="Crop Name (e.g. Wheat)" value={cropName} onChange={(e) => setCropName(e.target.value)} required />
                  <input type="text" className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} placeholder="Variety (Optional)" value={cropVariety} onChange={(e) => setCropVariety(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Planting Date</label>
                  <input type="date" className="form-input" style={{ fontSize: '0.8rem', padding: '0.4rem' }} value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} required />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Record Crop</button>
                  <button type="button" onClick={() => setSelectedFarmId(null)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
