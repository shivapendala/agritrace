import React, { useEffect, useState } from 'react';
import { Shield, Lock, Search, Filter, RefreshCw, Key, UserCheck, Sprout, Award, QrCode } from 'lucide-react';

interface AuditLogItem {
  id: string;
  user_id?: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address?: string;
  metadata_json?: string;
  timestamp: string;
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      let url = '/api/v1/audit-logs';
      const params: string[] = [];
      if (actionFilter) params.push(`action=${encodeURIComponent(actionFilter)}`);
      if (entityFilter) params.push(`entity=${encodeURIComponent(entityFilter)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load enterprise audit logs');
      setLogs(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter, entityFilter]);

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN') || action.includes('USER')) return <Key size={14} style={{ color: '#60a5fa' }} />;
    if (action.includes('FARMER')) return <UserCheck size={14} style={{ color: '#34d399' }} />;
    if (action.includes('BATCH')) return <Sprout size={14} style={{ color: '#10b981' }} />;
    if (action.includes('QUALITY')) return <Award size={14} style={{ color: '#fbbf24' }} />;
    if (action.includes('QR')) return <QrCode size={14} style={{ color: '#c084fc' }} />;
    return <Shield size={14} style={{ color: 'var(--primary)' }} />;
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <Lock size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Enterprise Security Audit Trail</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Immutable system event & authorization log stream</p>
          </div>
        </div>
        <button onClick={fetchAuditLogs} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={13} /> Action Category
          </label>
          <select className="form-input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All Security Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="USER_CREATION">USER_CREATION</option>
            <option value="FARMER_VERIFICATION">FARMER_VERIFICATION</option>
            <option value="BATCH_CREATION">BATCH_CREATION</option>
            <option value="QUALITY_APPROVAL">QUALITY_APPROVAL</option>
            <option value="QUALITY_REJECTION">QUALITY_REJECTION</option>
            <option value="QR_VERIFICATION">QR_VERIFICATION</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Search size={13} /> Entity Name Filter
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. User, Batch, FarmerProfile..."
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading security audit logs...</div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit events found matching filters.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                <th style={{ padding: '0.75rem 1rem' }}>Target Entity</th>
                <th style={{ padding: '0.75rem 1rem' }}>Entity ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actor User ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-color)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}
                    >
                      {getActionIcon(log.action)} {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{log.entity}</td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--primary)' }}>
                    {log.entity_id.substring(0, 12)}...
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {log.user_id ? `${log.user_id.substring(0, 8)}...` : 'PUBLIC'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
