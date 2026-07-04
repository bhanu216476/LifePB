import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Mail, Lock, User as UserIcon, Briefcase, Globe, BrainCircuit } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        triggerToast('System Connected', 'Authenticated session established successfully.', 'success');
        navigate('/dashboard');
      } else {
        await register({ email, password, name, age, occupation, timezone });
        triggerToast('Account Created', 'Welcome to LifeOS AI. Please complete your system configuration.', 'success');
        triggerConfetti();
        navigate('/setup');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
      triggerToast('Auth Error', err.message || 'Verification failed.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('alex@lifeos.ai', 'password123');
      triggerToast('Alex Mercer Mode', 'Demo session loaded with 30 days of analytics.', 'ai');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative px-4 py-12 overflow-hidden">
      {/* Ambient background glows */}
      <div id="ambient-glows" />

      {/* Main card */}
      <div className="w-full max-w-md glass-card rounded-[24px] p-8 relative z-10 glow-primary">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-500/30">
            <BrainCircuit size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight mt-3">
            {isLogin ? 'Initialize LifeOS' : 'Configure New Core'}
          </h2>
          <p className="text-xs text-white/50 text-center">
            {isLogin ? 'Enter your access credentials to boot system.' : 'Create a new personal intelligence core.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/50 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="Alex Mercer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="27"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Occupation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                      placeholder="Engineer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Timezone</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="America/New_York"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                placeholder="alex@lifeos.ai"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-white/40">System Key (Password)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
          >
            {loading ? 'Booting Core...' : isLogin ? 'Connect Core' : 'Initialize Core'}
          </button>
        </form>

        {isLogin && (
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 mt-3 rounded-xl text-sm font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 hover:bg-cyan-900/30 transition-all cursor-pointer shadow-sm"
          >
            Load Demo Profile (Alex Mercer)
          </button>
        )}

        <div className="mt-8 text-center text-xs">
          <span className="text-white/40">{isLogin ? "Need a new core?" : "Already configured?"} </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#6366F1] hover:underline font-semibold cursor-pointer"
          >
            {isLogin ? 'Setup wizard' : 'Connect existing'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
