import React, { useEffect, useState } from 'react';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  QrCode,
  Droplets,
  Thermometer,
  Weight,
  FileText,
  Filter
} from 'lucide-react';

interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  remaining_quantity: number;
  unit: string;
  status: string;
}

interface Inspection {
  id: string;
  batch_id: string;
  inspector_id: string;
  inspection_date: string;
  verified_weight: number;
  moisture_percentage?: number;
  temperature_celsius?: number;
  quality_grade: 'A' | 'B' | 'C' | 'REJECTED';
  visual_condition: string;
  contamination_status: string;
  remarks?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REINSPECTION';
  created_at: string;
}

export const QualityOfficerDashboard: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Create Inspection Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [verifiedWeight, setVerifiedWeight] = useState<number | ''>(500);
  const [moisture, setMoisture] = useState<number | ''>(12);
  const [temperature, setTemperature] = useState<number | ''>(20);
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B' | 'C' | 'REJECTED'>('A');
  const [visualCondition, setVisualCondition] = useState('Excellent color, uniform sizing');
  const [contaminationStatus, setContaminationStatus] = useState('CLEAN');
  const [remarks, setRemarks] = useState('All lab parameters compliant with Grade A standards');

  // Review Action State
  const [actionNotes, setActionNotes] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');

      // Fetch pending / available batches
      const batchRes = await fetch('/api/v1/batches/', { headers: { Authorization: `Bearer ${token}` } });
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData);
        if (batchData.length > 0 && !selectedBatchId) setSelectedBatchId(batchData[0].id);
      }

      // Fetch inspections
      let url = '/api/v1/inspections/';
      if (statusFilter) url += `?approval_status=${statusFilter}`;
      const inspRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (inspRes.ok) {
        const inspData = await inspRes.json();
        setInspections(inspData);
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

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/inspections/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          batch_id: selectedBatchId,
          verified_weight: Number(verifiedWeight),
          moisture_percentage: moisture !== '' ? Number(moisture) : undefined,
          temperature_celsius: temperature !== '' ? Number(temperature) : undefined,
          quality_grade: qualityGrade,
          visual_condition: visualCondition,
          contamination_status: contaminationStatus,
          remarks
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create inspection');
      }
      setMessage('Quality inspection recorded successfully!');
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApprove = async (inspectionId: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/inspections/${inspectionId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: actionNotes || 'Approved for warehouse transfer' })
      });
      if (!res.ok) throw new Error('Failed to approve inspection');
      setMessage('Inspection APPROVED! Batch is now authorized for Warehouse entry.');
      setActionNotes('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (inspectionId: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/inspections/${inspectionId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: actionNotes || 'Quality standards not met' })
      });
      if (!res.ok) throw new Error('Failed to reject inspection');
      setMessage('Inspection REJECTED. Batch blocked from standard inventory.');
      setActionNotes('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReinspect = async (inspectionId: string) => {
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/inspections/${inspectionId}/reinspect`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: actionNotes || 'Flagged for re-testing' })
      });
      if (!res.ok) throw new Error('Failed to request reinspection');
      setMessage('Flagged for Re-inspection!');
      setActionNotes('');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const approvedCount = inspections.filter(i => i.approval_status === 'APPROVED').length;
  const pendingCount = inspections.filter(i => i.approval_status === 'PENDING').length;
  const rejectedCount = inspections.filter(i => i.approval_status === 'REJECTED').length;

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Quality Dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Summary Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>APPROVED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{approvedCount}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PENDING REVIEW</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{pendingCount}</div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>REJECTED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Action Header & Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Agricultural Quality Officer Workflow</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Inspect batches, record moisture & lab parameters, and authorize warehouse movement.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={18} /> New Quality Inspection
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ maxWidth: '380px', fontSize: '0.85rem' }}
            placeholder="Inspector approval notes (optional)..."
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="REQUIRES_REINSPECTION">Requires Re-inspection</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record Inspection Modal */}
      {showCreateModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Record Quality Inspection Report</h4>
          <form onSubmit={handleCreateInspection}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Select Target Batch</label>
                <select className="form-select" value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)} required>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} — {b.product_name} ({b.remaining_quantity} {b.unit}) [{b.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label"><Weight size={14} style={{ display: 'inline' }} /> Verified Lab Weight</label>
                <input type="number" step="0.1" min="0.1" className="form-input" value={verifiedWeight} onChange={(e) => setVerifiedWeight(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>

              <div className="form-group">
                <label className="form-label"><Droplets size={14} style={{ display: 'inline' }} /> Moisture Percentage (%)</label>
                <input type="number" step="0.1" min="0" max="100" className="form-input" value={moisture} onChange={(e) => setMoisture(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>

              <div className="form-group">
                <label className="form-label"><Thermometer size={14} style={{ display: 'inline' }} /> Temperature (°C)</label>
                <input type="number" step="0.1" className="form-input" value={temperature} onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Quality Grade</label>
                <select className="form-select" value={qualityGrade} onChange={(e) => setQualityGrade(e.target.value as any)}>
                  <option value="A">Grade A (Premium)</option>
                  <option value="B">Grade B (Standard)</option>
                  <option value="C">Grade C (Commercial)</option>
                  <option value="REJECTED">REJECTED (Defective / Contaminated)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Visual Condition</label>
                <input type="text" className="form-input" placeholder="e.g. Excellent color, no decay" value={visualCondition} onChange={(e) => setVisualCondition(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Contamination Status</label>
                <select className="form-select" value={contaminationStatus} onChange={(e) => setContaminationStatus(e.target.value)}>
                  <option value="CLEAN">CLEAN (Zero residues)</option>
                  <option value="NEGLIGIBLE">NEGLIGIBLE (Within safety threshold)</option>
                  <option value="CONTAMINATED">CONTAMINATED (Pesticide/Foreign matter detected)</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label"><FileText size={14} style={{ display: 'inline' }} /> Inspector Remarks & Lab Findings</label>
                <textarea className="form-input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Submit Inspection Report</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Inspection History Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Quality Inspection Records ({inspections.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Inspection Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batch ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Verified Weight</th>
                <th style={{ padding: '0.75rem 1rem' }}>Lab Metrics</th>
                <th style={{ padding: '0.75rem 1rem' }}>Grade</th>
                <th style={{ padding: '0.75rem 1rem' }}>Approval Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Officer Actions</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp) => (
                <tr key={insp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(insp.inspection_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    <QrCode size={13} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {insp.batch_id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{insp.verified_weight} KG</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Moisture: {insp.moisture_percentage || 'N/A'}% | Temp: {insp.temperature_celsius || 'N/A'}°C
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`role-badge ${insp.quality_grade === 'A' ? 'role-FARMER' : insp.quality_grade === 'REJECTED' ? 'role-SUPER_ADMIN' : 'role-QUALITY_OFFICER'}`}>
                      Grade {insp.quality_grade}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`role-badge ${insp.approval_status === 'APPROVED' ? 'role-FARMER' : insp.approval_status === 'REJECTED' ? 'role-SUPER_ADMIN' : 'role-WAREHOUSE_MANAGER'}`}>
                      {insp.approval_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                      {insp.approval_status !== 'APPROVED' && (
                        <button onClick={() => handleApprove(insp.id)} className="btn btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} /> Approve
                        </button>
                      )}
                      {insp.approval_status !== 'REJECTED' && (
                        <button onClick={() => handleReject(insp.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}>
                          <XCircle size={13} /> Reject
                        </button>
                      )}
                      <button onClick={() => handleReinspect(insp.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}>
                        <RotateCcw size={13} /> Re-inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
