import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';
import { Sprout, Lock, Mail, User, Phone, Building, ArrowRight } from 'lucide-react';

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'FARMER', label: 'Farmer', desc: 'Crop cultivation, harvest logs & batch creation' },
  { value: 'QUALITY_OFFICER', label: 'Quality Officer', desc: 'Inspection, grading & lab certification' },
  { value: 'WAREHOUSE_MANAGER', label: 'Warehouse Manager', desc: 'Cold storage & inventory tracking' },
  { value: 'TRANSPORT_MANAGER', label: 'Transport Manager', desc: 'Logistics, fleet management & dispatch' },
  { value: 'DRIVER', label: 'Transport Driver', desc: 'In-transit telemetry & delivery logs' },
  { value: 'RETAILER', label: 'Retailer', desc: 'Store receipt & retail point-of-sale' },
  { value: 'CUSTOMER', label: 'Customer', desc: 'Public QR verification & provenance scan' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'System governance & user management' }
];

export const Register: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [organization, setOrganization] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
        role,
        phone_number: phoneNumber || undefined,
        organization: organization || undefined
      });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-box fade-in" style={{ maxWidth: '540px' }}>
        <div className="auth-header">
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'var(--primary-light)', borderRadius: '14px', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            <Sprout size={36} />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join the AgriTrace Farm-to-Market Network</p>
        </div>

        {error && <div className="alert-error">{error}</div>}
        {success && <div className="alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="jane@farm.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">System Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label} — {r.desc}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="+1 555 0192"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Organization / Farm</label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="Green Acres Organic"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Complete Registration'} <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
