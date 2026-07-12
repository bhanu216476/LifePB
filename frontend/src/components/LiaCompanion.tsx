import React, { useEffect, useState, useRef } from 'react';
import { useLia } from '../context/LiaContext';
import type { LiaState } from '../context/LiaContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import LiaCanvas from './LiaCanvas';
import { Sparkles, MessageCircle, X, Send, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LiaCompanion: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { liaState, setLiaState, liaText, speakLia, stopLia } = useLia();
  const { triggerConfetti } = useNotifications();

  const [inputVisible, setInputVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [visible, setVisible] = useState(false);
  const [liaMood, setLiaMood] = useState('Happy to assist!');

  const introDone = useRef(false);

  // 1. Entrance Wave Hand & Walk on screen on login
  useEffect(() => {
    if (isAuthenticated && !introDone.current) {
      introDone.current = true;
      setVisible(true);
      setTimeout(() => {
        const firstName = user?.name?.split(' ')[0] || 'Operator';
        speakLia(`Welcome back, ${firstName}! I'm happy to see you again. Ready to conquer your goals today?`);
      }, 1500);
    } else if (!isAuthenticated) {
      introDone.current = false;
      setVisible(false);
    }
  }, [isAuthenticated, user]);

  // 2. Global Event Listener for system activities (Task/Goal completions, habits, streaks)
  useEffect(() => {
    const handleSystemEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, text } = customEvent.detail || {};

      if (type === 'task-completed') {
        setLiaState('happy');
        speakLia(text || "Great job! Keep going! You just completed a task and gained XP!");
        triggerConfetti();
      } else if (type === 'goal-completed') {
        setLiaState('celebration');
        speakLia(text || "Incredible! Goal completed! You are unlocking your full potential!");
        triggerConfetti();
      } else if (type === 'streak-increased') {
        setLiaState('celebration');
        speakLia(text || `Wow! Your daily login streak has increased! Keep up the amazing consistency!`);
        triggerConfetti();
      } else if (type === 'logout') {
        setLiaState('goodbye');
        speakLia("See you tomorrow! Have a wonderful day.", () => {
          setVisible(false);
        });
      }
    };

    window.addEventListener('lia-event', handleSystemEvent);
    return () => window.removeEventListener('lia-event', handleSystemEvent);
  }, [speakLia, setLiaState]);

  // 3. Command sender (Chat interface directly integrated with Lia)
  const handleSendCommand = async () => {
    if (!chatInput.trim()) return;
    const prompt = chatInput.trim();
    setChatInput('');
    setLiaState('thinking');
    setLiaMood('Thinking...');

    try {
      // Simulate/Trigger Lia response
      const query = prompt.toLowerCase();
      let replyText = '';

      if (query.includes('streak') || query.includes('days')) {
        replyText = `You have a daily streak of ${user?.streak || 0} days! Let's keep it going today.`;
        setLiaState('celebration');
      } else if (query.includes('complete') || query.includes('done')) {
        replyText = "Excellent focus! Keep checking off tasks to level up your productivity score.";
        setLiaState('happy');
      } else if (query.includes('remind') || query.includes('what should i do')) {
        replyText = "Have you updated today's progress? Make sure to tick off pending goals!";
        setLiaState('reminder');
      } else if (query.includes('hello') || query.includes('hi') || query.includes('help')) {
        replyText = `Hello! I'm Lia, your productivity toy companion. I'll help track your habits and daily routines.`;
        setLiaState('greeting');
      } else {
        replyText = "I've logged your focus activity. You're doing amazing today — let's check off our main goals!";
        setLiaState('speaking');
      }

      setLiaMood(prompt);
      speakLia(replyText);
    } catch {
      setLiaState('idle');
      setLiaMood('Ready to help!');
    }
  };

  if (!isAuthenticated || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-3 pointer-events-none">
      {/* Lia Speech Bubble */}
      <AnimatePresence>
        {liaText && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="w-72 bg-[#0d1321]/95 border border-cyan-500/25 p-4 rounded-[20px] shadow-2xl backdrop-blur-xl pointer-events-auto select-text text-white relative"
          >
            {/* Spech bubble arrow */}
            <div className="absolute bottom-[-6px] right-8 w-3 h-3 bg-[#0d1321] border-r border-b border-cyan-500/25 transform rotate-45" />

            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-white/5">
              <span className="text-[10px] font-black tracking-widest text-[#06B6D4] uppercase flex items-center gap-1">
                <Sparkles size={10} /> Lia Desk Friend
              </span>
              <button
                onClick={stopLia}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Mute Speech"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-white/90 leading-relaxed font-medium">
              {liaText}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3D Container & Controls */}
      <div className="flex items-end gap-3 pointer-events-auto">
        {/* Expanded Quick Chat Panel */}
        <AnimatePresence>
          {inputVisible && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="w-64 bg-[#0d1321]/95 border border-white/8 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Ask Lia</span>
                <span className="text-[9px] text-[#06B6D4] truncate max-w-[120px]">{liaMood}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                  placeholder="Ask about goals, streak, focus..."
                  className="flex-1 glass-input px-3 py-1.5 rounded-xl text-xs text-white"
                />
                <button
                  onClick={handleSendCommand}
                  className="p-2 rounded-xl bg-gradient-to-r from-[#06B6D4] to-cyan-500 text-black font-bold cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Send size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Render & Interactive Base */}
        <div className="relative group flex flex-col items-center">
          {/* Controls Bar (shown on hover over character) */}
          <div className="absolute top-[-40px] flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/5 shadow-lg">
            <button
              onClick={() => setInputVisible(!inputVisible)}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Chat with Lia"
            >
              <MessageCircle size={14} />
            </button>
            <button
              onClick={() => {
                setLiaState('happy');
                speakLia("Ready to win today? I am watching your productivity streaks!");
              }}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Cheer up!"
            >
              <Sparkles size={14} />
            </button>
            <button
              onClick={() => speakLia("Have you updated today's progress? Let's check off our main goals!")}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Trigger Reminder"
            >
              <HelpCircle size={14} />
            </button>
          </div>

          {/* 3D Mesh Canvas Container */}
          <div
            className="w-32 h-36 relative filter drop-shadow-[0_8px_24px_rgba(6,182,212,0.15)] cursor-pointer"
            onClick={() => {
              if (liaState === 'idle') {
                const randomStates: LiaState[] = ['greeting', 'happy', 'listening', 'thinking'];
                const selected = randomStates[Math.floor(Math.random() * randomStates.length)];
                setLiaState(selected);
                setTimeout(() => setLiaState('idle'), 3000);
              }
            }}
          >
            <LiaCanvas />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiaCompanion;
