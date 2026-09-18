import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, Wallet, Building2, Plus, ArrowDownLeft, ArrowUpRight,
  TrendingUp, ArrowRight, RefreshCw, DollarSign, CheckCircle2, X
} from 'lucide-react';
import { getFundAccounts, createFundAccount, getFundTransactions, createFundTransaction, fmtCurrency } from '../api/client.js';

export default function FundFlow() {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name) return;
    setSubmitting(true);
    try {
      await createFundAccount({
        ...accountForm,
        opening_balance: Number(accountForm.opening_balance) || 0
      });
      setShowAccountModal(false);
      setAccountForm({ name: '', type: 'BANK', account_number: '', ifsc_code: '', opening_balance: 0 });
      loadData();
    } catch (err) {
      alert(err.message || 'Error creating account');
    } finally {
      setSubmitting(false);
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
      setTxForm({ account_id: '', amount: '', direction: 'IN', date: new Date().toISOString().slice(0, 10), description: '' });
      loadData();
    } catch (err) {
      alert(err.message || 'Error recording transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Fund Flow & Bank Accounts</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Manage cash-in-hand, bank balances, and funds ledger</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowTxModal(true)}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Entry</span>
            </button>
            
            <button
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Building2 size={13} className="text-slate-500" />
              <span className="hidden sm:inline">+ Add Account</span>
              <span className="sm:hidden">+ Account</span>
            </button>

            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Fund Flow"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Total Liquid Funds</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight number-cell">
            {fmtCurrency(totalFunds)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Combined Cash + Bank</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Cash in Hand</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight number-cell">
            {fmtCurrency(totalCashBalance)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">Counter & Register Drawer</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">Bank & UPI Accounts</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight number-cell">
            {fmtCurrency(totalBankBalance)}
          </p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block">All connected accounts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Registered Accounts</h2>
            <button
              onClick={() => setShowAccountModal(true)}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> New
            </button>
          </div>

          {accounts.length > 0 ? (
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 transition-all flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{acc.name}</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 shrink-0">{acc.type}</span>
                    </div>
                    {acc.account_number && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">A/C: {acc.account_number}</p>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-900 number-cell shrink-0 ml-2">
                    {fmtCurrency(acc.current_balance)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No bank accounts added yet.</div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Fund Movements</h2>
            <span className="text-[11px] text-slate-400">Cash-in / Cash-out vouchers</span>
          </div>

          {transactions.length > 0 ? (
            <>
              <div className="sm:hidden space-y-2">
                {transactions.map(tx => {
                  const isIncoming = tx.direction === 'IN';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-1.5 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs">{tx.account_name}</span>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isIncoming ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                          {isIncoming ? 'CASH IN' : 'CASH OUT'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                        <div className="min-w-0">
                          <p className="truncate text-slate-600">{tx.description || 'Fund Voucher'}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{tx.date}</p>
                        </div>
                        <span className={`text-sm font-black number-cell ${isIncoming ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {fmtCurrency(tx.amount)}
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
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Account</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-right">Flow</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map(tx => {
                      const isIncoming = tx.direction === 'IN';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 text-slate-500 whitespace-nowrap">{tx.date}</td>
                          <td className="py-2.5 font-bold text-slate-800 whitespace-nowrap">{tx.account_name}</td>
                          <td className="py-2.5 text-slate-600 whitespace-nowrap">{tx.description || 'Fund Voucher'}</td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isIncoming ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {isIncoming ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                              {isIncoming ? 'CASH IN' : 'CASH OUT'}
                            </span>
                          </td>
                          <td className={`py-2.5 text-right font-extrabold number-cell whitespace-nowrap ${isIncoming ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {fmtCurrency(tx.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">No fund entries recorded yet.</div>
          )}
        </div>

      </div>

      {showAccountModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowAccountModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Add Cash / Bank Account</h2>
              <button onClick={() => setShowAccountModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, Drawer Cash"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Account Type</label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-medium"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="UPI">UPI / Digital Wallet</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Account Number (Optional)</label>
                <input
                  type="text"
                  placeholder="A/C No"
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={accountForm.opening_balance}
                  onChange={(e) => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving…' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showTxModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setShowTxModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Record Cash In / Cash Out</h2>
              <button onClick={() => setShowTxModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTx} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Target Account</label>
                <select
                  required
                  value={txForm.account_id}
                  onChange={(e) => setTxForm({ ...txForm, account_id: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-medium"
                >
                  <option value="">Select Account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} (₹{a.current_balance})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, direction: 'IN' })}
                    className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                      txForm.direction === 'IN' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    + Cash IN (Deposit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, direction: 'OUT' })}
                    className={`py-1.5 text-xs font-bold rounded-lg border cursor-pointer ${
                      txForm.direction === 'OUT' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    - Cash OUT (Withdraw)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="0.00"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Description / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Owner Capital, Bank Transfer"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs cursor-pointer"
                >
                  {submitting ? 'Saving…' : 'Record Entry'}
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
