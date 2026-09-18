import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Users, Plus, Search, Edit2, Trash2, X,
  RefreshCw, CreditCard, ArrowUpRight, ArrowDownLeft,
  Phone, Mail, Building2, ChevronRight,
  FileText, Calendar, Receipt, Download, Printer, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import {
  getParties, createParty, updateParty, deleteParty,
  getInvoices, getTransactions, createTransaction,
  deleteTransaction, deleteInvoice, fmtCurrency
} from '../api/client.js';

const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const formatWhatsAppPhone = (phone) => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('91') && digits.length > 10) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const EMPTY_PARTY = {
  type: 'CUSTOMER', name: '', phone: '', gst_number: '',
  address: '', email: '', opening_balance: 0
};

const EMPTY_TXN = { type: 'PAYMENT_IN', amount: '', date: new Date().toISOString().slice(0,10), reference: '', notes: '' };

function PartyModal({ party, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_PARTY,
    ...(party || {}),
    name: party?.name ?? '',
    phone: party?.phone ?? '',
    gst_number: party?.gst_number ?? '',
    email: party?.email ?? '',
    address: party?.address ?? '',
    opening_balance: party?.opening_balance ?? 0,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true);
    setError(null);
    try {
      if (party?.id) {
        await updateParty(party.id, form);
      } else {
        await createParty(form);
      }
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-slate-900/70 sm:bg-slate-900/60 sm:backdrop-blur-sm z-[10001] flex items-center justify-center p-3 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-slate-200 animate-fade-in text-slate-800">
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">{party?.id ? 'Edit Party Details' : 'Add New Customer / Vendor'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {error && <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Party Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['CUSTOMER', 'VENDOR'].map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    form.type === t
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'CUSTOMER' ? '👤 Customer (Buyer)' : '🏭 Vendor (Supplier)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Party / Business Name *</label>
            <input required className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold" placeholder="Full Name or Store Name" value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
              <input className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" placeholder="+91 98765 43210" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">GSTIN (Optional)</label>
              <input className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none uppercase font-mono" placeholder="22AAAAA0000A1Z5" value={form.gst_number ?? ''} onChange={e => set('gst_number', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
              <input className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" type="email" placeholder="email@example.com" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Opening Balance (₹)</label>
              <input className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold" type="number" step="any" placeholder="0.00" value={form.opening_balance ?? ''} onChange={e => set('opening_balance', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Billing / Shipping Address</label>
            <input className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" placeholder="Full postal address" value={form.address ?? ''} onChange={e => set('address', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs cursor-pointer">
              {saving ? 'Saving…' : 'Save Party'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function PaymentModal({ party, onClose, onSave }) {
  const [form, setForm] = useState({
    ...EMPTY_TXN,
    type: party.type === 'CUSTOMER' ? 'PAYMENT_IN' : 'PAYMENT_OUT',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedInvId, setSelectedInvId] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      setLoadingInvoices(true);
      try {
        const invoices = await getInvoices({ party_id: party.id, limit: 100 });
        setUnpaidInvoices((invoices || []).filter(inv => (inv.balance_due || 0) > 0));
      } catch {
        setUnpaidInvoices([]);
      } finally {
        setLoadingInvoices(false);
      }
    })();
  }, [party.id]);

  const selectInvoice = (inv) => {
    if (selectedInvId === inv.id) {
      setSelectedInvId(null);
      setForm(f => ({
        ...f,
        invoice_id: null,
        reference: '',
        amount: '',
        notes: '',
      }));
      return;
    }
    setSelectedInvId(inv.id);
    setForm(f => ({
      ...f,
      invoice_id: inv.id,
      reference: inv.invoice_number || `INV-${inv.id}`,
      amount: inv.balance_due,
      notes: `Against ${inv.invoice_number || `INV-${inv.id}`}`,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    setSaving(true);
    setError(null);
    try {
      await createTransaction({
        ...form,
        party_id: party.id,
        invoice_id: selectedInvId || form.invoice_id || null,
        reference: form.reference || (selectedInvId ? `Against ${unpaidInvoices.find(i => i.id === selectedInvId)?.invoice_number || selectedInvId}` : null),
        amount: Number(form.amount)
      });
      window.dispatchEvent(new CustomEvent('hk:payment-updated'));
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-slate-900/70 sm:bg-slate-900/60 sm:backdrop-blur-sm z-[10001] flex items-center justify-center p-3 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 border border-slate-200 animate-fade-in text-slate-800 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Record Payment</h2>
            <p className="text-[11px] text-slate-400 font-medium">{party.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {error && <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          {/* ── Direction ── */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Direction</label>
            <div className="grid grid-cols-2 gap-2">
              {['PAYMENT_IN', 'PAYMENT_OUT'].map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => set('type', t)}
                  className={`py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    form.type === t
                      ? t === 'PAYMENT_IN'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t === 'PAYMENT_IN' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                  {t === 'PAYMENT_IN' ? 'Received (IN)' : 'Paid (OUT)'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Select Bill to Settle ── */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Settle Against Invoice</label>
            {loadingInvoices ? (
              <div className="flex items-center gap-2 py-2 text-[11px] text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Loading unpaid bills…
              </div>
            ) : unpaidInvoices.length > 0 ? (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto rounded-xl border border-slate-200 p-1.5 bg-slate-50/50">
                {unpaidInvoices.map(inv => {
                  const isSelected = selectedInvId === inv.id;
                  return (
                    <button
                      type="button"
                      key={inv.id}
                      onClick={() => selectInvoice(inv)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <FileText size={12} className={isSelected ? 'text-emerald-600' : 'text-slate-400'} />
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                            {inv.invoice_number || `INV-${inv.id}`}
                          </span>
                          <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1 rounded">
                            {inv.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span>{inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '—'}</span>
                          <span>•</span>
                          <span>Total: {fmtCurrency(inv.total_amount)}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-black block ${isSelected ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {fmtCurrency(inv.balance_due)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">due</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-2 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-500" />
                No unpaid invoices — all bills settled!
              </div>
            )}
            {selectedInvId && (
              <button
                type="button"
                onClick={() => { setSelectedInvId(null); set('amount', ''); set('notes', ''); set('reference', ''); set('invoice_id', null); }}
                className="mt-1 text-[10px] text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
              >
                ✕ Clear selection (general payment)
              </button>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Amount (₹) *</label>
            <input required type="number" min="0.01" step="any" placeholder="0.00" value={form.amount ?? ''} onChange={e => set('amount', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold" />
          </div>

          {/* ── Date ── */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
            <input type="date" value={form.date ?? ''} onChange={e => set('date', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" />
          </div>

          {/* ── Reference / Note ── */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Reference / Note</label>
            <input placeholder="UPI ref, Cheque no, or voucher note" value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs cursor-pointer">
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}

function PartyLedgerModal({ party, onClose, onRecordPayment, onEditParty }) {
  const [filterType, setFilterType] = useState('ALL');
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLedger = useCallback(async () => {
    if (!party?.id) return;
    setLoading(true);
    try {
      const [invRes, txnRes] = await Promise.all([
        getInvoices({ party_id: party.id, limit: 100 }),
        getTransactions({ party_id: party.id })
      ]);
      setInvoices(invRes || []);
      setTransactions(txnRes || []);
    } catch {
      setInvoices([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [party?.id]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger, party?.current_balance]);

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete this ${entry.kind === 'INVOICE' ? 'invoice' : 'payment'} (${entry.ref})? This will revert balance.`)) return;
    try {
      if (entry.kind === 'INVOICE') {
        await deleteInvoice(entry.rawId);
      } else {
        await deleteTransaction(entry.rawId);
      }
      window.dispatchEvent(new CustomEvent('hk:payment-updated'));
      loadLedger();
    } catch (err) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      loadLedger();
    };
    window.addEventListener('hk:payment-updated', handleUpdate);
    return () => window.removeEventListener('hk:payment-updated', handleUpdate);
  }, [loadLedger]);

  const allEntries = React.useMemo(() => {
    const list = [];
    invoices.forEach(inv => {
      list.push({
        id: `inv-${inv.id}`,
        rawId: inv.id,
        kind: 'INVOICE',
        date: inv.date || inv.created_at,
        created_at: inv.created_at,
        ref: inv.invoice_number || `INV-${inv.id}`,
        type: inv.type,
        amount: inv.total_amount || 0,
        paid: inv.amount_paid || 0,
        balance: inv.balance_due || 0,
        payment_mode: inv.payment_mode || 'CASH',
        notes: inv.notes
      });
    });

    transactions.forEach(txn => {
      list.push({
        id: `txn-${txn.id}`,
        rawId: txn.id,
        kind: 'PAYMENT',
        date: txn.date || txn.created_at,
        created_at: txn.created_at,
        ref: txn.reference || `TXN-${txn.id}`,
        type: txn.type,
        amount: txn.amount || 0,
        notes: txn.notes
      });
    });

    list.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
    return list;
  }, [invoices, transactions]);

  const filteredEntries = React.useMemo(() => {
    if (filterType === 'INVOICE') return allEntries.filter(e => e.kind === 'INVOICE');
    if (filterType === 'PAYMENT') return allEntries.filter(e => e.kind === 'PAYMENT');
    return allEntries;
  }, [allEntries, filterType]);

  const totalInvoiced = invoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const isCust = party.type === 'CUSTOMER';
  const balanceDue = party.current_balance || 0;
  const totalPaid = Math.max(0, totalInvoiced - balanceDue);
  const bizName = (() => { try { return JSON.parse(localStorage.getItem('cached_company'))?.name || 'Our Store'; } catch { return 'Our Store'; } })();
  const shareMsg = `\u{1F514} *Payment Reminder \u2014 HisabKhata POS*\n\nDear *${party.name}*,\n\nYour current outstanding balance with *${bizName}* is:\n\n\u{1F4B0} *Outstanding Amount: ${fmtCurrency(balanceDue)}*\n\nKindly clear the outstanding amount at your earliest convenience.\n\nThank you for your continued business with us! \u{1F64F}\n\n\u2014 *${bizName}*`;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-slate-900/70 sm:bg-slate-900/60 sm:backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white sm:rounded-2xl rounded-t-[1.25rem] shadow-2xl w-full max-w-3xl h-[95dvh] sm:h-auto sm:max-h-[92vh] flex flex-col sm:border border-slate-200 animate-fade-in text-slate-800 overflow-hidden">
        
        {/* ── Mobile drag handle ── */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* ── Header ── */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-sm ${
              isCust ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 text-emerald-700 border border-emerald-200' : 'bg-gradient-to-br from-amber-400/20 to-amber-500/10 text-amber-700 border border-amber-200'
            }`}>
              {party.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] sm:text-base font-extrabold text-slate-900 truncate leading-tight">{party.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide ${
                  isCust ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {party.type}
                </span>
                {party.phone && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Phone size={11} className="text-slate-400" />
                    {party.phone}
                  </span>
                )}
              </div>
              {party.gst_number && (
                <span className="font-mono text-[10px] bg-slate-200/60 px-1 rounded text-slate-700 mt-0.5 inline-block">
                  GSTIN: {party.gst_number}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEditParty(party)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Edit Party Details"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="px-3 py-3 sm:p-4 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100 shrink-0">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Billed</span>
              <p className="text-[13px] sm:text-base font-black text-slate-800 number-cell mt-1 leading-tight">{fmtCurrency(totalInvoiced)}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 shadow-sm">
              <span className="text-[9px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Settled</span>
              <p className="text-[13px] sm:text-base font-black text-emerald-700 number-cell mt-1 leading-tight">{fmtCurrency(totalPaid)}</p>
            </div>
            <div className={`p-2.5 sm:p-3 rounded-xl border shadow-sm ${
              balanceDue > 0 ? (isCust ? 'bg-amber-50/70 border-amber-200/70' : 'bg-rose-50/70 border-rose-200/70') : 'bg-white border-slate-200/80'
            }`}>
              <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Balance</span>
              <p className={`text-[13px] sm:text-base font-black number-cell mt-1 leading-tight ${
                balanceDue > 0 ? (isCust ? 'text-amber-700' : 'text-rose-700') : 'text-slate-500'
              }`}>
                {fmtCurrency(balanceDue)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs + Actions ── */}
        <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold shrink-0">
              {[
                { key: 'ALL', label: `All (${allEntries.length})` },
                { key: 'INVOICES', label: 'Invoices' },
                { key: 'PAYMENTS', label: 'Payments' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`px-3 py-1.5 rounded-[10px] text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    filterType === tab.key ? 'bg-white text-slate-900 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {party.phone && balanceDue > 0 && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(party.phone)}&text=${encodeURIComponent(shareMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 sm:px-2.5 sm:py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl sm:rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <WhatsAppIcon size={14} />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              )}
              <button
                onClick={() => onRecordPayment(party)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl sm:rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">Record Payment</span>
                <span className="sm:hidden">Pay</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Ledger Entries ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-slate-50/30">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-400">Loading ledger…</span>
            </div>
          ) : filteredEntries.length > 0 ? (
            filteredEntries.map(entry => {
              const isInv = entry.kind === 'INVOICE';
              return (
                <div
                  key={entry.id}
                  className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm"
                >
                  {/* Top row: icon + ref + amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isInv
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : entry.type === 'PAYMENT_IN'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {isInv ? <FileText size={16} /> : entry.type === 'PAYMENT_IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] sm:text-xs font-black text-slate-900">{entry.ref}</span>
                          <span className={`text-[9px] sm:text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md uppercase ${
                            isInv
                              ? 'bg-slate-100 text-slate-600'
                              : entry.type === 'PAYMENT_IN'
                                ? 'bg-emerald-100/70 text-emerald-700'
                                : 'bg-rose-100/70 text-rose-700'
                          }`}>
                            {isInv ? entry.type : (entry.type === 'PAYMENT_IN' ? 'Received' : 'Paid')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-[14px] sm:text-sm font-black number-cell block leading-tight ${
                          isInv
                            ? 'text-slate-900'
                            : entry.type === 'PAYMENT_IN'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                        }`}>
                          {isInv ? '' : (entry.type === 'PAYMENT_IN' ? '- ' : '+ ')}
                          {fmtCurrency(entry.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      {isInv && (
                        entry.balance > 0 ? (
                          <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                            Due: {fmtCurrency(entry.balance)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                            Paid
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Bottom meta row */}
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/80 text-[10px] sm:text-[10px] text-slate-400 font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {entry.date ? new Date(entry.date).toLocaleDateString('en-GB') : '—'}
                    </span>
                    {entry.payment_mode && (
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600 font-semibold">
                        {isInv && entry.balance <= 0 && typeof entry.payment_mode === 'string' && entry.payment_mode.includes('Due:')
                          ? 'Settled'
                          : entry.payment_mode}
                      </span>
                    )}
                    {isInv && entry.paid > 0 && (
                      <span className="text-emerald-600 font-semibold">Paid: {fmtCurrency(entry.paid)}</span>
                    )}
                    {entry.notes && (
                      <span className="text-slate-500 truncate max-w-[180px] sm:max-w-[150px]">{entry.notes}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              <Receipt size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700 text-sm">No ledger activity found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Create invoices or record payments for this party.</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 sm:py-3 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0 gap-2">
          <span className="text-[11px] font-medium text-slate-400">{filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl sm:rounded-lg text-xs transition-colors cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

export default function Parties() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [selectedPartyLedger, setSelectedPartyLedger] = useState(null);
  const [searchParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getParties({ type: activeTab === 'ALL' ? undefined : activeTab, search });
      setParties(res || []);
    } catch {
      setParties([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (searchParams.get('new') === '1') setModal('new'); }, [searchParams]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this party? This will also remove their balance.')) return;
    try {
      await deleteParty(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalReceivable = parties.filter(p => p.type === 'CUSTOMER').reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0);
  const totalPayable = parties.filter(p => p.type === 'VENDOR').reduce((s, p) => s + Math.max(0, p.current_balance || 0), 0);

  const filtered = parties.filter(p => {
    if (activeTab === 'CUSTOMER' && p.type !== 'CUSTOMER') return false;
    if (activeTab === 'VENDOR' && p.type !== 'VENDOR') return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.phone || '').includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Customers & Vendors Khata</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Manage customer credit ledgers, supplier balances, and payment vouchers</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setModal('new')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Add Party</span>
            </button>

            <button
              onClick={load}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Parties"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">Customer Dues</span>
          <p className="text-base sm:text-2xl font-black text-emerald-600 tracking-tight number-cell mt-0.5 sm:mt-1 truncate">{fmtCurrency(totalReceivable)}</p>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">Receivables</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">Supplier Dues</span>
          <p className="text-base sm:text-2xl font-black text-rose-600 tracking-tight number-cell mt-0.5 sm:mt-1 truncate">{fmtCurrency(totalPayable)}</p>
          <span className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">Payables</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        <div className="inline-flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-100/90 text-xs font-bold text-slate-600 shadow-inner overflow-x-auto no-scrollbar shrink-0">
          {['ALL', 'CUSTOMER', 'VENDOR'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t
                  ? 'bg-white text-emerald-700 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All Parties' : t === 'CUSTOMER' ? 'Customers' : 'Vendors'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search party by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading parties…</span>
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filtered.map(p => {
                const isCust = p.type === 'CUSTOMER';
                const hasDue = (p.current_balance || 0) > 0;
                const bizName = (() => { try { return JSON.parse(localStorage.getItem('cached_company'))?.name || 'Our Store'; } catch { return 'Our Store'; } })();
                const shareMsg = `\u{1F514} *Payment Reminder \u2014 HisabKhata POS*\n\nDear *${p.name}*,\n\nYour current outstanding balance with *${bizName}* is:\n\n\u{1F4B0} *Outstanding Amount: ${fmtCurrency(p.current_balance || 0)}*\n\nKindly clear the outstanding amount at your earliest convenience.\n\nThank you for your continued business with us! \u{1F64F}\n\n\u2014 *${bizName}*`;
                return (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                          isCust ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {p.type}
                        </span>
                        <span className="font-bold text-slate-900 text-xs truncate">{p.name}</span>
                      </div>
                      <span className={`text-xs font-black number-cell shrink-0 ${
                        hasDue ? (isCust ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'
                      }`}>
                        {fmtCurrency(p.current_balance)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                      <div className="space-y-0.5 min-w-0">
                        {p.phone && <p className="font-medium text-slate-600">{p.phone}</p>}
                        {p.address && <p className="text-[10px] text-slate-400 truncate">{p.address}</p>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedPartyLedger(p)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          Ledger
                        </button>
                        <button
                          onClick={() => setPayModal(p)}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                        >
                          ₹ Pay
                        </button>
                        {p.phone && hasDue && (
                          <a
                            href={`https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(p.phone)}&text=${encodeURIComponent(shareMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="WhatsApp"
                          >
                            <WhatsAppIcon size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => setModal(p)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
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
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider whitespace-nowrap">
                    <th className="py-3 px-4">Party Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4 text-right">Balance Due</th>
                    <th className="py-3 px-4 text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(p => {
                    const isCust = p.type === 'CUSTOMER';
                    const hasDue = (p.current_balance || 0) > 0;
                    const bizName = (() => { try { return JSON.parse(localStorage.getItem('cached_company'))?.name || 'Our Store'; } catch { return 'Our Store'; } })();
                    const shareMsg = `\u{1F514} *Payment Reminder \u2014 HisabKhata POS*\n\nDear *${p.name}*,\n\nYour current outstanding balance with *${bizName}* is:\n\n\u{1F4B0} *Outstanding Amount: ${fmtCurrency(p.current_balance || 0)}*\n\nKindly clear the outstanding amount at your earliest convenience.\n\nThank you for your continued business with us! \u{1F64F}\n\n\u2014 *${bizName}*`;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedPartyLedger(p)}
                            className="text-left group cursor-pointer"
                          >
                            <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1">
                              {p.name}
                              <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-emerald-600" />
                            </span>
                            {p.address && <span className="text-[11px] text-slate-400 truncate max-w-[200px] block">{p.address}</span>}
                          </button>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isCust ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">{p.phone || '—'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">{p.gst_number || '—'}</td>
                        <td className="py-3 px-4 text-right font-extrabold number-cell whitespace-nowrap">
                          <span className={hasDue ? (isCust ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-400'}>
                            {fmtCurrency(p.current_balance)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedPartyLedger(p)}
                              className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                              title="View Statement / Ledger"
                            >
                              Statement
                            </button>

                            <button
                              onClick={() => setPayModal(p)}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                              title="Record Payment"
                            >
                              ₹ Pay
                            </button>

                            {p.phone && hasDue && (
                              <a
                                href={`https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(p.phone)}&text=${encodeURIComponent(shareMsg)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Send WhatsApp Reminder"
                              >
                                <WhatsAppIcon size={14} />
                              </a>
                            )}

                            <button
                              onClick={() => setModal(p)}
                              className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <Users size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No parties found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Party" to register your customers and suppliers.</p>
          </div>
        )}
      </div>

      {selectedPartyLedger && (
        <PartyLedgerModal
          party={selectedPartyLedger}
          onClose={() => setSelectedPartyLedger(null)}
          onRecordPayment={(p) => setPayModal(p)}
          onEditParty={(p) => setModal(p)}
        />
      )}
      {payModal && (
        <PaymentModal
          party={payModal}
          onClose={() => setPayModal(null)}
          onSave={async () => {
            setPayModal(null);
            await load();
            try {
              const fresh = await getParties({ search });
              const target = (fresh || []).find(p => p.id === payModal.id);
              if (target && selectedPartyLedger) {
                setSelectedPartyLedger(target);
              }
            } catch {}
          }}
        />
      )}
      {modal && <PartyModal party={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

    </div>
  );
}
