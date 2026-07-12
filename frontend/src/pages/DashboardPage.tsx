import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { speakWithLadyVoice, stopSpeaking } from '../utils/speech';
import {
  Flame, CheckCircle2, TrendingUp, CloudSun, Zap, Volume2,
  VolumeX, Mic, Trophy, Target, Sparkles, BarChart3
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_URL || 'https://lifeos-ai-backend.onrender.com';

interface DashboardStats {
  lifeScore: number;
  streakCount: number;
  latestMood: string;
  latestSleepScore: number;
  latestSleepDurationHours: string;
  waterMl: number;
  steps: number;
  learningMins: number;
  expensesToday: number;
  goalsCount: number;
  goalsCompleted: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompletedToday: number;
  habitsTotal: number;
  productivityScore: number;
  completionPercent: number;
  nextGoalReminder: { title: string; deadline: string } | null;
  recentAchievements: { id: string; title: string; description: string; xpReward: number; unlockedAt: string }[];
}

interface LifeScoreHistoryItem {
  id: string;
  overallScore: number;
  productivityScore: number;
  healthScore: number;
  financeScore: number;
  loggedDate: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  category: string;
  priority: string;
}

const DashboardPage: React.FC = () => {
  const { token, user } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lifeScores, setLifeScores] = useState<LifeScoreHistoryItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [weather, setWeather] = useState<{ temp: string; condition: string } | null>(null);
  const [quote, setQuote] = useState<{ text: string; author: string }>({
    text: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker'
  });
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => () => { stopSpeaking(); }, []);

  const handleVoiceBriefing = () => {
    if (isSpeaking) {
      stopSpeaking(); setIsSpeaking(false);
      triggerToast('Audio Paused', 'Voice assistant paused.', 'info');
      return;
    }
    if (!stats) return;
    const remaining = stats.tasksTotal - stats.tasksCompleted;
    const text = `Hello ${user?.name?.split(' ')[0] || 'Operator'}. Welcome back. Today you completed ${stats.habitsCompletedToday} out of ${stats.habitsTotal} habits. You have ${remaining} pending tasks. Your login streak is at ${stats.streakCount} days and your overall Life Score is ${stats.lifeScore} percent. Let's make today productive.`;
    setIsSpeaking(true);
    speakWithLadyVoice(text, () => setIsSpeaking(false));
    triggerToast('Assistant Speaking', 'Spoken daily progress report triggered.', 'ai');
  };

  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [statsRes, scoresRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE}/api/dashboard`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/lifescores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/tasks`,      { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (statsRes.ok && scoresRes.ok && tasksRes.ok) {
        setStats(await statsRes.json());
        setLifeScores(await scoresRes.json());
        const tasks = await tasksRes.json();
        setRecentTasks(tasks.filter((t: Task) => t.status !== 'COMPLETED').slice(0, 4));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicAPIs = async () => {
    try {
      const w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');
      if (w.ok) {
        const d = await w.json();
        if (d.current_weather) {
          setWeather({ temp: `${Math.round(d.current_weather.temperature)}°C`, condition: weatherCodeStr(d.current_weather.weathercode) });
        }
      }
    } catch { setWeather({ temp: '22°C', condition: 'Partly Cloudy' }); }

    try {
      const q = await fetch('https://quoteslate.vercel.app/api/quotes/random');
      if (q.ok) { const d = await q.json(); if (d?.quote) setQuote({ text: d.quote, author: d.author || 'Unknown' }); }
    } catch {}
  };

  const weatherCodeStr = (c: number) => {
    if (c === 0) return 'Clear Sky';
    if (c <= 3) return 'Partly Cloudy';
    if (c <= 48) return 'Foggy';
    if (c <= 67) return 'Rainy';
    return 'Snowy';
  };

  useEffect(() => {
    if (token) { fetchDashboardData(); fetchPublicAPIs(); }
  }, [token]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED', completionPercent: 100 }),
      });
      if (res.ok) {
        triggerToast('Task Completed! ✅', 'XP Reward Unlocked (+50 XP)', 'success');
        triggerConfetti();
        fetchDashboardData();
      }
    } catch (err) { console.error(err); }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div className="flex flex-col items-center gap-3">
          <Zap className="animate-pulse text-[#06B6D4]" size={32} />
          <p className="text-sm font-mono text-white/50">Aggregating Life Intelligence Matrix...</p>
        </div>
      </div>
    );
  }

  const formattedScoreChart = lifeScores.map(s => ({
    name: new Date(s.loggedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: s.overallScore,
    productivity: s.productivityScore,
    health: s.healthScore,
  }));

  const firstName = user?.name?.split(' ')[0] || 'Operator';

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">

      {/* ─── Header ─── */}
      <header className="flex justify-between items-start pr-14">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#06B6D4]">System Dashboard</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-white/50 mt-1 italic max-w-xl">
            "{quote.text}" — <span className="font-semibold text-white/60">{quote.author}</span>
          </p>
        </div>

        <div className="glass-card rounded-2xl px-5 py-3 flex items-center gap-4 border border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <CloudSun className="text-[#06B6D4]" size={20} />
            <div className="text-right">
              <span className="text-xxs font-bold text-white/40 block">WEATHER</span>
              <span className="text-xs font-semibold">{weather?.temp || '21°C'} – {weather?.condition || 'Clear'}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-right">
              <span className="text-xxs font-bold text-white/40 block">AI ORB</span>
              <span className="text-xs font-semibold text-emerald-400">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── AI Voice Cockpit ─── */}
      <section className="glass-card rounded-[24px] p-6 border border-cyan-800/20 glow-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#06B6D4]/5 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-[#06B6D4] shrink-0 ${isSpeaking ? 'animate-pulse shadow-lg shadow-cyan-500/25' : ''}`}>
              <Mic size={24} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white flex items-center gap-2">
                LifeOS AI Voice Assistant
                <span className="text-[10px] uppercase bg-cyan-500/20 text-[#06B6D4] px-2 py-0.5 rounded-full border border-cyan-500/10 tracking-widest font-bold font-mono">LADY VOICE</span>
              </h2>
              <p className="text-sm text-white/70 mt-1 leading-relaxed max-w-2xl">
                "Hello, {firstName}. I've compiled your cognitive activities, habits streak, and pending directives. Tap listen to start your audio briefing."
              </p>
            </div>
          </div>
          <button
            onClick={handleVoiceBriefing}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-lg shrink-0
              ${isSpeaking ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300' : 'bg-gradient-to-r from-[#06B6D4] to-cyan-500 text-black font-bold shadow-cyan-500/20'}`}
          >
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {isSpeaking ? 'Stop Briefing' : 'Listen to Briefing'}
          </button>
        </div>
        {isSpeaking && (
          <div className="flex gap-1.5 items-end h-8 mt-4 ml-16">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-1 bg-[#06B6D4] rounded-full audio-wave-bar" style={{ animationDelay: `${i * 0.07}s`, height: '100%' }} />
            ))}
          </div>
        )}
      </section>

      {/* ─── KPI Row ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Life Score */}
        <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6366F1]/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Life Score</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight">{stats.lifeScore}</span>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">Aggregation of 5 dimensions</p>
        </div>

        {/* Login Streak */}
        <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Login Streak</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight">{stats.streakCount}</span>
            <Flame size={16} className="text-amber-400 animate-pulse" />
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">Consecutive days active</p>
        </div>

        {/* Today's Progress */}
        <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Today's Tasks</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight">{stats.tasksCompleted}/{stats.tasksTotal}</span>
            <span className="text-xs font-semibold text-indigo-400">{stats.completionPercent}%</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${stats.completionPercent}%` }} />
          </div>
        </div>

        {/* Productivity Score */}
        <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Productivity</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight">{stats.productivityScore}</span>
            <span className="text-xs text-cyan-400 font-mono">/100</span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${stats.productivityScore}%` }} />
          </div>
        </div>
      </section>

      {/* ─── Main Split: Trend Chart + Agenda ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Life Score Trend */}
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-base text-white">System Score Trends</h3>
              <p className="text-xxs text-white/40">30-day analytics index mapping life performance</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-semibold bg-indigo-900/30 text-indigo-300 border border-indigo-500/10 px-2 py-0.5 rounded-lg">Productivity</span>
              <span className="text-[10px] font-semibold bg-emerald-900/30 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-lg">Health</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedScoreChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <YAxis domain={[40, 100]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Overall" />
                <Area type="monotone" dataKey="productivity" stroke="#8B5CF6" strokeWidth={1} fillOpacity={1} fill="url(#colorProd)" name="Productivity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Agenda */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-bold text-base text-white">Daily Agenda</h3>
                <p className="text-xxs text-white/40">Incomplete actions requiring energy</p>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              {recentTasks.length > 0 ? recentTasks.map(task => (
                <div key={task.id} className="p-3 rounded-xl bg-white/3 border border-white/5 flex items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50 block w-max mb-1">{task.category}</span>
                    <p className="text-xs font-semibold text-white/90 truncate">{task.title}</p>
                  </div>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="w-8 h-8 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 text-[#6366F1] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                    title="Mark Complete"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                </div>
              )) : (
                <div className="text-center py-10 text-white/30 text-xs">
                  ✅ All tasks complete! You are aligned.
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xxs text-white/40 mt-4">
            <span>{stats.tasksCompleted} of {stats.tasksTotal} completed</span>
            <span className="font-mono">+{stats.tasksCompleted * 50} XP Today</span>
          </div>
        </div>
      </div>

      {/* ─── Bottom Row: Next Goal + Achievements + Habits ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Next Goal Reminder */}
        <div className="glass-card rounded-[20px] p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/6 rounded-full blur-2xl -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-amber-400" />
            <span className="text-xxs font-bold uppercase tracking-wider text-amber-400/70">Next Goal</span>
          </div>
          {stats.nextGoalReminder ? (
            <>
              <p className="font-bold text-sm text-white">{stats.nextGoalReminder.title}</p>
              <p className="text-xxs text-white/40 mt-1">
                Deadline: {new Date(stats.nextGoalReminder.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </>
          ) : (
            <p className="text-xs text-white/40">No upcoming goals with deadlines.</p>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="glass-card rounded-[20px] p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-amber-400" />
            <span className="text-xxs font-bold uppercase tracking-wider text-amber-400/70">Recent Achievements</span>
          </div>
          {stats.recentAchievements.length > 0 ? stats.recentAchievements.map(a => (
            <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/3 border border-white/5">
              <span className="text-lg">🏆</span>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{a.title}</p>
                <p className="text-[10px] text-white/40">+{a.xpReward} XP</p>
              </div>
            </div>
          )) : (
            <p className="text-xs text-white/30">Complete milestones to unlock achievements.</p>
          )}
        </div>

        {/* Today's Habit Progress */}
        <div className="glass-card rounded-[20px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-purple-400" />
            <span className="text-xxs font-bold uppercase tracking-wider text-purple-400/70">Today's Habits</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-black font-mono">{stats.habitsCompletedToday}</span>
            <span className="text-white/40 text-sm">/ {stats.habitsTotal} habits</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
              style={{ width: stats.habitsTotal > 0 ? `${(stats.habitsCompletedToday / stats.habitsTotal) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <BarChart3 size={12} className="text-white/30" />
            <span className="text-xxs text-white/30">
              {stats.habitsTotal > 0 ? Math.round((stats.habitsCompletedToday / stats.habitsTotal) * 100) : 0}% completion rate today
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
