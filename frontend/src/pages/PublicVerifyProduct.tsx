import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Lock,
  Search,
  ArrowLeft,
  MapPin,
  Award,
  ShieldCheck
} from 'lucide-react';

interface TimelineStep {
  step_number: number;
  title: string;
  description: string;
  timestamp?: string;
  is_completed: boolean;
}

type AuthenticityStatus = 'VERIFIED' | 'SUSPICIOUS' | 'REVOKED' | 'UNKNOWN';

interface PublicVerificationData {
  is_valid: boolean;
  authenticity_status: AuthenticityStatus;
  status_explanation: string;
  qr_code: string;
  batch_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  current_status: string;
  current_location: string;
  farmer_name: string;
  farm_name: string;
  farm_address: string;
  origin_region: string;
  harvest_date: string;
  quality_grade?: string;
  inspection_status?: string;
  warehouse_name?: string;
  transport_tracking_number?: string;
  retailer_name?: string;
  timeline: TimelineStep[];
}

export const PublicVerifyProduct: React.FC = () => {
  const { qrCode: routeQrCode } = useParams<{ qrCode: string }>();
  const [inputQr, setInputQr] = useState(routeQrCode || '');
  const [data, setData] = useState<PublicVerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async (targetCode: string) => {
    if (!targetCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/verify/${targetCode}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Batch or QR code not found');
      }
      const verifiedData = await res.json();
      setData(verifiedData);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeQrCode) {
      fetchVerification(routeQrCode);
    }
  }, [routeQrCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVerification(inputQr.trim());
  };

  const renderStatusCard = (status: AuthenticityStatus, explanation: string, qrCode: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <div
            className="glass-card"
            style={{
              textAlign: 'center',
              padding: '1.75rem',
              borderColor: '#10b981',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(16,185,129,0.15) 100%)'
            }}
          >
            <CheckCircle2 size={46} style={{ color: '#34d399', margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginBottom: '0.35rem' }}>
              VERIFIED AUTHENTIC PRODUCT
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#e2e8f0', maxWidth: '600px', margin: '0 auto 0.5rem' }}>
              {explanation}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Provenance Code: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{qrCode}</strong>
            </div>
          </div>
        );

      case 'SUSPICIOUS':
        return (
          <div
            className="glass-card"
            style={{
              textAlign: 'center',
              padding: '1.75rem',
              borderColor: '#f59e0b',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(245,158,11,0.15) 100%)'
            }}
          >
            <AlertTriangle size={46} style={{ color: '#fbbf24', margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.35rem' }}>
              SUSPICIOUS / FLAG ALERT
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#fef3c7', maxWidth: '600px', margin: '0 auto 0.5rem' }}>
              {explanation}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Traceability Code: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{qrCode}</strong>
            </div>
          </div>
        );

      case 'REVOKED':
        return (
          <div
            className="glass-card"
            style={{
              textAlign: 'center',
              padding: '1.75rem',
              borderColor: '#f43f5e',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(244,63,94,0.18) 100%)'
            }}
          >
            <XCircle size={46} style={{ color: '#f43f5e', margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e', marginBottom: '0.35rem' }}>
              REVOKED / REJECTED BATCH
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#fecdd3', maxWidth: '600px', margin: '0 auto 0.5rem' }}>
              {explanation}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Traceability Code: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{qrCode}</strong>
            </div>
          </div>
        );

      default:
        return (
          <div
            className="glass-card"
            style={{
              textAlign: 'center',
              padding: '1.75rem',
              borderColor: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.03)'
            }}
          >
            <HelpCircle size={46} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              UNKNOWN / UNVERIFIED CODE
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
              This QR code or batch number could not be validated in the AgriTrace system registry.
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-primary)', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        
        {/* Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> AgriTrace Portal
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
            <ShieldCheck size={16} /> Public Verification Portal
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)', marginBottom: '0.75rem' }}>
            <QrCode size={38} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Customer Authenticity Verification
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '540px', margin: '0 auto' }}>
            Scan product QR code or enter batch number to inspect origin region, quality inspection grade, and supply chain journey.
          </p>
        </div>

        {/* Scan & Search Bar */}
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Scan QR or enter Batch Number (e.g. TOM-2026-0001)..."
                value={inputQr}
                onChange={(e) => setInputQr(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.66rem 1.35rem' }}>
              Inspect Product
            </button>
          </form>
        </div>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving Consumer Traceability Passport...
          </div>
        )}

        {error && (
          <div className="alert-error" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '2rem' }}>
            <XCircle size={28} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
            <strong>Verification Error:</strong> {error}
          </div>
        )}

        {data && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Dynamic Status Card */}
            {renderStatusCard(data.authenticity_status, data.status_explanation, data.qr_code)}

            {/* Authenticity Statuses Guide Grid */}
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AgriTrace Authenticity Statuses Guide
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <strong style={{ color: '#34d399', display: 'block' }}>✓ VERIFIED</strong>
                  Authentic, quality-inspected, un-tampered product from verified farmer.
                </div>
                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <strong style={{ color: '#fbbf24', display: 'block' }}>⚠ SUSPICIOUS</strong>
                  Flagged due to cold-chain temperature deviations or pending review.
                </div>
                <div style={{ background: 'rgba(244,63,94,0.1)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)' }}>
                  <strong style={{ color: '#f43f5e', display: 'block' }}>✕ REVOKED</strong>
                  Failed safety testing or officially recalled from market.
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--text-muted)', display: 'block' }}>? UNKNOWN</strong>
                  Unrecognized batch number or unregistered product code.
                </div>
              </div>
            </div>

            {/* Product & Origin Overview */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', color: '#ffffff' }}>
                Product Origin & Quality Specifications
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRODUCT</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{data.product_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BATCH NUMBER</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{data.batch_number}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORIGIN FARM & REGION</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    <MapPin size={14} style={{ display: 'inline', color: 'var(--primary)', marginRight: '0.2rem' }} />
                    {data.farm_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{data.origin_region}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HARVEST DATE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{new Date(data.harvest_date).toLocaleDateString()}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Producer: {data.farmer_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QUALITY GRADE</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                    <Award size={16} style={{ color: '#fbbf24' }} />
                    <span className="role-badge role-FARMER" style={{ fontWeight: 800 }}>Grade {data.quality_grade} ({data.inspection_status})</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT LOCATION</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{data.current_location}</div>
                </div>
              </div>
            </div>

            {/* Provenance Step Journey Timeline */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                7-Step Farm-to-Table Supply Chain Journey
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {data.timeline.map((step) => (
                  <div
                    key={step.step_number}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: step.is_completed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: step.is_completed ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ marginTop: '0.1rem' }}>
                      {step.is_completed ? (
                        <CheckCircle2 size={20} style={{ color: '#34d399' }} />
                      ) : (
                        <Clock size={20} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: step.is_completed ? '#ffffff' : 'var(--text-secondary)' }}>
                          Step {step.step_number}: {step.title}
                        </div>
                        {step.timestamp && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(step.timestamp).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Protection Shield Banner */}
            <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Lock size={13} style={{ display: 'inline', color: '#34d399', marginRight: '0.25rem' }} />
              Protected Public Passport. Sensitive business details, farmer phone numbers, and private logs remain encrypted.
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
