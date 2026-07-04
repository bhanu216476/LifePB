import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus } from 'lucide-react';

interface ScreenTimeLog {
  id: string;
  appName: string;
  durationMinutes: number;
  category: string; // PRODUCTIVE, DISTRACTING, NEUTRAL
  loggedDate: string;
}

const DigitalHabitsPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast } = useNotifications();

  // State
  const [logs, setLogs] = useState<ScreenTimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [appName, setAppName] = useState('');
  const [minutes, setMinutes] = useState('');
  const [category, setCategory] = useState('PRODUCTIVE');

  const fetchDigitalLogs = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/digital', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setLogs(await response.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDigitalLogs();
  }, [token]);

  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !minutes) return;

    try {
      const response = await fetch('http://localhost:5000/api/digital', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appName,
          durationMinutes: parseInt(minutes),
          category
        })
      });

      if (response.ok) {
        triggerToast('Screen Time Logged', 'Digital register updated.', 'success');
        setAppName('');
        setMinutes('');
        setShowAddForm(false);
        fetchDigitalLogs();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Calculations
  const totalMinutes = logs.reduce((acc, l) => acc + l.durationMinutes, 0);
  const productiveMinutes = logs.filter(l => l.category === 'PRODUCTIVE').reduce((acc, l) => acc + l.durationMinutes, 0);
  const distractingMinutes = logs.filter(l => l.category === 'DISTRACTING').reduce((acc, l) => acc + l.durationMinutes, 0);

  // Distraction Score = (Distracting / Total) * 100
  const distractionScore = totalMinutes > 0 ? Math.round((distractingMinutes / totalMinutes) * 100) : 0;
  const ratingText = distractionScore > 50 ? 'Critical Distraction' : distractionScore > 20 ? 'Optimal focus' : 'Exceptional Focus';

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Digital Registry</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Digital Habits & Screentime</h1>
          <p className="text-xs text-white/50 mt-1">Track app workflows, lock down distraction scores, and protect focus blocks.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>Log Application</span>
        </button>
      </header>

      {/* Log Form modal overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Log App Usage</h3>
            <form onSubmit={handleLogUsage} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">App Name</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="e.g. VS Code, Chrome, Twitter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Minutes</label>
                  <input
                    type="number"
                    required
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white font-mono"
                    placeholder="120"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Focus Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="PRODUCTIVE">Productive</option>
                    <option value="DISTRACTING">Distracting</option>
                    <option value="NEUTRAL">Neutral</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Log screen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Total Screentime</span>
          <p className="text-3xl font-black font-mono text-white mt-2">{(totalMinutes / 60).toFixed(1)}h</p>
        </div>
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Productive Work</span>
          <p className="text-3xl font-black font-mono text-[#06B6D4] mt-2">{(productiveMinutes / 60).toFixed(1)}h</p>
        </div>
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Distractions</span>
          <p className="text-3xl font-black font-mono text-rose-400 mt-2">{(distractingMinutes / 60).toFixed(1)}h</p>
        </div>
        <div className={`glass-card rounded-[20px] p-5 border
          ${distractionScore > 40 ? 'border-rose-500/20 shadow-rose-500/5' : 'border-emerald-500/20 shadow-emerald-500/5'}`}>
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Distraction Score</span>
          <p className={`text-3xl font-black font-mono mt-2
            ${distractionScore > 40 ? 'text-rose-400' : 'text-emerald-400'}`}>{distractionScore}%</p>
          <span className="text-[10px] text-white/30 block mt-1 font-semibold">{ratingText}</span>
        </div>
      </section>

      {/* Tabular logs lists */}
      <section className="glass-card rounded-[24px] overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2 text-white/40 text-xxs font-bold tracking-wider uppercase">
              <th className="py-4 px-6">Application Name</th>
              <th className="py-4 px-3">Category</th>
              <th className="py-4 px-3">Usage Time</th>
              <th className="py-4 px-6">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="border-b border-white/5 animate-pulse">
                  <td className="py-5 px-6"><div className="h-4 bg-white/5 rounded w-1/3" /></td>
                  <td className="py-5 px-3"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="py-5 px-3"><div className="h-4 bg-white/5 rounded w-10" /></td>
                  <td className="py-5 px-6"><div className="h-4 bg-white/5 rounded w-24" /></td>
                </tr>
              ))
            ) : logs.length > 0 ? (
              logs.slice().reverse().map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/1 text-sm font-medium">
                  <td className="py-4 px-6 font-semibold">{log.appName}</td>
                  <td className="py-4 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                      ${log.category === 'PRODUCTIVE' ? 'bg-cyan-950 text-cyan-300' : ''}
                      ${log.category === 'DISTRACTING' ? 'bg-rose-950 text-rose-300' : ''}
                      ${log.category === 'NEUTRAL' ? 'bg-zinc-800 text-zinc-300' : ''}
                    `}>
                      {log.category}
                    </span>
                  </td>
                  <td className="py-4 px-3 font-mono text-white/70">{log.durationMinutes} mins</td>
                  <td className="py-4 px-6 font-mono text-xs text-white/40">
                    {new Date(log.loggedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-16 text-white/30">Digital registry is empty.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default DigitalHabitsPage;
