import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Settings, Zap } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'https://lifeos-ai-backend.onrender.com';

const typeColors: Record<string, string> = {
  SMART:    'bg-cyan-500/20 text-cyan-300 border-cyan-500/20',
  SYSTEM:   'bg-indigo-500/20 text-indigo-300 border-indigo-500/20',
  DEADLINE: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
  ALERT:    'bg-purple-500/20 text-purple-300 border-purple-500/20',
};

const typeIcons: Record<string, string> = {
  SMART: '🤖',
  SYSTEM: '🔔',
  DEADLINE: '⏰',
  ALERT: '📢',
};

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllRead, fetchNotifications, triggerToast } = useNotifications();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const sendTestNotification = async () => {
    if (!token) return;
    setTestLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast('Test Sent ✅', data.message || 'Test notification created.', 'success');
        fetchNotifications();
      } else {
        triggerToast('Test Failed', data.error || 'Could not send test.', 'danger');
      }
    } catch (err) {
      triggerToast('Error', 'Network error sending test notification.', 'danger');
    } finally {
      setTestLoading(false);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open) fetchNotifications();
  };

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative z-50" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-xl glass-card border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/20 transition-all duration-200 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-pulse text-indigo-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-[#050816]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute top-12 right-0 w-80 rounded-2xl glass-panel border border-white/8 shadow-2xl shadow-black/50 overflow-hidden"
          style={{ animation: 'slideDown 0.18s ease-out' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-indigo-400" />
              <span className="font-bold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-[10px] font-semibold text-white/50 hover:text-white/80 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  <CheckCheck size={13} />
                  All read
                </button>
              )}
              <button onClick={() => { setOpen(false); navigate('/settings'); }} title="Notification Settings" className="text-white/40 hover:text-white/80 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
                <Settings size={14} />
              </button>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                <span className="text-3xl">🔕</span>
                <p className="text-xs text-white/40">No notifications yet. Complete activities to earn reminders!</p>
              </div>
            ) : (
              recent.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/3 cursor-pointer hover:bg-white/3 transition-colors group ${!n.isRead ? 'bg-white/2' : ''}`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-xs font-bold truncate ${!n.isRead ? 'text-white' : 'text-white/60'}`}>{n.title}</p>
                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border font-bold ${typeColors[n.type] || typeColors.SYSTEM}`}>{n.type}</span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-white/25 mt-1">{new Date(n.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/5 flex justify-between items-center gap-2">
            <button
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={sendTestNotification}
              disabled={testLoading}
              title="Send a test notification to verify the pipeline"
              className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors disabled:opacity-50"
            >
              <Zap size={11} className={testLoading ? 'animate-pulse' : ''} />
              {testLoading ? 'Sending...' : 'Test'}
            </button>
            <button
              onClick={() => { setOpen(false); fetchNotifications(); }}
              className="text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
