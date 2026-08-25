import React, { useEffect, useState, useRef } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, ShieldCheck, Sprout, Truck, Store, X } from 'lucide-react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      if (!token) return;

      const [listRes, countRes] = await Promise.all([
        fetch('/api/v1/notifications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (listRes.ok) setNotifications(await listRes.json());
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.unread_count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('agritrace_access_token');
      const res = await fetch('/api/v1/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('TEMPERATURE') || type.includes('REJECTED')) {
      return <AlertTriangle size={16} style={{ color: '#f43f5e' }} />;
    }
    if (type.includes('APPROVED') || type.includes('VERIFICATION')) {
      return <ShieldCheck size={16} style={{ color: '#34d399' }} />;
    }
    if (type.includes('HARVEST')) {
      return <Sprout size={16} style={{ color: '#10b981' }} />;
    }
    if (type.includes('SHIPMENT') || type.includes('TRANSPORT')) {
      return <Truck size={16} style={{ color: '#60a5fa' }} />;
    }
    if (type.includes('RETAIL')) {
      return <Store size={16} style={{ color: '#c084fc' }} />;
    }
    return <Info size={16} style={{ color: 'var(--primary)' }} />;
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          padding: '0.55rem',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#f43f5e',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-full)',
              padding: '0.15rem 0.45rem',
              minWidth: '18px',
              textAlign: 'center',
              border: '2px solid var(--bg-dark)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div
          className="glass-panel fade-in"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 12px)',
            width: '380px',
            maxHeight: '480px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '1.25rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} style={{ color: 'var(--primary)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>Notifications</h4>
              {unreadCount > 0 && (
                <span className="role-badge role-SUPER_ADMIN" style={{ fontSize: '0.7rem' }}>
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No notifications at this time.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: n.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(16, 185, 129, 0.08)',
                    border: n.read ? '1px solid var(--border-color)' : '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ marginTop: '0.15rem' }}>{getNotificationIcon(n.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: n.read ? 'var(--text-secondary)' : '#ffffff' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => markAsRead(n.id, e)}
                      title="Mark as read"
                      style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
