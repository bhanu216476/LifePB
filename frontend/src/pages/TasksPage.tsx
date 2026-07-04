import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Clock, Trash2, Calendar } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  difficulty: string;
  energyNeeded: string;
  estimatedTimeMs: string | null;
  plannedTime: string | null;
  actualTime: string | null;
  delay: number | null;
  completionPercent: number;
  status: string;
}

const TasksPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PRODUCTIVITY');
  const [priority, setPriority] = useState('MEDIUM');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [energyNeeded, setEnergyNeeded] = useState('MEDIUM');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [plannedTime, setPlannedTime] = useState('');

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    try {
      const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          difficulty,
          energyNeeded,
          estimatedTimeMinutes: estimatedMinutes || '0',
          plannedTime
        })
      });

      if (response.ok) {
        triggerToast('Task Created', 'Added to queue. Maintain focus!', 'success');
        setTitle('');
        setDescription('');
        setEstimatedMinutes('');
        setPlannedTime('');
        setShowAddForm(false);
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const completionPercent = newStatus === 'COMPLETED' ? 100 : newStatus === 'IN_PROGRESS' ? 50 : 0;
      const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, completionPercent })
      });

      if (response.ok) {
        if (newStatus === 'COMPLETED') {
          triggerToast('Milestone Logged', 'Task finalized. +50 XP Reward.', 'success');
          triggerConfetti();
        }
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completionPercent } : t));
        fetchTasks();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Purge this task from task history?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerToast('Purged Task', 'Action removed from registry.', 'warning');
        setTasks(prev => prev.filter(t => t.id !== id));
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
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Platform Backlog</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Actions & Tasks</h1>
          <p className="text-xs text-white/50 mt-1">Track actual vs planned completion schedules, energy usage, and rewards.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </header>

      {/* Task Creation Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Register New Task</h3>
            <form onSubmit={handleAddTask} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="e.g. Code auth router tests"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white h-20 resize-none"
                  placeholder="Detail action parameters..."
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
                    <option value="PRODUCTIVITY">Productivity</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="WORK">Work</option>
                    <option value="HEALTH">Health</option>
                    <option value="LEARNING">Learning</option>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Energy Needed</label>
                  <select
                    value={energyNeeded}
                    onChange={(e) => setEnergyNeeded(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Est. Minutes</label>
                  <input
                    type="number"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                    placeholder="60"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Planned Date</label>
                  <input
                    type="datetime-local"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                  />
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
                  Confirm Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task List Tables */}
      <section className="glass-card rounded-[24px] overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/2 text-white/40 text-xxs font-bold tracking-wider uppercase">
              <th className="py-4 px-6">Task Title & Details</th>
              <th className="py-4 px-3">Metadata</th>
              <th className="py-4 px-3">Schedule</th>
              <th className="py-4 px-3">Status Control</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="border-b border-white/5 animate-pulse">
                  <td className="py-6 px-6"><div className="h-4 bg-white/5 rounded w-2/3" /></td>
                  <td className="py-6 px-3"><div className="h-4 bg-white/5 rounded w-12" /></td>
                  <td className="py-6 px-3"><div className="h-4 bg-white/5 rounded w-16" /></td>
                  <td className="py-6 px-3"><div className="h-4 bg-white/5 rounded w-20" /></td>
                  <td className="py-6 px-6"><div className="h-4 bg-white/5 rounded w-8 ml-auto" /></td>
                </tr>
              ))
            ) : tasks.length > 0 ? (
              tasks.map(task => {
                const estMins = task.estimatedTimeMs ? Math.round(parseInt(task.estimatedTimeMs) / (60 * 1000)) : 0;
                return (
                  <tr key={task.id} className="border-b border-white/5 hover:bg-white/1 transition-colors text-sm">
                    {/* Title */}
                    <td className="py-4 px-6 max-w-xs">
                      <div>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/55">
                            {task.category}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded
                            ${task.priority === 'HIGH' ? 'bg-rose-950/40 text-rose-400' : 'text-white/40 bg-white/3'}
                          `}>
                            {task.priority}
                          </span>
                        </div>
                        <p className="font-semibold text-white mt-1.5 leading-snug">{task.title}</p>
                        <p className="text-xs text-white/40 truncate mt-0.5">{task.description || 'No description added.'}</p>
                      </div>
                    </td>

                    {/* Metadata */}
                    <td className="py-4 px-3 font-mono text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white/60">Diff: {task.difficulty}</span>
                        <span className="text-white/40">Energy: {task.energyNeeded}</span>
                      </div>
                    </td>

                    {/* Schedule info */}
                    <td className="py-4 px-3 font-mono text-xs text-white/60">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {estMins}m est.
                        </span>
                        {task.plannedTime && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(task.plannedTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Dropdowns */}
                    <td className="py-4 px-3">
                      <select
                        value={task.status}
                        onChange={(e) => handleUpdateStatus(task.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-transparent
                          ${task.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/30' : ''}
                          ${task.status === 'IN_PROGRESS' ? 'bg-indigo-950/60 text-indigo-400 border-indigo-800/30' : ''}
                          ${task.status === 'TODO' ? 'bg-zinc-800 text-white/70 border-white/5' : ''}
                        `}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-white/30 hover:text-rose-400 cursor-pointer transition-colors p-1.5 hover:bg-white/5 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-20 text-white/30 text-sm">
                  Backlog is empty. Maintain alignment by creating a new task.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default TasksPage;
