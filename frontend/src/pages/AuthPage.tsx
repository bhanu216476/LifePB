import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Mail, Lock, User as UserIcon, Briefcase, Globe, BrainCircuit, Loader2 } from 'lucide-react';

// Google "G" logo SVG
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AuthPage: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Form fields
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
        const { user } = await login(email, password);
        const firstName = user.name.split(' ')[0];
        triggerToast(
          `Welcome back, ${firstName}! 👋`,
          'Ready to improve today? Your dashboard is live.',
          'success'
        );
        navigate('/dashboard');
      } else {
        await register({ email, password, name, age, occupation, timezone });
        const firstName = name.split(' ')[0];
        triggerToast(`Welcome, ${firstName}! 🎉`, 'Account created. Let\'s set up your profile.', 'success');
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

  // Google Sign-In (simulated developer mode if no real VITE_GOOGLE_CLIENT_ID)
  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      let credential = '';

      if (clientId) {
        // Real Google Identity Services flow
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => {
            (window as any).google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: any) => {
                credential = response.credential;
                resolve();
              },
            });
            (window as any).google.accounts.id.prompt();
          };
          script.onerror = () => reject(new Error('Google SDK failed to load'));
          document.head.appendChild(script);
        });
      } else {
        // Developer simulation mode – generates a mock credential
        const demoEmail = `demo.google.${Date.now()}@gmail.com`;
        const demoName = 'Google Demo User';
        credential = `mock_google_${demoEmail}_${demoName}_https://lh3.googleusercontent.com/a/default-user`;
      }

      const { user, isNew } = await loginWithGoogle(credential, timezone);
      const firstName = user.name.split(' ')[0];
      if (isNew) {
        triggerToast(`Welcome, ${firstName}! 🎉`, 'Google account connected! Setting up your profile.', 'success');
        triggerConfetti();
        navigate('/setup');
      } else {
        triggerToast(`Welcome back, ${firstName}! 👋`, 'Signed in with Google. Ready to improve today?', 'success');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.');
      triggerToast('Google Error', err.message || 'Google Sign-In failed.', 'danger');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { user } = await login('alex@lifeos.ai', 'password123');
      triggerToast(`Welcome, ${user.name.split(' ')[0]}! 🤖`, 'Demo session loaded with 30 days of analytics.', 'ai');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative px-4 py-12 overflow-hidden">
      <div id="ambient-glows" />

      {/* Main card */}
      <div className="w-full max-w-md glass-card rounded-[24px] p-8 relative z-10 glow-primary">
        {/* Logo */}
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

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/50 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {/* ─── Google Sign-In ─── */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer shadow-sm disabled:opacity-50 mb-4"
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin text-white/60" />
          ) : (
            <GoogleIcon />
          )}
          {googleLoading ? 'Connecting Google...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xxs font-semibold text-white/30 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* ─── Email / Password Form ─── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="Alex Mercer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="27" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Occupation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={15} />
                    <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="Engineer" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Timezone</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={15} />
                  <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="America/New_York" />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="alex@lifeos.ai" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xxs font-bold uppercase tracking-wider text-white/40">System Key (Password)</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white" placeholder="••••••••••••" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 mt-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Booting Core...' : isLogin ? 'Connect Core' : 'Initialize Core'}
          </button>
        </form>

        {/* Demo Login */}
        {isLogin && (
          <button
            onClick={handleDemoLogin}
            disabled={loading || googleLoading}
            className="w-full py-3 mt-3 rounded-xl text-sm font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 hover:bg-cyan-900/30 transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Load Demo Profile (Alex Mercer)
          </button>
        )}

        {/* Switch mode */}
        <div className="mt-8 text-center text-xs">
          <span className="text-white/40">{isLogin ? 'Need a new core?' : 'Already configured?'} </span>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
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
