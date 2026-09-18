import React, { useEffect, useState } from 'react';
import { Book, Users, Wallet, Building2, Search, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { getParties, getTransactions, getFundAccounts, fmtCurrency } from '../api/client.js';

export default function AccountBook() {
  const [parties, setParties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fundAccounts, setFundAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getParties(),
      getTransactions(),
      getFundAccounts()
    ])
      .then(([partyList, txList, fundList]) => {
        setParties(partyList || []);
        setTransactions(txList || []);
        setFundAccounts(fundList || []);
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

  const filteredParties = parties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.phone || '').includes(q);
  });

  const selectedParty = parties.find(p => String(p.id) === String(selectedPartyId));
  const partyTransactions = transactions.filter(t => String(t.party_id) === String(selectedPartyId));

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Book size={18} className="text-emerald-600" />
            Account Book & General Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Unified ledger across customer accounts, suppliers, and cash funds</p>
        </div>

        <button
          onClick={loadData}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Customer Receivables (Debtors)</span>
          <p className="text-2xl font-black text-emerald-600 tracking-tight number-cell mt-1">{fmtCurrency(totalReceivables)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">To Collect across all customers</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Supplier Payables (Creditors)</span>
          <p className="text-2xl font-black text-rose-600 tracking-tight number-cell mt-1">{fmtCurrency(totalPayables)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">To Pay across all vendors</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Party Ledgers</h2>
            <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{parties.length}</span>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {filteredParties.map(p => {
              const isSelected = String(p.id) === String(selectedPartyId);
              const isCustomer = p.type === 'CUSTOMER';
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPartyId(p.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                    isSelected ? 'bg-emerald-50 border-emerald-300 shadow-xs' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                    <span className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${isCustomer ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>{p.phone || 'No phone'}</span>
                    <span className={`font-extrabold ${p.current_balance > 0 ? (isCustomer ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-500'}`}>
                      {fmtCurrency(p.current_balance)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          {selectedParty ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{selectedParty.name}</h3>
                  <p className="text-xs text-slate-400">{selectedParty.phone || 'No phone'} · GST: {selectedParty.gst_number || 'Unregistered'}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Balance</span>
                  <span className="text-lg font-black text-slate-900 number-cell">{fmtCurrency(selectedParty.current_balance)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Reference</th>
                      <th className="pb-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {partyTransactions.length > 0 ? (
                      partyTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2.5 text-slate-500">{tx.date}</td>
                          <td className="py-2.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'PAYMENT_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {tx.type === 'PAYMENT_IN' ? 'Payment Received' : 'Payment Given'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-700">{tx.reference || tx.notes || '—'}</td>
                          <td className="py-2.5 text-right font-extrabold text-slate-900 number-cell">{fmtCurrency(tx.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-slate-400">No payment records found for this account.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              <Book size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Select an account from the left list</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any customer or vendor to inspect their ledger statement.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
