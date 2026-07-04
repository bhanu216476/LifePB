import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Flame, Trash2, Check, Zap } from 'lucide-react';

interface HabitLog {
  id: string;
  completedAt: string;
  status: string; // COMPLETED, SKIPPED
  notes: string | null;
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
  targetCount: number;
  streakCount: number;
  maxStreak: number;
  category: string;
  logs: HabitLog[];
}

const HabitsPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [category, setCategory] = useState('HEALTH');

  const fetchHabits = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/habits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchHabits();
  }, [token]);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const response = await fetch('http://localhost:5000/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, frequency, category })
      });

      if (response.ok) {
        triggerToast('Routine Established', `"${name}" integrated into scheduling core.`, 'success');
        setName('');
        setShowAddForm(false);
        fetchHabits();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogHabit = async (id: string, status: 'COMPLETED' | 'SKIPPED') => {
    try {
      const response = await fetch(`http://localhost:5000/api/habits/${id}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, notes: 'Logged via platform client' })
      });

      if (response.ok) {
        if (status === 'COMPLETED') {
          triggerToast('Habit Completed', 'Routine locked in. Streak incremented (+30 XP).', 'success');
          triggerConfetti();
        } else {
          triggerToast('Habit Logged', 'Skipped logged. Streak reset.', 'warning');
        }
        fetchHabits();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!confirm('Permanently delete this habit and all logged logs?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/habits/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerToast('Habit Purged', 'Habit metadata removed.', 'warning');
        setHabits(prev => prev.filter(h => h.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Helper: check if completed today
  const isCompletedToday = (habit: Habit) => {
    const todayStr = new Date().toDateString();
    return habit.logs.some(log => new Date(log.completedAt).toDateString() === todayStr && log.status === 'COMPLETED');
  };

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Routine Engine</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Habits & Routines</h1>
          <p className="text-xs text-white/50 mt-1">Sustain cognitive loops and unlock performance multipliers.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>Add Routine</span>
        </button>
      </header>

      {/* Habit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Establish Routine Core</h3>
            <form onSubmit={handleCreateHabit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Habit Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="e.g. Read 15 pages of philosophy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="HEALTH">Health</option>
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="LEARNING">Learning</option>
                    <option value="MINDFULNESS">Mindfulness</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-black"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid of habits */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="glass-card rounded-[22px] p-6 h-48 animate-pulse" />
          ))
        ) : habits.length > 0 ? (
          habits.map(habit => {
            const completedToday = isCompletedToday(habit);
            const totalLogs = habit.logs.length;
            const successLogs = habit.logs.filter(l => l.status === 'COMPLETED').length;
            const successRate = totalLogs > 0 ? Math.round((successLogs / totalLogs) * 100) : 0;

            return (
              <div key={habit.id} className="glass-card rounded-[22px] p-6 flex flex-col justify-between relative overflow-hidden group">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/10">
                      {habit.category}
                    </span>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="text-white/20 hover:text-rose-400 cursor-pointer transition-colors p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{habit.name}</h3>
                  <p className="text-xxs text-white/40 mt-1 font-mono">{habit.frequency} TARGET</p>
                </div>

                {/* Habit Stats (Streak & Success) */}
                <div className="flex items-center gap-6 my-4">
                  <div className="flex items-center gap-1.5">
                    <Flame className={`shrink-0 ${completedToday ? 'text-amber-500 animate-pulse' : 'text-white/30'}`} size={20} />
                    <div>
                      <span className="text-lg font-black font-mono text-white block">{habit.streakCount}</span>
                      <span className="text-[9px] text-white/40 uppercase font-mono">Streak</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="text-indigo-400 shrink-0" size={18} />
                    <div>
                      <span className="text-lg font-black font-mono text-white block">{successRate}%</span>
                      <span className="text-[9px] text-white/40 uppercase font-mono">Success</span>
                    </div>
                  </div>
                </div>

                {/* Log Controls */}
                <div className="pt-4 border-t border-white/5 flex gap-2">
                  {completedToday ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <Check size={14} />
                      Completed Today
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleLogHabit(habit.id, 'COMPLETED')}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-black text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleLogHabit(habit.id, 'SKIPPED')}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-xs font-medium cursor-pointer"
                        title="Log Skip"
                      >
                        Skip
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 text-center py-20 text-white/35 text-sm">
            No active routines. Establish a habit to strengthen streaks.
          </div>
        )}
      </section>
    </div>
  );
};

export default HabitsPage;
