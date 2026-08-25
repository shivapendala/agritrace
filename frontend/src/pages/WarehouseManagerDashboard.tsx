import React, { useEffect, useState } from 'react';
import {
  Warehouse as WarehouseIcon,
  Plus,
  ArrowRightLeft,
  Scissors,
  Edit2,
  Truck,
  Thermometer,
  MapPin,
  QrCode,
  Search
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  location_address: string;
  total_capacity_kg: number;
  occupied_capacity_kg: number;
  target_temperature_celsius: number;
  is_cold_storage: boolean;
}

interface Batch {
  id: string;
  batch_number: string;
  product_name: string;
  remaining_quantity: number;
  unit: string;
  status: string;
}

interface InventoryItem {
  id: string;
  batch_id: string;
  warehouse_id: string;
  storage_location_id?: string;
  initial_quantity: number;
  current_quantity: number;
  unit: string;
  received_date: string;
  status: 'IN_STOCK' | 'DISPATCHED' | 'SPLIT' | 'EXPIRED';
  notes?: string;
}

export const WarehouseManagerDashboard: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Create Warehouse Modal
  const [showCreateWhModal, setShowCreateWhModal] = useState(false);
  const [whName, setWhName] = useState('Central Logistics Hub');
  const [whCode, setWhCode] = useState('WH-CENTRAL-01');
  const [whAddress, setWhAddress] = useState('Sector 12 Cold Park');
  const [whCapacity, setWhCapacity] = useState<number | ''>(50000);

  // Receive Batch Modal
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveBatchId, setReceiveBatchId] = useState('');
  const [receiveWhId, setReceiveWhId] = useState('');
  const [receiveQty, setReceiveQty] = useState<number | ''>(500);

  // Operations Modals (Move / Split / Adjust / Dispatch)
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [operationType, setOperationType] = useState<'move' | 'split' | 'adjust' | 'dispatch' | null>(null);
  
  // Operation input states
  const [targetWhId, setTargetWhId] = useState('');
  const [splitQty, setSplitQty] = useState<number | ''>(100);
  const [adjustQty, setAdjustQty] = useState<number | ''>(450);
  const [adjustReason, setAdjustReason] = useState('Moisture shrinkage audit');
  const [dispatchQty, setDispatchQty] = useState<number | ''>(200);
  const [dispatchDestination, setDispatchDestination] = useState('Metro Retail Outlet Hub');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const whRes = await fetch('/api/v1/warehouses/', { headers: { Authorization: `Bearer ${token}` } });
      if (whRes.ok) {
        const whData = await whRes.json();
        setWarehouses(whData);
        if (whData.length > 0 && !receiveWhId) {
          setReceiveWhId(whData[0].id);
          setTargetWhId(whData[0].id);
        }
      }

      const batchRes = await fetch('/api/v1/batches/', { headers: { Authorization: `Bearer ${token}` } });
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData);
        if (batchData.length > 0 && !receiveBatchId) setReceiveBatchId(batchData[0].id);
      }

      let invUrl = '/api/v1/inventory/';
      const params = new URLSearchParams();
      if (selectedWarehouseId) params.append('warehouse_id', selectedWarehouseId);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) invUrl += `?${params.toString()}`;

      const invRes = await fetch(invUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventories(invData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouseId, statusFilter]);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/warehouses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: whName,
          code: whCode,
          location_address: whAddress,
          total_capacity_kg: Number(whCapacity),
          target_temperature_celsius: 4.0,
          is_cold_storage: true
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to create warehouse');
      }
      setMessage('Warehouse created successfully!');
      setShowCreateWhModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReceiveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          batch_id: receiveBatchId,
          warehouse_id: receiveWhId,
          quantity: Number(receiveQty),
          unit: 'KG'
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to receive batch');
      }
      setMessage('Batch received into warehouse inventory!');
      setShowReceiveModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExecuteOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || !operationType) return;
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      let url = '';
      let method = 'POST';
      let body: any = {};

      if (operationType === 'move') {
        url = `/api/v1/inventory/${activeItem.id}/move`;
        method = 'PUT';
        body = { target_warehouse_id: targetWhId, notes: 'Inter-warehouse relocation' };
      } else if (operationType === 'split') {
        url = `/api/v1/inventory/${activeItem.id}/split`;
        body = { split_quantity: Number(splitQty), notes: 'Partial allocation split' };
      } else if (operationType === 'adjust') {
        url = `/api/v1/inventory/${activeItem.id}/adjust`;
        method = 'PUT';
        body = { new_quantity: Number(adjustQty), reason: adjustReason };
      } else if (operationType === 'dispatch') {
        url = `/api/v1/inventory/${activeItem.id}/dispatch`;
        body = { dispatch_quantity: Number(dispatchQty), destination_address: dispatchDestination };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Operation failed');
      }

      setMessage(`Inventory operation '${operationType.toUpperCase()}' completed successfully!`);
      setActiveItem(null);
      setOperationType(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredInventory = inventories.filter(item => 
    item.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Warehouse Dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {/* Warehouse Facilities Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Cold Storage Warehouse Facilities ({warehouses.length})</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowCreateWhModal(true)} className="btn btn-secondary">
              <Plus size={16} /> New Warehouse
            </button>
            <button onClick={() => setShowReceiveModal(true)} className="btn btn-primary">
              <WarehouseIcon size={16} /> Receive Batch
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {warehouses.map((wh) => {
            const occupiedPercent = Math.min(100, Math.round((wh.occupied_capacity_kg / wh.total_capacity_kg) * 100));
            return (
              <div key={wh.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>{wh.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 700 }}>{wh.code}</span>
                  </div>
                  <span className="role-badge role-WAREHOUSE_MANAGER" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Thermometer size={12} /> {wh.target_temperature_celsius}°C
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: '0.2rem' }} /> {wh.location_address}
                </div>

                {/* Capacity Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>Capacity Occupied</span>
                    <strong>{occupiedPercent}% ({wh.occupied_capacity_kg} / {wh.total_capacity_kg} KG)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${occupiedPercent}%`, height: '100%', background: occupiedPercent > 90 ? '#f43f5e' : 'var(--primary)', transition: 'var(--transition)' }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Warehouse Modal */}
      {showCreateWhModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Create New Warehouse Facility</h4>
          <form onSubmit={handleCreateWarehouse}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Warehouse Name</label>
                <input type="text" className="form-input" value={whName} onChange={(e) => setWhName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Code</label>
                <input type="text" className="form-input" value={whCode} onChange={(e) => setWhCode(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Address Location</label>
                <input type="text" className="form-input" value={whAddress} onChange={(e) => setWhAddress(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Total Capacity (KG)</label>
                <input type="number" step="100" min="100" className="form-input" value={whCapacity} onChange={(e) => setWhCapacity(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Create Facility</button>
              <button type="button" onClick={() => setShowCreateWhModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Receive Batch Modal */}
      {showReceiveModal && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>Receive Approved Batch into Warehouse</h4>
          <form onSubmit={handleReceiveBatch}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Batch</label>
                <select className="form-select" value={receiveBatchId} onChange={(e) => setReceiveBatchId(e.target.value)} required>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} — {b.product_name} ({b.remaining_quantity} {b.unit}) [{b.status}]
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Target Warehouse</label>
                <select className="form-select" value={receiveWhId} onChange={(e) => setReceiveWhId(e.target.value)} required>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Receiving Quantity (KG)</label>
                <input type="number" step="0.1" min="0.1" className="form-input" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Receive Stock</button>
              <button type="button" onClick={() => setShowReceiveModal(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Stock Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Warehouse Inventory Items ({filteredInventory.length})</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Track live stock levels, perform relocations, stock splits, adjustments, and dispatches.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', width: '200px' }}
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="form-select" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
            <select className="form-select" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="SPLIT">Split</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Inventory ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Batch ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Stock Quantity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Received Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Stock Operations</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{item.id.substring(0, 8)}...</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>
                    <QrCode size={13} style={{ display: 'inline', marginRight: '0.2rem' }} />
                    {item.batch_id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {item.current_quantity} / {item.initial_quantity} {item.unit}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    {new Date(item.received_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`role-badge ${item.status === 'IN_STOCK' ? 'role-FARMER' : 'role-QUALITY_OFFICER'}`}>{item.status}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.3rem' }}>
                      <button onClick={() => { setActiveItem(item); setOperationType('move'); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Move to another Warehouse">
                        <ArrowRightLeft size={13} /> Move
                      </button>
                      <button onClick={() => { setActiveItem(item); setOperationType('split'); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Split Quantity">
                        <Scissors size={13} /> Split
                      </button>
                      <button onClick={() => { setActiveItem(item); setOperationType('adjust'); }} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Adjust Count">
                        <Edit2 size={13} /> Adjust
                      </button>
                      <button onClick={() => { setActiveItem(item); setOperationType('dispatch'); }} className="btn btn-primary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} title="Dispatch to Transport">
                        <Truck size={13} /> Dispatch
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operation Execution Form Modal */}
      {activeItem && operationType && (
        <div className="glass-panel fade-in" style={{ padding: '1.75rem', borderColor: 'var(--primary)' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>
            Execute Stock Operation: <span style={{ textTransform: 'uppercase' }}>{operationType}</span>
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Item ID: <code>{activeItem.id}</code> | Available Stock: <strong>{activeItem.current_quantity} {activeItem.unit}</strong>
          </p>

          <form onSubmit={handleExecuteOperation}>
            {operationType === 'move' && (
              <div className="form-group">
                <label className="form-label">Target Destination Warehouse</label>
                <select className="form-select" value={targetWhId} onChange={(e) => setTargetWhId(e.target.value)} required>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</option>
                  ))}
                </select>
              </div>
            )}

            {operationType === 'split' && (
              <div className="form-group">
                <label className="form-label">Quantity to Split ({activeItem.unit})</label>
                <input type="number" step="0.1" max={activeItem.current_quantity - 0.1} min="0.1" className="form-input" value={splitQty} onChange={(e) => setSplitQty(e.target.value === '' ? '' : Number(e.target.value))} required />
              </div>
            )}

            {operationType === 'adjust' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">New Total Stock Count ({activeItem.unit})</label>
                  <input type="number" step="0.1" min="0" className="form-input" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value === '' ? '' : Number(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Audit Adjustment Reason</label>
                  <input type="text" className="form-input" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} required />
                </div>
              </div>
            )}

            {operationType === 'dispatch' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Dispatch Quantity ({activeItem.unit})</label>
                  <input type="number" step="0.1" max={activeItem.current_quantity} min="0.1" className="form-input" value={dispatchQty} onChange={(e) => setDispatchQty(e.target.value === '' ? '' : Number(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination Address</label>
                  <input type="text" className="form-input" value={dispatchDestination} onChange={(e) => setDispatchDestination(e.target.value)} required />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">Confirm {operationType.toUpperCase()}</button>
              <button type="button" onClick={() => { setActiveItem(null); setOperationType(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
