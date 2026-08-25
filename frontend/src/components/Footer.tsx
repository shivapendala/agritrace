import { Sprout } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ borderTop: '1px solid var(--border-color)', padding: '2rem', marginTop: 'auto', background: 'rgba(9, 13, 22, 0.95)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sprout size={18} style={{ color: 'var(--primary)' }} />
          <strong style={{ color: '#ffffff' }}>AgriTrace Platform</strong> — Complete Farm-to-Market Traceability
        </div>
        <div>
          © {new Date().getFullYear()} AgriTrace. All rights reserved. Real business logic & verified RBAC architecture.
        </div>
      </div>
    </footer>
  );
};
