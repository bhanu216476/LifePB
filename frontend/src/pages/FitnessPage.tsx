import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Droplet } from 'lucide-react';
import Sparkline from '../components/Sparkline';

interface Workout {
  id: string;
  workoutType: string;
  durationMinutes: number;
  caloriesBurned: number;
  weightKg: number | null;
  loggedDate: string;
}

const FitnessPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast, triggerConfetti } = useNotifications();

  // State
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [steps, setSteps] = useState(7500);
  const [waterMl, setWaterMl] = useState(0);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [workoutType, setWorkoutType] = useState('RUNNING');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');

  const fetchFitnessData = async () => {
    if (!token) return;
    try {
      const [workoutsRes, dashboardRes] = await Promise.all([
        fetch('http://localhost:5000/api/fitness/workouts', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/dashboard', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (workoutsRes.ok && dashboardRes.ok) {
        setWorkouts(await workoutsRes.json());
        const dash = await dashboardRes.json();
        setWaterMl(dash.waterMl);
        setSteps(dash.steps || 7500);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token) fetchFitnessData();
  }, [token]);

  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || !calories) return;

    try {
      const response = await fetch('http://localhost:5000/api/fitness/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workoutType,
          durationMinutes: parseInt(duration),
          caloriesBurned: parseInt(calories),
          weightKg: weight ? parseFloat(weight) : null
        })
      });

      if (response.ok) {
        triggerToast('Workout Logged', 'Biological output saved. +80 XP.', 'success');
        triggerConfetti();
        setDuration('');
        setCalories('');
        setWeight('');
        setShowAddForm(false);
        fetchFitnessData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddWater = async (amount: number) => {
    try {
      const response = await fetch('http://localhost:5000/api/fitness/water', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amountMl: amount })
      });

      if (response.ok) {
        triggerToast('Hydrated', `Added ${amount}ml water. Keep going!`, 'success');
        setWaterMl(prev => prev + amount);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddSteps = async () => {
    const extraSteps = 2500;
    try {
      const response = await fetch('http://localhost:5000/api/fitness/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ count: extraSteps })
      });

      if (response.ok) {
        const newTotal = steps + extraSteps;
        setSteps(newTotal);
        triggerToast('Steps Synced', `Logged ${extraSteps} steps. Total: ${newTotal}.`, 'success');
        if (newTotal >= 10000 && steps < 10000) {
          triggerToast('Step Goal Met!', 'Walked 10,000 steps today! +100 XP.', 'success');
          triggerConfetti();
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Biological Engine</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Health & Physical Activity</h1>
          <p className="text-xs text-white/50 mt-1">Log workouts, steps, weight indices, and water targets.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>Log Workout</span>
        </button>
      </header>

      {/* Workout Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Log Physical Training</h3>
            <form onSubmit={handleLogWorkout} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Workout Type</label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                >
                  <option value="RUNNING">Running</option>
                  <option value="CYCLING">Cycling</option>
                  <option value="STRENGTH">Strength Training</option>
                  <option value="HIIT">HIIT / Functional</option>
                  <option value="SWIMMING">Swimming</option>
                  <option value="YOGA">Yoga</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Duration (Mins)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                    placeholder="45"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Est. Calories Burned</label>
                  <input
                    type="number"
                    required
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                    placeholder="350"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Weight (kg - Optional)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                  placeholder="74.2"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Log Workout</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* split visual dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Health indicators */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Hydration Widget */}
          <div className="glass-card rounded-[24px] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#06B6D4]/5 rounded-full blur-2xl -mr-6 -mt-6" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-base">Biological Hydration</h3>
                <p className="text-xxs text-white/40">Keep cells saturated with water inputs</p>
              </div>
              <div className="text-right">
                <span className="text-xxs font-bold text-white/40 block">CURRENT HYDRATION</span>
                <span className="text-2xl font-black font-mono text-[#06B6D4]">{waterMl} ml / 3000 ml</span>
              </div>
            </div>

            <Sparkline value={(waterMl / 3000) * 100} type="accent" height={10} />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleAddWater(250)}
                className="flex-1 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/30 hover:bg-cyan-900/30 font-semibold text-xs text-[#06B6D4] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Droplet size={14} />
                +250ml Glass
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="flex-1 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/30 hover:bg-cyan-900/30 font-semibold text-xs text-[#06B6D4] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Droplet size={14} />
                +500ml Flask
              </button>
            </div>
          </div>

          {/* Steps tracker */}
          <div className="glass-card rounded-[24px] p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-2xl -mr-6 -mt-6" />
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-base">Active Daily Steps</h3>
                <p className="text-xxs text-white/40">Cardiovascular pacing metric</p>
              </div>
              <div className="text-right">
                <span className="text-xxs font-bold text-white/40 block">TODAY'S STEPS</span>
                <span className="text-2xl font-black font-mono text-[#F59E0B]">{steps} / 10000</span>
              </div>
            </div>

            <Sparkline value={(steps / 10000) * 100} type="warning" height={10} />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddSteps}
                className="w-full py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/30 hover:bg-amber-900/30 font-semibold text-xs text-[#F59E0B] flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                Log 2,500 Steps Walked
              </button>
            </div>
          </div>
        </div>

        {/* Right: Workout log list */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-4">Recent Workout Logs</h3>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {workouts.slice(-5).reverse().map(workout => (
                <div key={workout.id} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                      {workout.workoutType}
                    </span>
                    <h4 className="font-semibold text-white mt-1.5">{workout.durationMinutes} minutes training</h4>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[#10B981] font-bold">-{workout.caloriesBurned} kcal</span>
                    {workout.weightKg && <span className="text-white/40 block text-[10px] mt-0.5">{workout.weightKg} kg</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xxs font-mono text-white/30 pt-4 border-t border-white/5">
            ESTIMATED ADIPOSE OUTFLOW INDEX
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitnessPage;
