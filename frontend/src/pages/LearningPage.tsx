import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Clock, CheckCircle } from 'lucide-react';

interface StudySession {
  id: string;
  topic: string;
  durationMinutes: number;
  notes: string | null;
  loggedDate: string;
}

interface LearningResource {
  id: string;
  title: string;
  type: string; // BOOK, COURSE, TUTORIAL
  status: string; // TODO, IN_PROGRESS, COMPLETED
  progress: number;
}

const LearningPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);

  // Form State
  const [showLogModal, setShowLogModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  // Resource Form
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState('COURSE');

  const fetchLearningData = async () => {
    if (!token) return;
    try {
      const [sessionsRes, resourcesRes] = await Promise.all([
        fetch('http://localhost:5000/api/learning/sessions', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/learning/resources', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (sessionsRes.ok && resourcesRes.ok) {
        setSessions(await sessionsRes.json());
        setResources(await resourcesRes.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token) fetchLearningData();
  }, [token]);

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !duration) return;

    try {
      const response = await fetch('http://localhost:5000/api/learning/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          durationMinutes: parseInt(duration),
          notes
        })
      });

      if (response.ok) {
        triggerToast('Study Logged', 'Learning session stored. +45 XP.', 'success');
        triggerConfetti();
        setTopic('');
        setDuration('');
        setNotes('');
        setShowLogModal(false);
        fetchLearningData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle) return;

    try {
      const response = await fetch('http://localhost:5000/api/learning/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: resTitle,
          type: resType,
          progress: 0
        })
      });

      if (response.ok) {
        triggerToast('Resource Added', 'Integrated new material into backlog.', 'success');
        setResTitle('');
        setShowResourceForm(false);
        fetchLearningData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateResourceProgress = async (id: string, newProgress: number) => {
    try {
      const targetRes = resources.find(r => r.id === id);
      if (!targetRes) return;

      const status = newProgress >= 100 ? 'COMPLETED' : 'IN_PROGRESS';
      const response = await fetch(`http://localhost:5000/api/learning/resources/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ progress: newProgress, status })
      });

      if (response.ok) {
        if (newProgress >= 100 && targetRes.progress < 100) {
          triggerToast('Track Completed!', 'Syllabus mastered! +150 XP Unlock.', 'success');
          triggerConfetti();
        }
        setResources(prev => prev.map(r => r.id === id ? { ...r, progress: newProgress, status } : r));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Cognitive Index</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Learning & Curriculums</h1>
          <p className="text-xs text-white/50 mt-1">Acquire technical and creative disciplines through tracked focus sessions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResourceForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#0D1321] hover:bg-white/5 border border-white/10 cursor-pointer"
          >
            <span>Add Syllabus</span>
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer"
          >
            <Clock size={16} />
            <span>Log study</span>
          </button>
        </div>
      </header>

      {/* Log Session Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogModal(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Log study session</h3>
            <form onSubmit={handleLogSession} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Topic / Skill</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="e.g. Spanish conjugation"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                  placeholder="45"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Study Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="Practiced past tenses..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Log Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showResourceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowResourceForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Register Syllabus / Resource</h3>
            <form onSubmit={handleCreateResource} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Title / Subject</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="e.g. Master Rust Programming"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Resource Type</label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                >
                  <option value="BOOK">Book</option>
                  <option value="COURSE">Course</option>
                  <option value="TUTORIAL">Tutorial / Documentation</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowResourceForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Add Syllabus</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI Overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Logged Focus</span>
          <p className="text-3xl font-black font-mono text-white mt-2">{(totalStudyMinutes / 60).toFixed(1)}h</p>
          <span className="text-[10px] text-white/30 block mt-1">Cumulative study logs</span>
        </div>
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Syllabi Active</span>
          <p className="text-3xl font-black font-mono text-white mt-2">
            {resources.filter(r => r.status !== 'COMPLETED').length}
          </p>
          <span className="text-[10px] text-white/30 block mt-1">Tracks currently in progress</span>
        </div>
        <div className="glass-card rounded-[20px] p-5">
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Mastered Tracks</span>
          <p className="text-3xl font-black font-mono text-white mt-2">
            {resources.filter(r => r.status === 'COMPLETED').length}
          </p>
          <span className="text-[10px] text-white/30 block mt-1">Resources marked at 100%</span>
        </div>
      </section>

      {/* Split Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Syllabi */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col gap-4">
          <h3 className="font-bold text-base">Syllabus Progress Tracker</h3>
          <div className="flex flex-col gap-4">
            {resources.length > 0 ? (
              resources.map(res => (
                <div key={res.id} className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                        {res.type}
                      </span>
                      <h4 className="text-sm font-semibold text-white/90 mt-1">{res.title}</h4>
                    </div>
                    {res.progress >= 100 && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                  </div>

                  <div>
                    <div className="flex justify-between text-xxs font-mono text-white/45 mb-1">
                      <span>PROGRESS</span>
                      <span>{res.progress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={res.progress}
                      onChange={(e) => handleUpdateResourceProgress(res.id, parseInt(e.target.value))}
                      className="w-full h-1 bg-black/40 accent-indigo-500 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-white/30 text-xs">No learning tracks initialized.</div>
            )}
          </div>
        </div>

        {/* Study Logs */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col gap-4">
          <h3 className="font-bold text-base">Study Log Stream</h3>
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {sessions.slice(-5).reverse().map(session => (
              <div key={session.id} className="p-3 rounded-xl bg-white/2 border border-white/5 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-semibold text-white">{session.topic}</h4>
                  <p className="text-xxs text-white/40 mt-0.5 italic">"{session.notes || 'No notes added.'}"</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-indigo-300 font-semibold">{session.durationMinutes} mins</span>
                  <span className="text-[10px] text-white/30 block mt-0.5 font-mono">
                    {new Date(session.loggedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPage;
