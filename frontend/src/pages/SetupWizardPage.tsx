import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { Compass, Target, Code, Heart, Clock } from 'lucide-react';

const SetupWizardPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Profile data state
  const [workingStart, setWorkingStart] = useState('09:00');
  const [workingEnd, setWorkingEnd] = useState('17:00');
  const [lifeGoals, setLifeGoals] = useState('');
  const [skills, setSkills] = useState('');
  const [interests, setInterests] = useState('');

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await updateProfile({
        name: user?.name || '',
        age: user?.age || null,
        occupation: user?.occupation || '',
        timezone: user?.timezone || 'UTC',
        preferredWorkingHoursStart: workingStart,
        preferredWorkingHoursEnd: workingEnd,
        lifeGoals,
        skills,
        interests,
      });

      triggerToast('System Configured', 'LifeOS AI is initialized and ready.', 'success');
      triggerConfetti();
      navigate('/dashboard');
    } catch (error: any) {
      triggerToast('Setup Error', error.message || 'Failed to update configuration.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative px-4 py-12 overflow-hidden">
      {/* Ambient backgrounds */}
      <div id="ambient-glows" />

      <div className="w-full max-w-lg glass-card rounded-[24px] p-8 relative z-10 glow-primary">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8">
          <span className="text-xxs font-bold uppercase tracking-widest text-[#06B6D4]">Core Setup</span>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div 
                key={s} 
                className={`w-8 h-1 rounded-full transition-all duration-300
                  ${s <= step ? 'bg-[#06B6D4]' : 'bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        {/* Step 1: Working Hours */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-800/30 flex items-center justify-center text-[#06B6D4]">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Focus Timeframes</h2>
                <p className="text-xs text-white/50">Specify your preferred working and focus windows.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Work Start</label>
                <input
                  type="time"
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-white font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Work End</label>
                <input
                  type="time"
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm glass-input text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Life Goals */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-800/30 flex items-center justify-center text-[#6366F1]">
                <Target size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Grand Directives</h2>
                <p className="text-xs text-white/50">Detail your primary life goals for this period.</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Life Goals & Intentions</label>
              <textarea
                value={lifeGoals}
                onChange={(e) => setLifeGoals(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm glass-input text-white h-32 resize-none"
                placeholder="e.g. Master React, run a marathon, save $10,000 for investments, read 15 books this year..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Skills & Interests */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/40 border border-purple-800/30 flex items-center justify-center text-[#8B5CF6]">
                <Compass size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Skills & Hobbies</h2>
                <p className="text-xs text-white/50">Identify skills to master and personal interests.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Core Skills (Comma separated)</label>
                <div className="relative">
                  <Code className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="TypeScript, React, Cooking, Spanish"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Personal Interests</label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                  <input
                    type="text"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="Biohacking, Running, Astronomy, Writing"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Nav */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/5">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 border border-white/10 transition-all cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black bg-[#06B6D4] hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              {loading ? 'Initializing...' : 'Boot Core'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizardPage;
