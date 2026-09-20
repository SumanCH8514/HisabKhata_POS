import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, Wallet, Building2, Plus, ArrowDownLeft, ArrowUpRight,
  TrendingUp, ArrowRightLeft, RefreshCw, X, Trash2, Edit2, Search,
  Filter, Calendar, CheckCircle2, ChevronRight, ArrowRight
} from 'lucide-react';
import { 
  getFundAccounts, 
  createFundAccount, 
  updateFundAccount, 
  deleteFundAccount, 
  getFundTransactions, 
  createFundTransaction, 
  transferFund, 
  deleteFundTransaction, 
  fmtCurrency 
} from '../api/client.js';
import { toast } from '../utils/toast.js';

export default function FundFlow() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');

  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'BANK',
    account_number: '',
    ifsc_code: '',
    opening_balance: 0
  });

  const [txForm, setTxForm] = useState({
    account_id: '',
    amount: '',
    direction: 'IN',
    date: new Date().toISOString().slice(0, 10),
    description: ''
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: ''
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getFundAccounts(),
      getFundTransactions()
    ])
      .then(([accList, txList]) => {
        setAccounts(accList || []);
        setTransactions(txList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCashBalance = accounts
    .filter(a => a.type === 'CASH')
    .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const totalBankBalance = accounts
    .filter(a => a.type !== 'CASH')
    .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const totalFunds = totalCashBalance + totalBankBalance;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedAccountId !== 'ALL' && String(tx.account_id) !== String(selectedAccountId)) {
        return false;
      }
      if (directionFilter !== 'ALL' && tx.direction !== directionFilter) {
        return false;
      }
      if (dateFilter !== 'ALL') {
        const txDate = new Date(tx.date || tx.created_at);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          const todayStr = now.toISOString().slice(0, 10);
          if (tx.date !== todayStr) return false;
        } else if (dateFilter === 'THIS_MONTH') {
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const accMatch = (tx.account_name || '').toLowerCase().includes(q);
        const amtMatch = String(tx.amount || '').includes(q);
        return descMatch || accMatch || amtMatch;
      }
      return true;
    });
  }, [transactions, selectedAccountId, directionFilter, dateFilter, searchQuery]);

  const totalFilteredIn = filteredTransactions
    .filter(t => t.direction === 'IN')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalFilteredOut = filteredTransactions
    .filter(t => t.direction === 'OUT')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const handleOpenCreateAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      name: '',
      type: 'BANK',
      account_number: '',
      ifsc_code: '',
      opening_balance: 0
    });
    setShowAccountModal(true);
  };

  const handleOpenEditAccount = (acc, e) => {
    e?.stopPropagation();
    setEditingAccount(acc);
    setAccountForm({
      name: acc.name,
      type: acc.type,
      account_number: acc.account_number || '',
      ifsc_code: acc.ifsc_code || '',
      opening_balance: acc.opening_balance || 0
    });
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name) return;
    setSubmitting(true);
    try {
      if (editingAccount) {
        await updateFundAccount(editingAccount.id, {
          name: accountForm.name,
          type: accountForm.type,
          account_number: accountForm.account_number,
          ifsc_code: accountForm.ifsc_code
        });
      } else {
        await createFundAccount({
          ...accountForm,
          opening_balance: Number(accountForm.opening_balance) || 0
        });
      }
      setShowAccountModal(false);
      toast.success(editingAccount ? 'Account updated successfully' : 'Account created successfully');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error saving account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (acc, e) => {
    e?.stopPropagation();
    if (!confirm(`Are you sure you want to delete account "${acc.name}"?`)) return;
    try {
      await deleteFundAccount(acc.id);
      if (selectedAccountId === String(acc.id)) {
        setSelectedAccountId('ALL');
      }
      toast.success(`Account "${acc.name}" deleted`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error deleting account');
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    if (!txForm.account_id || !txForm.amount) return;
    setSubmitting(true);
    try {
      await createFundTransaction({
        ...txForm,
        amount: Number(txForm.amount)
      });
      setShowTxModal(false);
      toast.success(`${txForm.direction === 'IN' ? 'Cash IN' : 'Cash OUT'} entry recorded`);
      setTxForm({
        account_id: accounts[0]?.id || '',
        amount: '',
        direction: 'IN',
        date: new Date().toISOString().slice(0, 10),
        description: ''
      });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error recording transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferFunds = async (e) => {
    e.preventDefault();
    if (!transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount) return;
    if (transferForm.from_account_id === transferForm.to_account_id) {
      toast.warning('Source and destination accounts must be different');
      return;
    }
    setSubmitting(true);
    try {
      await transferFund({
        ...transferForm,
        amount: Number(transferForm.amount)
      });
      setShowTransferModal(false);
      toast.success('Funds transferred successfully');
      setTransferForm({
        from_account_id: '',
        to_account_id: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        description: ''
      });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error transferring funds');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTx = async (tx) => {
    if (!confirm(`Revert this ${tx.direction === 'IN' ? 'Cash IN' : 'Cash OUT'} entry of ${fmtCurrency(tx.amount)}? Account balance will be restored.`)) return;
    try {
      await deleteFundTransaction(tx.id);
      toast.success('Transaction deleted and balance restored');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error deleting transaction');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-12 text-slate-800 dark:text-slate-100">
      
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">Fund Flow & Bank Accounts</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
              Real-time cash in hand, bank balances, inter-account transfers, and funds ledger
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
            <button
              onClick={() => {
                setTxForm(prev => ({ ...prev, account_id: accounts[0]?.id || '' }));
                setShowTxModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Record Cash In / Out</span>
            </button>

            <button
              onClick={() => {
                if (accounts.length < 2) {
                  toast.warning('Please add at least 2 accounts to perform a fund transfer.');
                  return;
                }
                setTransferForm(prev => ({
                  ...prev,
                  from_account_id: accounts[0]?.id || '',
                  to_account_id: accounts[1]?.id || ''
                }));
                setShowTransferModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <ArrowRightLeft size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Transfer</span>
            </button>
            
            <button
              onClick={handleOpenCreateAccount}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Building2 size={13} className="text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">+ Add Account</span>
              <span className="sm:hidden">+ Account</span>
            </button>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Fund Flow"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600 dark:text-emerald-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Total Liquid Funds</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight number-cell">
            {fmtCurrency(totalFunds)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">Combined Cash + Bank + UPI</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cash in Hand</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight number-cell">
            {fmtCurrency(totalCashBalance)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">Counter & Register Drawer</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Bank & UPI Accounts</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight number-cell">
            {fmtCurrency(totalBankBalance)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">{accounts.filter(a => a.type !== 'CASH').length} active bank accounts</span>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Movement Summary</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ArrowRightLeft size={16} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ArrowDownLeft size={13} /> +{fmtCurrency(totalFilteredIn)}
            </span>
            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <ArrowUpRight size={13} /> -{fmtCurrency(totalFilteredOut)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 block truncate">
            {filteredTransactions.length} transaction entries
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
        
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Registered Accounts</h2>
            <button
              onClick={handleOpenCreateAccount}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> New Account
            </button>
          </div>

          <button
            onClick={() => setSelectedAccountId('ALL')}
            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              selectedAccountId === 'ALL'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                ALL
              </div>
              <div>
                <p className="text-xs font-bold">All Accounts Overview</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{accounts.length} total accounts</p>
              </div>
            </div>
            <span className="text-xs font-black number-cell">{fmtCurrency(totalFunds)}</span>
          </button>

          {accounts.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
              {accounts.map(acc => {
                const isSelected = selectedAccountId === String(acc.id);
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(String(acc.id))}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{acc.name}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          acc.type === 'CASH'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : acc.type === 'UPI'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        }`}>
                          {acc.type}
                        </span>
                      </div>
                      {acc.account_number && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                          A/C: {acc.account_number} {acc.ifsc_code ? `· IFSC: ${acc.ifsc_code}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white number-cell">
                        {fmtCurrency(acc.current_balance)}
                      </span>
                      <div className="flex items-center sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditAccount(acc, e)}
                          className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700"
                          title="Edit Account"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAccount(acc, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700"
                          title="Delete Account"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">No bank accounts added yet.</div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Fund Movements Ledger
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                {selectedAccountId === 'ALL' ? 'Showing all accounts' : `Filtered: ${accounts.find(a => String(a.id) === selectedAccountId)?.name || 'Account'}`}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 text-xs font-semibold">
                {['ALL', 'IN', 'OUT'].map(dir => (
                  <button
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      directionFilter === dir
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {dir === 'ALL' ? 'All' : dir === 'IN' ? 'Inflows' : 'Outflows'}
                  </button>
                ))}
              </div>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
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
              placeholder="Search by description, account, amount…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 dark:text-slate-500">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading ledger entries…</span>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <>
              <div className="sm:hidden space-y-2">
                {filteredTransactions.map(tx => {
                  const isIncoming = tx.direction === 'IN';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {tx.account_name || 'Account'}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded ${
                          isIncoming
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}>
                          {isIncoming ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {isIncoming ? 'CASH IN' : 'CASH OUT'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-200/50 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <div className="min-w-0">
                          <p className="truncate text-slate-700 dark:text-slate-300 font-medium">
                            {tx.description || 'Fund Voucher'}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{tx.date}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-black number-cell ${
                            isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {fmtCurrency(tx.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteTx(tx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                            title="Revert entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Account</th>
                      <th className="pb-2.5">Description</th>
                      <th className="pb-2.5 text-center">Type</th>
                      <th className="pb-2.5 text-right">Amount</th>
                      <th className="pb-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTransactions.map(tx => {
                      const isIncoming = tx.direction === 'IN';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">{tx.date}</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{tx.account_name}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 max-w-[220px] truncate">{tx.description || 'Fund Voucher'}</td>
                          <td className="py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                              isIncoming
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50'
                                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50'
                            }`}>
                              {isIncoming ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                              {isIncoming ? 'CASH IN' : 'CASH OUT'}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-black number-cell whitespace-nowrap ${
                            isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {fmtCurrency(tx.amount)}
                          </td>
                          <td className="py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTx(tx)}
                              className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Revert entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              No matching fund entries recorded yet.
            </div>
          )}
        </div>

      </div>

      {showAccountModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowAccountModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAccount ? 'Edit Account Details' : 'Add Cash / Bank Account'}
              </h2>
              <button onClick={() => setShowAccountModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, Drawer Cash"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Account Type</label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-900 dark:text-white"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="UPI">UPI / Digital Wallet</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Account Number (Optional)</label>
                <input
                  type="text"
                  placeholder="A/C No"
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">IFSC / Routing Code (Optional)</label>
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={accountForm.ifsc_code}
                  onChange={(e) => setAccountForm({ ...accountForm, ifsc_code: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-mono text-slate-900 dark:text-white uppercase"
                />
              </div>
              {!editingAccount && (
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={accountForm.opening_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {submitting ? 'Saving…' : (editingAccount ? 'Update Account' : 'Save Account')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showTxModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowTxModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Record Cash In / Cash Out</h2>
              <button onClick={() => setShowTxModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTx} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Target Account</label>
                <select
                  required
                  value={txForm.account_id}
                  onChange={(e) => setTxForm({ ...txForm, account_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-medium text-slate-900 dark:text-white"
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({fmtCurrency(a.current_balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, direction: 'IN' })}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      txForm.direction === 'IN'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    + Cash IN (Deposit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, direction: 'OUT' })}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                      txForm.direction === 'OUT'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-300 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    - Cash OUT (Withdraw)
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
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Description / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Owner Capital, Misc Income, Drawings"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  {submitting ? 'Saving…' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showTransferModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowTransferModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 dark:border-slate-800 animate-fade-in text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ArrowRightLeft size={15} />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inter-Account Fund Transfer</h2>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleTransferFunds} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Transfer From (Debited)</label>
                  <select
                    required
                    value={transferForm.from_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Select Source</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({fmtCurrency(a.current_balance)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Transfer To (Credited)</label>
                  <select
                    required
                    value={transferForm.to_account_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Select Destination</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({fmtCurrency(a.current_balance)})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Transfer Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  placeholder="0.00"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-black text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={transferForm.date}
                  onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Notes / Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Counter cash deposited into bank, ATM withdrawal"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={13} />
                  <span>{submitting ? 'Transferring…' : 'Execute Transfer'}</span>
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
