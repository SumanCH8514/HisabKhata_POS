import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Book, Users, Wallet, Building2, Search, ArrowDownLeft, ArrowUpRight, 
  RefreshCw, Plus, Calendar, FileText, CheckCircle2, ChevronRight,
  Phone, MessageSquare, ExternalLink, ArrowLeft, X, Filter, DollarSign,
  TrendingUp, TrendingDown, Layers
} from 'lucide-react';
import { 
  getParties, 
  getTransactions, 
  getInvoices, 
  getExpenses, 
  getFundAccounts, 
  createTransaction, 
  fmtCurrency 
} from '../api/client.js';

function WhatsAppIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function AccountBook() {
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fundAccounts, setFundAccounts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PARTIES');
  
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyTypeFilter, setPartyTypeFilter] = useState('ALL');
  const [partyBalanceFilter, setPartyBalanceFilter] = useState('ALL');
  const [partySearch, setPartySearch] = useState('');
  
  const [journalFilter, setJournalFilter] = useState('ALL');
  const [journalDateRange, setJournalDateRange] = useState('THIS_MONTH');
  const [journalSearch, setJournalSearch] = useState('');
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    party_id: '',
    type: 'PAYMENT_IN',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    payment_mode: 'CASH',
    notes: '',
    reference: ''
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getParties(),
      getInvoices(),
      getTransactions(),
      getExpenses(),
      getFundAccounts()
    ])
      .then(([partyList, invList, txList, expList, fundList]) => {
        setParties(partyList || []);
        setInvoices(invList || []);
        setTransactions(txList || []);
        setExpenses(expList || []);
        setFundAccounts(fundList || []);
        
        if (!selectedPartyId && partyList && partyList.length > 0) {
          const firstWithBalance = partyList.find(p => Number(p.current_balance) > 0) || partyList[0];
          setSelectedPartyId(String(firstWithBalance.id));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalReceivables = parties
    .filter(p => p.type === 'CUSTOMER')
    .reduce((sum, p) => sum + Math.max(0, Number(p.current_balance) || 0), 0);

  const totalPayables = parties
    .filter(p => p.type === 'VENDOR')
    .reduce((sum, p) => sum + Math.max(0, Number(p.current_balance) || 0), 0);

  const filteredParties = useMemo(() => {
    return parties.filter(p => {
      if (partyTypeFilter !== 'ALL' && p.type !== partyTypeFilter) return false;
      const bal = Number(p.current_balance) || 0;
      if (partyBalanceFilter === 'DUE' && bal <= 0) return false;
      if (partyBalanceFilter === 'SETTLED' && bal > 0) return false;
      if (partySearch.trim()) {
        const q = partySearch.toLowerCase();
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const phoneMatch = (p.phone || '').includes(q);
        return nameMatch || phoneMatch;
      }
      return true;
    });
  }, [parties, partyTypeFilter, partyBalanceFilter, partySearch]);

  const selectedParty = useMemo(() => {
    return parties.find(p => String(p.id) === String(selectedPartyId)) || null;
  }, [parties, selectedPartyId]);

  const partyLedgerEntries = useMemo(() => {
    if (!selectedParty) return [];
    const isCustomer = selectedParty.type === 'CUSTOMER';
    const entries = [];

    invoices.forEach(inv => {
      if (String(inv.party_id) === String(selectedParty.id)) {
        entries.push({
          id: `inv-${inv.id}`,
          date: inv.invoice_date || inv.date || inv.created_at?.slice(0, 10),
          voucher_type: inv.type === 'PURCHASE' ? 'Purchase Bill' : 'Tax Invoice',
          ref_no: inv.invoice_number,
          description: inv.notes || (inv.type === 'PURCHASE' ? 'Vendor Purchase' : 'Goods Sold'),
          amount: Number(inv.total_amount || inv.total || 0),
          debit: isCustomer ? Number(inv.total_amount || 0) : 0,
          credit: !isCustomer ? Number(inv.total_amount || 0) : 0,
          isInvoice: true,
          status: inv.payment_status || (inv.balance_due <= 0 ? 'PAID' : 'DUE'),
          balance_due: Number(inv.balance_due || 0),
          raw_date: new Date(inv.invoice_date || inv.date || inv.created_at).getTime()
        });
      }
    });

    transactions.forEach(tx => {
      if (String(tx.party_id) === String(selectedParty.id)) {
        const isPayIn = tx.type === 'PAYMENT_IN';
        entries.push({
          id: `tx-${tx.id}`,
          date: tx.date || tx.created_at?.slice(0, 10),
          voucher_type: isPayIn ? 'Payment Received' : 'Payment Made',
          ref_no: tx.reference || `TX-${tx.id}`,
          description: tx.notes || (isPayIn ? 'Customer Receipt' : 'Vendor Payment'),
          amount: Number(tx.amount || 0),
          debit: isCustomer ? 0 : Number(tx.amount || 0),
          credit: isCustomer ? Number(tx.amount || 0) : 0,
          isInvoice: false,
          payment_mode: tx.payment_mode || 'CASH',
          raw_date: new Date(tx.date || tx.created_at).getTime()
        });
      }
    });

    entries.sort((a, b) => (a.raw_date || 0) - (b.raw_date || 0));

    let runningBal = 0;
    return entries.map(item => {
      if (isCustomer) {
        runningBal += (item.debit - item.credit);
      } else {
        runningBal += (item.credit - item.debit);
      }
      return {
        ...item,
        running_balance: runningBal
      };
    });
  }, [selectedParty, invoices, transactions]);

  const partyTotalBilled = useMemo(() => {
    return partyLedgerEntries
      .filter(e => e.isInvoice)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [partyLedgerEntries]);

  const partyTotalPaid = useMemo(() => {
    return partyLedgerEntries
      .filter(e => !e.isInvoice)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [partyLedgerEntries]);

  const journalEntries = useMemo(() => {
    const list = [];

    invoices.forEach(inv => {
      list.push({
        id: `inv-${inv.id}`,
        date: inv.invoice_date || inv.date || inv.created_at?.slice(0, 10),
        category: inv.type === 'PURCHASE' ? 'PURCHASE' : 'SALE',
        type_label: inv.type === 'PURCHASE' ? 'Purchase Bill' : 'Sales Invoice',
        party_name: inv.party_name || 'Walk-in Customer',
        ref_no: inv.invoice_number,
        amount: Number(inv.total_amount || 0),
        inflow: inv.type === 'SALES' ? Number(inv.paid_amount || inv.total_amount || 0) : 0,
        outflow: inv.type === 'PURCHASE' ? Number(inv.paid_amount || inv.total_amount || 0) : 0,
        status: inv.payment_status || (inv.balance_due <= 0 ? 'PAID' : 'DUE'),
        raw_date: new Date(inv.invoice_date || inv.date || inv.created_at).getTime()
      });
    });

    transactions.forEach(tx => {
      const isPayIn = tx.type === 'PAYMENT_IN';
      list.push({
        id: `tx-${tx.id}`,
        date: tx.date || tx.created_at?.slice(0, 10),
        category: isPayIn ? 'PAYMENT_IN' : 'PAYMENT_OUT',
        type_label: isPayIn ? 'Receipt (Cash IN)' : 'Payment (Cash OUT)',
        party_name: tx.party_name || (isPayIn ? 'Customer Receipt' : 'Vendor Payment'),
        ref_no: tx.reference || `TX-${tx.id}`,
        amount: Number(tx.amount || 0),
        inflow: isPayIn ? Number(tx.amount || 0) : 0,
        outflow: !isPayIn ? Number(tx.amount || 0) : 0,
        status: 'COMPLETED',
        raw_date: new Date(tx.date || tx.created_at).getTime()
      });
    });

    expenses.forEach(exp => {
      list.push({
        id: `exp-${exp.id}`,
        date: exp.date || exp.created_at?.slice(0, 10),
        category: 'EXPENSE',
        type_label: `Expense: ${exp.category}`,
        party_name: exp.notes || 'Operating Overhead',
        ref_no: `EXP-${exp.id}`,
        amount: Number(exp.amount || 0),
        inflow: 0,
        outflow: Number(exp.amount || 0),
        status: 'PAID',
        raw_date: new Date(exp.date || exp.created_at).getTime()
      });
    });

    list.sort((a, b) => (b.raw_date || 0) - (a.raw_date || 0));

    return list.filter(item => {
      if (journalFilter !== 'ALL') {
        if (journalFilter === 'SALES' && item.category !== 'SALE') return false;
        if (journalFilter === 'PURCHASES' && item.category !== 'PURCHASE') return false;
        if (journalFilter === 'PAYMENTS' && !item.category.startsWith('PAYMENT')) return false;
        if (journalFilter === 'EXPENSES' && item.category !== 'EXPENSE') return false;
      }

      if (journalDateRange !== 'ALL') {
        const itemDate = new Date(item.date);
        const now = new Date();
        if (journalDateRange === 'TODAY') {
          const todayStr = now.toISOString().slice(0, 10);
          if (item.date !== todayStr) return false;
        } else if (journalDateRange === 'THIS_MONTH') {
          if (itemDate.getMonth() !== now.getMonth() || itemDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      if (journalSearch.trim()) {
        const q = journalSearch.toLowerCase();
        const partyMatch = (item.party_name || '').toLowerCase().includes(q);
        const refMatch = (item.ref_no || '').toLowerCase().includes(q);
        const typeMatch = (item.type_label || '').toLowerCase().includes(q);
        return partyMatch || refMatch || typeMatch;
      }

      return true;
    });
  }, [invoices, transactions, expenses, journalFilter, journalDateRange, journalSearch]);

  const handleOpenPaymentModal = (type = 'PAYMENT_IN') => {
    if (!selectedParty) return;
    setPaymentForm({
      party_id: selectedParty.id,
      type: type,
      amount: selectedParty.current_balance > 0 ? String(selectedParty.current_balance) : '',
      date: new Date().toISOString().slice(0, 10),
      payment_mode: 'CASH',
      notes: '',
      reference: ''
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.party_id || !paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    setSubmittingPayment(true);
    try {
      await createTransaction({
        ...paymentForm,
        amount: Number(paymentForm.amount)
      });
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatWhatsAppPhone = (p) => {
    if (!p) return '';
    const clean = p.replace(/\D/g, '');
    return clean.length === 10 ? `91${clean}` : clean;
  };

  const getWhatsAppStatementUrl = () => {
    if (!selectedParty || !selectedParty.phone) return '#';
    const bal = Number(selectedParty.current_balance) || 0;
    const isCust = selectedParty.type === 'CUSTOMER';
    const msg = isCust
      ? `Dear ${selectedParty.name},\nGreetings! Your current outstanding balance with us is ${fmtCurrency(bal)}. Kindly check your account statement and settle at your earliest convenience. Thank you!`
      : `Dear ${selectedParty.name},\nRegarding our vendor khata, your current balance is ${fmtCurrency(bal)}. Thank you!`;
    return `https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(selectedParty.phone)}&text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 text-slate-800 dark:text-slate-100">
      
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Book size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Account Book & General Ledger</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
              Unified double-entry ledger across customers, suppliers, expenses, and store journal
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('PARTIES')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'PARTIES'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users size={13} />
                <span>Party Ledgers</span>
              </button>
              <button
                onClick={() => setActiveTab('JOURNAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'JOURNAL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>General Day Book</span>
              </button>
            </div>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Account Book"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Customer Receivables (Debtors)
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight number-cell mt-1">
            {fmtCurrency(totalReceivables)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">To collect from customers</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Supplier Payables (Creditors)
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight number-cell mt-1">
            {fmtCurrency(totalPayables)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">To pay to suppliers/vendors</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Registered Parties
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight number-cell mt-1">
            {parties.length}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            {parties.filter(p => p.type === 'CUSTOMER').length} Customers · {parties.filter(p => p.type === 'VENDOR').length} Vendors
          </span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Net Store Credit Position
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight number-cell mt-1 ${
            totalReceivables >= totalPayables ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {fmtCurrency(totalReceivables - totalPayables)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            {totalReceivables >= totalPayables ? 'Net Surplus (Receivable)' : 'Net Liability (Payable)'}
          </span>
        </div>
      </div>

      {activeTab === 'PARTIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Party Accounts
              </h2>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                {filteredParties.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
                {['ALL', 'CUSTOMER', 'VENDOR'].map(t => (
                  <button
                    key={t}
                    onClick={() => setPartyTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      partyTypeFilter === t
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {t === 'ALL' ? 'All' : t === 'CUSTOMER' ? 'Customers' : 'Vendors'}
                  </button>
                ))}
              </div>

              <select
                value={partyBalanceFilter}
                onChange={(e) => setPartyBalanceFilter(e.target.value)}
                className="px-2 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-none outline-none cursor-pointer"
              >
                <option value="ALL">All Balances</option>
                <option value="DUE">Pending Due</option>
                <option value="SETTLED">Settled (₹0)</option>
              </select>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search party by name or mobile…"
                value={partySearch}
                onChange={(e) => setPartySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-0.5">
              {filteredParties.length > 0 ? (
                filteredParties.map(p => {
                  const isSelected = String(p.id) === String(selectedPartyId);
                  const isCustomer = p.type === 'CUSTOMER';
                  const balance = Number(p.current_balance) || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPartyId(String(p.id))}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                            isCustomer
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {p.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {p.phone || 'No phone'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black number-cell block leading-tight ${
                          balance > 0
                            ? (isCustomer ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')
                            : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {fmtCurrency(balance)}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                          {balance > 0 ? (isCustomer ? 'Due' : 'Payable') : 'Settled'}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                  No matching accounts found.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
            {selectedParty ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-2xs ${
                      selectedParty.type === 'CUSTOMER'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60'
                    }`}>
                      {selectedParty.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                          {selectedParty.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide ${
                          selectedParty.type === 'CUSTOMER'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                        }`}>
                          {selectedParty.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {selectedParty.phone || 'No phone'} · GSTIN: {selectedParty.gst_number || 'Unregistered'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedParty.phone && (
                      <a
                        href={getWhatsAppStatementUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <WhatsAppIcon size={14} />
                        <span>WhatsApp Share</span>
                      </a>
                    )}

                    <button
                      onClick={() => handleOpenPaymentModal(selectedParty.type === 'CUSTOMER' ? 'PAYMENT_IN' : 'PAYMENT_OUT')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>{selectedParty.type === 'CUSTOMER' ? 'Collect Payment' : 'Pay Vendor'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
                    <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white number-cell mt-1">
                      {fmtCurrency(partyTotalBilled)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Settled</span>
                    <p className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 number-cell mt-1">
                      {fmtCurrency(partyTotalPaid)}
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    Number(selectedParty.current_balance) > 0
                      ? (selectedParty.type === 'CUSTOMER' ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/50')
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800'
                  }`}>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Balance Due</span>
                    <p className={`text-sm sm:text-base font-black number-cell mt-1 ${
                      Number(selectedParty.current_balance) > 0
                        ? (selectedParty.type === 'CUSTOMER' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400')
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {fmtCurrency(selectedParty.current_balance)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Double-Entry Statement & Running Balance
                  </h4>

                  {partyLedgerEntries.length > 0 ? (
                    <>
                      <div className="sm:hidden space-y-2">
                        {partyLedgerEntries.map(entry => (
                          <div
                            key={entry.id}
                            className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{entry.ref_no}</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                entry.isInvoice
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              }`}>
                                {entry.voucher_type}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {entry.description}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block">{entry.date}</span>
                                {entry.debit > 0 && (
                                  <span className="font-bold text-rose-600 dark:text-rose-400">Dr: {fmtCurrency(entry.debit)}</span>
                                )}
                                {entry.credit > 0 && (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Cr: {fmtCurrency(entry.credit)}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block">Balance</span>
                                <span className="font-black number-cell text-slate-900 dark:text-white">
                                  {fmtCurrency(entry.running_balance)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                              <th className="pb-2.5">Date</th>
                              <th className="pb-2.5">Voucher / Ref</th>
                              <th className="pb-2.5">Particulars</th>
                              <th className="pb-2.5 text-right">Debit (Dr)</th>
                              <th className="pb-2.5 text-right">Credit (Cr)</th>
                              <th className="pb-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {partyLedgerEntries.map(entry => (
                              <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">{entry.date}</td>
                                <td className="py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                  <span className="block leading-tight">{entry.ref_no}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">{entry.voucher_type}</span>
                                </td>
                                <td className="py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{entry.description}</td>
                                <td className="py-3 text-right font-extrabold number-cell text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                  {entry.debit > 0 ? fmtCurrency(entry.debit) : '—'}
                                </td>
                                <td className="py-3 text-right font-extrabold number-cell text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  {entry.credit > 0 ? fmtCurrency(entry.credit) : '—'}
                                </td>
                                <td className="py-3 text-right font-black number-cell text-slate-900 dark:text-white whitespace-nowrap">
                                  {fmtCurrency(entry.running_balance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                      No invoices or payments recorded for this account yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-xs text-slate-400 dark:text-slate-500">
                <Book size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Select an account from the left</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Click any customer or supplier to view their running balance statement.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'JOURNAL' && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Store Day Book / Unified Chronological Journal
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Consolidated audit trail of sales, purchases, customer receipts, vendor payments, and overheads
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'SALES', label: 'Sales' },
                  { key: 'PURCHASES', label: 'Purchases' },
                  { key: 'PAYMENTS', label: 'Payments' },
                  { key: 'EXPENSES', label: 'Expenses' }
                ].map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setJournalFilter(cat.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      journalFilter === cat.key
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <select
                value={journalDateRange}
                onChange={(e) => setJournalDateRange(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border-none outline-none cursor-pointer"
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today</option>
                <option value="THIS_MONTH">This Month</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search journal by party, voucher reference, or transaction type…"
              value={journalSearch}
              onChange={(e) => setJournalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading day book entries…</span>
            </div>
          ) : journalEntries.length > 0 ? (
            <>
              <div className="sm:hidden space-y-2">
                {journalEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{entry.party_name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                        entry.category === 'SALE'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          : entry.category === 'PURCHASE'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : entry.category === 'PAYMENT_IN'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}>
                        {entry.type_label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">{entry.ref_no}</span>
                        <span className="text-[10px] text-slate-400">{entry.date}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black number-cell block ${
                          entry.inflow > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {fmtCurrency(entry.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Voucher Type</th>
                      <th className="pb-2.5">Reference</th>
                      <th className="pb-2.5">Party / Particulars</th>
                      <th className="pb-2.5 text-right">Inflow (₹)</th>
                      <th className="pb-2.5 text-right">Outflow (₹)</th>
                      <th className="pb-2.5 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {journalEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">{entry.date}</td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md ${
                            entry.category === 'SALE'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50'
                              : entry.category === 'PURCHASE'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50'
                                : entry.category === 'PAYMENT_IN'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50'
                          }`}>
                            {entry.type_label}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">{entry.ref_no}</td>
                        <td className="py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate">{entry.party_name}</td>
                        <td className="py-3 text-right font-extrabold number-cell text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {entry.inflow > 0 ? fmtCurrency(entry.inflow) : '—'}
                        </td>
                        <td className="py-3 text-right font-extrabold number-cell text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {entry.outflow > 0 ? fmtCurrency(entry.outflow) : '—'}
                        </td>
                        <td className="py-3 text-right font-black number-cell text-slate-900 dark:text-white whitespace-nowrap">
                          {fmtCurrency(entry.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              No journal transactions found for the selected filters.
            </div>
          )}
        </div>
      )}

      {showPaymentModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {paymentForm.type === 'PAYMENT_IN' ? 'Record Customer Receipt' : 'Record Supplier Payment'}
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Party</label>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white">
                  {selectedParty?.name} ({selectedParty?.type})
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Payment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, type: 'PAYMENT_IN' })}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      paymentForm.type === 'PAYMENT_IN'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Payment In (Received)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, type: 'PAYMENT_OUT' })}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      paymentForm.type === 'PAYMENT_OUT'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Payment Out (Given)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-black text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
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
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Reference No. (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Cheque / Slip No"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Part payment against bill"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {submittingPayment ? 'Saving…' : 'Record Payment'}
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
