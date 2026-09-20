import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CreditCard, Plus, Trash2, Edit2, Search, Filter, Calendar, 
  TrendingUp, RefreshCw, Tag, DollarSign, AlertCircle, X,
  PieChart, ChevronRight, CheckCircle2, Wallet, Building2
} from 'lucide-react';
import { 
  getExpenses, 
  createExpense, 
  updateExpense, 
  deleteExpense, 
  fmtCurrency 
} from '../api/client.js';
import { toast } from '../utils/toast.js';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState('THIS_MONTH');

  const [formData, setFormData] = useState({
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_mode: 'CASH',
    notes: ''
  });

  const categories = [
    'Rent', 
    'Salaries', 
    'Electricity & Utilities', 
    'Transportation', 
    'Packaging', 
    'Marketing', 
    'Repairs & Maintenance', 
    'Tea & Refreshments', 
    'Office Supplies',
    'Other'
  ];

  const loadExpenses = () => {
    setLoading(true);
    getExpenses()
      .then(list => setExpenses(list || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    loadExpenses(); 
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;
      
      if (dateRangeFilter !== 'ALL') {
        const expDate = new Date(exp.date);
        const now = new Date();
        if (dateRangeFilter === 'TODAY') {
          const todayStr = now.toISOString().slice(0, 10);
          if (exp.date !== todayStr) return false;
        } else if (dateRangeFilter === 'THIS_MONTH') {
          if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (dateRangeFilter === 'LAST_MONTH') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (expDate.getMonth() !== lastMonth.getMonth() || expDate.getFullYear() !== lastMonth.getFullYear()) {
            return false;
          }
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const catMatch = (exp.category || '').toLowerCase().includes(q);
        const noteMatch = (exp.notes || '').toLowerCase().includes(q);
        const amtMatch = String(exp.amount || '').includes(q);
        const modeMatch = (exp.payment_mode || '').toLowerCase().includes(q);
        return catMatch || noteMatch || amtMatch || modeMatch;
      }
      return true;
    });
  }, [expenses, categoryFilter, dateRangeFilter, search]);

  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const topCategory = categoryBreakdown[0] || null;

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      category: 'Rent',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      payment_mode: 'CASH',
      notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpense(exp);
    setFormData({
      category: exp.category || 'Rent',
      amount: exp.amount || '',
      date: exp.date || new Date().toISOString().slice(0, 10),
      payment_mode: exp.payment_mode || 'CASH',
      notes: exp.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return;
    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          ...formData,
          amount: parseFloat(formData.amount)
        });
      } else {
        await createExpense({ 
          ...formData, 
          amount: parseFloat(formData.amount) 
        });
      }
      setShowModal(false);
      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully');
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Error saving expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await deleteExpense(id);
      toast.success('Expense deleted successfully');
      loadExpenses();
    } catch (err) {
      toast.error(err.message || 'Error deleting expense');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 text-slate-800 dark:text-slate-100">
      
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CreditCard size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate">Operating Expenses</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
              Track rent, salaries, utilities, tea & refreshments, and shop overheads
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Record Expense</span>
            </button>

            <button
              onClick={loadExpenses}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Expenses"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-rose-600 dark:text-rose-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Filtered Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight number-cell">
            {fmtCurrency(totalFilteredExpense)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Across {filteredExpenses.length} expense vouchers
          </span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">This Month's Overhead</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight number-cell">
            {fmtCurrency(thisMonthExpenses)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Current calendar month spend
          </span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Top Spending Category</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Tag size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
            {topCategory ? topCategory[0] : 'None'}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            {topCategory ? `${fmtCurrency(topCategory[1])} (${totalFilteredExpense > 0 ? Math.round((topCategory[1] / totalFilteredExpense) * 100) : 0}% of total)` : 'No records yet'}
          </span>
        </div>
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Category Breakdown
            </span>
            <span className="text-[11px] text-slate-400">
              {categoryBreakdown.length} active categories
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categoryBreakdown.map(([cat, amt]) => {
              const pct = totalFilteredExpense > 0 ? Math.round((amt / totalFilteredExpense) * 100) : 0;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? 'ALL' : cat)}
                  className={`px-3 py-1.5 rounded-xl border text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                    categoryFilter === cat
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold shadow-2xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="font-semibold">{cat}</span>
                  <span className="font-black number-cell">{fmtCurrency(amt)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold shrink-0">
            {['ALL', 'THIS_MONTH', 'LAST_MONTH', 'TODAY'].map(range => (
              <button
                key={range}
                onClick={() => setDateRangeFilter(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dateRangeFilter === range
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {range === 'ALL' ? 'All Dates' : range === 'THIS_MONTH' ? 'This Month' : range === 'LAST_MONTH' ? 'Last Month' : 'Today'}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-none outline-none cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by purpose, category, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-rose-500 text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading expenses…</span>
          </div>
        ) : filteredExpenses.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
              {filteredExpenses.map(exp => (
                <div
                  key={exp.id}
                  className="p-3 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {exp.category}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{exp.date}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                        {exp.notes || 'No description'}
                      </p>
                      {exp.payment_mode && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          Mode: {exp.payment_mode}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400 number-cell">
                        {fmtCurrency(exp.amount)}
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(exp)}
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                        title="Edit Expense"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="Delete Expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Notes / Purpose</th>
                    <th className="py-3 px-4 text-center">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">{exp.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-[240px] truncate">{exp.notes || '—'}</td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {exp.payment_mode || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black number-cell text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {fmtCurrency(exp.amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors cursor-pointer"
                            title="Edit Expense"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
            <CreditCard size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No expense records found</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Click "Record Expense" to track your store spending.
            </p>
          </div>
        )}
      </div>

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingExpense ? 'Edit Business Expense' : 'Record Business Expense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Expense Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-black text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-900 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Notes / Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Shop maintenance, staff tea, delivery fee"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {submitting ? 'Saving…' : (editingExpense ? 'Update Expense' : 'Record Expense')}
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
