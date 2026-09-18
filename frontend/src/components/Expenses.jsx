import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, Plus, Trash2, Search, Filter, Calendar, 
  TrendingUp, RefreshCw, Tag, DollarSign, AlertCircle, X
} from 'lucide-react';
import { getExpenses, createExpense, deleteExpense, fmtCurrency } from '../api/client.js';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_mode: 'CASH',
    notes: ''
  });

  const categories = ['Rent', 'Salaries', 'Electricity & Utilities', 'Transportation', 'Packaging', 'Marketing', 'Repairs & Maintenance', 'Tea & Refreshments', 'Other'];

  const loadExpenses = () => {
    setLoading(true);
    getExpenses()
      .then(list => setExpenses(list || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadExpenses(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    setSubmitting(true);
    try {
      await createExpense({ ...formData, amount: parseFloat(formData.amount) });
      setShowModal(false);
      setFormData({ category: 'Rent', amount: '', date: new Date().toISOString().slice(0, 10), payment_mode: 'CASH', notes: '' });
      loadExpenses();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense record?')) return;
    try {
      await deleteExpense(id);
      loadExpenses();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses.filter(exp => {
    if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (exp.category || '').toLowerCase().includes(q) || (exp.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard size={18} className="text-rose-600 shrink-0" />
              <span className="truncate">Operating Expenses</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Track rent, staff salaries, shop utilities, and overheads</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Record Expense</span>
            </button>

            <button
              onClick={loadExpenses}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Expenses"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-rose-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Operating Expenses</span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight number-cell mt-1">{fmtCurrency(totalExpense)}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Across {expenses.length} expense vouchers</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        <div className="inline-flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-100/90 text-xs font-bold text-slate-600 shadow-inner overflow-x-auto no-scrollbar shrink-0">
          {['ALL', 'Rent', 'Salaries', 'Electricity & Utilities', 'Tea & Refreshments'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-white text-rose-700 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat === 'ALL' ? 'All Expenses' : cat}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-rose-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading expenses…</span>
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filteredExpenses.map(exp => (
                <div
                  key={exp.id}
                  className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {exp.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{exp.date}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    <p className="text-[11px] text-slate-600 truncate">{exp.notes || 'No description'}</p>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-rose-600 font-mono">
                        {fmtCurrency(exp.amount)}
                      </span>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Notes / Purpose</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{exp.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{exp.notes || '—'}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 number-cell whitespace-nowrap">{fmtCurrency(exp.amount)}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No expense records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Record Expense" to track your store spending.</p>
          </div>
        )}
      </div>

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Record Business Expense</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Expense Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Shop maintenance, tea for guests"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving…' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
