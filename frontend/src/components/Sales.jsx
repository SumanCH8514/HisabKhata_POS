import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Plus, Search, Filter, Printer, Download,
  CheckCircle2, Clock, AlertCircle, ChevronDown, Trash2,
  Calendar, User, ArrowRight, Eye, RefreshCw, X, CreditCard,
  MoreVertical, ExternalLink, Copy, Check, Mail,
  Receipt, Hash, ChevronRight
} from 'lucide-react';
import { getInvoices, createInvoice, deleteInvoice, createTransaction, sendInvoiceReceipt, getParties, getItems, fmtCurrency, isBusinessGstRegistered, getActiveTaxRates, getDefaultTaxRate } from '../api/client.js';

const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function QuickPaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(invoice.balance_due || 0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [notes, setNotes] = useState(`Settlement for ${invoice.invoice_number}`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) return setError('Enter a valid payment amount');
    setSubmitting(true);
    setError(null);
    try {
      await createTransaction({
        type: 'PAYMENT_IN',
        party_id: invoice.party_id,
        invoice_id: invoice.id,
        amount: num,
        payment_mode: paymentMode,
        reference: `Against ${invoice.invoice_number}`,
        notes: notes || null
      });
      window.dispatchEvent(new CustomEvent('hk:payment-updated'));
      onSaved();
    } catch (err) {
      setError(err.message || 'Payment error');
    } finally {
      setSubmitting(false);
    }
  };

  return typeof document !== 'undefined' && createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-fade-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Record Payment</h2>
            <p className="text-[11px] text-slate-500 font-mono">{invoice.invoice_number} • {invoice.party_name || 'Walk-in Customer'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>}

          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Bill</span>
              <span className="font-extrabold text-slate-900">{fmtCurrency(invoice.total_amount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Balance Due</span>
              <span className="font-extrabold text-rose-600">{fmtCurrency(invoice.balance_due)}</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-semibold"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR</option>
              <option value="BANK">Bank Transfer / NEFT</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Notes / Reference</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs cursor-pointer">
              {submitting ? 'Saving…' : 'Save Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function InvoiceMobileActionSheet({
  invoice,
  onClose,
  onRecordPayment,
  onDeleteInvoice,
  getWhatsAppUrl,
  onEmailInvoice
}) {
  const [copied, setCopied] = useState(false);
  if (!invoice) return null;

  const isPaid = (invoice.balance_due || 0) <= 0;
  const billUrl = `${window.location.origin}/receipt/${invoice.invoice_number}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(billUrl);
      } else {
        const input = document.createElement('input');
        input.value = billUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return typeof document !== 'undefined' && createPortal(
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 transition-opacity animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-[#0b1120]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{invoice.invoice_number}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${
                isPaid ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}>
                {isPaid ? 'PAID' : `DUE: ${fmtCurrency(invoice.balance_due)}`}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold truncate mt-0.5">
              {invoice.party_name || 'Walk-in Customer'} • <span className="text-slate-400 dark:text-slate-500 font-normal">{invoice.date}</span>
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-base font-black text-slate-900 dark:text-white font-mono block">
              {fmtCurrency(invoice.total_amount || 0)}
            </span>
            <button
              onClick={onClose}
              className="mt-1 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer inline-flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-1.5 overflow-y-auto">
          {!isPaid && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRecordPayment(invoice);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-left transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-300">Record Payment</p>
                <p className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Collect remaining {fmtCurrency(invoice.balance_due)} pending balance</p>
              </div>
            </button>
          )}

          <a
            href={billUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Eye size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">View Digital Receipt</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400">Open full interactive online bill in browser</p>
            </div>
            <ExternalLink size={14} className="text-slate-400 shrink-0 mr-1" />
          </a>

          <a
            href={getWhatsAppUrl(invoice)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <WhatsAppIcon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Share on WhatsApp</p>
              <p className="text-[10px] text-emerald-700/90 dark:text-emerald-400/90">Send digital receipt directly to customer's WhatsApp</p>
            </div>
          </a>

          <button
            type="button"
            onClick={() => {
              onEmailInvoice?.(invoice);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-blue-200/80 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Mail size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-blue-900 dark:text-blue-300">Email Invoice Receipt</p>
              <p className="text-[10px] text-blue-700/90 dark:text-blue-400/90">{invoice.party_email ? `Send directly to ${invoice.party_email}` : 'Enter customer email & dispatch receipt'}</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(`/invoice/${invoice.id}/print`, '_blank');
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <FileText size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Print Tax Invoice (A4)</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400">Standard GST invoice format for PDF or A4 printer</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(`/invoice/${invoice.id}/print-thermal`, '_blank');
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Printer size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300">Print Thermal Slip (POS)</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400">2-inch / 3-inch (80mm) receipt for counter POS printer</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{copied ? 'Link Copied to Clipboard!' : 'Copy Digital Receipt Link'}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400">{copied ? 'Direct customer link copied' : 'Copy link to share via SMS or any chat'}</p>
            </div>
          </button>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteInvoice(invoice.id, invoice.invoice_number);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-950/50 text-left transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Trash2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete Invoice / Transaction</p>
                <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80">Revert item stock and remove balance from Khata</p>
              </div>
            </button>
          </div>
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b1120]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-98 transition-all cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Sales() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [printModalInvoice, setPrintModalInvoice] = useState(null);
  const [payModalInvoice, setPayModalInvoice] = useState(null);
  const [mobileActionInvoice, setMobileActionInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDeleteInvoice = async (id, invNo) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNo || ''}? This will revert stock and Khata ledger balance.`)) return;
    try {
      await deleteInvoice(id);
      window.dispatchEvent(new CustomEvent('hk:payment-updated'));
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete invoice');
    }
  };

  const [isRegistered, setIsRegistered] = useState(() => isBusinessGstRegistered());

  const [form, setForm] = useState(() => ({
    type: 'SALES',
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().slice(0, 10),
    party_id: '',
    payment_mode: 'CASH',
    amount_paid: 0,
    notes: '',
    items: [{ item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: isBusinessGstRegistered() ? getDefaultTaxRate() : 0 }]
  }));

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getInvoices({ type: 'SALES' }),
      getParties({ type: 'CUSTOMER' }),
      getItems()
    ])
      .then(([invList, partyList, itemList]) => {
        setInvoices(invList || []);
        setParties(partyList || []);
        setItems(itemList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    const handleProfileUpdate = () => {
      setIsRegistered(isBusinessGstRegistered());
    };
    window.addEventListener('hk:payment-updated', handleUpdate);
    window.addEventListener('company_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('hk:payment-updated', handleUpdate);
      window.removeEventListener('company_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const handleAddItemRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: isRegistered ? getDefaultTaxRate() : 0 }]
    }));
  };

  const handleRemoveItemRow = (idx) => {
    if (form.items.length === 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleItemChange = (idx, field, val) => {
    setForm(prev => {
      const updated = [...prev.items];
      if (field === 'item_id') {
        const selected = items.find(it => String(it.id) === String(val));
        if (selected) {
          updated[idx] = {
            ...updated[idx],
            item_id: selected.id,
            item_name: selected.name,
            unit: selected.unit || 'Pcs',
            rate: selected.sale_price || 0,
            tax_rate: isRegistered ? (selected.tax_rate || 0) : 0,
            mrp: (selected.mrp !== undefined && selected.mrp !== null && Number(selected.mrp) > 0) ? Number(selected.mrp) : (selected.sale_price || 0)
          };
        }
      } else {
        updated[idx][field] = val;
      }
      return { ...prev, items: updated };
    });
  };

  const subtotal = form.items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0)), 0);
  const taxTotal = isRegistered ? form.items.reduce((sum, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0);
    return sum + (base * (Number(it.tax_rate) || 0) / 100);
  }, 0) : 0;
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.items || form.items.length === 0 || form.items.some(it => !it.item_name && !it.item_id)) {
      alert('Please select or specify all item names');
      return;
    }
    setSubmitting(true);
    try {
      const selectedParty = parties.find(p => String(p.id) === String(form.party_id));
      const paid = form.payment_mode === 'CREDIT' ? 0 : (form.amount_paid !== '' && form.amount_paid !== undefined && form.amount_paid !== null ? Number(form.amount_paid) : grandTotal);
      const res = await createInvoice({
        ...form,
        customer_email: selectedParty?.email || null,
        customer_name: selectedParty?.name || null,
        customer_phone: selectedParty?.phone || null,
        subtotal,
        tax_amount: isRegistered ? taxTotal : 0,
        total_amount: grandTotal,
        amount_paid: paid,
        items: form.items.map(it => ({
          ...it,
          tax_rate: isRegistered ? (Number(it.tax_rate) || 0) : 0
        }))
      });
      setShowModal(false);
      loadData();
      if (res?.email_sent) {
        alert(`Invoice created and receipt emailed to ${res.recipient_email}!`);
      }
    } catch (err) {
      alert(err.message || 'Error creating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailInvoice = async (inv) => {
    let target = (inv.party_email || parties.find(p => p.id === inv.party_id)?.email || '').trim();
    if (!target) {
      target = window.prompt(`Enter customer email address for invoice #${inv.invoice_number}:`);
      if (!target || !target.trim()) return;
    }
    try {
      const res = await sendInvoiceReceipt(inv.id, { email: target.trim() });
      alert(res.message || `Receipt dispatched successfully to ${target.trim()}`);
    } catch (err) {
      alert(err.message || 'Failed to dispatch email receipt');
    }
  };

  const getWhatsAppInvoiceUrl = (inv) => {
    if (!inv) return '#';
    const bizName = (() => {
      try {
        return JSON.parse(localStorage.getItem('cached_company'))?.name || 'Our Store';
      } catch {
        return 'Our Store';
      }
    })();
    const customerName = inv.party_name || 'Customer';
    const billLink = `${window.location.origin}/receipt/${inv.invoice_number}`;
    const text = `\u{1F9FE} *Digital Bill \u2014 ${bizName}*\n\nDear *${customerName}*,\n\nThank you for shopping with *${bizName}*! \u{1F64F}\n\n\u{1F331} As part of our green initiative, we're sharing your digital bill with you.\n\n\u{1F4C4} *View Your Bill:*\n${billLink}\n\nThank you for choosing us.\n\u{1F6CD}\uFE0F *Happy Shopping!*\n\n\u2014 *${bizName}*`;
    
    const rawPhone = (inv.party_phone || parties.find(p => p.id === inv.party_id)?.phone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone ? (rawPhone.startsWith('91') && rawPhone.length > 10 ? rawPhone : `91${rawPhone}`) : '';
    
    return phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'PAID' && (inv.balance_due || 0) > 0) return false;
    if (activeTab === 'UNPAID' && (inv.balance_due || 0) <= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (inv.invoice_number || '').toLowerCase().includes(q) || (inv.party_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText size={18} className="text-emerald-600 shrink-0" />
              <span className="truncate">Sales & Invoices</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Manage customer sales orders, tax invoices, and payment statuses</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setForm({
                  type: 'SALES',
                  invoice_number: `INV-${Date.now().toString().slice(-6)}`,
                  date: new Date().toISOString().slice(0, 10),
                  party_id: '',
                  payment_mode: 'CASH',
                  amount_paid: 0,
                  notes: '',
                  items: [{ item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: isRegistered ? getDefaultTaxRate() : 0 }]
                });
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Create Invoice</span>
            </button>
            
            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Invoices"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        <div className="inline-flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-100/90 text-xs font-bold text-slate-600 shadow-inner overflow-x-auto no-scrollbar shrink-0">
          {[
            { key: 'ALL', label: 'All Invoices' },
            { key: 'PAID', label: 'Fully Paid' },
            { key: 'UNPAID', label: 'Pending Due' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-emerald-700 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice # or customer…"
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
            <span>Loading invoices…</span>
          </div>
        ) : filteredInvoices.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filteredInvoices.map(inv => {
                const isPaid = (inv.balance_due || 0) <= 0;
                return (
                  <div
                    key={inv.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">{inv.invoice_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPaid ? 'PAID' : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPayModalInvoice(inv); }}
                              className="cursor-pointer underline"
                            >
                              DUE: {fmtCurrency(inv.balance_due)}
                            </button>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-medium">{inv.date}</span>
                        <button
                          type="button"
                          onClick={() => setMobileActionInvoice(inv)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md cursor-pointer transition-colors"
                          title="More Options"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{inv.party_name || 'Walk-in Customer'}</p>
                        {isRegistered && (
                          <p className="text-[10px] text-slate-400">GST Tax: {fmtCurrency(inv.tax_amount || 0)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="text-right mr-1">
                          <span className="text-sm font-black text-slate-900 font-mono block">
                            {fmtCurrency(inv.total_amount || 0)}
                          </span>
                        </div>
                        {!isPaid && (
                          <button
                            onClick={() => setPayModalInvoice(inv)}
                            className="p-1.5 text-rose-600 hover:text-emerald-700 bg-rose-50 hover:bg-emerald-50 border border-rose-200 hover:border-emerald-200 rounded-lg shadow-2xs cursor-pointer"
                            title="Record Payment"
                          >
                            <CreditCard size={14} />
                          </button>
                        )}
                        <a
                          href={getWhatsAppInvoiceUrl(inv)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-2xs cursor-pointer inline-flex items-center justify-center transition-colors"
                          title="Share Digital Bill on WhatsApp"
                        >
                          <WhatsAppIcon size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleEmailInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 bg-white border border-slate-200 rounded-lg shadow-2xs cursor-pointer inline-flex items-center justify-center transition-colors"
                          title={inv.party_email ? `Email Receipt to ${inv.party_email}` : "Email Invoice Receipt"}
                        >
                          <Mail size={14} />
                        </button>
                        <button
                          onClick={() => setPrintModalInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 bg-white border border-slate-200 rounded-lg shadow-2xs cursor-pointer"
                          title="Print Invoice"
                        >
                          <Printer size={14} />
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
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4 text-right">{isRegistered ? 'Tax (GST)' : 'Tax'}</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => {
                    const isPaid = (inv.balance_due || 0) <= 0;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold font-mono text-slate-900 whitespace-nowrap">{inv.invoice_number}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{inv.date}</td>
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">{inv.party_name || 'Walk-in Customer'}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 number-cell whitespace-nowrap">{isRegistered ? fmtCurrency(inv.tax_amount || 0) : '—'}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 number-cell whitespace-nowrap">{fmtCurrency(inv.total_amount || 0)}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {isPaid ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              PAID
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPayModalInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer active:scale-95 shadow-2xs"
                              title="Click to Record Payment"
                            >
                              <CreditCard size={11} className="text-rose-600" />
                              <span>DUE: {fmtCurrency(inv.balance_due)}</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {!isPaid && (
                              <button
                                onClick={() => setPayModalInvoice(inv)}
                                className="p-1.5 text-rose-600 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Record Payment"
                              >
                                <CreditCard size={15} />
                              </button>
                            )}
                            <a
                              href={getWhatsAppInvoiceUrl(inv)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Share Digital Bill on WhatsApp"
                            >
                              <WhatsAppIcon size={15} />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleEmailInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                              title={inv.party_email ? `Email Receipt to ${inv.party_email}` : "Email Invoice Receipt"}
                            >
                              <Mail size={15} />
                            </button>
                            <button
                              onClick={() => setPrintModalInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Print Invoice (A4 / Thermal)"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Sale / Invoice"
                            >
                              <Trash2 size={15} />
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
          <div className="py-12 text-center">
            <FileText size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No invoices found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Create Invoice" to generate a tax invoice.</p>
          </div>
        )}
      </div>

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs z-[9999] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 transition-opacity animate-fade-in" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white dark:bg-[#0f172a] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-slide-up overflow-hidden">
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Receipt size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {isRegistered ? 'New Sales Tax Invoice' : 'New Sales Invoice (Non-GST / Bill of Supply)'}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
                    {isRegistered ? 'Fast POS GST Billing, Itemized Ledger & Digital Receipt' : 'Non-GST Sales Bill (0% Tax), Ledger & Digital Receipt'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/70 dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Hash size={12} className="text-emerald-500" /> Invoice Number
                  </label>
                  <input
                    type="text"
                    required
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar size={12} className="text-emerald-500" /> Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <User size={12} className="text-emerald-500" /> Customer / Party
                  </label>
                  <select
                    value={form.party_id}
                    onChange={(e) => setForm({ ...form, party_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="">Walk-in Customer (Instant Bill)</option>
                    {parties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.phone ? `(${p.phone})` : ''} {p.current_balance ? `• Bal: ₹${p.current_balance}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Invoice Line Items</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                      {form.items.length} {form.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="hidden md:block overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item & Description</th>
                        <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                        <th className="py-2.5 px-2 w-20">Unit</th>
                        <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                        {isRegistered && <th className="py-2.5 px-2 w-20 text-center">GST %</th>}
                        <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                      {form.items.map((row, idx) => {
                        const base = Math.max(0, (Number(row.quantity) || 0) * (Number(row.rate) || 0) - (Number(row.discount) || 0));
                        const tax = isRegistered ? (base * (Number(row.tax_rate) || 0) / 100) : 0;
                        const lineTotal = base + tax;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <select
                                value={row.item_id}
                                onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                              >
                                <option value="">Select product or type custom below…</option>
                                {items.map(it => (
                                  <option key={it.id} value={it.id}>{it.name} • ₹{it.sale_price}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Item name or custom specification"
                                value={row.item_name}
                                onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                                className="w-full px-2.5 py-1 text-[11px] border border-slate-200/80 dark:border-slate-800 rounded-lg mt-1 bg-slate-50/60 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 align-top">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 align-top">
                              <select
                                value={row.unit || 'Pcs'}
                                onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                              >
                                {['Pcs', 'Kg', 'Gm', 'Ltr', 'Ml', 'Box', 'Pkt', 'Mtr', 'Roll'].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-2 align-top">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.rate}
                                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right outline-none focus:border-emerald-500"
                              />
                            </td>
                            {isRegistered && (
                              <td className="py-2.5 px-2 align-top">
                                <select
                                  value={row.tax_rate ?? 18}
                                  onChange={(e) => handleItemChange(idx, 'tax_rate', Number(e.target.value))}
                                  className="w-full px-1.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center outline-none focus:border-emerald-500"
                                >
                                  {getActiveTaxRates().map(r => (
                                    <option key={r} value={r}>{r}%</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            <td className="py-2.5 px-3 align-top text-right">
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white block mt-1.5">
                                {fmtCurrency(lineTotal)}
                              </span>
                              {isRegistered && (
                                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 block">
                                  GST: {fmtCurrency(tax)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 align-top text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                disabled={form.items.length === 1}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors mt-1 disabled:opacity-25 disabled:cursor-not-allowed"
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {form.items.map((row, idx) => {
                    const base = Math.max(0, (Number(row.quantity) || 0) * (Number(row.rate) || 0) - (Number(row.discount) || 0));
                    const tax = isRegistered ? (base * (Number(row.tax_rate) || 0) / 100) : 0;
                    const lineTotal = base + tax;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Item #{idx + 1}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            disabled={form.items.length === 1}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors disabled:opacity-25"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                            Product or Item Name
                          </label>
                          <select
                            value={row.item_id}
                            onChange={(e) => handleItemChange(idx, 'item_id', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 mb-1.5"
                          >
                            <option value="">Select product from inventory…</option>
                            {items.map(it => (
                              <option key={it.id} value={it.id}>{it.name} • ₹{it.sale_price}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Item name / specifications"
                            value={row.item_name}
                            onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className={`grid ${isRegistered ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Quantity</label>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Rate (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right outline-none"
                            />
                          </div>
                          {isRegistered && (
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">GST %</label>
                              <select
                                value={row.tax_rate ?? 18}
                                onChange={(e) => handleItemChange(idx, 'tax_rate', Number(e.target.value))}
                                className="w-full px-1.5 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center outline-none"
                              >
                                {getActiveTaxRates().map(r => (
                                  <option key={r} value={r}>{r}%</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-xs">
                          {isRegistered ? (
                            <span className="text-[11px] text-slate-400">GST: {fmtCurrency(tax)}</span>
                          ) : (
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Non-GST (0%)</span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                            Line Total: {fmtCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-slate-50/70 dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div className="md:col-span-7 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                      Payment Mode & Settlement
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {[
                        { key: 'CASH', label: 'Cash' },
                        { key: 'UPI', label: 'UPI / QR' },
                        { key: 'BANK', label: 'Bank' },
                        { key: 'CARD', label: 'Card' },
                        { key: 'CREDIT', label: 'Credit / Due' }
                      ].map(m => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              payment_mode: m.key,
                              amount_paid: m.key === 'CREDIT' ? 0 : (prev.amount_paid !== undefined && prev.amount_paid !== null ? prev.amount_paid : grandTotal)
                            }));
                          }}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                            form.payment_mode === m.key
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Amount Received (₹)
                        </label>
                        {form.payment_mode !== 'CREDIT' && (
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, amount_paid: grandTotal }))}
                            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            Paid Full
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.payment_mode === 'CREDIT' ? 0 : (form.amount_paid !== undefined && form.amount_paid !== null ? form.amount_paid : grandTotal)}
                        onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                        disabled={form.payment_mode === 'CREDIT'}
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        Notes / Remarks (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Delivered via courier, PO #123"
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{isRegistered ? 'Taxable Subtotal' : 'Subtotal'}</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fmtCurrency(subtotal)}</span>
                  </div>
                  {isRegistered && (
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>GST Tax Amount</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{fmtCurrency(taxTotal)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Invoice Total</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {fmtCurrency(grandTotal)}
                    </span>
                  </div>
                  {form.payment_mode === 'CREDIT' || (form.amount_paid !== '' && Number(form.amount_paid) < grandTotal) ? (
                    <div className="pt-1.5 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-xl">
                      <span>Balance Due (Khata)</span>
                      <span className="font-mono">{fmtCurrency(Math.max(0, grandTotal - (Number(form.amount_paid) || 0)))}</span>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-xl">
                      <span>Payment Status</span>
                      <span>Fully Paid</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-98 rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Invoice…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} strokeWidth={2.5} />
                      <span>Generate & Save Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {printModalInvoice && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && setPrintModalInvoice(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Printer size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Print Format</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{printModalInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setPrintModalInvoice(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  window.open(`/invoice/${printModalInvoice.id}/print`, '_blank');
                  setPrintModalInvoice(null);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">A4 Standard Tax Invoice</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Full-page format suitable for official records & GST filing</p>
                </div>
              </button>

              <button
                onClick={() => {
                  window.open(`/invoice/${printModalInvoice.id}/print-thermal`, '_blank');
                  setPrintModalInvoice(null);
                }}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Printer size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Thermal POS Receipt</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Compact 2-inch / 3-inch (80mm) slip for thermal counter printers</p>
                </div>
              </button>

              <a
                href={getWhatsAppInvoiceUrl(printModalInvoice)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPrintModalInvoice(null)}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-left transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <WhatsAppIcon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-900 group-hover:text-emerald-950">Share via WhatsApp</p>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5">Send instant digital bill link directly to customer's WhatsApp</p>
                </div>
              </a>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setPrintModalInvoice(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {payModalInvoice && (
        <QuickPaymentModal
          invoice={payModalInvoice}
          onClose={() => setPayModalInvoice(null)}
          onSaved={() => {
            setPayModalInvoice(null);
            loadData();
          }}
        />
      )}

      {mobileActionInvoice && (
        <InvoiceMobileActionSheet
          invoice={mobileActionInvoice}
          onClose={() => setMobileActionInvoice(null)}
          onRecordPayment={(inv) => setPayModalInvoice(inv)}
          onDeleteInvoice={handleDeleteInvoice}
          getWhatsAppUrl={getWhatsAppInvoiceUrl}
          onEmailInvoice={handleEmailInvoice}
        />
      )}

    </div>
  );
}
