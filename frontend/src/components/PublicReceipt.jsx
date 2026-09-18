import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download, Printer, CheckCircle2, AlertCircle,
  MapPin, Phone, Globe, Mail, ArrowDownLeft, ShieldCheck, Copy, Check, User
} from 'lucide-react';
import { getPublicInvoice, fmtCurrency, getImageBase64 } from '../api/client.js';
import logoLight from '../assets/logo_light_mode.png';
import logoDark from '../assets/logo_dark_mode.png';

const WhatsAppIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function PublicReceipt() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoBase64, setLogoBase64] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    getPublicInvoice(id)
      .then((res) => {
        setData(res);
        if (res.company?.logo_url) {
          getImageBase64(res.company.logo_url).then(b64 => {
            if (b64) setLogoBase64(b64);
          }).catch(() => { });
        }
      })
      .catch((err) => {
        setError(err.message || 'Unable to load digital receipt.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = receiptRef.current;
    if (!element) return;
    setDownloading(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }
    try {
      if (window.html2pdf) {
        const opt = {
          margin: 6,
          filename: `${data?.invoice_number || 'receipt'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await window.html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Loading digital receipt…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
          <AlertCircle size={28} />
        </div>
        <h1 className="text-base font-bold text-slate-900 dark:text-white mb-1">Receipt Not Found</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
          This digital bill link may be invalid, expired, or removed by the store owner.
        </p>
      </div>
    );
  }

  const comp = data.company || {};
  const items = data.items || [];
  const isPaid = (data.balance_due || 0) <= 0;
  const grandTotal = Number(data.total_amount) || 0;
  const balanceDue = Number(data.balance_due) || 0;
  const amountPaid = Number(data.amount_paid) || 0;

  const cleanPhone = (comp.phone || '').replace(/[^0-9]/g, '').slice(-10);
  const upiId = (comp.upi_id && comp.upi_id.trim()) || (cleanPhone ? `${cleanPhone}@upi` : null);
  const upiPayUrl = upiId && balanceDue > 0
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(comp.name || 'Merchant')}&am=${balanceDue.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${data.invoice_number}`)}`
    : null;
  const qrCodeUrl = upiPayUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(upiPayUrl)}`
    : null;

  const rawCompPhone = (comp.phone || '').replace(/[^0-9]/g, '');
  const compWhatsAppPhone = rawCompPhone ? (rawCompPhone.startsWith('91') && rawCompPhone.length > 10 ? rawCompPhone : (rawCompPhone.length === 10 ? `91${rawCompPhone}` : rawCompPhone)) : '';
  const merchantWaUrl = compWhatsAppPhone
    ? `https://api.whatsapp.com/send?phone=${compWhatsAppPhone}&text=${encodeURIComponent(`Hi, I have a query regarding bill ${data.invoice_number}`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 py-4 sm:py-10 px-3 sm:px-6 font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-emerald-100">

      <div className="max-w-xl mx-auto mb-4 flex items-center justify-between gap-2 print:hidden">
        <a href="/" className="inline-flex items-center gap-2 group shrink-0">
          <img src={logoLight} alt="HisabKhata POS" className="h-7 sm:h-8 w-auto object-contain dark:hidden" />
          <img src={logoDark} alt="HisabKhata POS" className="h-7 sm:h-8 w-auto object-contain hidden dark:block" />
        </a>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Copy Receipt Link"
          >
            {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Download PDF"
          >
            <Download size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>{downloading ? 'PDF…' : 'PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-black dark:hover:bg-slate-700 border border-transparent dark:border-slate-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Print Receipt"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      <div
        ref={receiptRef}
        id="digital-receipt-card"
        className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 overflow-hidden print:border-none print:shadow-none print:rounded-none print:max-w-full text-slate-900 dark:text-slate-100"
      >

        <div className="p-4 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/90 dark:to-slate-900">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {comp.name || 'Store Receipt'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold tracking-wide uppercase shrink-0" title="Verified Merchant">
                  <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Verified</span>
                </span>
              </div>

              {comp.address && (
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-start gap-1 leading-snug">
                  <MapPin size={12} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                  <span>{comp.address}</span>
                </p>
              )}
            </div>

            {(logoBase64 || comp.logo_url) ? (
              <div className="shrink-0 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <img
                  src={logoBase64 || comp.logo_url}
                  alt={comp.name || 'Logo'}
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
                {(comp.name || 'HK').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {(comp.phone || comp.website || comp.email || comp.gst_number || comp.gstin) && (
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2 mt-3 pt-2.5 border-t border-slate-100/90 dark:border-slate-800 text-[11px]">
              {comp.phone && (
                <a
                  href={`tel:${comp.phone.replace(/[^0-9+]/g, '')}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/70 dark:border-slate-700 font-semibold transition-all min-w-0"
                >
                  <Phone size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{comp.phone}</span>
                </a>
              )}
              {comp.website && (
                <a
                  href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/70 dark:border-slate-700 font-semibold transition-all min-w-0"
                >
                  <Globe size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{comp.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {comp.email && (
                <a
                  href={`mailto:${comp.email}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 border border-slate-200/70 dark:border-slate-700 font-semibold transition-all min-w-0"
                >
                  <Mail size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{comp.email}</span>
                </a>
              )}
              {(comp.gst_number || comp.gstin) && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 min-w-0">
                  <span className="text-slate-400 dark:text-slate-500 font-sans text-[10px] shrink-0">GSTIN:</span>
                  <span className="truncate">{comp.gst_number || comp.gstin}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 sm:px-7 sm:py-4 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {data.invoice_number}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                {data.type || 'TAX INVOICE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
              {data.date ? new Date(data.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              {data.payment_mode ? ` • Mode: ${isPaid && typeof data.payment_mode === 'string' && data.payment_mode.includes('Due:') ? 'Paid in Full' : data.payment_mode}` : ''}
            </p>
          </div>

          <div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide ${isPaid
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
              }`}>
              {isPaid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {isPaid ? 'PAID IN FULL' : `DUE: ${fmtCurrency(balanceDue)}`}
            </span>
          </div>
        </div>

        {(data.party_name || qrCodeUrl) && (
          <div className="px-5 py-3 sm:px-7 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
            <div className="min-w-0">
              {data.party_name && (
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1">
                    <User size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>Billed To:</span>
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{data.party_name}</p>
                  {data.party_phone && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Phone size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{data.party_phone}</span>
                    </p>
                  )}
                  {data.party_address && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
                      <MapPin size={11} className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                      <span>{data.party_address}</span>
                    </p>
                  )}
                  {data.party_gst && (
                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="font-sans text-[10px] text-slate-400">GSTIN:</span>
                      <span>{data.party_gst}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {qrCodeUrl && (
              <div className="shrink-0 text-center flex flex-col items-center print:hidden" data-html2canvas-ignore="true">
                <div className="p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-tight">Scan & Pay</span>
              </div>
            )}
          </div>
        )}

        <div className="p-3.5 sm:p-7">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-2.5 pr-1 sm:pr-2 text-left">Item</th>
                  <th className="pb-2.5 px-1 sm:px-2 text-center w-12 sm:w-20">Qty</th>
                  <th className="pb-2.5 px-1 sm:px-2 text-right w-16 sm:w-24">MRP</th>
                  <th className="pb-2.5 pl-1 sm:pl-2 text-right w-16 sm:w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => {
                  const qty = Number(item.quantity) || 1;
                  const mrp = Number(item.item_mrp || item.mrp) || (Number(item.total) && qty ? Number(item.total) / qty : Number(item.rate) || 0);
                  const lineTotal = Number(item.total) || (qty * (Number(item.rate) || 0) + (Number(item.tax_amount) || 0));
                  return (
                    <tr key={idx} className="group">
                      <td className="py-2.5 pr-1 sm:pr-2">
                        <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug">{item.item_name || item.name || `Item #${idx + 1}`}</p>
                      </td>
                      <td className="py-2.5 px-1 sm:px-2 text-center font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">
                        {qty} {item.unit || 'Pcs'}
                      </td>
                      <td className="py-2.5 px-1 sm:px-2 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap text-[11px] sm:text-xs number-cell">
                        {fmtCurrency(mrp)}
                      </td>
                      <td className="py-2.5 pl-1 sm:pl-2 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap text-[11px] sm:text-xs number-cell">
                        {fmtCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            {data.subtotal > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="font-medium number-cell">{fmtCurrency(data.subtotal)}</span>
              </div>
            )}
            {data.tax_amount > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>GST Tax</span>
                <span className="font-medium number-cell">{fmtCurrency(data.tax_amount)}</span>
              </div>
            )}
            {data.discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount</span>
                <span className="font-medium number-cell">-{fmtCurrency(data.discount)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800 text-sm sm:text-base font-black text-slate-900 dark:text-white">
              <span>Grand Total</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-base sm:text-lg number-cell">
                {fmtCurrency(grandTotal)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 pt-1">
              <span>Amount Paid</span>
              <span className="text-slate-800 dark:text-slate-200 number-cell">{fmtCurrency(amountPaid)}</span>
            </div>

            {balanceDue > 0 && (
              <div className="flex justify-between text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900/60 mt-2">
                <span>Outstanding Balance Due</span>
                <span className="number-cell font-black">{fmtCurrency(balanceDue)}</span>
              </div>
            )}
          </div>

          {upiPayUrl && (
            <div className="mt-5 text-center print:hidden" data-html2canvas-ignore="true">
              <a
                href={upiPayUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <ArrowDownLeft size={15} />
                <span>Pay ₹{balanceDue.toFixed(2)} with UPI App</span>
              </a>
            </div>
          )}

          {data.notes && (
            <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Notes</span>
              <p className="italic">{data.notes}</p>
            </div>
          )}

          {merchantWaUrl && (
            <div data-html2canvas-ignore="true" className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-white">Have questions about this bill?</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">Reach out directly to {comp.name || 'the merchant'}.</p>
              </div>
              <a
                href={merchantWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <WhatsAppIcon size={15} />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          )}

        </div>

        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center space-y-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            🌱 Thank you for shopping with us! This is an eco-friendly digital receipt.
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Powered by <strong className="text-slate-600 dark:text-slate-300">HisabKhata POS</strong> • Crafted by{' '}
            <a
              href="https://sumanonline.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-emerald-500 transition-colors"
            >
              SumanOnline
            </a>
          </p>
        </div>

      </div>

    </div>
  );
}
