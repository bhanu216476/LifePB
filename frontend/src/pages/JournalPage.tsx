import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Search, Calendar, Heart, Award, Frown, Sparkles } from 'lucide-react';

interface JournalEntry {
  id: string;
  reflections: string;
  gratitudeContent: string | null;
  achievements: string | null;
  failures: string | null;
  lessonsLearned: string | null;
  moodEmoji: string | null;
  entryDate: string;
}

const JournalPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [reflections, setReflections] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [achievements, setAchievements] = useState('');
  const [failures, setFailures] = useState('');
  const [lessons, setLessons] = useState('');
  const [moodEmoji, setMoodEmoji] = useState('😊');

  const fetchJournalEntries = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/journals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setEntries(await response.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchJournalEntries();
  }, [token]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflections) return;

    try {
      const response = await fetch('http://localhost:5000/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reflections,
          gratitudeContent: gratitude,
          achievements,
          failures,
          lessonsLearned: lessons,
          moodEmoji
        })
      });

      if (response.ok) {
        triggerToast('Journal Synchronized', 'Daily reflections stored in neural core.', 'success');
        triggerConfetti();
        setReflections('');
        setGratitude('');
        setAchievements('');
        setFailures('');
        setLessons('');
        setShowAddForm(false);
        fetchJournalEntries();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.reflections.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (entry.lessonsLearned && entry.lessonsLearned.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (entry.achievements && entry.achievements.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Reflection Engine</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Reflections & Journal</h1>
          <p className="text-xs text-white/50 mt-1">Analyze thoughts, consolidate lessons learned, and store daily gratitudes.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>New Entry</span>
        </button>
      </header>

      {/* Write Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base mb-4">Log Journal Entry</h3>
            <form onSubmit={handleCreateEntry} className="flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-2">
                {['😊', '😐', '😔', '😡', '🤯'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setMoodEmoji(emoji)}
                    className={`py-3 rounded-xl text-xl transition-all border
                      ${moodEmoji === emoji ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-transparent border-transparent'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Daily Reflections</label>
                <textarea
                  required
                  value={reflections}
                  onChange={(e) => setReflections(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white h-24 resize-none"
                  placeholder="Detail parameters of your day..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Gratitude (Things you are grateful for)</label>
                <input
                  type="text"
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="Grateful for..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Achievements</label>
                  <input
                    type="text"
                    value={achievements}
                    onChange={(e) => setAchievements(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                    placeholder="Hit 10k steps..."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Failures / Obstacles</label>
                  <input
                    type="text"
                    value={failures}
                    onChange={(e) => setFailures(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                    placeholder="Lost focus in afternoon..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Lessons Learned</label>
                <input
                  type="text"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                  placeholder="Time block my schedule..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Input bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
          placeholder="Search reflections, lessons learned, or achievements..."
        />
      </div>

      {/* Stream of past entries */}
      <section className="flex flex-col gap-6">
        {loading ? (
          Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="glass-card rounded-[24px] p-6 h-56 animate-pulse" />
          ))
        ) : filteredEntries.length > 0 ? (
          filteredEntries.slice().reverse().map(entry => (
            <div key={entry.id} className="glass-card rounded-[24px] p-6 relative overflow-hidden flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{entry.moodEmoji || '😐'}</span>
                  <div>
                    <h3 className="font-bold text-sm text-white">Daily Log Entry</h3>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 font-mono mt-0.5">
                      <Calendar size={11} />
                      {new Date(entry.entryDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-white/95 leading-relaxed font-sans">
                <h4 className="font-bold text-xxs uppercase tracking-wider text-indigo-400 mb-1">Reflections</h4>
                <p>{entry.reflections}</p>
              </div>

              {/* Grid of structured notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                {entry.gratitudeContent && (
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-2">
                    <Heart size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block">Gratitude</span>
                      <p className="text-xxs text-white/80 mt-0.5 leading-relaxed">{entry.gratitudeContent}</p>
                    </div>
                  </div>
                )}

                {entry.achievements && (
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-2">
                    <Award size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block">Achievement</span>
                      <p className="text-xxs text-white/80 mt-0.5 leading-relaxed">{entry.achievements}</p>
                    </div>
                  </div>
                )}

                {entry.failures && (
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-2">
                    <Frown size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block">Obstacle</span>
                      <p className="text-xxs text-white/80 mt-0.5 leading-relaxed">{entry.failures}</p>
                    </div>
                  </div>
                )}

                {entry.lessonsLearned && (
                  <div className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-2">
                    <Sparkles size={14} className="text-[#06B6D4] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-white/40 uppercase block">Lesson Learned</span>
                      <p className="text-xxs text-white/80 mt-0.5 leading-relaxed">{entry.lessonsLearned}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-white/35 text-sm">
            Reflections matching search criteria not found.
          </div>
        )}
      </section>
    </div>
  );
};

export default JournalPage;
