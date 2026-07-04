import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Calendar, BrainCircuit, Trash2 } from 'lucide-react';

interface GoalSuggestion {
  id: string;
  suggestionText: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  progress: number;
  deadline: string;
  suggestions: GoalSuggestion[];
}

const GoalsPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('LEARNING');
  const [priority, setPriority] = useState('MEDIUM');
  const [deadline, setDeadline] = useState('');

  const fetchGoals = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGoals(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchGoals();
  }, [token]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const response = await fetch('http://localhost:5000/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, category, priority, deadline })
      });

      if (response.ok) {
        triggerToast('Goal Created', `"${title}" has been integrated as a core directive.`, 'success');
        setTitle('');
        setDescription('');
        setShowAddForm(false);
        fetchGoals();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    try {
      const targetGoal = goals.find(g => g.id === id);
      if (!targetGoal) return;

      const isCompletedNow = newProgress >= 100 && targetGoal.progress < 100;
      const status = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';

      const response = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress: newProgress, status })
      });

      if (response.ok) {
        if (isCompletedNow) {
          triggerToast('Goal Achieved!', `Milestone unlocked: "${targetGoal.title}" (+500 XP)`, 'success');
          triggerConfetti();
        }
        setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: newProgress, status } : g));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerToast('Goal Removed', 'Directive purged from core database.', 'warning');
        setGoals(prev => prev.filter(g => g.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Platform Directives</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Grand Goals & Objectives</h1>
          <p className="text-xs text-white/50 mt-1">Specify, verify, and complete long-term milestones with AI advice.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>New Goal</span>
        </button>
      </header>

      {/* Goal creation Form modal overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Establish New Core Directive</h3>
            <form onSubmit={handleAddGoal} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="Master React Native"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white h-20 resize-none"
                  placeholder="Build 3 production applications."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="CAREER">Career</option>
                    <option value="LEARNING">Learning</option>
                    <option value="HEALTH">Health</option>
                    <option value="FINANCE">Finance</option>
                    <option value="TRAVEL">Travel</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Target Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                />
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
                  Confirm Directive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goals Display Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="glass-card rounded-2xl p-6 h-56 animate-pulse" />
          ))
        ) : goals.length > 0 ? (
          goals.map(goal => (
            <div key={goal.id} className="glass-card rounded-[22px] p-6 flex flex-col justify-between relative overflow-hidden group">
              {/* Category indicator line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5" />

              <div>
                {/* Header detail */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/10">
                      {goal.category}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded
                      ${goal.priority === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-500/10' : ''}
                      ${goal.priority === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-500/10' : ''}
                      ${goal.priority === 'LOW' ? 'bg-zinc-800 text-zinc-300 border border-white/5' : ''}
                    `}>
                      {goal.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-white/30 hover:text-rose-400 cursor-pointer transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white leading-tight mt-1">{goal.title}</h3>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">{goal.description}</p>
              </div>

              {/* Progress sliders */}
              <div className="my-5">
                <div className="flex justify-between text-xxs font-mono mb-1.5 text-white/40">
                  <span>PROGRESS</span>
                  <span className="text-white/80">{Math.round(goal.progress)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress}
                  onChange={(e) => handleUpdateProgress(goal.id, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#6366F1] border border-white/5"
                />
              </div>

              {/* Deadline & AI Suggestion Block */}
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xxs text-white/40">
                  <Calendar size={12} />
                  <span>TARGET DUE:</span>
                  <span className="font-mono text-white/70">
                    {goal.deadline ? new Date(goal.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Continuous'}
                  </span>
                </div>

                {/* AI suggestions container */}
                {goal.suggestions && goal.suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-3 bg-cyan-950/30 border border-cyan-800/20 rounded-xl flex items-start gap-2 shadow-cyan-500/5 glow-accent">
                    <BrainCircuit size={15} className="text-[#06B6D4] shrink-0 mt-0.5" />
                    <p className="text-xxs text-cyan-200/90 leading-relaxed italic">{suggestion.suggestionText}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="md:col-span-2 text-center py-20 text-white/35">
            No directives active. Click "New Goal" to synchronize a new target.
          </div>
        )}
      </section>
    </div>
  );
};

export default GoalsPage;
