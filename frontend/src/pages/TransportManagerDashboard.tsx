import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  UserCheck,
  Thermometer,
  AlertTriangle,
  Navigation,
  MapPin,
  Search,
  Filter,
  ShieldAlert
} from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  vehicle_type: string;
  capacity_kg: number;
  min_temp_celsius: number;
  max_temp_celsius: number;
  is_available: boolean;
}

interface Driver {
  id: string;
  user_id: string;
  license_number: string;
  phone_number: string;
  is_available: boolean;
}

interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  remaining_quantity: number;
  unit: string;
}

interface TempLog {
  id: string;
  recorded_temp_celsius: number;
  is_breach: boolean;
  breach_message?: string;
  timestamp: string;
}

interface Shipment {
  id: string;
  tracking_number: string;
  batch_id: string;
  destination_address: string;
  vehicle_id?: string;
  driver_id?: string;
  status: 'CREATED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
  min_temp_required: number;
  max_temp_required: number;
  temp_logs: TempLog[];
  created_at: string;
}

export const TransportManagerDashboard: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('Metro Hypermarket, Avenue 5');
  const [minTemp, setMinTemp] = useState<number | ''>(2.0);
  const [maxTemp, setMaxTemp] = useState<number | ''>(8.0);

  // Vehicle Form
  const [licensePlate, setLicensePlate] = useState('TRK-COLD-99');
  const [capacity, setCapacity] = useState<number | ''>(5000);

  // Assign Modal
  const [assignShipment, setAssignShipment] = useState<Shipment | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');

  // Telemetry Sensor Modal
  const [telemetryShipment, setTelemetryShipment] = useState<Shipment | null>(null);
  const [sensorTemp, setSensorTemp] = useState<number | ''>(11.5);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const vehRes = await fetch('/api/v1/transport/vehicles', { headers: { Authorization: `Bearer ${token}` } });
      if (vehRes.ok) {
        const vData = await vehRes.json();
        setVehicles(vData);
        if (vData.length > 0 && !assignVehicleId) setAssignVehicleId(vData[0].id);
      }

      const drvRes = await fetch('/api/v1/transport/drivers', { headers: { Authorization: `Bearer ${token}` } });
      if (drvRes.ok) {
        const dData = await drvRes.json();
        setDrivers(dData);
        if (dData.length > 0 && !assignDriverId) setAssignDriverId(dData[0].id);
      }

      const batchRes = await fetch('/api/v1/batches/', { headers: { Authorization: `Bearer ${token}` } });
      if (batchRes.ok) {
        const bData = await batchRes.json();
        setBatches(bData);
        if (bData.length > 0 && !selectedBatchId) setSelectedBatchId(bData[0].id);
      }

      let url = '/api/v1/transport/shipments';
      if (statusFilter) url += `?status=${statusFilter}`;
      const shipRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (shipRes.ok) {
        const sData = await shipRes.json();
        setShipments(sData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/transport/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          destination_address: destinationAddress,
          min_temp_required: Number(minTemp),
          max_temp_required: Number(maxTemp)
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create shipment order');
      }
      const data = await res.json();
      setMessage(`Shipment created with Tracking #${data.tracking_number}!`);
      setShowShipmentModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/transport/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          license_plate: licensePlate,
          capacity_kg: Number(capacity),
          min_temp_celsius: 2.0,
          max_temp_celsius: 8.0
        })
      });
      if (!res.ok) throw new Error('Failed to register vehicle');
      setMessage('Cold chain vehicle registered successfully!');
      setShowVehicleModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignShipment) return;
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/transport/shipments/${assignShipment.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vehicle_id: assignVehicleId, driver_id: assignDriverId })
      });
      if (!res.ok) throw new Error('Failed to assign shipment');
      setMessage('Vehicle and driver assigned! Status updated to ASSIGNED.');
      setAssignShipment(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateStatus = async (shipmentId: string, newStatus: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/transport/shipments/${shipmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      setMessage(`Shipment status updated to ${newStatus}`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRecordTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telemetryShipment) return;
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/transport/shipments/${telemetryShipment.id}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recorded_temp_celsius: Number(sensorTemp) })
      });
      if (!res.ok) throw new Error('Failed to log telemetry');
      const logData = await res.json();
      if (logData.is_breach) {
        setError(logData.breach_message);
      } else {
        setMessage('Temperature reading logged within safe bounds.');
      }
      setTelemetryShipment(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const breachCount = shipments.reduce((acc, s) => acc + s.temp_logs.filter(l => l.is_breach).length, 0);
  const activeInTransit = shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Transport Dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {error && <div className="alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldAlert size={18} /> {error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIVE IN-TRANSIT</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{activeInTransit}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COLD-CHAIN BREACHES</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: breachCount > 0 ? '#f43f5e' : '#34d399' }}>{breachCount}</div>
          </div>
        </div>
      </div>

      {/* Control Header */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Transportation & Cold-Chain Telemetry</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dispatch refrigerated shipments, track driver status, and monitor temperature thresholds in real time.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowVehicleModal(true)} className="btn btn-secondary">
              <Plus size={16} /> Register Truck
            </button>
            <button onClick={() => setShowShipmentModal(true)} className="btn btn-primary">
              <Truck size={16} /> Create Shipment
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              placeholder="Search tracking # or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select className="form-select" style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="CREATED">Created</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PICKED_UP">Picked Up</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Create Shipment Modal */}
      {showShipmentModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Create Transport Shipment Order</h4>
          <form onSubmit={handleCreateShipment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Cargo Batch</label>
                <select className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batch_number} — {b.product_name} ({b.remaining_quantity} {b.unit})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destination Retail Address</label>
                <input type="text" className="form-input" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Min Cold Chain Temp (°C)</label>
                <input type="number" step="0.5" className="form-input" value={minTemp} onChange={(e) => setMinTemp(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Max Cold Chain Temp (°C)</label>
                <input type="number" step="0.5" className="form-input" value={maxTemp} onChange={(e) => setMaxTemp(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Dispatch Shipment</button>
              <button type="button" onClick={() => setShowShipmentModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Register Vehicle Modal */}
      {showVehicleModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Register Cold-Chain Refrigerated Vehicle</h4>
          <form onSubmit={handleCreateVehicle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">License Plate Number</label>
                <input type="text" className="form-input" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Max Cargo Capacity (KG)</label>
                <input type="number" step="100" min="100" className="form-input" value={capacity} onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Register Vehicle</button>
              <button type="button" onClick={() => setShowVehicleModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Shipments Directory Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Shipment Dispatch Directory ({shipments.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Tracking #</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batch ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Destination</th>
                <th style={{ padding: '0.75rem 1rem' }}>Temp Bounds</th>
                <th style={{ padding: '0.75rem 1rem' }}>Cold Chain Log</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const latestLog = s.temp_logs.length > 0 ? s.temp_logs[s.temp_logs.length - 1] : null;
                const hasBreach = s.temp_logs.some(l => l.is_breach);

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
                      <Navigation size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                      {s.tracking_number}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {s.batch_id.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      <MapPin size={13} style={{ display: 'inline', marginRight: '0.2rem' }} />
                      {s.destination_address}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                      <Thermometer size={13} style={{ display: 'inline', marginRight: '0.2rem', color: 'var(--primary)' }} />
                      {s.min_temp_required}°C – {s.max_temp_required}°C
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {latestLog ? (
                        <span style={{ fontSize: '0.8rem', color: latestLog.is_breach ? '#f43f5e' : '#34d399', fontWeight: 700 }}>
                          {latestLog.recorded_temp_celsius}°C {latestLog.is_breach && '⚠️ BREACH!'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No readings</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`role-badge ${hasBreach ? 'role-SUPER_ADMIN' : 'role-TRANSPORT_MANAGER'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                        {s.status === 'CREATED' && (
                          <button onClick={() => setAssignShipment(s)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                            <UserCheck size={13} /> Assign
                          </button>
                        )}
                        {s.status === 'ASSIGNED' && (
                          <button onClick={() => handleUpdateStatus(s.id, 'PICKED_UP')} className="btn btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                            Pick Up
                          </button>
                        )}
                        {s.status === 'PICKED_UP' && (
                          <button onClick={() => handleUpdateStatus(s.id, 'IN_TRANSIT')} className="btn btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                            In Transit
                          </button>
                        )}
                        {s.status === 'IN_TRANSIT' && (
                          <button onClick={() => handleUpdateStatus(s.id, 'DELIVERED')} className="btn btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                            Mark Delivered
                          </button>
                        )}
                        <button onClick={() => setTelemetryShipment(s)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                          <Thermometer size={13} /> Sensor Telemetry
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
      {assignShipment && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Assign Vehicle & Driver to Shipment #{assignShipment.tracking_number}</h4>
          <form onSubmit={handleAssignShipment}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Truck Vehicle</label>
                <select className="form-select" value={assignVehicleId} onChange={(e) => setAssignVehicleId(e.target.value)} required>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.license_plate} ({v.capacity_kg} KG)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Driver</label>
                <select className="form-select" value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} required>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>License: {d.license_number} ({d.phone_number})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Confirm Assignment</button>
              <button type="button" onClick={() => setAssignShipment(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Sensor Telemetry Modal */}
      {telemetryShipment && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Simulate Cold-Chain Sensor Telemetry
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Shipment Required Temp Bounds: <strong>{telemetryShipment.min_temp_required}°C – {telemetryShipment.max_temp_required}°C</strong>
          </p>

          <form onSubmit={handleRecordTelemetry}>
            <div className="form-group">
              <label className="form-label">Recorded Sensor Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={sensorTemp}
                onChange={(e) => setSensorTemp(e.target.value === '' ? '' : Number(e.target.value))}
                required
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Tip: Enter a temperature outside safe bounds (e.g. 11.5°C) to test automatic cold-chain breach alert generation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Log Sensor Telemetry</button>
              <button type="button" onClick={() => setTelemetryShipment(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
