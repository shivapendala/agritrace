import React, { useEffect, useState } from 'react';
import {
  Store,
  QrCode,
  MapPin,
  Phone,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

interface Shipment {
  id: string;
  tracking_number: string;
  batch_id: string;
  destination_address: string;
  status: string;
}

interface RetailerProfile {
  id: string;
  store_name: string;
  store_code: string;
  address: string;
  contact_phone: string;
  is_verified: boolean;
}

interface Receipt {
  id: string;
  shipment_id: string;
  batch_id: string;
  received_quantity: number;
  accepted_quantity: number;
  damaged_quantity: number;
  damage_reason?: string;
  status: 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED_ON_DELIVERY';
  receipt_date: string;
}

interface RetailInventory {
  id: string;
  batch_id: string;
  received_quantity: number;
  current_quantity: number;
  unit: string;
  shelf_location: string;
  received_date: string;
}

export const RetailerDashboard: React.FC = () => {
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [inventories, setInventories] = useState<RetailInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Delivery Confirm Modal
  const [confirmShipment, setConfirmShipment] = useState<Shipment | null>(null);
  const [receivedQty, setReceivedQty] = useState<number | ''>(500);
  const [acceptedQty, setAcceptedQty] = useState<number | ''>(480);
  const [damagedQty, setDamagedQty] = useState<number | ''>(20);
  const [damageReason, setDamageReason] = useState('Minor transit bruising on top layer');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      
      const profRes = await fetch('/api/v1/retail/profile/me', { headers: { Authorization: `Bearer ${token}` } });
      if (profRes.ok) setProfile(await profRes.json());

      const shipRes = await fetch('/api/v1/transport/shipments', { headers: { Authorization: `Bearer ${token}` } });
      if (shipRes.ok) setShipments(await shipRes.json());

      const recRes = await fetch('/api/v1/retail/receipts', { headers: { Authorization: `Bearer ${token}` } });
      if (recRes.ok) setReceipts(await recRes.json());

      const invRes = await fetch('/api/v1/retail/inventory', { headers: { Authorization: `Bearer ${token}` } });
      if (invRes.ok) setInventories(await invRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmShipment) return;
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/retail/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shipment_id: confirmShipment.id,
          received_quantity: Number(receivedQty),
          accepted_quantity: Number(acceptedQty),
          damaged_quantity: Number(damagedQty),
          damage_reason: damageReason
        })
      });
      if (!res.ok) throw new Error('Failed to confirm receipt');
      setMessage(`Delivery receipt confirmed! Batch status updated to AT_RETAILER.`);
      setConfirmShipment(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Retailer Dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Store Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Store size={22} style={{ color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile?.store_name || 'Retail Supermarket Outlet'}</h3>
              <span className="role-badge role-RETAILER">{profile?.store_code || 'STORE-01'}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <MapPin size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> {profile?.address || 'Main Commercial Street'} | <Phone size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> {profile?.contact_phone || '+1-800-RETAIL'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontSize: '0.9rem', fontWeight: 700 }}>
            <ShieldCheck size={18} /> Verified Retail Partner
          </div>
        </div>
      </div>

      {/* Incoming Deliveries */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>Incoming & Dispatched Deliveries</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Tracking #</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batch ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Destination</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--primary)' }}>
                    {s.tracking_number}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>
                    <QrCode size={13} style={{ display: 'inline', marginRight: '0.2rem' }} />
                    {s.batch_id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{s.destination_address}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="role-badge role-RETAILER">{s.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button onClick={() => setConfirmShipment(s)} className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                      <FileCheck size={13} /> Confirm Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delivery Receipt Modal */}
      {confirmShipment && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Confirm Delivery Receipt for Tracking #{confirmShipment.tracking_number}</h4>
          <form onSubmit={handleConfirmReceipt}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Total Received Quantity</label>
                <input type="number" step="0.1" min="0.1" className="form-input" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Accepted Stock Quantity</label>
                <input type="number" step="0.1" min="0" className="form-input" value={acceptedQty} onChange={(e) => setAcceptedQty(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Reported Damaged Quantity</label>
                <input type="number" step="0.1" min="0" className="form-input" value={damagedQty} onChange={(e) => setDamagedQty(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Damaged Product Notes / Reason</label>
                <input type="text" className="form-input" value={damageReason} onChange={(e) => setDamageReason(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Confirm Receipt & Add to Stock</button>
              <button type="button" onClick={() => setConfirmShipment(null)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Retail Store Inventory Directory */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>Active Retail Display Inventory ({inventories.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Batch ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Available Stock</th>
                <th style={{ padding: '0.75rem 1rem' }}>Shelf Location</th>
                <th style={{ padding: '0.75rem 1rem' }}>Received Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batch Status</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                    <QrCode size={13} style={{ display: 'inline', marginRight: '0.2rem' }} />
                    {inv.batch_id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {inv.current_quantity} / {inv.received_quantity} {inv.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{inv.shelf_location}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(inv.received_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="role-badge role-FARMER">AT_RETAILER</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Delivery Confirmation Receipts Log */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem' }}>Receipt Audit Logs ({receipts.length})</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Receipt Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Accepted Qty</th>
                <th style={{ padding: '0.75rem 1rem' }}>Damaged Qty</th>
                <th style={{ padding: '0.75rem 1rem' }}>Damage Reason</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(r.receipt_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34d399' }}>{r.accepted_quantity} KG</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: r.damaged_quantity > 0 ? '#f43f5e' : 'var(--text-muted)' }}>
                    {r.damaged_quantity} KG
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{r.damage_reason || 'None'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`role-badge ${r.status === 'ACCEPTED' ? 'role-FARMER' : 'role-SUPER_ADMIN'}`}>{r.status}</span>
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
