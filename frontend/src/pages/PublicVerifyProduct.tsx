import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Search,
  ArrowLeft
} from 'lucide-react';

interface TimelineStep {
  step_number: number;
  title: string;
  description: string;
  timestamp?: string;
  is_completed: boolean;
}

interface PublicVerificationData {
  is_valid: boolean;
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-primary)', padding: '1.5rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
            <ArrowLeft size={16} /> AgriTrace Home
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <Lock size={14} style={{ color: '#34d399' }} /> Public Verification Passport
          </div>
        </div>

        {/* Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--primary)', marginBottom: '0.75rem' }}>
            <QrCode size={36} />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Consumer Traceability Passport
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto' }}>
            Verify authentic farm origin, quality inspection certificates, cold-chain history, and store distribution.
          </p>
        </div>

        {/* Scan / Manual Entry Input */}
        <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Scan or enter QR Code / Batch # (e.g. TOM-2026-0001)..."
                value={inputQr}
                onChange={(e) => setInputQr(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
              Verify
            </button>
          </form>
        </div>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Retrieving Immutable Traceability Passport...
          </div>
        )}

        {error && (
          <div className="alert-error" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '2rem' }}>
            <XCircle size={28} style={{ display: 'block', margin: '0 auto 0.5rem' }} />
            <strong>Verification Failed:</strong> {error}
          </div>
        )}

        {data && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Authenticity Status Card */}
            <div
              className="glass-card"
              style={{
                textAlign: 'center',
                padding: '1.75rem',
                borderColor: data.is_valid ? 'var(--primary)' : '#f43f5e',
                background: data.is_valid ? 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(16,185,129,0.12) 100%)' : 'rgba(244,63,94,0.1)'
              }}
            >
              {data.is_valid ? (
                <>
                  <CheckCircle2 size={44} style={{ color: '#34d399', margin: '0 auto 0.75rem' }} />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginBottom: '0.25rem' }}>
                    100% AUTHENTIC & VERIFIED
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Traceability Code: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{data.qr_code}</strong>
                  </p>
                </>
              ) : (
                <>
                  <XCircle size={44} style={{ color: '#f43f5e', margin: '0 auto 0.75rem' }} />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e', marginBottom: '0.25rem' }}>
                    REVOKED / REJECTED BATCH
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    This batch failed safety inspection or has been recalled.
                  </p>
                </>
              )}
            </div>

            {/* Product Overview Grid */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: '#ffffff' }}>
                Product Provenance Passport
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRODUCT NAME</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{data.product_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BATCH NUMBER</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{data.batch_number}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORIGIN FARM</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{data.farm_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {data.farmer_name}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HARVEST DATE</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{new Date(data.harvest_date).toLocaleDateString()}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QUALITY GRADE</div>
                  <span className="role-badge role-FARMER">Grade {data.quality_grade} ({data.inspection_status})</span>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT LOCATION</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{data.current_location}</div>
                </div>
              </div>
            </div>

            {/* Provenance Step Timeline */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                7-Step Farm-to-Market Supply Chain Lifecycle
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

            {/* Privacy Protection Banner */}
            <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              🔒 Protected Traceability Passport. Sensitive personal contact details and internal business logs are encrypted & secured.
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
