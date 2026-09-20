import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, RefreshCw, Eye, ChevronLeft, ChevronRight, X, Trash2,
} from 'lucide-react';
import { getInvoices, getInvoice, deleteInvoice, fmtCurrency } from '../api/client.js';
import { toast } from '../utils/toast.js';

const TYPE_BADGE = {
  SALES:     'badge-green',
  PURCHASE:  'badge-blue',
  QUOTATION: 'badge-purple',
};

function InvoiceDetailModal({ invoiceId, onClose }) {
  const [inv, setInv]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoice(invoiceId).then(setInv).catch(console.error).finally(() => setLoading(false));
  }, [invoiceId]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText size={18} className="text-brand-400" />
            Invoice Detail
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inv ? (
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Invoice #</p>
                <p className="font-mono font-bold text-brand-400">{inv.invoice_number}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-white">{inv.date}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Type</p>
                <span className={TYPE_BADGE[inv.type]}>{inv.type}</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">Party</p>
                <p className="text-white font-semibold">{inv.party_name || '—'}</p>
                {inv.party_gst && <p className="text-xs text-slate-500 font-mono">{inv.party_gst}</p>}
              </div>
            </div>

            {/* Line items */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Line Items</p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th className="text-center">Qty</th>
                      <th className="text-right">Rate</th>
                      <th className="text-center">GST</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.items || []).map((item, i) => (
                      <tr key={item.id}>
                        <td className="text-slate-500">{i + 1}</td>
                        <td className="font-medium text-white">{item.item_name}</td>
                        <td className="text-center">{item.quantity} {item.unit}</td>
                        <td className="text-right number-cell">{fmtCurrency(item.rate)}</td>
                        <td className="text-center"><span className="badge-blue">{item.tax_rate}%</span></td>
                        <td className="text-right number-cell font-semibold">{fmtCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="glass-card p-4 space-y-2">
              {[
                { label: 'Subtotal', value: inv.subtotal },
                { label: 'Total GST', value: inv.tax_amount, color: 'text-brand-400' },
                { label: 'Grand Total', value: inv.total_amount, color: 'text-white font-bold text-base' },
                { label: 'Amount Paid', value: inv.amount_paid, color: 'text-emerald-400' },
                { label: 'Balance Due', value: inv.balance_due, color: inv.balance_due > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400' },
              ].map(({ label, value, color = 'text-slate-300' }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className={`number-cell ${color}`}>{fmtCurrency(value)}</span>
                </div>
              ))}
            </div>

            {inv.notes && (
              <div className="p-3 rounded-lg bg-surface-800 border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-300">{inv.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Invoice not found</p>
        )}
      </div>
    </div>
  );
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');      // '' | SALES | PURCHASE | QUOTATION
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [detailId, setDetailId] = useState(null);
  const navigate = useNavigate();
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filter) params.type = filter;
      const res = await getInvoices(params);
      setInvoices(res);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  const handleDelete = async (id, invNo) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNo || ''}? This will revert stock and Khata ledger balance.`)) return;
    try {
      await deleteInvoice(id);
      toast.success(`Invoice ${invNo || ''} deleted`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete invoice');
    }
  };

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? invoices.filter(i => i.invoice_number.toLowerCase().includes(search.toLowerCase()) || (i.party_name || '').toLowerCase().includes(search.toLowerCase()))
    : invoices;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={24} className="text-brand-400" />
            Invoices
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Browse and search all invoices</p>
        </div>
        <button id="create-invoice-nav-btn" onClick={() => navigate('/pos')} className="btn-primary">
          + New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {['', 'SALES', 'PURCHASE', 'QUOTATION'].map(t => (
            <button
              key={t}
              id={`filter-${t || 'all'}`}
              onClick={() => { setFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                filter === t
                  ? 'border-brand-500 bg-brand-600/30 text-white'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="invoice-search"
            className="input-field pl-9"
            placeholder="Search by invoice # or party name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={load} className="btn-secondary px-3"><RefreshCw size={15} /></button>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Type</th>
                <th>Party</th>
                <th>Date</th>
                <th className="text-right">Total</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-500 text-sm">Loading…</span>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                  No invoices found.{' '}
                  <button onClick={() => navigate('/pos')} className="text-brand-400 hover:underline">Create one →</button>
                </td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs text-brand-400">{inv.invoice_number}</td>
                  <td><span className={TYPE_BADGE[inv.type]}>{inv.type}</span></td>
                  <td className="font-medium text-white">{inv.party_name || <span className="text-slate-500">—</span>}</td>
                  <td className="text-slate-400 text-xs">{inv.date}</td>
                  <td className="text-right number-cell font-semibold">{fmtCurrency(inv.total_amount)}</td>
                  <td className="text-right number-cell text-emerald-400">{fmtCurrency(inv.amount_paid)}</td>
                  <td className="text-right number-cell">
                    <span className={inv.balance_due > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                      {fmtCurrency(inv.balance_due)}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        id={`view-invoice-${inv.id}`}
                        onClick={() => setDetailId(inv.id)}
                        className="btn-secondary text-xs py-1 px-2"
                        title="View details"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="Delete invoice"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={filtered.length < LIMIT}
              className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {detailId && <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
