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
import { getDashboard, swrDashboard, fmtCurrency, fmt } from '../api/client.js';
import { getCachedData } from '../utils/cache.js';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 animate-pulse">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:px-4 sm:py-3 shadow-xs flex items-center justify-between">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="h-8 w-20 bg-slate-200 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
            </div>
            <div className="h-8 w-36 bg-slate-200 rounded" />
            <div className="h-3 w-full bg-slate-100 rounded pt-2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
              <div className="h-7 w-36 bg-slate-200 rounded-md" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-14 bg-slate-100 rounded-lg" />
              <div className="h-14 bg-slate-100 rounded-lg" />
              <div className="h-14 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-44 bg-slate-50 rounded-lg flex items-end justify-between p-4 gap-2">
              {Array.from({ length: 16 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-slate-200 rounded-t w-full"
                  style={{ height: `${20 + (idx * 17) % 70}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="h-4 w-28 bg-slate-200 rounded" />
            <div className="h-12 bg-slate-100 rounded-xl" />
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="h-4 w-36 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const companyId = localStorage.getItem('companyId') || 'default';
  const initialCached = useMemo(() => {
    const c = getCachedData(`dashboard_${companyId}`);
    return c && c.periods ? c : null;
  }, [companyId]);
  const [metrics, setMetrics] = useState(initialCached);
  const [loading, setLoading] = useState(!initialCached);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('This Month');
  const [chartMode, setChartMode] = useState('sales');

  const fetchMetrics = useCallback((forceFresh = false) => {
    if (forceFresh) {
      setRefreshing(true);
      getDashboard(true)
        .then((fresh) => {
          setMetrics(fresh);
          setLoading(false);
        })
        .catch(console.error)
        .finally(() => setRefreshing(false));
      return;
    }

    swrDashboard((fresh) => {
      setMetrics(fresh);
      setLoading(false);
      setRefreshing(false);
    }).then((initial) => {
      if (initial) {
        setMetrics(initial);
        setLoading(false);
      }
    }).catch(console.error).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  }, []);

  useEffect(() => {
    fetchMetrics(false);
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

  const now = useMemo(() => new Date(), []);

  const periodKey = useMemo(() => {
    if (period === 'Today') return 'today';
    if (period === 'This Week') return 'week';
    if (period === 'This Year') return 'year';
    return 'month';
  }, [period]);

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

  const activeSales = useMemo(() => {
    if (m.periods?.[periodKey] && typeof m.periods[periodKey].sales === 'number') {
      return Number(m.periods[periodKey].sales) || 0;
    }
    if (period === 'Today') {
      return Number(salesByDay[currentDay]?.sales) || 0;
    }
    if (period === 'This Week') {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + diffToMon + i);
        if (d.getMonth() === now.getMonth()) {
          sum += Number(salesByDay[d.getDate()]?.sales) || 0;
        }
      }
      return sum;
    }
    if (period === 'This Month') {
      let sum = 0;
      for (let d = 1; d <= daysInCurrentMonth; d++) {
        sum += Number(salesByDay[d]?.sales) || 0;
      }
      return sum > 0 ? sum : (Number(m.totalSales) || 0);
    }
    return Number(m.totalSales) || 0;
  }, [m, periodKey, period, currentDay, salesByDay, now, daysInCurrentMonth]);

  const activePurchases = useMemo(() => {
    if (m.periods?.[periodKey] && typeof m.periods[periodKey].purchases === 'number') {
      return Number(m.periods[periodKey].purchases) || 0;
    }
    if (period === 'Today') {
      return Number(purchasesByDay[currentDay]?.purchases) || 0;
    }
    if (period === 'This Week') {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + diffToMon + i);
        if (d.getMonth() === now.getMonth()) {
          sum += Number(purchasesByDay[d.getDate()]?.purchases) || 0;
        }
      }
      return sum;
    }
    if (period === 'This Month') {
      let sum = 0;
      for (let d = 1; d <= daysInCurrentMonth; d++) {
        sum += Number(purchasesByDay[d]?.purchases) || 0;
      }
      return sum > 0 ? sum : (Number(m.totalPurchases) || 0);
    }
    return Number(m.totalPurchases) || 0;
  }, [m, periodKey, period, currentDay, purchasesByDay, now, daysInCurrentMonth]);

  const activeExpenses = useMemo(() => {
    if (m.periods?.[periodKey] && typeof m.periods[periodKey].expenses === 'number') {
      return Number(m.periods[periodKey].expenses) || 0;
    }
    if (period === 'Today') {
      return Number(expensesByDay[currentDay]) || 0;
    }
    if (period === 'This Week') {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      let sum = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + diffToMon + i);
        if (d.getMonth() === now.getMonth()) {
          sum += Number(expensesByDay[d.getDate()]) || 0;
        }
      }
      return sum;
    }
    if (period === 'This Month') {
      let sum = 0;
      for (let d = 1; d <= daysInCurrentMonth; d++) {
        sum += Number(expensesByDay[d]) || 0;
      }
      return sum > 0 ? sum : (Number(m.totalExpenses) || 0);
    }
    return Number(m.totalExpenses) || 0;
  }, [m, periodKey, period, currentDay, expensesByDay, now, daysInCurrentMonth]);

  const netCashFlow = activeSales - activePurchases - activeExpenses;
  const grossProfit = activeSales - activePurchases;
  const grossMargin = activeSales > 0 ? ((grossProfit / activeSales) * 100).toFixed(1) : '0.0';

  const periodLabelMap = {
    Today: 'Today',
    'This Week': 'Week',
    'This Month': 'Month',
    'This Year': 'Year'
  };
  const currentPeriodName = periodLabelMap[period] || 'Period';

  const periodDateLabel = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(now.getDate());
    const monthShort = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now);
    const year = now.getFullYear();

    if (period === 'Today') {
      return `${day} ${monthShort} ${year}`;
    }

    if (period === 'This Week') {
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const monDay = pad(mon.getDate());
      const monMonth = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(mon);
      return `${monDay} ${monMonth} – ${day} ${monthShort} ${year}`;
    }

    if (period === 'This Year') {
      return `01 Jan – ${day} ${monthShort} ${year}`;
    }

    return `01 ${monthShort} – ${day} ${monthShort} ${year}`;
  }, [period, now]);

  const performanceInfo = useMemo(() => {
    switch (period) {
      case 'Today':
        return {
          title: "Today's Performance",
          subtitle: `Hour-by-hour sales & cash activity for ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(now)}`
        };
      case 'This Week':
        return {
          title: 'Weekly Performance',
          subtitle: 'Day-by-day billing activity for this week (Mon – Sun)'
        };
      case 'This Year':
        return {
          title: 'Annual Performance',
          subtitle: `Month-by-month billing activity for ${now.getFullYear()}`
        };
      case 'This Month':
      default:
        return {
          title: 'Monthly Performance',
          subtitle: `Day-by-day billing activity for ${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(now)}`
        };
    }
  }, [period, now]);

  const chartDataItems = useMemo(() => {
    if (period === 'Today') {
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      const todaySalesVal = Number(m.periods?.today?.sales) || Number(salesByDay[currentDay]?.sales) || 0;
      return hours.map(h => {
        const isCurrentSlot = now.getHours() >= h && now.getHours() < h + 2;
        const salesVal = isCurrentSlot ? todaySalesVal : 0;
        const hourStr = h <= 12 ? `${h} AM` : `${h - 12} PM`;
        return {
          id: h,
          label: hourStr,
          tooltipTitle: `${hourStr} Today`,
          sales: salesVal,
          received: salesVal,
          count: salesVal > 0 ? 1 : 0,
          inflow: salesVal,
          outflow: 0,
          isHighlight: isCurrentSlot
        };
      });
    }

    if (period === 'This Week') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dayOfWeek = now.getDay();
      const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);

      return dayNames.map((name, idx) => {
        const d = new Date(mon);
        d.setDate(mon.getDate() + idx);
        const dayOfMonth = d.getDate();
        const isSameMonth = d.getMonth() === now.getMonth();
        const s = isSameMonth ? (salesByDay[dayOfMonth] || { sales: 0, received: 0, count: 0 }) : { sales: 0, received: 0, count: 0 };
        const p = isSameMonth ? (purchasesByDay[dayOfMonth] || { purchases: 0, paid: 0 }) : { purchases: 0, paid: 0 };
        const e = isSameMonth ? (expensesByDay[dayOfMonth] || 0) : 0;
        const inflow = s.received || s.sales || 0;
        const outflow = (p.paid || p.purchases || 0) + e;
        const isToday = d.toDateString() === now.toDateString();

        return {
          id: name,
          label: name,
          tooltipTitle: `${name}, ${dayOfMonth} ${new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(d)}`,
          sales: s.sales,
          received: s.received,
          count: s.count,
          inflow,
          outflow,
          isHighlight: isToday
        };
      });
    }

    if (period === 'This Year') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonthIdx = now.getMonth();

      return monthNames.map((name, idx) => {
        const isCurrentMonth = idx === currentMonthIdx;
        const salesVal = isCurrentMonth ? activeSales : 0;
        const purchasesVal = isCurrentMonth ? activePurchases : 0;
        const expensesVal = isCurrentMonth ? activeExpenses : 0;
        const inflow = salesVal;
        const outflow = purchasesVal + expensesVal;

        return {
          id: name,
          label: name,
          tooltipTitle: `${name} ${now.getFullYear()}`,
          sales: salesVal,
          received: salesVal,
          count: salesVal > 0 ? 1 : 0,
          inflow,
          outflow,
          isHighlight: isCurrentMonth
        };
      });
    }

    return Array.from({ length: Math.min(daysInCurrentMonth, 31) }).map((_, idx) => {
      const dayNum = idx + 1;
      const isToday = dayNum === currentDay;
      const s = salesByDay[dayNum] || { sales: 0, received: 0, count: 0 };
      const p = purchasesByDay[dayNum] || { purchases: 0, paid: 0 };
      const e = expensesByDay[dayNum] || 0;
      const inflow = s.received || s.sales || 0;
      const outflow = (p.paid || p.purchases || 0) + e;

      return {
        id: dayNum,
        label: dayNum === 1 || dayNum === 7 || dayNum === 14 || dayNum === 21 || dayNum === daysInCurrentMonth ? String(dayNum).padStart(2, '0') : '',
        tooltipTitle: `${dayNum} ${new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}`,
        sales: s.sales,
        received: s.received,
        count: s.count,
        inflow,
        outflow,
        isHighlight: isToday
      };
    });
  }, [period, now, currentDay, daysInCurrentMonth, m, salesByDay, purchasesByDay, expensesByDay, activeSales, activePurchases, activeExpenses]);

  const maxChartValue = useMemo(() => {
    let max = 100;
    for (const item of chartDataItems) {
      if (chartMode === 'sales') {
        if (item.sales > max) max = item.sales;
      } else {
        const val = Math.max(item.inflow || 0, item.outflow || 0);
        if (val > max) max = val;
      }
    }
    return max;
  }, [chartDataItems, chartMode]);

  if (loading && !metrics) {
    return <DashboardSkeleton />;
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

            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg hidden md:inline truncate">
              {periodDateLabel}
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
              onClick={() => fetchMetrics(true)}
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
              {fmtCurrency(activeSales)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{currentPeriodName} Volume</span>
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
              {fmtCurrency(activePurchases)}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
              <span>{currentPeriodName} Inward</span>
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
                  {performanceInfo.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{performanceInfo.subtitle}</p>
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
                  {fmtCurrency(activeExpenses)}
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
                    chartDataItems.map((item) => {
                      const hasSales = item.sales > 0;
                      const heightPercent = hasSales 
                        ? Math.max(14, Math.min(100, Math.round((item.sales / maxChartValue) * 90))) 
                        : 4;

                      return (
                        <div
                          key={item.id}
                          className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                        >
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[20px] rounded-t transition-all ${
                              hasSales 
                                ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-2xs' 
                                : item.isHighlight 
                                ? 'bg-blue-300 ring-2 ring-blue-400' 
                                : 'bg-slate-100 group-hover:bg-slate-200'
                            }`}
                          />
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl transition-all whitespace-nowrap z-30 flex flex-col items-center">
                            <span>{item.tooltipTitle}</span>
                            <span className="text-emerald-400 font-mono">{fmtCurrency(item.sales)}</span>
                            {item.count > 0 && <span className="text-[9px] text-slate-300">({item.count} {item.count === 1 ? 'sale' : 'sales'})</span>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    chartDataItems.map((item) => {
                      const totalOutflow = item.outflow || 0;
                      const inflow = item.inflow || 0;
                      const netDay = inflow - totalOutflow;

                      const inflowHeight = inflow > 0 ? Math.max(10, Math.min(100, Math.round((inflow / maxChartValue) * 85))) : 4;
                      const outflowHeight = totalOutflow > 0 ? Math.max(10, Math.min(100, Math.round((totalOutflow / maxChartValue) * 85))) : 0;

                      return (
                        <div
                          key={item.id}
                          className="flex-1 flex items-end justify-center gap-0.5 group relative h-full"
                        >
                          <div
                            style={{ height: `${inflowHeight}%` }}
                            className={`w-full max-w-[10px] rounded-t transition-all ${
                              inflow > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : item.isHighlight ? 'bg-blue-200' : 'bg-slate-100'
                            }`}
                          />
                          {totalOutflow > 0 && (
                            <div
                              style={{ height: `${outflowHeight}%` }}
                              className="w-full max-w-[10px] rounded-t bg-rose-400 group-hover:bg-rose-500 transition-all"
                            />
                          )}
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl transition-all whitespace-nowrap z-30 flex flex-col items-center">
                            <span>{item.tooltipTitle}</span>
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
                  {period === 'Today' ? (
                    chartDataItems.map((item) => (
                      <span key={item.id} className={item.isHighlight ? 'text-blue-600 font-bold' : ''}>
                        {item.label}
                      </span>
                    ))
                  ) : period === 'This Week' ? (
                    chartDataItems.map((item) => (
                      <span key={item.id} className={item.isHighlight ? 'text-emerald-600 font-bold' : ''}>
                        {item.label}
                      </span>
                    ))
                  ) : period === 'This Year' ? (
                    chartDataItems.map((item) => (
                      <span key={item.id} className={item.isHighlight ? 'text-emerald-600 font-bold' : ''}>
                        {item.label}
                      </span>
                    ))
                  ) : (
                    <>
                      <span>01 {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                      <span>07</span>
                      <span>14</span>
                      <span>21</span>
                      <span>{daysInCurrentMonth} {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
                {chartMode === 'sales' ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Sales Inflow
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-100 shrink-0" /> Today
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" /> Normal Days
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Inflow (Sales)
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" /> Outflow (Purchases & Expenses)
                    </span>
                  </>
                )}
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 border border-slate-200 rounded text-slate-600 shadow-2xs">F2</kbd> for Instant POS Bill
              </span>
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
