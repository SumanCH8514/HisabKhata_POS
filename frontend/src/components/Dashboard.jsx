import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, ShoppingBag, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, CalendarClock, TrendingUp, DollarSign,
  Plus, Search, ArrowRight, ShieldCheck, Zap,
  CheckCircle2, Clock, Layers, Sparkles, RefreshCw,
  BarChart3, Users, ChevronRight, Phone, MessageSquare,
  FileSpreadsheet, ArrowUp, ArrowDown, Wallet, Box, Eye
} from 'lucide-react';
import { getDashboard, fmtCurrency, fmt } from '../api/client.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('This Month');
  const [chartMode, setChartMode] = useState('sales');

  const fetchMetrics = useCallback(() => {
    setRefreshing(true);
    getDashboard()
      .then(setMetrics)
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/pos?type=SALES');
      } else if (e.key === 'F3') {
        e.preventDefault();
        navigate('/pos?type=PURCHASE');
      } else if (e.key === 'F4') {
        e.preventDefault();
        navigate('/inventory');
      } else if (e.key === 'F5') {
        e.preventDefault();
        navigate('/parties');
      } else if (e.key === 'F6') {
        e.preventDefault();
        navigate('/expenses');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const m = metrics || {
    totalSales: 0,
    totalPurchases: 0,
    totalReceivables: 0,
    totalPayables: 0,
    lowStockCount: 0,
    expiringCount: 0,
    totalExpenses: 0,
    inventoryValue: 0,
    recentInvoices: []
  };

  const netCashFlow = (m.totalSales || 0) - (m.totalPurchases || 0) - (m.totalExpenses || 0);
  const grossProfit = (m.totalSales || 0) - (m.totalPurchases || 0);
  const grossMargin = m.totalSales > 0 ? ((grossProfit / m.totalSales) * 100).toFixed(1) : '0.0';

  const now = new Date();
  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(now);

  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();

  const salesByDay = useMemo(() => {
    const map = {};
    (m.dailySales || []).forEach(row => {
      map[Number(row.day)] = { sales: Number(row.sales) || 0, received: Number(row.received) || 0, count: Number(row.count) || 0 };
    });
    return map;
  }, [m.dailySales]);

  const purchasesByDay = useMemo(() => {
    const map = {};
    (m.dailyPurchases || []).forEach(row => {
      map[Number(row.day)] = { purchases: Number(row.purchases) || 0, paid: Number(row.paid) || 0 };
    });
    return map;
  }, [m.dailyPurchases]);

  const expensesByDay = useMemo(() => {
    const map = {};
    (m.dailyExpenses || []).forEach(row => {
      map[Number(row.day)] = Number(row.expenses) || 0;
    });
    return map;
  }, [m.dailyExpenses]);

  const maxDayValue = useMemo(() => {
    let max = 100;
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      if (chartMode === 'sales') {
        const val = salesByDay[day]?.sales || 0;
        if (val > max) max = val;
      } else {
        const inflow = salesByDay[day]?.received || salesByDay[day]?.sales || 0;
        const outflow = (purchasesByDay[day]?.paid || purchasesByDay[day]?.purchases || 0) + (expensesByDay[day] || 0);
        const val = Math.max(inflow, outflow);
        if (val > max) max = val;
      }
    }
    return max;
  }, [salesByDay, purchasesByDay, expensesByDay, daysInCurrentMonth, chartMode]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading store overview…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12">
      
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            <div className="inline-flex items-center rounded-xl border border-slate-200/80 dark:border-slate-800 p-0.5 bg-slate-100/90 dark:bg-slate-900/90 text-xs font-bold text-slate-600 shadow-inner shrink-0">
              {['Today', 'This Week', 'This Month', 'This Year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs transition-all cursor-pointer ${
                    period === p
                      ? 'bg-emerald-600 text-white shadow-sm font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-semibold text-slate-400 hidden md:inline truncate">
              01 {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)} – {dateFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mr-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-bold">F2</span> Sale
              <span className="text-slate-300">·</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-bold">F3</span> Purchase
              <span className="text-slate-300">·</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700 font-bold">F4</span> Items
            </div>

            <button
              onClick={fetchMetrics}
              disabled={refreshing}
              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 active:scale-95 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh live statistics"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
              <span className="hidden sm:inline">{refreshing ? 'Syncing…' : 'Sync'}</span>
            </button>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div 
          onClick={() => navigate('/sales')}
          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Receipt size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight number-cell">
              {fmtCurrency(m.totalSales || 0)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Lifetime Volume</span>
              <span className="text-emerald-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                View bills <ChevronRight size={13} />
              </span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/purchase')}
          className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Purchases</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ShoppingBag size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight number-cell">
              {fmtCurrency(m.totalPurchases || 0)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Stock Inward</span>
              <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                View bills <ChevronRight size={13} />
              </span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/parties')}
          className="bg-white border border-slate-200 hover:border-cyan-400 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">To Collect (Debtors)</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100">
              <ArrowDownLeft size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight number-cell">
              {fmtCurrency(m.totalReceivables || 0)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Customer Khata</span>
              <span className="text-cyan-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Customer dues <ChevronRight size={13} />
              </span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => navigate('/parties')}
          className="bg-white border border-slate-200 hover:border-rose-400 rounded-xl p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">To Pay (Creditors)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <ArrowUpRight size={16} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 tracking-tight number-cell">
              {fmtCurrency(m.totalPayables || 0)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>Supplier Khata</span>
              <span className="text-rose-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Supplier dues <ChevronRight size={13} />
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <div className="lg:col-span-2 space-y-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  Monthly Performance
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Day-by-day billing activity for current month</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900 text-xs font-semibold">
                  <button
                    onClick={() => setChartMode('sales')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                      chartMode === 'sales'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Sales Trend
                  </button>
                  <button
                    onClick={() => setChartMode('cashflow')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                      chartMode === 'cashflow'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Cash Flow
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 my-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Cashflow</span>
                <span className={`text-sm sm:text-base font-extrabold number-cell block mt-0.5 ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {fmtCurrency(netCashFlow)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Other Expenses</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 number-cell block mt-0.5">
                  {fmtCurrency(m.totalExpenses || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Margin</span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 number-cell block mt-0.5">
                  {grossMargin}%
                </span>
              </div>
            </div>

            <div className="py-4">
              <div className="h-44 w-full flex flex-col justify-between relative">
                
                <div className="w-full flex-1 flex items-end justify-between gap-1 sm:gap-1.5 border-b border-slate-200 pb-1 px-1">
                  {chartMode === 'sales' ? (
                    Array.from({ length: Math.min(daysInCurrentMonth, 31) }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const isToday = dayNum === currentDay;
                      const dayData = salesByDay[dayNum] || { sales: 0, count: 0 };
                      const hasSales = dayData.sales > 0;
                      const heightPercent = hasSales 
                        ? Math.max(14, Math.min(100, Math.round((dayData.sales / maxDayValue) * 90))) 
                        : 4;

                      return (
                        <div
                          key={dayNum}
                          className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                        >
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[14px] rounded-t transition-all ${
                              hasSales 
                                ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-2xs' 
                                : isToday 
                                ? 'bg-blue-300 ring-2 ring-blue-400' 
                                : 'bg-slate-100 group-hover:bg-slate-200'
                            }`}
                          />
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl transition-all whitespace-nowrap z-30 flex flex-col items-center">
                            <span>{dayNum} {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                            <span className="text-emerald-400 font-mono">{fmtCurrency(dayData.sales)}</span>
                            {dayData.count > 0 && <span className="text-[9px] text-slate-300">({dayData.count} {dayData.count === 1 ? 'sale' : 'sales'})</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    Array.from({ length: Math.min(daysInCurrentMonth, 31) }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const isToday = dayNum === currentDay;
                      const inflow = salesByDay[dayNum]?.received || salesByDay[dayNum]?.sales || 0;
                      const purchaseOutflow = purchasesByDay[dayNum]?.paid || purchasesByDay[dayNum]?.purchases || 0;
                      const expenseOutflow = expensesByDay[dayNum] || 0;
                      const totalOutflow = purchaseOutflow + expenseOutflow;
                      const netDay = inflow - totalOutflow;

                      const inflowHeight = inflow > 0 ? Math.max(10, Math.min(100, Math.round((inflow / maxDayValue) * 85))) : 4;
                      const outflowHeight = totalOutflow > 0 ? Math.max(10, Math.min(100, Math.round((totalOutflow / maxDayValue) * 85))) : 0;

                      return (
                        <div
                          key={dayNum}
                          className="flex-1 flex items-end justify-center gap-0.5 group relative h-full"
                        >
                          <div
                            style={{ height: `${inflowHeight}%` }}
                            className={`w-full max-w-[7px] rounded-t transition-all ${
                              inflow > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : isToday ? 'bg-blue-200' : 'bg-slate-100'
                            }`}
                          />
                          {totalOutflow > 0 && (
                            <div
                              style={{ height: `${outflowHeight}%` }}
                              className="w-full max-w-[7px] rounded-t bg-rose-400 group-hover:bg-rose-500 transition-all"
                            />
                          )}
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl transition-all whitespace-nowrap z-30 flex flex-col items-center">
                            <span>{dayNum} {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                            <span className="text-emerald-400 font-mono">+ Inflow: {fmtCurrency(inflow)}</span>
                            {totalOutflow > 0 && <span className="text-rose-400 font-mono">- Outflow: {fmtCurrency(totalOutflow)}</span>}
                            <span className={`text-[9px] font-mono font-black ${netDay >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>Net: {fmtCurrency(netDay)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-2 px-1">
                  <span>01 {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                  <span>07</span>
                  <span>14</span>
                  <span>21</span>
                  <span>{daysInCurrentMonth} {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                {chartMode === 'sales' ? (
                  <>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Sales Inflow
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded bg-blue-300 ring-1 ring-blue-400 inline-block" /> Today
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded bg-slate-200 inline-block" /> Normal Days
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Inflow (Sales)
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <span className="w-2 h-2 rounded bg-rose-400 inline-block" /> Outflow (Purchases & Expenses)
                    </span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Press F2 for Instant POS Bill</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recent Invoices</h3>
                <p className="text-xs text-slate-400">Latest transactions from all registers</p>
              </div>
              <button
                onClick={() => navigate('/sales')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                All Invoices <ArrowRight size={13} />
              </button>
            </div>

            {m.recentInvoices && m.recentInvoices.length > 0 ? (
              <>
                <div className="sm:hidden space-y-2">
                  {m.recentInvoices.map((inv) => {
                    const isPaid = (inv.balance_due || 0) <= 0;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => navigate('/sales')}
                        className="p-3 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer shadow-2xs active:scale-98"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black font-mono text-slate-900">{inv.invoice_number}</span>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isPaid ? 'PAID' : `DUE ${fmtCurrency(inv.balance_due)}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-medium truncate">{inv.party_name || 'Cash Customer'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{inv.date}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 font-mono block">
                            {fmtCurrency(inv.total_amount)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                            View <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                        <th className="pb-2">Invoice No</th>
                        <th className="pb-2">Party</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2 text-right">Amount</th>
                        <th className="pb-2 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {m.recentInvoices.map((inv) => {
                        const isPaid = (inv.balance_due || 0) <= 0;
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/sales')}>
                            <td className="py-2.5 font-bold font-mono text-slate-800 whitespace-nowrap">{inv.invoice_number}</td>
                            <td className="py-2.5 text-slate-600 font-medium whitespace-nowrap">{inv.party_name || 'Cash Customer'}</td>
                            <td className="py-2.5 text-slate-400 whitespace-nowrap">{inv.date}</td>
                            <td className="py-2.5 text-right font-bold text-slate-900 number-cell whitespace-nowrap">
                              {fmtCurrency(inv.total_amount)}
                            </td>
                            <td className="py-2.5 text-right whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isPaid ? 'PAID' : 'DUE'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Receipt size={22} className="mx-auto text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-slate-700">No invoices created yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Generate your first GST / Non-GST invoice.</p>
                <button
                  onClick={() => navigate('/pos?type=SALES')}
                  className="mt-2.5 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} /> Create First Invoice (F2)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Stock Valuation</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Box size={15} strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl font-black text-slate-900 tracking-tight number-cell">
                {fmtCurrency(m.inventoryValue || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Total stock purchase value</p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Stock Status</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/40 text-[11px]">Healthy</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={15} className={m.lowStockCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400'} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Low Stock Alert</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                m.lowStockCount > 0 
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/40' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {m.lowStockCount || 0} Items
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {m.lowStockCount > 0 
                ? `${m.lowStockCount} items below safety reorder level.`
                : 'All products are sufficiently stocked.'}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => navigate('/inventory?filter=low')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5"
              >
                Check items <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <CalendarClock size={15} className={m.expiringCount > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-400'} />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Batch Expiry Watch</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                m.expiringCount > 0 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-500/40' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {m.expiringCount || 0} Expiring
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {m.expiringCount > 0
                ? `${m.expiringCount} batches expiring within 30 days.`
                : 'No batches near expiry threshold.'}
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => navigate('/inventory')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                View batches <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-bold text-slate-700 block mb-2.5">POS Quick Actions</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/pos?type=SALES')}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-left transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-emerald-600 block">[F2]</span>
                <span className="text-xs font-bold">New Sale</span>
              </button>
              <button
                onClick={() => navigate('/pos?type=PURCHASE')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-slate-500 block">[F3]</span>
                <span className="text-xs font-bold">New Purchase</span>
              </button>
              <button
                onClick={() => navigate('/inventory')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-slate-500 block">[F4]</span>
                <span className="text-xs font-bold">Add Item</span>
              </button>
              <button
                onClick={() => navigate('/parties')}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-left transition-colors"
              >
                <span className="text-[10px] font-mono font-bold text-slate-500 block">[F5]</span>
                <span className="text-xs font-bold">Add Party</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
