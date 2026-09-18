import React, { useEffect, useState, useMemo } from 'react';
import { 
  PieChart, FileSpreadsheet, Download, Calendar, Filter,
  ArrowDownLeft, ArrowUpRight, DollarSign, TrendingUp,
  Receipt, ShoppingBag, CreditCard, RefreshCw, BarChart2,
  Printer, Search, CheckCircle2, AlertTriangle, Package,
  Layers, ArrowRight, ShieldCheck, Scale, Sparkles
} from 'lucide-react';
import { 
  getSalesReport, 
  getGstReport, 
  getDayBook, 
  getItems, 
  getExpenses, 
  getInvoices,
  fmtCurrency,
  getCompany
} from '../api/client.js';

const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('SALES');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [gstData, setGstData] = useState([]);
  const [dayBookData, setDayBookData] = useState([]);
  const [itemsData, setItemsData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [company, setCompany] = useState(null);
  
  const [period, setPeriod] = useState('THIS_MONTH');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(getLocalDateStr(new Date()));

  const companyName = company?.name || company?.business_name || localStorage.getItem('companyName') || 'HisabKhata POS';

  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    
    if (period === 'TODAY') {
      return { from: todayStr, to: todayStr };
    }
    if (period === 'THIS_WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { from: getLocalDateStr(d), to: todayStr };
    }
    if (period === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: getLocalDateStr(firstDay), to: todayStr };
    }
    if (period === 'THIS_YEAR') {
      const curYear = now.getFullYear();
      const fyStartYear = now.getMonth() >= 3 ? curYear : curYear - 1;
      return { from: `${fyStartYear}-04-01`, to: todayStr };
    }
    if (period === 'CUSTOM') {
      return { from: customFrom, to: customTo };
    }
    return { from: '', to: '' };
  }, [period, customFrom, customTo]);

  const loadReportData = () => {
    setLoading(true);
    Promise.all([
      getInvoices({ type: 'SALES', limit: 1000 }).catch(() => getSalesReport()),
      getInvoices({ type: 'PURCHASE', limit: 1000 }).catch(() => []),
      getGstReport().catch(() => []),
      getDayBook({ date: dateFilter }).catch(() => []),
      getItems().catch(() => []),
      getExpenses().catch(() => []),
      getCompany().catch(() => null)
    ])
      .then(([sales, purchases, gst, daybook, items, expenses, comp]) => {
        if (comp) setCompany(comp);
        const salesList = sales || [];
        setSalesData(salesList);
        setPurchasesData(purchases || []);

        if (gst && gst.length > 0) {
          setGstData(gst);
        } else {
          const derivedGst = salesList.map(s => ({
            invoice_number: s.invoice_number,
            date: s.date,
            customer_name: s.party_name || 'Walk-in Customer',
            customer_gstin: s.party_gst || 'URP',
            customer_state: s.party_state || '',
            subtotal: s.subtotal || (Number(s.total_amount || 0) - Number(s.tax_amount || 0)),
            tax_amount: s.tax_amount || 0,
            total_amount: s.total_amount || 0
          }));
          setGstData(derivedGst);
        }

        const daybookList = daybook || [];
        if (daybookList.length > 0) {
          setDayBookData(daybookList);
        } else {
          const selectedDate = dateFilter;
          const salesOnDate = salesList
            .filter(s => (s.date || '').slice(0, 10) === selectedDate)
            .map(s => ({
              entry_type: 'INVOICE',
              reference: s.invoice_number,
              type: 'SALES',
              date: s.date,
              amount: s.total_amount
            }));
          const expensesOnDate = (expenses || [])
            .filter(e => (e.date || '').slice(0, 10) === selectedDate)
            .map(e => ({
              entry_type: 'EXPENSE',
              reference: e.notes || e.category,
              type: e.category,
              date: e.date,
              amount: e.amount
            }));
          setDayBookData([...salesOnDate, ...expensesOnDate]);
        }

        setItemsData(items || []);
        setExpensesData(expenses || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReportData();
  }, [dateFilter]);

  const filterByDateRange = (list, dateProp = 'date') => {
    if (!dateRange.from && !dateRange.to) return list;
    return list.filter(item => {
      const itemDate = (item[dateProp] || '').slice(0, 10);
      if (!itemDate) return true;
      if (dateRange.from && itemDate < dateRange.from) return false;
      if (dateRange.to && itemDate > dateRange.to) return false;
      return true;
    });
  };

  const filteredSales = useMemo(() => {
    const list = filterByDateRange(salesData, 'date');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(s => 
      (s.invoice_number || '').toLowerCase().includes(q) ||
      (s.party_name || '').toLowerCase().includes(q)
    );
  }, [salesData, dateRange, search]);

  const filteredGst = useMemo(() => {
    const list = filterByDateRange(gstData, 'date');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(g => 
      (g.invoice_number || '').toLowerCase().includes(q) ||
      (g.customer_name || '').toLowerCase().includes(q) ||
      (g.customer_gstin || '').toLowerCase().includes(q)
    );
  }, [gstData, dateRange, search]);

  const filteredExpenses = useMemo(() => {
    const list = filterByDateRange(expensesData, 'date');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(e => 
      (e.category || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q)
    );
  }, [expensesData, dateRange, search]);

  const filteredPurchases = useMemo(() => {
    return filterByDateRange(purchasesData, 'date');
  }, [purchasesData, dateRange]);

  const filteredItems = useMemo(() => {
    if (!search) return itemsData;
    const q = search.toLowerCase();
    return itemsData.filter(it => 
      (it.name || '').toLowerCase().includes(q) ||
      (it.barcode || '').toLowerCase().includes(q) ||
      (it.sku || '').toLowerCase().includes(q)
    );
  }, [itemsData, search]);

  const filteredDayBook = useMemo(() => {
    if (!search) return dayBookData;
    const q = search.toLowerCase();
    return dayBookData.filter(d => 
      (d.reference || '').toLowerCase().includes(q) ||
      (d.type || '').toLowerCase().includes(q) ||
      (d.entry_type || '').toLowerCase().includes(q)
    );
  }, [dayBookData, search]);

  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const totalTaxableSales = filteredSales.reduce((sum, s) => sum + (Number(s.subtotal) || (Number(s.total_amount || 0) - Number(s.tax_amount || 0))), 0);
  const totalTaxCollected = filteredSales.reduce((sum, s) => sum + (Number(s.tax_amount) || 0), 0);
  
  const totalPurchasesCost = filteredPurchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const totalInventoryValuationCost = itemsData.reduce((sum, i) => sum + ((Number(i.current_stock) || 0) * (Number(i.purchase_price) || 0)), 0);
  const totalInventoryValuationRetail = itemsData.reduce((sum, i) => sum + ((Number(i.current_stock) || 0) * (Number(i.sale_price) || 0)), 0);
  const potentialInventoryMargin = Math.max(0, totalInventoryValuationRetail - totalInventoryValuationCost);

  const estimatedGrossProfit = Math.max(0, totalSalesRevenue - totalPurchasesCost);
  const estimatedNetProfit = totalSalesRevenue - totalPurchasesCost - totalOperatingExpenses;
  const netProfitMarginPct = totalSalesRevenue > 0 ? ((estimatedNetProfit / totalSalesRevenue) * 100).toFixed(1) : '0.0';

  const expensesByCategory = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const dayBookSummary = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    dayBookData.forEach(d => {
      const amt = Number(d.amount) || 0;
      if (d.entry_type === 'INVOICE' || (d.entry_type === 'PAYMENT' && d.type === 'IN')) {
        cashIn += amt;
      } else {
        cashOut += amt;
      }
    });
    return { cashIn, cashOut, netBalance: cashIn - cashOut };
  }, [dayBookData]);

  const downloadCsv = (filename, headers, rows) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      headers.join(','), 
      ...rows.map(e => e.join(','))
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSalesCsv = () => {
    if (filteredSales.length === 0) return alert('No sales records to export');
    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Taxable Subtotal (Rs)', 'GST Tax (Rs)', 'Grand Total (Rs)'];
    const rows = filteredSales.map(s => [
      `"${s.invoice_number || ''}"`,
      `"${s.date || ''}"`,
      `"${s.party_name || 'Walk-in Customer'}"`,
      s.subtotal || 0,
      s.tax_amount || 0,
      s.total_amount || 0
    ]);
    downloadCsv(`Sales-Report-${getLocalDateStr(new Date())}.csv`, headers, rows);
  };

  const exportGstCsv = () => {
    if (filteredGst.length === 0) return alert('No GST records available to export.');
    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Customer GSTIN', 'State', 'Taxable Amount (Rs)', 'GST Amount (Rs)', 'Total (Rs)'];
    const rows = filteredGst.map(r => [
      `"${r.invoice_number || ''}"`,
      `"${r.date || ''}"`,
      `"${r.customer_name || 'Walk-in Customer'}"`,
      `"${r.customer_gstin || 'URP'}"`,
      `"${r.customer_state || ''}"`,
      r.subtotal || 0,
      r.tax_amount || 0,
      r.total_amount || 0
    ]);
    downloadCsv(`GSTR1-Summary-${getLocalDateStr(new Date())}.csv`, headers, rows);
  };

  const exportPnlCsv = () => {
    const headers = ['Category / Metric', 'Amount (INR)'];
    const rows = [
      ['Gross Sales Revenue (+)', totalSalesRevenue],
      ['Cost of Purchases / Goods (-)', totalPurchasesCost],
      ['Gross Margin (=)', estimatedGrossProfit],
      ['Total Operating Expenses (-)', totalOperatingExpenses],
      ...expensesByCategory.map(([cat, amt]) => [`  - ${cat}`, amt]),
      ['Net Estimated Profit (=)', estimatedNetProfit],
      ['Net Margin (%)', `${netProfitMarginPct}%`]
    ];
    downloadCsv(`Profit-And-Loss-${getLocalDateStr(new Date())}.csv`, headers, rows);
  };

  const exportStockCsv = async () => {
    if (itemsData.length === 0) return alert('No inventory items to export');

    const xlsxModule = await import('xlsx-js-style');
    const XLSX = xlsxModule.default || xlsxModule;

    const headers = [
      'Item Name',
      'Barcode',
      'SKU',
      'Current Stock',
      'Unit',
      'Purchase Cost (Rs)',
      'Sale Price (Rs)',
      'Total Stock Value (Rs)'
    ];

    const headerBorder = {
      top: { style: 'thin', color: { rgb: '006100' } },
      bottom: { style: 'thin', color: { rgb: '006100' } }
    };

    const headerRow = headers.map((h, i) => ({
      v: h,
      t: 's',
      s: {
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '006100' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
        alignment: {
          horizontal: i >= 5 ? 'right' : (i === 3 || i === 4 ? 'left' : 'left'),
          vertical: 'center'
        },
        border: headerBorder
      }
    }));

    const dataRows = itemsData.map((it, idx) => {
      const stock = Number(it.current_stock) || 0;
      const unit = it.unit || 'Pcs';
      const purchasePrice = Number(it.purchase_price) || 0;
      const salePrice = Number(it.sale_price) || 0;
      const totalValue = Math.round((stock * purchasePrice) * 100) / 100;
      const isEven = idx % 2 === 0;
      const rowColor = isEven ? 'C6EFCE' : 'FFFFFF';
      const isLast = idx === itemsData.length - 1;

      const cellBorder = isLast ? { bottom: { style: 'thin', color: { rgb: '006100' } } } : {};

      const cellStyle = (align = 'left') => ({
        font: { name: 'Calibri', sz: 11, color: { rgb: '000000' } },
        fill: { patternType: 'solid', fgColor: { rgb: rowColor } },
        alignment: { horizontal: align, vertical: 'center' },
        border: cellBorder
      });

      return [
        { v: it.name || '', t: 's', s: cellStyle('left') },
        { v: it.barcode || '', t: 's', s: cellStyle('left') },
        { v: it.sku || '', t: 's', s: cellStyle('left') },
        { v: `${stock} ${unit}`, t: 's', s: cellStyle('left') },
        { v: unit, t: 's', s: cellStyle('left') },
        { v: purchasePrice, t: 'n', s: cellStyle('right') },
        { v: salePrice, t: 'n', s: cellStyle('right') },
        { v: totalValue, t: 'n', s: cellStyle('right') }
      ];
    });

    const wsData = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 38 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 8 },
      { wch: 18 },
      { wch: 16 },
      { wch: 22 }
    ];

    ws['!rows'] = [{ hpt: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Valuation');
    XLSX.writeFile(wb, `Stock-Valuation-${getLocalDateStr(new Date())}.xlsx`);
  };

  const exportDayBookCsv = () => {
    if (dayBookData.length === 0) return alert('No transactions found for this date');
    const headers = ['Entry Type', 'Reference', 'Category / Subtype', 'Date', 'Amount (Rs)'];
    const rows = dayBookData.map(d => [
      `"${d.entry_type || ''}"`,
      `"${d.reference || ''}"`,
      `"${d.type || ''}"`,
      `"${d.date || ''}"`,
      d.amount || 0
    ]);
    downloadCsv(`DayBook-${dateFilter}.csv`, headers, rows);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 print:p-0 print:m-0 print:max-w-full">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs print:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <PieChart size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Financial Reports & Analysis</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">GST filings, Day Book, Profit & Loss, and stock valuation audits</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Print Current Report"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            {activeTab === 'SALES' && (
              <button
                onClick={exportSalesCsv}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Export CSV</span>
              </button>
            )}

            {activeTab === 'GST' && (
              <button
                onClick={exportGstCsv}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Export GSTR-1</span>
              </button>
            )}

            {activeTab === 'PNL' && (
              <button
                onClick={exportPnlCsv}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Export P&L</span>
              </button>
            )}

            {activeTab === 'STOCK' && (
              <button
                onClick={exportStockCsv}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Export Stock</span>
              </button>
            )}

            {activeTab === 'DAYBOOK' && (
              <button
                onClick={exportDayBookCsv}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Download size={13} strokeWidth={2.5} />
                <span className="whitespace-nowrap">Export Daybook</span>
              </button>
            )}

            <button
              onClick={loadReportData}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Reports"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto no-scrollbar print:hidden">
        {[
          { id: 'SALES', label: 'Sales Report', icon: Receipt },
          { id: 'GST', label: 'GSTR-1 Tax Summary', icon: FileSpreadsheet },
          { id: 'PNL', label: 'Profit & Loss', icon: TrendingUp },
          { id: 'STOCK', label: 'Stock Valuation', icon: Package },
          { id: 'DAYBOOK', label: 'Day Book', icon: Calendar }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === t.id
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab !== 'DAYBOOK' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs print:hidden">
          <div className="inline-flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-100/90 text-xs font-bold text-slate-600 shadow-inner overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_YEAR', label: 'This FY' },
              { id: 'ALL', label: 'All Time' },
              { id: 'CUSTOM', label: 'Custom' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                  period === p.id
                    ? 'bg-white text-emerald-700 shadow-xs font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            {period === 'CUSTOM' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            )}

            <div className="relative flex-1 max-w-full sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rows…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium shadow-2xs"
              />
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block mb-4 pb-2.5 border-b border-slate-300 w-full box-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{companyName}</h1>
            {company?.gstin && <p className="text-xs font-semibold text-slate-600">GSTIN: {company.gstin}</p>}
            <p className="text-sm font-bold text-slate-700 mt-0.5">
              {activeTab === 'SALES' && 'Sales Register Report'}
              {activeTab === 'GST' && 'GSTR-1 Outward Supplies Summary'}
              {activeTab === 'PNL' && 'Profit & Loss Statement'}
              {activeTab === 'STOCK' && 'Inventory Stock Valuation Report'}
              {activeTab === 'DAYBOOK' && `Day Book Register (${dateFilter})`}
            </p>
          </div>
          <div className="text-right text-[10px] sm:text-[11px] text-slate-500 shrink-0 leading-tight pr-1">
            <p className="font-bold text-slate-800">HisabKhata POS</p>
            <p className="mt-0.5">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            {dateRange.from && <p className="mt-0.5 font-medium">Period: {dateRange.from} to {dateRange.to || 'Present'}</p>}
          </div>
        </div>
      </div>

      {activeTab === 'SALES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-4 print:gap-2.5">
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Sales Revenue</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-900 tracking-tight number-cell mt-1">{fmtCurrency(totalSalesRevenue)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">From {filteredSales.length} tax invoices</span>
            </div>
            
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Taxable Subtotal</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-700 tracking-tight number-cell mt-1">{fmtCurrency(totalTaxableSales)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Excluding output GST</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total GST Collected</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-emerald-600 tracking-tight number-cell mt-1">{fmtCurrency(totalTaxCollected)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Output GST tax payable</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl shadow-xs print:shadow-none overflow-hidden print:overflow-visible">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading sales records…</span>
              </div>
            ) : filteredSales.length > 0 ? (
              <>
                <div className="sm:hidden print:hidden divide-y divide-slate-100 p-2 space-y-2">
                  {filteredSales.map(s => (
                    <div key={s.id} className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{s.invoice_number}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{s.date}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{s.party_name || 'Walk-in Customer'}</p>
                          <p className="text-[10px] text-slate-400">Tax: {fmtCurrency(s.tax_amount)}</p>
                        </div>
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {fmtCurrency(s.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-xs print:text-[10px] table-auto print:table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-500 print:text-slate-800 uppercase text-[10px] print:text-[9px] font-bold tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[18%]">Invoice #</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[14%]">Date</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[28%]">Customer</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[14%]">Taxable Value</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[12%]">Tax Amount</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[14%]">Total (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {filteredSales.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-bold text-slate-900 whitespace-nowrap font-mono">{s.invoice_number}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-slate-500 whitespace-nowrap">{s.date}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-slate-700 whitespace-nowrap print:whitespace-normal print:break-words font-medium">{s.party_name || 'Walk-in Customer'}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell whitespace-nowrap">{fmtCurrency(s.subtotal || (Number(s.total_amount || 0) - Number(s.tax_amount || 0)))}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell text-emerald-600 font-bold whitespace-nowrap">{fmtCurrency(s.tax_amount)}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell font-extrabold text-slate-900 whitespace-nowrap">{fmtCurrency(s.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No sales invoices found for the selected period.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'GST' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-4 print:gap-2.5">
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GSTR-1 Taxable Value</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-900 tracking-tight number-cell mt-1">
                {fmtCurrency(filteredGst.reduce((sum, g) => sum + (Number(g.subtotal) || 0), 0))}
              </p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Net outward taxable base</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Output GST</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-emerald-600 tracking-tight number-cell mt-1">
                {fmtCurrency(filteredGst.reduce((sum, g) => sum + (Number(g.tax_amount) || 0), 0))}
              </p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">IGST + CGST + SGST</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Invoice Count</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-700 tracking-tight number-cell mt-1">{filteredGst.length}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">B2B + B2C Tax Vouchers</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl shadow-xs print:shadow-none overflow-hidden print:overflow-visible">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading GST records…</span>
              </div>
            ) : filteredGst.length > 0 ? (
              <>
                <div className="sm:hidden print:hidden divide-y divide-slate-100 p-2 space-y-2">
                  {filteredGst.map((g, i) => (
                    <div key={i} className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 text-xs">{g.invoice_number}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{g.date}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{g.customer_name || 'Walk-in'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">GSTIN: {g.customer_gstin || 'URP'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-600 block">GST: {fmtCurrency(g.tax_amount)}</span>
                          <span className="text-sm font-black text-slate-900 font-mono block">{fmtCurrency(g.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-xs print:text-[10px] table-auto print:table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-500 print:text-slate-800 uppercase text-[10px] print:text-[9px] font-bold tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[15%]">Invoice #</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[13%]">Date</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[24%]">Customer Name</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[16%]">GSTIN</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[11%]">Taxable</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[10%]">GST Amount</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[11%]">Total Invoice</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {filteredGst.map((g, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-bold text-slate-900 whitespace-nowrap font-mono">{g.invoice_number}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-slate-500 whitespace-nowrap">{g.date}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-slate-700 whitespace-nowrap print:whitespace-normal print:break-words font-medium">{g.customer_name || 'Walk-in'}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-mono text-[11px] print:text-[9px] text-slate-500 whitespace-nowrap">{g.customer_gstin || 'URP'}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell whitespace-nowrap">{fmtCurrency(g.subtotal)}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell font-bold text-emerald-600 whitespace-nowrap">{fmtCurrency(g.tax_amount)}</td>
                          <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell font-extrabold text-slate-900 whitespace-nowrap">{fmtCurrency(g.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No GST records found for the selected period.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'PNL' && (
        <div className="space-y-4 max-w-4xl mx-auto print:max-w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-4 print:gap-2.5">
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sales Revenue</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-900 tracking-tight number-cell mt-1">{fmtCurrency(totalSalesRevenue)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-emerald-600 font-bold mt-1 block">Inward Sales</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Purchases & Expenses</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-rose-600 tracking-tight number-cell mt-1">{fmtCurrency(totalPurchasesCost + totalOperatingExpenses)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Stock + Overhead Costs</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Net Estimated Profit</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-emerald-600 tracking-tight number-cell mt-1">{fmtCurrency(estimatedNetProfit)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] font-bold text-emerald-700 mt-1 block">{netProfitMarginPct}% Profit Margin</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-4 sm:p-6 print:p-4 shadow-xs print:shadow-none space-y-5 print:space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:border-slate-200">
              <h2 className="text-xs sm:text-sm print:text-xs font-black text-slate-800 uppercase tracking-wider">
                Comprehensive Profit & Loss Statement
              </h2>
              <span className="text-[11px] print:text-[10px] font-bold text-slate-400 font-mono">
                {dateRange.from ? `${dateRange.from} to ${dateRange.to || 'Present'}` : 'All Time'}
              </span>
            </div>

            <div className="space-y-3 text-xs print:text-[11px]">
              <div className="p-3 bg-slate-50 print:bg-slate-50/50 rounded-xl border border-slate-200/50 print:border-slate-200 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>1. Gross Sales Inflow (+)</span>
                  <span className="number-cell font-black text-slate-900">{fmtCurrency(totalSalesRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500 pl-3">
                  <span>Gross Stock Inward Purchases (-)</span>
                  <span className="number-cell text-rose-600 font-bold">{fmtCurrency(totalPurchasesCost)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-emerald-800">
                  <span>Gross Trading Margin (=)</span>
                  <span className="number-cell font-black">{fmtCurrency(estimatedGrossProfit)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 print:bg-slate-50/50 rounded-xl border border-slate-200/50 print:border-slate-200 space-y-2">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>2. Operating Overheads & Expenses (-)</span>
                  <span className="number-cell font-black text-rose-600">{fmtCurrency(totalOperatingExpenses)}</span>
                </div>
                {expensesByCategory.length > 0 ? (
                  <div className="pl-3 space-y-1 pt-1 border-t border-slate-200/60">
                    {expensesByCategory.map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between text-slate-500">
                        <span>{cat}</span>
                        <span className="number-cell">{fmtCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pl-3">No expenses recorded for this period.</p>
                )}
              </div>

              <div className="flex justify-between items-center p-3.5 sm:p-4 print:p-3 bg-emerald-50 rounded-2xl print:rounded-xl border border-emerald-200 shadow-2xs print:shadow-none">
                <div>
                  <span className="text-xs sm:text-sm font-black text-emerald-950 block">Net Store Profit / Earning</span>
                  <span className="text-[11px] print:text-[9px] text-emerald-700 font-medium mt-0.5 block">After accounting for goods and business expenses</span>
                </div>
                <div className="text-right">
                  <span className="text-lg sm:text-xl print:text-base font-black text-emerald-700 number-cell block">{fmtCurrency(estimatedNetProfit)}</span>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{netProfitMarginPct}% Margin</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'STOCK' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-4 print:gap-2.5">
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total In-Stock Cost Valuation</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-slate-900 tracking-tight number-cell mt-1">{fmtCurrency(totalInventoryValuationCost)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Cost value of all stored inventory</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Retail / Sale Value</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-emerald-600 tracking-tight number-cell mt-1">{fmtCurrency(totalInventoryValuationRetail)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Estimated value at retail selling prices</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Potential Gross Profit in Stock</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-blue-600 tracking-tight number-cell mt-1">{fmtCurrency(potentialInventoryMargin)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Across {itemsData.length} unique catalog items</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl shadow-xs print:shadow-none overflow-hidden print:overflow-visible">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading inventory…</span>
              </div>
            ) : filteredItems.length > 0 ? (
              <>
                <div className="sm:hidden print:hidden divide-y divide-slate-100 p-2 space-y-2">
                  {filteredItems.map(it => {
                    const isLowStock = (it.current_stock || 0) <= (it.min_stock || 5);
                    return (
                      <div key={it.id} className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{it.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {it.current_stock} {it.unit || 'pcs'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 text-[11px]">
                          <span className="text-slate-500 font-mono">Buy: {fmtCurrency(it.purchase_price)} • Sale: {fmtCurrency(it.sale_price)}</span>
                          <span className="font-black text-slate-900 font-mono">
                            Val: {fmtCurrency((it.current_stock || 0) * (it.purchase_price || 0))}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-xs print:text-[10px] table-auto print:table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-500 print:text-slate-800 uppercase text-[10px] print:text-[9px] font-bold tracking-wider">
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[32%]">Item Name</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 w-[18%] print:w-[15%]">SKU / Barcode</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-center w-[12%] print:w-[11%]">In Stock</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right w-[14%] print:w-[13%]">Cost Price</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right w-[14%] print:w-[13%]">Sale Price</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right w-[16%] print:w-[16%]">Stock Valuation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {filteredItems.map(it => {
                        const isLowStock = (it.current_stock || 0) <= (it.min_stock || 5);
                        return (
                          <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-bold text-slate-900 whitespace-nowrap print:whitespace-normal print:break-words">{it.name}</td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-mono text-slate-500 text-[11px] print:text-[9px] whitespace-nowrap print:break-all">{it.barcode || it.sku || '—'}</td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] print:text-[9px] font-bold ${
                                isLowStock ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {it.current_stock} {it.unit || 'pcs'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell whitespace-nowrap font-medium">{fmtCurrency(it.purchase_price)}</td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell whitespace-nowrap font-medium">{fmtCurrency(it.sale_price)}</td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-right number-cell font-extrabold text-slate-900 whitespace-nowrap">
                              {fmtCurrency((it.current_stock || 0) * (it.purchase_price || 0))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No inventory products found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'DAYBOOK' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-3 sm:gap-4 print:gap-2.5">
            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Inflow (Cash IN)</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-emerald-600 tracking-tight number-cell mt-1">{fmtCurrency(dayBookSummary.cashIn)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Sales + Payments In</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Outflow (Cash OUT)</span>
              <p className="text-xl sm:text-2xl print:text-lg font-black text-rose-600 tracking-tight number-cell mt-1">{fmtCurrency(dayBookSummary.cashOut)}</p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Purchases + Expenses</span>
            </div>

            <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl p-3.5 sm:p-4 print:p-2.5 shadow-xs print:shadow-none">
              <span className="text-[10px] sm:text-xs print:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Daily Balance</span>
              <p className={`text-xl sm:text-2xl print:text-lg font-black tracking-tight number-cell mt-1 ${dayBookSummary.netBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {fmtCurrency(dayBookSummary.netBalance)}
              </p>
              <span className="text-[10px] sm:text-[11px] print:text-[9px] text-slate-400 mt-1 block">Inflow minus Outflow</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-3 shadow-xs print:hidden">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Journal Date</span>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold shadow-2xs"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 print:border-slate-300 rounded-2xl print:rounded-xl shadow-xs print:shadow-none overflow-hidden print:overflow-visible">
            {loading ? (
              <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading day book…</span>
              </div>
            ) : filteredDayBook.length > 0 ? (
              <>
                <div className="sm:hidden print:hidden divide-y divide-slate-100 p-2 space-y-2">
                  {filteredDayBook.map((d, idx) => {
                    const isOutflow = d.entry_type === 'EXPENSE' || (d.entry_type === 'PAYMENT' && d.type === 'OUT');
                    return (
                      <div key={idx} className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.entry_type === 'INVOICE' ? 'bg-emerald-100 text-emerald-800' : d.entry_type === 'PAYMENT' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {d.entry_type} ({d.type})
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{d.date}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 text-xs">
                          <span className="font-bold text-slate-800 truncate">{d.reference}</span>
                          <span className={`font-black font-mono ${isOutflow ? 'text-rose-600' : 'text-emerald-700'}`}>
                            {isOutflow ? '-' : '+'}{fmtCurrency(d.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left text-xs print:text-[10px] table-auto print:table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 print:bg-slate-100 border-b border-slate-200 print:border-slate-300 text-slate-500 print:text-slate-800 uppercase text-[10px] print:text-[9px] font-bold tracking-wider whitespace-nowrap">
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[18%]">Type</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[46%]">Reference / Description</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 print:w-[16%]">Date</th>
                        <th className="py-3 px-4 print:py-1.5 print:px-2 text-right print:w-[20%]">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {filteredDayBook.map((d, idx) => {
                        const isOutflow = d.entry_type === 'EXPENSE' || (d.entry_type === 'PAYMENT' && d.type === 'OUT');
                        return (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] print:text-[9px] font-bold ${
                                d.entry_type === 'INVOICE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : d.entry_type === 'PAYMENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {d.entry_type} ({d.type})
                              </span>
                            </td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 font-bold text-slate-800 whitespace-nowrap print:whitespace-normal print:break-words">{d.reference}</td>
                            <td className="py-2.5 px-4 print:py-1.5 print:px-2 text-slate-500 whitespace-nowrap">{d.date}</td>
                            <td className={`py-2.5 px-4 print:py-1.5 print:px-2 text-right font-extrabold number-cell whitespace-nowrap ${isOutflow ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {isOutflow ? '-' : '+'}{fmtCurrency(d.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">No transactions recorded for {dateFilter}.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
