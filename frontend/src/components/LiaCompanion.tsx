import React, { useEffect, useState, useRef } from 'react';
import { useLia } from '../context/LiaContext';
import type { LiaState } from '../context/LiaContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import LiaCanvas from './LiaCanvas';
import { Sparkles, MessageCircle, X, Send, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseLiaResponse } from '../utils/liaAIEngine';
import type { ChatMessage } from '../utils/liaAIEngine';

const LiaCompanion: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { liaState, setLiaState, liaText, speakLia, stopLia } = useLia();
  const { triggerConfetti } = useNotifications();

  const [inputVisible, setInputVisible] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [visible, setVisible] = useState(false);
  const [liaMood, setLiaMood] = useState('Happy to assist!');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);

  // Position offset state for when chatbot opens
  const [drawerOpen, setDrawerOpen] = useState(false);

  const introDone = useRef(false);

  // 1. Listen for AI Chatbot Drawer opens/closes to dynamically reposition Lia
  useEffect(() => {
    const handleDrawer = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setDrawerOpen(!!customEvent.detail.isOpen);
      }
    };
    window.addEventListener('ai-orb-toggle', handleDrawer);
    return () => window.removeEventListener('ai-orb-toggle', handleDrawer);
  }, []);

  // 2. Personal Greeting Wave Hand & Walk on screen on login
  useEffect(() => {
    if (isAuthenticated && !introDone.current) {
      introDone.current = true;
      setVisible(true);
      setTimeout(() => {
        const firstName = user?.name?.split(' ')[0] || 'Operator';
        const greetings = [
          `Welcome back, ${firstName}! 😊 Ready to achieve today's goals?`,
          `Welcome back, ${firstName}! Let's continue where we left off.`,
          `Welcome back, ${firstName}! Nice to see you again.`,
          `Hi ${firstName}! Ready to make today highly productive?`
        ];
        const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        speakLia(selectedGreeting);
      }, 1500);
    } else if (!isAuthenticated) {
      introDone.current = false;
      setVisible(false);
    }
  }, [isAuthenticated, user]);

  // 3. Listen to system activities
  useEffect(() => {
    const handleSystemEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, text } = customEvent.detail || {};

      if (type === 'task-completed') {
        setLiaState('happy');
        const congrats = [
          "Great job! Keep going!",
          "Awesome! You're building a great habit.",
          "Fantastic work! Let's conquer the rest of today's goals."
        ];
        speakLia(text || congrats[Math.floor(Math.random() * congrats.length)]);
        triggerConfetti();
      } else if (type === 'goal-completed') {
        setLiaState('celebration');
        speakLia(text || "Fantastic work! You've completed everything for today.");
        triggerConfetti();
      } else if (type === 'streak-increased') {
        setLiaState('celebration');
        speakLia(text || `Awesome! You're building a great habit.`);
        triggerConfetti();
      } else if (type === 'chat-response') {
        setLiaState(customEvent.detail.state || 'speaking');
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

  // 4. Command sender with typing simulation and streamed response effect
  const handleSendCommand = async () => {
    if (!chatInput.trim()) return;
    const prompt = chatInput.trim();
    setChatInput('');
    setLiaState('thinking');
    setTyping(true);
    setLiaMood('Thinking...');

    // Add user message to history
    const userMsg: ChatMessage = { sender: 'user', text: prompt, timestamp: new Date() };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);

    // Dynamic processing delay for realistic "AI is alive" feeling
    setTimeout(() => {
      const { reply, state } = parseLiaResponse(
        prompt,
        chatHistory,
        user?.name || 'Operator',
        user?.streak || 0
      );

      // Add assistant message to history
      const assistMsg: ChatMessage = { sender: 'assistant', text: reply, timestamp: new Date() };
      setChatHistory(prev => [...prev, assistMsg]);

      setLiaState(state);
      setLiaMood('Ready!');
      setTyping(false);

      // Trigger lady voice & display speech bubble
      speakLia(reply);
    }, 1200);
  };

  if (!isAuthenticated || !visible) return null;

  // Responsive positions: when chatbot is open, move closer to the chat panel (e.g. shift left)
  const positionClass = drawerOpen 
    ? "fixed bottom-6 right-[460px] md:right-[520px] transition-all duration-500 ease-out z-[999] flex flex-col items-end gap-3 pointer-events-none"
    : "fixed bottom-6 right-6 transition-all duration-500 ease-out z-[999] flex flex-col items-end gap-3 pointer-events-none";

  return (
    <div className={positionClass}>
      {/* Lia Speech Bubble */}
      <AnimatePresence>
        {liaText && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="w-72 bg-[#0d1321]/95 border border-cyan-500/25 p-4 rounded-[20px] shadow-2xl backdrop-blur-xl pointer-events-auto select-text text-white relative"
          >
            {/* Speech bubble arrow */}
            <div className="absolute bottom-[-6px] right-8 w-3 h-3 bg-[#0d1321] border-r border-b border-cyan-500/25 transform rotate-45" />

            <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-white/5">
              <span className="text-[10px] font-black tracking-widest text-[#06B6D4] uppercase flex items-center gap-1">
                <Sparkles size={10} /> Lia Companion
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

      {/* Typing Indicator */}
      <AnimatePresence>
        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#0d1321]/80 border border-white/5 px-3.5 py-2 rounded-full flex items-center gap-2 pointer-events-auto shadow-md backdrop-blur-md"
          >
            <Loader2 className="animate-spin text-[#06B6D4]" size={11} />
            <span className="text-[10px] text-white/60 font-medium">Lia is composing...</span>
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
              className="w-66 bg-[#0d1321]/95 border border-white/8 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl backdrop-blur-xl"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Dialogue Core</span>
                <span className="text-[9px] text-[#06B6D4] truncate max-w-[120px] font-mono">{liaMood}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCommand()}
                  placeholder="Say something to Lia..."
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

        {/* 3D Render & Draggable Base */}
        <motion.div 
          drag
          dragConstraints={{ left: -100, right: 100, top: -100, bottom: 50 }}
          className="relative group flex flex-col items-center"
        >
          {/* Controls Bar (shown on hover over character) */}
          <div className="absolute top-[-40px] flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/5 shadow-lg z-50">
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
            className="w-24 h-28 sm:w-32 sm:h-36 relative cursor-grab active:cursor-grabbing"
            onClick={() => {
              if (liaState === 'idle') {
                const randomStates: LiaState[] = ['greeting', 'happy', 'listening', 'thinking'];
                const selected = randomStates[Math.floor(Math.random() * randomStates.length)];
                setLiaState(selected);
                setTimeout(() => setLiaState('idle'), 2500);
              }
            }}
          >
            <LiaCanvas />

            {/* Premium Soft Floating Shadow Beneath */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-black/40 rounded-full blur-xs scale-x-150 animate-pulse pointer-events-none" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LiaCompanion;
