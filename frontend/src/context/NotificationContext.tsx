import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string; // SMART, SYSTEM, DEADLINE, ALERT
  isRead: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  triggerToast: (title: string, message: string, type?: 'success' | 'warning' | 'danger' | 'info' | 'ai') => void;
  toast: { title: string; message: string; type: string; visible: boolean } | null;
  triggerConfetti: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; type: string; visible: boolean } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const triggerToast = (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info' | 'ai' = 'info') => {
    setToast({ title, message, type, visible: true });
    
    // Auto hide after 4 seconds
    setTimeout(() => {
      setToast(prev => (prev ? { ...prev, visible: false } : null));
    }, 4000);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#6366F1', '#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B'],
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        triggerToast,
        toast,
        triggerConfetti,
      }}
    >
      {children}
      
      {/* Toast Notification popup */}
      {toast && toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 flex max-w-sm flex-col gap-1 rounded-xl p-4 shadow-xl backdrop-blur-md border border-white/8 transition-all duration-300 transform translate-y-0
          ${toast.type === 'success' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/20' : ''}
          ${toast.type === 'danger' ? 'bg-rose-950/80 text-rose-300 border-rose-500/20' : ''}
          ${toast.type === 'warning' ? 'bg-amber-950/80 text-amber-300 border-amber-500/20' : ''}
          ${toast.type === 'info' ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/20' : ''}
          ${toast.type === 'ai' ? 'bg-cyan-950/80 text-cyan-200 border-cyan-500/20 shadow-cyan-500/10 glow-accent' : ''}
        `}>
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5">
              {toast.type === 'ai' && <span className="text-xs uppercase bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">AI Agent</span>}
              {toast.title}
            </span>
            <button 
              onClick={() => setToast(prev => (prev ? { ...prev, visible: false } : null))}
              className="text-white/40 hover:text-white text-xs cursor-pointer ml-3"
            >
              ✕
            </button>
          </div>
          <div className="text-sm text-white/75 mt-1">{toast.message}</div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
