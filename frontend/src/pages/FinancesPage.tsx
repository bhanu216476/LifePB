import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Plus, Trash2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Expense {
  id: string;
  amount: number;
  category: string;
  merchant: string;
  transactionDate: string;
}

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444'];

const FinancesPage: React.FC = () => {
  const { token } = useAuth();
  const { triggerToast } = useNotifications();

  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('FOOD');
  const [merchant, setMerchant] = useState('');

  const fetchExpenses = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/finances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setExpenses(await response.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (token) fetchExpenses();
  }, [token]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) return;

    try {
      const response = await fetch('http://localhost:5000/api/finances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category,
          merchant
        })
      });

      if (response.ok) {
        triggerToast('Expense Logged', 'Transaction synchronized successfully.', 'success');
        setAmount('');
        setMerchant('');
        setShowAddForm(false);
        fetchExpenses();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Delete this transaction log?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/finances/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerToast('Transaction Removed', 'Expense log purged.', 'warning');
        setExpenses(prev => prev.filter(exp => exp.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Group by category for PieChart
  const categoryDataMap = expenses.reduce((acc: any, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const pieData = Object.keys(categoryDataMap).map(catKey => ({
    name: catKey.charAt(0) + catKey.slice(1).toLowerCase(),
    value: parseFloat(categoryDataMap[catKey].toFixed(2))
  }));

  const totalSpend = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  return (
    <div className="pl-68 pr-8 py-8 flex flex-col gap-8 min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <span className="text-xxs font-extrabold uppercase tracking-widest text-[#6366F1]">Capital Engine</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Expenses & Finances</h1>
          <p className="text-xs text-white/50 mt-1">Audit cash streams, savings metrics, and monthly budgets.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:opacity-95 cursor-pointer shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          <span>New Expense</span>
        </button>
      </header>

      {/* Add Expense Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-md bg-[#0D1321] border border-white/8 p-6 rounded-2xl glass-panel shadow-2xl">
            <h3 className="font-bold text-base mb-4">Log Expense Transaction</h3>
            <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm glass-input text-white font-mono"
                  placeholder="24.50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Merchant</label>
                  <input
                    type="text"
                    required
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                    placeholder="e.g. Amazon, Uber"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xxs font-bold uppercase tracking-wider text-white/40">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm glass-input text-white"
                  >
                    <option value="FOOD">Food</option>
                    <option value="HOUSING">Housing</option>
                    <option value="UTILITIES">Utilities</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="SUBSCRIPTIONS">Subscriptions</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="HEALTHCARE">Healthcare</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-white/10">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#6366F1] text-black">Log Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main split dashboard content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Spent breakdown (2 cols) */}
        <div className="lg:col-span-2 glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-base text-white">Expense Distribution</h3>
                <p className="text-xxs text-white/40">Spend grouped by focus parameters</p>
              </div>
              <div className="text-right">
                <span className="text-xxs font-bold text-white/40 block">TOTAL EXPENDITURE</span>
                <span className="text-2xl font-black font-mono text-white">${totalSpend.toFixed(2)}</span>
              </div>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-white/30 text-xs">No transactions registered.</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 border-t border-white/5 pt-4">
            {pieData.map((item, index) => (
              <span key={index} className="inline-flex items-center gap-1.5 text-xxs font-semibold bg-white/2 border border-white/5 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-white/60">{item.name} (${item.value})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Transaction stream */}
        <div className="glass-card rounded-[24px] p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base mb-4">Capital Outflow Registry</h3>
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {expenses.slice(-5).reverse().map(exp => (
                <div key={exp.id} className="p-3.5 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between text-xs group">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/50">
                      {exp.category}
                    </span>
                    <h4 className="font-semibold text-white mt-1.5">{exp.merchant}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-rose-300 font-bold">-${exp.amount.toFixed(2)}</span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="text-white/20 group-hover:text-rose-400 cursor-pointer transition-colors p-1 hover:bg-white/5 rounded-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xxs font-mono text-white/30 pt-4 border-t border-white/5">
            BUDGET TARGETS SET AT 30% SAVINGS RATE
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancesPage;
