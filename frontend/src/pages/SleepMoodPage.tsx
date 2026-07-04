import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Moon, Smile } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface SleepLog {
  id: string;
  durationHours: number;
  qualityScore: number;
  dreams: string | null;
  loggedDate: string;
}

interface MoodLog {
  id: string;
  moodEmoji: string;
  stressLevel: number;
  energyLevel: number;
  motivationLevel: number;
  notes: string | null;
  loggedDate: string;
}

const SleepMoodPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast } = useNotifications();

  // State
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);

  // Form State
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState<'SLEEP' | 'MOOD'>('SLEEP');
  
  // Sleep Form inputs
  const [sleepDuration, setSleepDuration] = useState('');
  const [sleepQuality, setSleepQuality] = useState(8);
  const [dreams, setDreams] = useState('');

  // Mood Form inputs
  const [moodEmoji, setMoodEmoji] = useState('😊');
  const [stressLevel, setStressLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [motivationLevel, setMotivationLevel] = useState(7);
  const [notes, setNotes] = useState('');

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const [sleepRes, moodRes] = await Promise.all([
        fetch('http://localhost:5000/api/sleep', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/mood', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (sleepRes.ok && moodRes.ok) {
        const sleepData = await sleepRes.json();
        const moodData = await moodRes.json();
        setSleepLogs(sleepData);
        setMoodLogs(moodData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token) fetchLogs();
  }, [token]);

  const handleLogSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sleepDuration) return;

    try {
      const response = await fetch('http://localhost:5000/api/sleep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          durationHours: parseFloat(sleepDuration),
          qualityScore: sleepQuality,
          dreams
        })
      });

      if (response.ok) {
        triggerToast('Sleep Logged', 'Sleep record synchronized successfully.', 'success');
        setSleepDuration('');
        setDreams('');
        setShowLogModal(false);
        fetchLogs();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogMood = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/mood', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moodEmoji,
          stressLevel,
          energyLevel,
          motivationLevel,
          notes
        })
      });

      if (response.ok) {
        triggerToast('Mood Registered', 'State of mind saved in neural core.', 'success');
        setNotes('');
        setShowLogModal(false);
        fetchLogs();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Prepare chart data (past 7 entries)
  const chartData = sleepLogs.slice(-7).map((sLog) => {
    const matchingMood = moodLogs.find(
      mLog => new Date(mLog.loggedDate).toDateString() === new Date(sLog.loggedDate).toDateString()
    );

    return {
      date: new Date(sLog.loggedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      duration: sLog.durationHours,
      quality: sLog.qualityScore,
      stress: matchingMood ? matchingMood.stressLevel : null,
      energy: matchingMood ? matchingMood.energyLevel : null
    };
  });

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Circadian Engine</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Sleep & Cognitive State</h1>
          <p className="text-xs text-white/50 mt-1">Optimize recovery parameters, stress curves, and performance cycles.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setLogType('SLEEP'); setShowLogModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#0D1321] hover:bg-white/5 border border-white/10 cursor-pointer transition-colors"
          >
            <Moon size={16} />
            <span>Log Sleep</span>
          </button>
          <button
            onClick={() => { setLogType('MOOD'); setShowLogModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            <Smile size={16} />
            <span>Log Mood</span>
          </button>
        </div>
      </header>

      {/* Log Modal overlay */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogModal(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">
              {logType === 'SLEEP' ? 'Log recovery cycle parameters' : 'Record cognitive state'}
            </h3>

            {logType === 'SLEEP' ? (
              <form onSubmit={handleLogSleep} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Sleep Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={sleepDuration}
                    onChange={(e) => setSleepDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                    placeholder="7.5"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xxs font-bold uppercase tracking-wider text-white/40">
                    <span>Quality Index</span>
                    <span>{sleepQuality}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#6366F1] border border-white/5"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Dream Diary / Comments</label>
                  <input
                    type="text"
                    value={dreams}
                    onChange={(e) => setDreams(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                    placeholder="Vivid recall of space..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Save Cycle</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogMood} className="flex flex-col gap-4">
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

                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xxs font-bold uppercase tracking-wider text-white/40">
                      <span>Stress Level</span>
                      <span>{stressLevel}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(parseInt(e.target.value))} className="w-full h-1 bg-black/40 accent-rose-500" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xxs font-bold uppercase tracking-wider text-white/40">
                      <span>Energy Level</span>
                      <span>{energyLevel}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={energyLevel} onChange={(e) => setEnergyLevel(parseInt(e.target.value))} className="w-full h-1 bg-black/40 accent-emerald-500" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xxs font-bold uppercase tracking-wider text-white/40">
                      <span>Motivation Level</span>
                      <span>{motivationLevel}/10</span>
                    </div>
                    <input type="range" min="1" max="10" value={motivationLevel} onChange={(e) => setMotivationLevel(parseInt(e.target.value))} className="w-full h-1 bg-black/40 accent-cyan-500" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Logs Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white"
                    placeholder="Reflecting on afternoon meetings..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => setShowLogModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Register State</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Analytics Graph Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6">
          <h3 className="font-bold text-base text-white mb-6">Circadian Recovery Index</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.2)" fontSize={10} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.2)" fontSize={10} label={{ value: 'Index', angle: 90, position: 'insideRight', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="duration" stroke="#8B5CF6" strokeWidth={2} name="Sleep Duration" activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#06B6D4" strokeWidth={2} name="Sleep Quality" />
                <Line yAxisId="right" type="monotone" dataKey="energy" stroke="#10B981" strokeWidth={1} name="Day Energy" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent logs */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-4">Neural Log Stream</h3>
            <div className="flex flex-col gap-3">
              {moodLogs.slice(-4).reverse().map(mood => (
                <div key={mood.id} className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-white/40 block">
                      {new Date(mood.loggedDate).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="text-white/80 mt-1 truncate max-w-xs">{mood.notes || 'Mind state logged.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mood.moodEmoji}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-mono text-[10px]">Str: {mood.stressLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xxs font-mono text-white/30 pt-4 border-t border-white/5">
            CORRELATIONS UPDATING VIA AI ORB
          </div>
        </div>
      </section>
    </div>
  );
};

export default SleepMoodPage;
