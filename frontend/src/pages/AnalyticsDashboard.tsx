import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  Layers,
  XCircle,
  Warehouse,
  Truck,
  AlertTriangle,
  Download,
  Printer,
  FileText
} from 'lucide-react';

interface OverviewMetrics {
  total_farmers: number;
  total_farms: number;
  total_batches: number;
  approved_batches: number;
  rejected_batches: number;
  total_warehouse_stock_kg: number;
  shipments_in_transit: number;
  total_retailers: number;
  verified_products_count: number;
  temperature_alerts_count: number;
}

interface ReportRow {
  record_id: string;
  date: string;
  type: string;
  batch_number: string;
  product_name: string;
  details: string;
  status: string;
  metric_value?: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [reportType, setReportType] = useState<string>('harvest');
  const [productFilter, setProductFilter] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/analytics/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setOverview(await res.json());
    } catch (err: any) {
      console.error('Failed to fetch overview metrics:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('agritrace_access_token');
      let url = `/api/v1/analytics/reports?report_type=${reportType}`;
      if (productFilter) url += `&product_name=${encodeURIComponent(productFilter)}`;
      if (gradeFilter) url += `&quality_grade=${encodeURIComponent(gradeFilter)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load report data');
      setReportRows(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, productFilter, gradeFilter]);

  const handleExportCSV = () => {
    let url = `/api/v1/analytics/reports/export-csv?report_type=${reportType}`;
    if (productFilter) url += `&product_name=${encodeURIComponent(productFilter)}`;
    if (gradeFilter) url += `&quality_grade=${encodeURIComponent(gradeFilter)}`;
    
    window.open(url, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Printable Report Header Styles */}
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          .no-print { display: none !important; }
          .glass-panel, .glass-card { border: 1px solid #ccc !important; background: #fff !important; color: #000 !important; box-shadow: none !important; }
        }
      `}</style>

      {/* Admin Metrics Overview Cards */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              FARMERS
              <Users size={16} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem' }}>{overview.total_farmers}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{overview.total_farms} Registered Farms</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              TOTAL BATCHES
              <Layers size={16} style={{ color: '#60a5fa' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem' }}>{overview.total_batches}</div>
            <div style={{ fontSize: '0.75rem', color: '#34d399' }}>{overview.approved_batches} Approved</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              REJECTED BATCHES
              <XCircle size={16} style={{ color: '#f43f5e' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: overview.rejected_batches > 0 ? '#f43f5e' : '#ffffff', marginTop: '0.35rem' }}>
              {overview.rejected_batches}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Quarantined</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              WAREHOUSE STOCK
              <Warehouse size={16} style={{ color: '#fbbf24' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.35rem' }}>{overview.total_warehouse_stock_kg.toLocaleString()} KG</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Inventory</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              IN TRANSIT
              <Truck size={16} style={{ color: '#c084fc' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem' }}>{overview.shipments_in_transit}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Active Shipments</div>
          </div>

          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              TEMP ALERTS
              <AlertTriangle size={16} style={{ color: '#f43f5e' }} />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: overview.temperature_alerts_count > 0 ? '#fbbf24' : '#ffffff', marginTop: '0.35rem' }}>
              {overview.temperature_alerts_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cold-Chain Breaches</div>
          </div>
        </div>
      )}

      {/* Report Controls & Filters */}
      <div className="glass-panel no-print" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Supply Chain Analytics & Custom Reports</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Download size={15} /> Export CSV
            </button>
            <button onClick={handlePrintReport} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Printer size={15} /> Print Report
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Report Category</label>
            <select className="form-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="harvest">Harvest Quantity Report</option>
              <option value="quality">Quality Inspection Report</option>
              <option value="inventory">Warehouse Inventory Report</option>
              <option value="temperature">Cold-Chain Temperature Alerts</option>
              <option value="traceability">Batch Traceability Passport Report</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Product Name Filter</label>
            <input type="text" className="form-input" placeholder="e.g. Tomatoes, Sweet Corn..." value={productFilter} onChange={(e) => setProductFilter(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Quality Grade Filter</label>
            <select className="form-input" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
              <option value="">All Grades</option>
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
              <option value="Grade C">Grade C</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} />
          Report Audit Trail ({reportRows.length} Records)
        </h4>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Generating report data...</div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Report Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Batch #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Product</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Details</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((r) => (
                  <tr key={r.record_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.date}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{r.type}</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--primary)' }}>{r.batch_number}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.product_name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{r.details}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="role-badge role-FARMER">{r.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800 }}>
                      {r.metric_value !== undefined ? r.metric_value : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
