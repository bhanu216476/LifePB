import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Activity,
  Moon,
  BookOpen,
  Monitor,
  FileText,
  LogOut
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { user, logout, token } = useAuth();
  const { } = useNotifications();
  const [xpData, setXpData] = useState({ totalXP: 0, level: 1, levelProgress: 0, nextLevelXP: 100 });

  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/achievements', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.totalXP === 'number') {
            setXpData({
              totalXP: data.totalXP,
              level: data.level,
              levelProgress: data.levelProgress,
              nextLevelXP: data.nextLevelXP
            });
          }
        })
        .catch(err => console.error(err));
    }
  }, [token]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/goals', label: 'Goals', icon: Target },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/habits', label: 'Habits', icon: Activity },
    { to: '/sleep-mood', label: 'Sleep & Mood', icon: Moon },
    { to: '/learning', label: 'Learning', icon: BookOpen },
    { to: '/digital-habits', label: 'Digital Habits', icon: Monitor },
    { to: '/fitness', label: 'Fitness & Health', icon: Activity },
    { to: '/journal', label: 'Journal', icon: FileText },
  ];

  return (
    <aside className="w-64 h-screen fixed top-0 left-0 bg-[#0D1321]/80 backdrop-blur-md border-r border-white/5 flex flex-col justify-between py-6 px-4 z-40">
      <div className="flex flex-col gap-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            L
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              LifeOS <span className="text-[#06B6D4] font-bold text-xs bg-cyan-950 px-1.5 py-0.5 rounded ml-1 border border-cyan-800/30">AI</span>
            </h1>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="glass-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate text-white">{user.name}</p>
                <p className="text-xs text-white/50 truncate font-mono">{user.occupation || 'Platform User'}</p>
              </div>
            </div>
            
            {/* Gamification Bar */}
            <div className="mt-1">
              <div className="flex justify-between text-xxs mb-1">
                <span className="text-indigo-400 font-semibold uppercase tracking-wider">Level {xpData.level}</span>
                <span className="text-white/40 font-mono">{xpData.totalXP} / {xpData.nextLevelXP} XP</span>
              </div>
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-500 rounded-full"
                  style={{ width: `${xpData.levelProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Routes */}
        <nav className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 text-[#8B5CF6] glow-primary' 
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="flex flex-col gap-2">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all duration-200 cursor-pointer"
        >
          <LogOut size={18} />
          <span>Disconnect System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
