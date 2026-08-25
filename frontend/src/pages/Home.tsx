import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShieldCheck, Truck, Warehouse, QrCode, Store, Activity, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Home: React.FC = () => {
  const [healthInfo, setHealthInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setHealthInfo(data))
      .catch(() => setHealthInfo({ status: 'offline', database: 'disconnected' }));
  }, []);

  const features = [
    { title: 'Harvest & Batch Creation', desc: 'Farmers log crop origins, GPS field locations, harvest timestamps & batch IDs.', icon: Sprout, color: '#34d399' },
    { title: 'Quality Inspection', desc: 'Certified quality officers record lab metrics, grading, and safety compliance.', icon: ShieldCheck, color: '#60a5fa' },
    { title: 'Warehouse & Cold Storage', desc: 'Track storage allocations, humidity, temperature, and inventory movements.', icon: Warehouse, color: '#fbbf24' },
    { title: 'Cold-Chain Transport', desc: 'Real-time transit telemetry, vehicle routing, and driver hand-offs.', icon: Truck, color: '#f472b6' },
    { title: 'Retailer Receipt', desc: 'Store inventory receipt logging and retail point-of-sale provenance links.', icon: Store, color: '#c084fc' },
    { title: 'Customer QR Scan', desc: 'Instant public QR verification tracing product journey back to original farm.', icon: QrCode, color: '#38bdf8' },
  ];

  return (
    <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Section */}
      <div className="glass-panel fade-in" style={{ padding: '3.5rem 2.5rem', textWrap: 'balance', marginBottom: '3rem', background: 'linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(16,185,129,0.12) 100%)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'var(--primary-light)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-full)', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          <Activity size={16} /> Production-Grade Traceability Platform
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1rem', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Farm-to-Market Agricultural Product Provenance & Transparency
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: 1.6, marginBottom: '2rem' }}>
          AgriTrace seamlessly tracks agricultural products from initial farmer harvest through quality inspection, cold storage, transportation telemetry, retail receipt, and instant consumer QR code verification.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
            Get Started <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
            Sign In to Platform
          </Link>
        </div>

        {/* Backend Health Status Badge */}
        {healthInfo && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: healthInfo.status === 'online' ? '#34d399' : '#f43f5e' }}>
              <CheckCircle2 size={16} /> System Status: <strong style={{ color: '#ffffff' }}>{healthInfo.status.toUpperCase()}</strong>
            </div>
            <div>PostgreSQL DB: <strong style={{ color: 'var(--text-secondary)' }}>{healthInfo.database}</strong></div>
            <div>Environment: <strong style={{ color: 'var(--text-secondary)' }}>{healthInfo.environment}</strong></div>
          </div>
        )}
      </div>

      {/* Feature Capabilities Grid */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ffffff', textAlign: 'center' }}>
        Core Supply Chain Workflow Lifecycle
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div key={idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '12px', background: `${feat.color}20`, color: feat.color, width: 'fit-content' }}>
                <Icon size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>{feat.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feat.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
