import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { speakWithLadyVoice, stopSpeaking } from '../utils/speech';
import { BrainCircuit, Activity, RefreshCw, X, TrendingUp, Send, Volume2, VolumeX, Mic } from 'lucide-react';
import { parseLiaResponse } from '../utils/liaAIEngine';

interface Insight {
  text: string;
  type: string;
  confidenceScore: number;
}

interface Prediction {
  target: string;
  value: string;
  confidenceScore: number;
}

const AIOrb: React.FC = () => {
  const { token, isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'predictions' | 'chatbot'>('insights');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; time: string }>>([
    { sender: 'assistant', text: 'Hello! I am Lia, your LifeOS voice intelligence companion. Ask me anything about your habits, sleep, or pending tasks.', time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [typing, setTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, typing]);

  // Stop speaking when drawer closes
  useEffect(() => {
    if (!isOpen) {
      stopSpeaking();
    }
    window.dispatchEvent(new CustomEvent('ai-orb-toggle', { detail: { isOpen } }));
  }, [isOpen]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setChatInput('');
    setTyping(true);

    // Map chatMessages list to liaAIEngine format
    const historyMapped = chatMessages.map(m => ({
      sender: m.sender,
      text: m.text,
      timestamp: new Date(),
    }));

    setTimeout(() => {
      const { reply, state } = parseLiaResponse(
        userMsg,
        historyMapped,
        user?.name || 'Operator',
        user?.streak || 0
      );

      const responseTimeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply, time: responseTimeStr }]);
      setTyping(false);

      // Trigger companion state update so Lia animates synchronously!
      window.dispatchEvent(new CustomEvent('lia-event', {
        detail: { type: 'chat-response', text: reply, state }
      }));

      if (voiceOutputEnabled) {
        speakWithLadyVoice(reply);
      }
    }, 1100);
  };

  const fetchAIData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [insightsRes, predictionsRes] = await Promise.all([
        fetch('http://localhost:5000/api/ai/insights', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/ai/predictions', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (insightsRes.ok && predictionsRes.ok) {
        const insightsData = await insightsRes.json();
        const predictionsData = await predictionsRes.json();
        setInsights(insightsData);
        setPredictions(predictionsData);
      }
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isOpen) {
      fetchAIData();
    }
  }, [isAuthenticated, isOpen]);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Orb */}
      <div 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 z-50 cursor-pointer group"
      >
        <div className="relative">
          {/* Glowing background ring */}
          <div className="absolute inset-0 bg-[#06B6D4] rounded-full blur-xl opacity-60 group-hover:opacity-85 transition-opacity duration-300 scale-125" />
          
          {/* Main Orb Body */}
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#06B6D4] via-[#0891B2] to-[#0E7490] border border-cyan-300/40 flex items-center justify-center animate-orb shadow-2xl shadow-cyan-500/50">
            <BrainCircuit size={26} className="text-white group-hover:scale-110 transition-transform duration-300" />
          </div>

          {/* Sparkle micro-badge */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border border-cyan-200/50 text-[8px] font-bold text-black items-center justify-center">AI</span>
          </span>
        </div>
      </div>

      {/* Slide-out Intelligence Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Surface */}
          <div className="relative w-full max-w-md h-full bg-[#0D1321]/95 border-l border-white/5 shadow-2xl flex flex-col justify-between z-10 glass-panel">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-[#06B6D4]" size={20} />
                <h2 className="text-lg font-bold text-white tracking-tight">LifeOS AI Assistant</h2>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchAIData}
                  className="text-white/40 hover:text-[#06B6D4] transition-colors cursor-pointer"
                  title="Re-calculate Insights"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Segmented Controls Tab */}
            <div className="px-6 pt-4 flex gap-2">
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all
                  ${activeTab === 'insights' 
                    ? 'bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4]' 
                    : 'text-white/40 hover:text-white/70 bg-transparent border border-transparent'
                  }`}
              >
                Insights
              </button>
              <button
                onClick={() => setActiveTab('predictions')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all
                  ${activeTab === 'predictions' 
                    ? 'bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4]' 
                    : 'text-white/40 hover:text-white/70 bg-transparent border border-transparent'
                  }`}
              >
                Predictions
              </button>
              <button
                onClick={() => setActiveTab('chatbot')}
                className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1
                  ${activeTab === 'chatbot' 
                    ? 'bg-cyan-500/10 border border-cyan-500/30 text-[#06B6D4]' 
                    : 'text-white/40 hover:text-white/70 bg-transparent border border-transparent'
                  }`}
              >
                <Mic size={12} />
                Chat
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {activeTab === 'chatbot' ? (
                /* ── AI Chatbot Panel ── */
                <div className="flex flex-col gap-3 h-full">
                  {/* Voice toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Mic size={14} className="text-[#06B6D4]" />
                      <span className="text-xxs font-bold uppercase tracking-widest text-white/50">Lady Voice Output</span>
                    </div>
                    <button
                      onClick={() => setVoiceOutputEnabled(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border cursor-pointer
                        ${voiceOutputEnabled 
                          ? 'bg-cyan-950/50 border-cyan-500/30 text-[#06B6D4]' 
                          : 'bg-white/3 border-white/10 text-white/40'}`}
                    >
                      {voiceOutputEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                      {voiceOutputEnabled ? 'Voice ON' : 'Voice OFF'}
                    </button>
                  </div>

                  {/* Message stream */}
                  <div className="flex flex-col gap-4 flex-1 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-end gap-2 max-w-[85%]">
                          {msg.sender === 'assistant' && (
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d7c19e] to-[#f4ecd8] border border-[#5c4033]/20 flex flex-col items-center justify-center shrink-0 shadow-md">
                              <span className="text-[14px]" title="Lia Face">🤖</span>
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-[18px] text-xs leading-relaxed shadow-sm border
                            ${msg.sender === 'user' 
                              ? 'bg-[#6366F1]/15 border-[#6366F1]/20 text-white rounded-br-none' 
                              : 'bg-cyan-950/40 border-cyan-800/10 text-white/95 rounded-bl-none'}`}>
                            {msg.text}
                          </div>
                        </div>
                        <span className="text-[9px] text-white/30 mt-1 px-1 font-mono">{msg.time}</span>
                      </div>
                    ))}

                    {/* Animated Typing Indicator */}
                    {typing && (
                      <div className="flex items-end gap-2 max-w-[85%]">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#d7c19e] to-[#f4ecd8] border border-[#5c4033]/20 flex items-center justify-center shrink-0 shadow-md">
                          <span className="text-[14px]">🤖</span>
                        </div>
                        <div className="px-4 py-3 rounded-[18px] rounded-bl-none bg-cyan-950/20 border border-cyan-800/10 flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input bar */}
                  <div className="flex gap-2 pt-3 border-t border-white/5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 px-3 py-2.5 rounded-xl text-xs glass-input text-white placeholder-white/30"
                      placeholder="Ask about habits, sleep, tasks..."
                    />
                    <button
                      onClick={handleSendChat}
                      className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#06B6D4] to-cyan-500 flex items-center justify-center text-black cursor-pointer hover:opacity-90 shrink-0"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              ) : loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="glass-card rounded-2xl p-4 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-1/3 mb-3" />
                    <div className="h-3 bg-white/5 rounded w-full mb-2" />
                    <div className="h-3 bg-white/5 rounded w-5/6" />
                  </div>
                ))
              ) : activeTab === 'insights' ? (
                insights.length > 0 ? (
                  insights.map((insight, idx) => (
                    <div key={idx} className="glass-card rounded-2xl p-5 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#06B6D4] to-cyan-700" />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center shrink-0">
                          <Activity size={15} className="text-[#06B6D4]" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">{insight.type}</span>
                            <span className="text-[10px] font-mono text-white/40">Confidence: {Math.round(insight.confidenceScore * 100)}%</span>
                          </div>
                          <p className="text-sm text-white/90 leading-relaxed font-sans">{insight.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-white/40 py-12">No insights computed yet. Log more days of data.</div>
                )
              ) : (
                predictions.length > 0 ? (
                  predictions.map((pred, idx) => {
                    const cleanTarget = pred.target.replace('_', ' ');
                    return (
                      <div key={idx} className="glass-card rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#8B5CF6] to-purple-800" />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B5CF6]">{cleanTarget}</span>
                            <h3 className="text-xl font-bold font-mono text-white mt-1">{pred.value}</h3>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-white/40 block">Confidence</span>
                            <span className="text-xs font-semibold text-emerald-400 font-mono">{Math.round(pred.confidenceScore * 100)}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1 bg-black/40 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#6366F1]" 
                            style={{ width: `${pred.confidenceScore * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-white/40 py-12">No predictive metrics available yet.</div>
                )
              )}
            </div>

            {/* Footer Summary / Quote */}
            <div className="p-6 border-t border-white/5 bg-black/20">
              <div className="flex items-center gap-2 mb-2 text-xxs font-bold uppercase text-white/35 tracking-widest">
                <TrendingUp size={12} className="text-[#06B6D4]" />
                Daily Recommendation
              </div>
              <p className="text-xs text-white/70 leading-relaxed italic">
                "Productivity aligns with energy waves. Complete tasks needing high focus before 10:00 AM, and schedule administration after 3:00 PM."
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIOrb;
