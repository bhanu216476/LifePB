import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell, Clock, User, Shield,
  Loader2, CheckCircle2, Globe, Briefcase, Key
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://lifeos-ai-backend.onrender.com';

interface NotifSettings {
  notificationEnabled: boolean;
  reminderTimes: string;
}

const REMINDER_SLOTS = [
  { label: '🌞 Morning', key: 'morning', default: '09:00' },
  { label: '📈 Afternoon', key: 'afternoon', default: '14:00' },
  { label: '🌙 Evening', key: 'evening', default: '20:00' },
];

const SettingsPage: React.FC = () => {
  const { user, token, updateProfile, refreshProfile } = useAuth();
  const { pushPermission, requestPushPermission, triggerToast } = useNotifications();

  const [notifSettings, setNotifSettings] = useState<NotifSettings>({ notificationEnabled: true, reminderTimes: '09:00,14:00,20:00' });
  const [reminderSlots, setReminderSlots] = useState(['09:00', '14:00', '20:00']);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [savedNotif, setSavedNotif] = useState(false);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [timezone, setTimezone] = useState(user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Fetch notification settings
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/notifications/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (data.reminderTimes) {
        setNotifSettings(data);
        setReminderSlots(data.reminderTimes.split(',').map((t: string) => t.trim()));
      }
    }).catch(console.warn);
  }, [token]);

  const handleSaveNotifications = async () => {
    if (!token) return;
    setLoadingNotif(true);
    try {
      const reminderTimes = reminderSlots.filter(Boolean).join(',');
      const res = await fetch(`${API_BASE}/api/notifications/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationEnabled: notifSettings.notificationEnabled, reminderTimes }),
      });
      if (res.ok) {
        setSavedNotif(true);
        triggerToast('Settings Saved', 'Notification preferences updated!', 'success');
        setTimeout(() => setSavedNotif(false), 2000);
      }
    } catch (e) {
      triggerToast('Error', 'Failed to save settings.', 'danger');
    } finally {
      setLoadingNotif(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      await updateProfile({ name, occupation, timezone });
      await refreshProfile();
      triggerToast('Profile Updated', 'Your profile has been saved.', 'success');
    } catch (err: any) {
      triggerToast('Error', err.message || 'Failed to save profile.', 'danger');
    } finally {
      setLoadingProfile(false);
    }
  };

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header>
        <span className="text-xxs font-extrabold uppercase tracking-widest text-[#8B5CF6]">Configuration</span>
        <h1 className="text-3xl font-extrabold tracking-tight mt-1">Settings</h1>
        <p className="text-xs text-white/50 mt-1">Manage notifications, profile, and preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ─── Notification Settings ─── */}
        <section className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center">
              <Bell size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-base">Notifications</h2>
              <p className="text-xxs text-white/40">Configure daily reminder alerts</p>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/5">
            <div>
              <p className="text-sm font-semibold">Daily Reminders</p>
              <p className="text-xxs text-white/40 mt-0.5">Send 2-3 motivational notifications per day</p>
            </div>
            <button
              onClick={() => setNotifSettings(s => ({ ...s, notificationEnabled: !s.notificationEnabled }))}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer border ${
                notifSettings.notificationEnabled
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500/40'
                  : 'bg-white/10 border-white/10'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                notifSettings.notificationEnabled ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Reminder Time Slots */}
          {notifSettings.notificationEnabled && (
            <div className="flex flex-col gap-3">
              <p className="text-xxs font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
                <Clock size={11} /> Reminder Times
              </p>
              {REMINDER_SLOTS.map((slot, i) => (
                <div key={slot.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                  <span className="text-sm w-28">{slot.label}</span>
                  <input
                    type="time"
                    value={reminderSlots[i] || slot.default}
                    onChange={e => {
                      const updated = [...reminderSlots];
                      updated[i] = e.target.value;
                      setReminderSlots(updated);
                    }}
                    className="glass-input rounded-lg px-3 py-1.5 text-sm text-white flex-1"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Push Notification Permission */}
          <div className="p-4 rounded-xl border border-white/5 bg-white/2 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  Browser Push Notifications
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    pushPermission === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' :
                    pushPermission === 'denied'  ? 'bg-rose-500/20 text-rose-300 border-rose-500/20' :
                    pushPermission === 'unsupported' ? 'bg-white/10 text-white/40 border-white/10' :
                    'bg-amber-500/20 text-amber-300 border-amber-500/20'
                  }`}>
                    {pushPermission === 'granted' ? '✅ Enabled' :
                     pushPermission === 'denied'  ? '🚫 Denied' :
                     pushPermission === 'unsupported' ? '❌ Not Supported' : '⏳ Pending'}
                  </span>
                </p>
                <p className="text-xxs text-white/40 mt-0.5">
                  {pushPermission === 'granted' ? 'You will receive browser push notifications.' :
                   pushPermission === 'denied'  ? 'Permission denied. Please enable in browser settings.' :
                   pushPermission === 'unsupported' ? 'Your browser does not support push.' :
                   'Allow browser notifications for best experience.'}
                </p>
              </div>
              {pushPermission !== 'granted' && pushPermission !== 'denied' && pushPermission !== 'unsupported' && (
                <button
                  onClick={requestPushPermission}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 cursor-pointer shadow-lg shadow-indigo-500/20 transition-all"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={loadingNotif}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 cursor-pointer shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            {loadingNotif ? <Loader2 size={16} className="animate-spin" /> : savedNotif ? <CheckCircle2 size={16} /> : <Bell size={16} />}
            {loadingNotif ? 'Saving...' : savedNotif ? 'Saved!' : 'Save Notification Settings'}
          </button>
        </section>

        {/* ─── Profile Settings ─── */}
        <section className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-500/20 flex items-center justify-center overflow-hidden">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-purple-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-base">Profile</h2>
              <p className="text-xxs text-white/40">
                {user?.authProvider === 'GOOGLE' ? '🔑 Connected via Google' : '📧 Email & Password'} · {user?.email}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="Your name" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Occupation</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="e.g. Software Engineer" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Timezone</label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="e.g. Asia/Kolkata" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loadingProfile}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 cursor-pointer shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
            >
              {loadingProfile ? <Loader2 size={16} className="animate-spin" /> : <User size={16} />}
              {loadingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* ─── App Info ─── */}
        <section className="glass-card rounded-2xl p-6 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/20 flex items-center justify-center">
              <Shield size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="font-bold text-base">Security & Account Info</h2>
              <p className="text-xxs text-white/40">Current session and activity details</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Auth Provider', value: user?.authProvider || 'EMAIL', icon: Key },
              { label: 'Login Streak', value: `${user?.streak || 0} days 🔥`, icon: null },
              { label: 'Email', value: user?.email || '', icon: null },
              { label: 'Notifications', value: notifSettings.notificationEnabled ? '✅ Enabled' : '🔕 Disabled', icon: null },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-white/3 border border-white/5">
                <p className="text-xxs text-white/40 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-white truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
