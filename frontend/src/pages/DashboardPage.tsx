import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { speakWithLadyVoice, stopSpeaking } from '../utils/speech';
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  CloudSun,
  Zap,
  Volume2,
  VolumeX,
  Mic
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
}

interface LifeScoreHistoryItem {
  id: string;
  overallScore: number;
  productivityScore: number;
  healthScore: number;
  financeScore: number;
  learningScore: number;
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

  // Component States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lifeScores, setLifeScores] = useState<LifeScoreHistoryItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [weather, setWeather] = useState<{ temp: string; condition: string } | null>(null);
  const [quote, setQuote] = useState<{ text: string; author: string }>({
    text: "The best way to predict the future is to create it.",
    author: "Peter Drucker"
  });
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-stop voice assistant speaking on component unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleVoiceBriefing = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      triggerToast('Audio Paused', 'Voice assistant paused.', 'info');
      return;
    }

    if (!stats) return;

    const remainingTasksCount = stats.tasksTotal - stats.tasksCompleted;
    const reportText = `Hello ${user?.name || 'Operator'}. Welcome back. Today you have completed ${stats.habitsCompletedToday} out of ${stats.habitsTotal} habits. You have ${remainingTasksCount} pending tasks in your backlog, and your daily streak is active at ${stats.streakCount} days. Your overall Life Score is currently at ${stats.lifeScore} percent. Let's make today productive.`;

    setIsSpeaking(true);
    speakWithLadyVoice(reportText, () => {
      setIsSpeaking(false);
    });
    triggerToast('Assistant Speaking', 'Spoken daily progress report triggered.', 'ai');
  };

  // Fetch Dashboard Core Metrics
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const [statsRes, scoresRes, tasksRes] = await Promise.all([
        fetch('http://localhost:5000/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/lifescores', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (statsRes.ok && scoresRes.ok && tasksRes.ok) {
        const statsData = await statsRes.json();
        const scoresData = await scoresRes.json();
        const tasksData = await tasksRes.json();

        setStats(statsData);
        setLifeScores(scoresData);
        // Take first 4 incomplete tasks
        setRecentTasks(tasksData.filter((t: Task) => t.status !== 'COMPLETED').slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching dashboard aggregation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Weather & Quotes from Public APIs (from public-apis list)
  const fetchPublicAPIs = async () => {
    // 1. Weather Forecast via Open-Meteo (Keyless, free public weather)
    try {
      const weatherRes = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true'
      );
      if (weatherRes.ok) {
        const wData = await weatherRes.json();
        const current = wData.current_weather;
        if (current) {
          setWeather({
            temp: `${Math.round(current.temperature)}°C`,
            condition: getWeatherCodeString(current.weathercode)
          });
        }
      }
    } catch (err) {
      console.warn('Weather API failed, using fallback.');
      setWeather({ temp: '22°C', condition: 'Partly Cloudy' });
    }

    // 2. Daily Quotes via Keyless Public APIs
    try {
      const quoteRes = await fetch('https://quoteslate.vercel.app/api/quotes/random');
      if (quoteRes.ok) {
        const qData = await quoteRes.json();
        if (qData && qData.quote) {
          setQuote({ text: qData.quote, author: qData.author || 'Unknown' });
        }
      }
    } catch (err) {
      // Fallback is already set
    }
  };

  const getWeatherCodeString = (code: number): string => {
    if (code === 0) return 'Clear Sky';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 82) return 'Rain Showers';
    return 'Snowy';
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      fetchPublicAPIs();
    }
  }, [token]);

  // Complete a task directly from the dashboard
  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED', completionPercent: 100 })
      });

      if (response.ok) {
        triggerToast('Task Completed', 'XP Reward Unlocked (+50 XP)', 'success');
        triggerConfetti();
        // Refresh local dashboard data
        fetchDashboardData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div className="flex flex-col items-center gap-3">
          <Zap className="animate-pulse text-[#06B6D4] shrink-0" size={32} />
          <p className="text-sm font-mono text-white/50">Aggregating Life Intelligence Matrix...</p>
        </div>
      </div>
    );
  }

  // Format chart dates
  const formattedScoreChart = lifeScores.map(score => {
    const dateObj = new Date(score.loggedDate);
    return {
      name: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: score.overallScore,
      productivity: score.productivityScore,
      health: score.healthScore,
      finance: score.financeScore
    };
  });

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header section */}
      <header className="flex justify-between items-start">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#06B6D4]">System Dashboard</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-white">
            Welcome back, {user?.name || 'Operator'}
          </h1>
          <p className="text-sm text-white/50 mt-1 italic">
            "{quote.text}" — <span className="font-semibold text-white/60">{quote.author}</span>
          </p>
        </div>

        {/* Quick Weather / Metadata Widget */}
        <div className="glass-card rounded-2xl px-5 py-3 flex items-center gap-4 border border-white/5">
          <div className="flex items-center gap-2">
            <CloudSun className="text-[#06B6D4]" size={20} />
            <div className="text-right">
              <span className="text-xxs font-bold text-white/40 block">WEATHER</span>
              <span className="text-xs font-semibold">{weather?.temp || '21°C'} - {weather?.condition || 'Clear'}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="text-right">
              <span className="text-xxs font-bold text-white/40 block">AI ORB STATUS</span>
              <span className="text-xs font-semibold text-emerald-400">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* AI Voice Assistant Cockpit Widget */}
      <section className="glass-card rounded-[24px] p-6 border border-cyan-800/20 shadow-cyan-500/5 glow-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#06B6D4]/5 rounded-full blur-3xl -mr-12 -mt-12" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/20 flex items-center justify-center text-[#06B6D4] shrink-0
              ${isSpeaking ? 'animate-pulse shadow-lg shadow-cyan-500/25 glow-accent' : ''}`}>
              <Mic size={24} className={isSpeaking ? 'scale-110' : ''} />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white flex items-center gap-2">
                LifeOS AI Voice Assistant
                <span className="text-[10px] uppercase bg-cyan-500/20 text-[#06B6D4] px-2 py-0.5 rounded-full border border-cyan-500/10 tracking-widest font-bold font-mono">LADY VOICE</span>
              </h2>
              <p className="text-sm text-white/70 mt-1 leading-relaxed max-w-2xl">
                "Hello, {user?.name || 'Operator'}. I've compiled your cognitive activities, habits streak, and pending directives. Tap listen to start your audio briefing."
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleVoiceBriefing}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-lg
                ${isSpeaking 
                  ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300 shadow-rose-500/10' 
                  : 'bg-gradient-to-r from-[#06B6D4] to-cyan-500 hover:opacity-95 text-black shadow-cyan-500/20 font-bold'}`}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isSpeaking ? 'Stop Briefing' : 'Listen to Briefing'}</span>
            </button>
          </div>
        </div>
        
        {/* Audio waves visualizer when speaking */}
        {isSpeaking && (
          <div className="flex gap-1.5 items-end h-8 mt-4 ml-16">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
              <div
                key={i}
                className="w-1 bg-[#06B6D4] rounded-full audio-wave-bar"
                style={{ animationDelay: `${i * 0.07}s`, height: '100%' }}
              />
            ))}
          </div>
        )}
      </section>

      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI 1: Life Score */}
        <div className="glass-card rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6366F1]/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Life Score</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight text-white">{stats.lifeScore}</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp size={12} />
              +2.1%
            </span>
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">Aggregation of 5 dimensions</p>
        </div>

        {/* KPI 2: Current Streak */}
        <div className="glass-card rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F59E0B]/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Daily Streak</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight text-white">{stats.streakCount}</span>
            <span className="text-xs font-semibold text-amber-400 flex items-center gap-0.5">
              <Flame size={14} className="animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">Meditation & Coding routine</p>
        </div>

        {/* KPI 3: Task Completion */}
        <div className="glass-card rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#8B5CF6]/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Task velocity</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight text-white">
              {stats.tasksCompleted}/{stats.tasksTotal}
            </span>
            <span className="text-xs font-semibold text-indigo-400">
              {stats.tasksTotal > 0 ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0}%
            </span>
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">Today's completed milestones</p>
        </div>

        {/* KPI 4: Water Logs / Health */}
        <div className="glass-card rounded-[20px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#06B6D4]/10 rounded-full blur-2xl -mr-6 -mt-6" />
          <span className="text-xxs font-bold uppercase tracking-wider text-white/40">Water / Hydration</span>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-4xl font-black font-mono tracking-tight text-white">{stats.waterMl}</span>
            <span className="text-xs text-cyan-400 font-mono">ml / 3000</span>
          </div>
          <p className="text-xxs text-white/40 mt-2 font-mono">
            {stats.waterMl >= 3000 ? 'Target achieved!' : `${3000 - stats.waterMl} ml remaining`}
          </p>
        </div>
      </section>

      {/* Main Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Life Score trend (2 cols) */}
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-base text-white">System Score Trends</h3>
              <p className="text-xxs text-white/40">30-day analytics index mapping life performance</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-900/30 text-indigo-300 border border-indigo-500/10 px-2 py-0.5 rounded-lg">
                Productivity
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-900/30 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-lg">
                Health
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedScoreChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <YAxis domain={[40, 100]} stroke="rgba(255,255,255,0.2)" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" name="Overall Score" />
                <Area type="monotone" dataKey="productivity" stroke="#8B5CF6" strokeWidth={1} fillOpacity={1} fill="url(#colorProd)" name="Productivity" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Today's agenda (1 col) */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-base text-white">Daily Agenda</h3>
                <p className="text-xxs text-white/40">Incomplete actions requiring energy</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {recentTasks.length > 0 ? (
                recentTasks.map(task => (
                  <div key={task.id} className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex items-center justify-between gap-3 group">
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50 block w-max mb-1.5">
                        {task.category}
                      </span>
                      <p className="text-xs font-semibold text-white/90 truncate">{task.title}</p>
                    </div>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="w-8 h-8 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/20 text-[#6366F1] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                      title="Mark Complete"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-white/35 text-xs">
                  All tasks complete! You are aligned.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xxs text-white/45">
            <span>{stats.tasksCompleted} OF {stats.tasksTotal} TASKS COMPLETED</span>
            <span className="font-mono">+{stats.tasksCompleted * 50} XP Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
