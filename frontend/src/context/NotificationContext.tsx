import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_URL || 'https://lifeos-ai-backend.onrender.com';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info' | 'ai';
  visible: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  triggerToast: (title: string, message: string, type?: 'success' | 'warning' | 'danger' | 'info' | 'ai') => void;
  toast: ToastItem | null;
  triggerConfetti: () => void;
  requestPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper: Convert VAPID base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Register service worker once
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        swRegistration.current = reg;
      }).catch(err => console.warn('SW registration failed:', err));
    }
    // Read current permission state
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    } else {
      setPushPermission('unsupported');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Auto-subscribe if already granted
      if ('Notification' in window && Notification.permission === 'granted') {
        subscribeToPush().catch(console.warn);
      }
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, token]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) setNotifications(await response.json());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => markAsRead(n.id)));
  };

  // Subscribe to Web Push
  const subscribeToPush = useCallback(async () => {
    if (!token || !swRegistration.current) return;
    try {
      const keyRes = await fetch(`${API_BASE}/api/notifications/vapid-key`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!keyRes.ok) return;
      const { publicKey } = await keyRes.json();

      const subscription = await swRegistration.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch(`${API_BASE}/api/notifications/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subscription, deviceType: 'web' }),
      });
    } catch (err) {
      console.warn('Push subscription failed:', err);
    }
  }, [token]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      setPushPermission('unsupported');
      triggerToast('Not Supported', 'Your browser does not support push notifications.', 'warning');
      return;
    }
    if (Notification.permission === 'granted') {
      await subscribeToPush();
      setPushPermission('granted');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      await subscribeToPush();
      triggerToast('Notifications Enabled', '🔔 You will now receive daily reminders!', 'success');
    } else {
      triggerToast('Permission Denied', 'In-app notifications will be used as fallback.', 'info');
    }
  };

  const triggerToast = (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info' | 'ai' = 'info') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    const id = Math.random().toString(36).slice(2);
    setToast({ id, title, message, type, visible: true });
    toastTimeout.current = setTimeout(() => {
      setToast(prev => (prev?.id === id ? { ...prev, visible: false } : prev));
      setTimeout(() => setToast(null), 400);
    }, 4500);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#6366F1', '#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B'],
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const typeStyles: Record<string, string> = {
    success: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30 shadow-emerald-500/10',
    danger:  'bg-rose-950/90 text-rose-200 border-rose-500/30 shadow-rose-500/10',
    warning: 'bg-amber-950/90 text-amber-200 border-amber-500/30 shadow-amber-500/10',
    info:    'bg-indigo-950/90 text-indigo-200 border-indigo-500/30 shadow-indigo-500/10',
    ai:      'bg-cyan-950/90 text-cyan-200 border-cyan-500/30 shadow-cyan-500/10',
  };

  const typeIcons: Record<string, string> = {
    success: '✅',
    danger:  '❌',
    warning: '⚠️',
    info:    'ℹ️',
    ai:      '🤖',
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pushPermission,
        fetchNotifications,
        markAsRead,
        markAllRead,
        triggerToast,
        toast,
        triggerConfetti,
        requestPushPermission,
      }}
    >
      {children}

      {/* Animated Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] max-w-sm w-full rounded-2xl p-4 border shadow-2xl backdrop-blur-xl
            transition-all duration-400 ease-out
            ${toast.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
            ${typeStyles[toast.type] || typeStyles.info}
          `}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-lg shrink-0 mt-0.5">{typeIcons[toast.type] || 'ℹ️'}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {toast.type === 'ai' && (
                    <span className="text-[9px] uppercase font-black tracking-widest bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">AI Agent</span>
                  )}
                  <p className="font-bold text-sm truncate">{toast.title}</p>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 text-white/30 hover:text-white/80 transition-colors text-lg leading-none cursor-pointer"
            >
              ✕
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/30 rounded-full toast-progress"
              style={{ animationDuration: '4.5s' }}
            />
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
