import React, { useEffect, useState } from 'react';
import {
  Sprout,
  Plus,
  QrCode,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  Warehouse,
  ShieldCheck,
  Store,
  TrendingDown,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  farm_id: string;
  farmer_id: string;
  initial_quantity: number;
  remaining_quantity: number;
  unit: string;
  harvest_date: string;
  current_location: string;
  status: 'HARVESTED' | 'QUALITY_PENDING' | 'QUALITY_APPROVED' | 'IN_WAREHOUSE' | 'IN_TRANSIT' | 'AT_RETAILER' | 'SOLD' | 'REJECTED';
  created_at: string;
}

interface Farm {
  id: string;
  name: string;
  location_address: string;
}

export const HarvestBatchManager: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New Harvest Modal Form
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [productName, setProductName] = useState('Tomato Premium');
  const [quantity, setQuantity] = useState<number | ''>(500);
  const [unit, setUnit] = useState('KG');
  const [harvestMethod, setHarvestMethod] = useState('MANUAL');
  const [initialQualityNotes, setInitialQualityNotes] = useState('Fresh harvest, A-Grade size');

  // Batch Details & Timeline Modal
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [deductAmount, setDeductAmount] = useState<number | ''>(50);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const farmsRes = await fetch('/api/v1/farms/', { headers: { Authorization: `Bearer ${token}` } });
      if (farmsRes.ok) {
        const farmData = await farmsRes.json();
        setFarms(farmData);
        if (farmData.length > 0 && !selectedFarmId) setSelectedFarmId(farmData[0].id);
      }

      let url = '/api/v1/batches/';
      if (statusFilter) url += `?status=${statusFilter}`;
      const batchRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData);
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

  const handleRecordHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/harvests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          farm_id: selectedFarmId,
          product_name: productName,
          quantity: Number(quantity),
          unit,
          harvest_method: harvestMethod,
          initial_quality_notes: initialQualityNotes
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to record harvest');
      }
      const data = await res.json();
      setMessage(`Harvest recorded! Traceability Batch ${data.batch.batch_number} created.`);
      setShowHarvestModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeductQuantity = async (batchId: string) => {
    if (!deductAmount || deductAmount <= 0) return;
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/batches/${batchId}/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity_to_deduct: Number(deductAmount), reason: 'Market dispatch' })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to deduct quantity');
      }
      const updatedBatch = await res.json();
      setSelectedBatch(updatedBatch);
      setMessage(`Deducted ${deductAmount} ${updatedBatch.unit} from batch.`);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/batches/${batchId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      const updated = await res.json();
      setSelectedBatch(updated);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusTimelineSteps = [
    { key: 'HARVESTED', label: 'Harvested', icon: Sprout },
    { key: 'QUALITY_PENDING', label: 'Quality Check', icon: Clock },
    { key: 'QUALITY_APPROVED', label: 'Inspected', icon: ShieldCheck },
    { key: 'IN_WAREHOUSE', label: 'Warehouse', icon: Warehouse },
    { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
    { key: 'AT_RETAILER', label: 'At Retailer', icon: Store },
    { key: 'SOLD', label: 'Sold / Verified', icon: CheckCircle2 }
  ];

  const filteredBatches = batches.filter(b => 
    b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Traceability Batches...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Harvest Recording & Batch Traceability</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log crop harvests and track origin batch codes across the supply chain.</p>
          </div>
          <button onClick={() => setShowHarvestModal(true)} className="btn btn-primary">
            <Plus size={18} /> Record New Harvest
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              placeholder="Search by Batch # (e.g. TOM-2026) or Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="HARVESTED">Harvested</option>
              <option value="QUALITY_PENDING">Quality Pending</option>
              <option value="QUALITY_APPROVED">Quality Approved</option>
              <option value="IN_WAREHOUSE">In Warehouse</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="AT_RETAILER">At Retailer</option>
              <option value="SOLD">Sold</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record Harvest Modal Form */}
      {showHarvestModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Record Harvest & Generate Batch</h4>
          <form onSubmit={handleRecordHarvest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Origin Farm</label>
                <select className="form-select" value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)} required>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.location_address})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Product / Crop Name</label>
                <input type="text" className="form-input" placeholder="e.g. Tomato Premium" value={productName} onChange={(e) => setProductName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Harvested Quantity</label>
                <input type="number" step="0.1" min="0.1" className="form-input" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="TONS">Tons</option>
                  <option value="CRATES">Crates</option>
                  <option value="BOXES">Boxes</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Harvest Method</label>
                <select className="form-select" value={harvestMethod} onChange={(e) => setHarvestMethod(e.target.value)}>
                  <option value="MANUAL">Manual Hand-pick</option>
                  <option value="MECHANICAL">Mechanical Harvest</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Quality Notes</label>
                <input type="text" className="form-input" placeholder="e.g. Grade A, uniform size" value={initialQualityNotes} onChange={(e) => setInitialQualityNotes(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Generate Traceability Batch</button>
              <button type="button" onClick={() => setShowHarvestModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Batches Table List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Traceability Batches ({filteredBatches.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Batch Number</th>
                <th style={{ padding: '0.75rem 1rem' }}>Product</th>
                <th style={{ padding: '0.75rem 1rem' }}>Harvest Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Available Stock</th>
                <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    <QrCode size={14} style={{ display: 'inline', marginRight: '0.3rem' }} />
                    {b.batch_number}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{b.product_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(b.harvest_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <strong style={{ color: '#ffffff' }}>{b.remaining_quantity}</strong> / {b.initial_quantity} {b.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: '0.2rem' }} />
                    {b.current_location}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="role-badge role-FARMER">{b.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => setSelectedBatch(b)} className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                      Inspect Timeline <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Details & Timeline Modal */}
      {selectedBatch && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div>
              <div className="role-badge role-FARMER" style={{ marginBottom: '0.4rem' }}>{selectedBatch.status}</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                Batch: {selectedBatch.batch_number}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Product: <strong>{selectedBatch.product_name}</strong> | Harvested {new Date(selectedBatch.harvest_date).toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => setSelectedBatch(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Close Modal
            </button>
          </div>

          {/* Visual Step Timeline */}
          <h5 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Batch Provenance Lifecycle Timeline
          </h5>
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            {statusTimelineSteps.map((step, idx) => {
              const StepIcon = step.icon;
              const isCurrent = selectedBatch.status === step.key;
              return (
                <div
                  key={step.key}
                  style={{
                    flex: 1,
                    minWidth: '110px',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isCurrent ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>STEP 0{idx + 1}</div>
                  <StepIcon size={18} style={{ color: isCurrent ? 'var(--primary)' : 'var(--text-muted)', margin: '0.25rem 0' }} />
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isCurrent ? '#ffffff' : 'var(--text-secondary)' }}>{step.label}</div>
                </div>
              );
            })}
          </div>

          {/* Controls: Deduct Quantity & Advance Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-amber)' }}>
                <TrendingDown size={16} style={{ display: 'inline', marginRight: '0.3rem' }} /> Quantity Inventory Control
              </h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Remaining Stock: <strong>{selectedBatch.remaining_quantity} {selectedBatch.unit}</strong> (Initial: {selectedBatch.initial_quantity})
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  min="0.1"
                  max={selectedBatch.remaining_quantity}
                  className="form-input"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
                  placeholder="Deduct amount..."
                  value={deductAmount}
                  onChange={(e) => setDeductAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <button onClick={() => handleDeductQuantity(selectedBatch.id)} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                  Deduct Stock
                </button>
              </div>
            </div>

            <div>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>
                Advance Status Transition
              </h5>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => handleUpdateBatchStatus(selectedBatch.id, 'QUALITY_PENDING')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Request Quality Check
                </button>
                <button onClick={() => handleUpdateBatchStatus(selectedBatch.id, 'IN_WAREHOUSE')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Store in Warehouse
                </button>
                <button onClick={() => handleUpdateBatchStatus(selectedBatch.id, 'IN_TRANSIT')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                  Dispatch Transport
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
