import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, Download, MapPin, Phone, Globe, FileText, QrCode, Bluetooth } from 'lucide-react';
import { getInvoice, getCompany, getItems, getImageBase64, fmtCurrency, getPosSettings, formatAppDate, isBusinessGstRegistered } from '../api/client.js';
import { getConnectedPrinter, connectBluetoothPrinter, autoReconnectBluetoothPrinter, printEscPosInvoice, isBluetoothSupported } from '../utils/bluetoothPrinter.js';

const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function truncateItemName(name, maxChars = 98) {
  if (!name) return '';
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 3).trim() + '...';
}

export default function InvoicePrintA4() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [logoBase64, setLogoBase64] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [btPrinter, setBtPrinter] = useState(() => getConnectedPrinter());
  const [printingBt, setPrintingBt] = useState(false);

  const [cfg, setCfg] = useState(() => getPosSettings('a4'));

  useEffect(() => {
    Promise.all([
      getInvoice(id),
      getCompany(),
      getItems().catch(() => [])
    ])
      .then(([inv, comp, itemList]) => {
        setInvoice(inv);
        setCompany(comp);
        setCatalog(itemList || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    autoReconnectBluetoothPrinter().then(p => {
      if (p) setBtPrinter(p);
    }).catch(() => {});

    const handleBtConnect = () => setBtPrinter(getConnectedPrinter());
    const handleBtDisconnect = () => setBtPrinter(null);
    window.addEventListener('hk_bluetooth_printer_connected', handleBtConnect);
    window.addEventListener('hk_bluetooth_printer_disconnected', handleBtDisconnect);
    return () => {
      window.removeEventListener('hk_bluetooth_printer_connected', handleBtConnect);
      window.removeEventListener('hk_bluetooth_printer_disconnected', handleBtDisconnect);
    };
  }, []);

  useEffect(() => {
    if (company?.logo_url && cfg.showLogo !== false) {
      getImageBase64(company.logo_url).then(b64 => {
        if (b64) setLogoBase64(b64);
      });
    }
  }, [company?.logo_url, cfg.showLogo]);

  const handleDirectPrint = async () => {
    if (isBluetoothSupported()) {
      setPrintingBt(true);
      try {
        let printer = getConnectedPrinter();
        if (!printer) {
          printer = await autoReconnectBluetoothPrinter();
        }
        if (!printer) {
          printer = await connectBluetoothPrinter();
        }
        if (printer) {
          setBtPrinter(printer);
          await printEscPosInvoice(invoice, company, cfg, catalog);
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      } finally {
        setPrintingBt(false);
      }
    }
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('a4-printable-invoice');
    if (!element) return;
    setDownloading(true);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }
    try {
      const pdfEngine = window.html2pdf;
      if (pdfEngine) {
        const opt = {
          margin: 0,
          filename: `${invoice?.invoice_number || 'invoice'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await pdfEngine().set(opt).from(element).save();
      } else if (window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF)) {
        const jsPdfClass = window.jspdf?.jsPDF || window.jsPDF;
        const canvas = await window.html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPdfClass('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${invoice?.invoice_number || 'invoice'}.pdf`);
      } else {
        window.print();
      }
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      if (wasDark) {
        document.documentElement.classList.add('dark');
      }
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">
        Loading invoice...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-sm font-bold text-rose-600">Invoice not found.</p>
        <button
          onClick={() => navigate('/sales')}
          className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          Go to Sales
        </button>
      </div>
    );
  }

  const isRegistered = isBusinessGstRegistered(company);
  const effectiveTitle = !isRegistered
    ? (cfg.invoiceTitle && cfg.invoiceTitle !== 'TAX INVOICE' ? cfg.invoiceTitle : 'BILL OF SUPPLY')
    : (cfg.invoiceTitle || 'TAX INVOICE');
  const displaySubtotal = isRegistered ? Number(invoice.subtotal) : Number(invoice.total_amount || invoice.subtotal);
  const displayTax = isRegistered ? Number(invoice.tax_amount || 0) : 0;
  const bankName = cfg.bankName || company?.bank_name;
  const bankAcc = cfg.bankAccountNo || company?.account_number;
  const bankIfsc = cfg.bankIfsc || company?.ifsc_code;
  const bankBranch = cfg.bankBranch || company?.branch_name;
  const upiId = cfg.upiId || company?.upi_id;

  const handleBack = () => {
    try {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
    } catch { }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/invoices');
    }
  };

  const getWhatsAppInvoiceUrl = () => {
    if (!invoice) return '#';
    const bizName = company?.name || (() => {
      try {
        return JSON.parse(localStorage.getItem('cached_company'))?.name || 'Our Store';
      } catch {
        return 'Our Store';
      }
    })();
    const customerName = invoice.party_name || 'Customer';
    const billLink = `${window.location.origin}/receipt/${invoice.invoice_number}`;
    const text = `\u{1F9FE} *Digital Bill \u2014 ${bizName}*\n\nDear *${customerName}*,\n\nThank you for shopping with *${bizName}*! \u{1F64F}\n\n\u{1F331} As part of our green initiative, we're sharing your digital bill with you.\n\n\u{1F4C4} *View Your Bill:*\n${billLink}\n\nThank you for choosing us.\n\u{1F6CD}\uFE0F *Happy Shopping!*\n\n\u2014 *${bizName}*`;
    
    const rawPhone = (invoice.party_phone || '').replace(/[^0-9]/g, '');
    const phone = rawPhone ? (rawPhone.startsWith('91') && rawPhone.length > 10 ? rawPhone : `91${rawPhone}`) : '';
    
    return phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0 print:m-0">

      <div className="max-w-[850px] mx-auto mb-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-2 print:hidden">
        <button
          onClick={handleBack}
          className="h-9 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
        >
          <ArrowLeft size={13} className="text-slate-500" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={getWhatsAppInvoiceUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
            title="Share Digital Bill on WhatsApp"
          >
            <WhatsAppIcon size={14} />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="h-9 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 active:scale-95"
            title="Export vector PDF"
          >
            <Download size={13} className="text-emerald-600 shrink-0" />
            <span>{downloading ? 'PDF…' : 'PDF'}</span>
          </button>

          <button
            onClick={handleDirectPrint}
            disabled={printingBt}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              btPrinter
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/25'
            }`}
            title={btPrinter ? `Connected: ${btPrinter.name}` : 'Print invoice'}
          >
            {btPrinter ? <Bluetooth size={13} className="shrink-0 animate-pulse" /> : <Printer size={13} className="shrink-0" />}
            <span>{printingBt ? 'Printing…' : btPrinter ? 'Print (BT)' : 'Print'}</span>
          </button>
        </div>
      </div>

      <div id="a4-printable-invoice" className="max-w-[850px] mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm print:shadow-none print:border-none print:p-6 print:max-w-full">

        {cfg.isCompositionScheme && (
          <div className="mb-4 text-center py-1.5 px-3 bg-slate-100 rounded-lg border border-slate-300">
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Composition Taxable Person, not eligible to collect tax on supplies
            </p>
          </div>
        )}

        <div className="flex justify-between items-start pb-6 border-b border-slate-200">
          <div className="space-y-1.5 max-w-[60%]">
            {cfg.showLogo !== false && company?.logo_url ? (
              <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center p-1.5 shadow-sm mb-3">
                <img src={logoBase64 || company.logo_url} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : null}
            {cfg.showCompanyName !== false && (
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{cfg.customCompanyName || company?.name || 'HisabKhata Store'}</h1>
            )}

            {cfg.showAddress !== false && company?.address && (
              <table className="border-collapse text-xs text-slate-600 pt-0.5">
                <tbody>
                  <tr>
                    <td className="pr-1.5 align-top pt-0.5 w-4 text-left">
                      <MapPin size={13} className="text-slate-400 block" />
                    </td>
                    <td className="align-top leading-relaxed">{company.address}</td>
                  </tr>
                </tbody>
              </table>
            )}

            <table className="border-collapse text-xs text-slate-600 pt-0.5">
              <tbody>
                <tr>
                  {cfg.showContact !== false && company?.phone && (
                    <>
                      <td className="pr-1.5 align-middle w-4 text-left">
                        <Phone size={12} className="text-slate-400 block" />
                      </td>
                      <td className="align-middle pr-4 whitespace-nowrap leading-none">{company.phone}</td>
                    </>
                  )}
                  {cfg.showWebsite !== false && company?.website && (
                    <>
                      <td className="pr-1.5 align-middle w-4 text-left">
                        <Globe size={12} className="text-slate-400 block" />
                      </td>
                      <td className="align-middle whitespace-nowrap leading-none">{company.website.replace(/^https?:\/\//, '')}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>

            {cfg.showGstin !== false && isRegistered && (company?.gst_number || company?.trade_licence) && (
              <table className="border-collapse text-xs font-bold text-slate-800 pt-0.5">
                <tbody>
                  <tr>
                    <td className="pr-1.5 align-middle w-4 text-left">
                      <FileText size={12} className="text-slate-400 block" />
                    </td>
                    <td className="align-middle leading-none">
                      GSTIN / Licence: <span className="font-mono">{company.gst_number || company.trade_licence}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div className="text-right space-y-1.5">
            {cfg.invoiceTitle !== 'NAN' && cfg.invoiceTitle !== 'NONE' && (
              <div className="flex justify-end mb-2">
                <span className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md leading-normal inline-block text-center">
                  {effectiveTitle}
                </span>
              </div>
            )}
            <p className="text-xs font-bold text-slate-800">
              Invoice No: <span className="font-mono text-slate-900 font-black">{invoice.invoice_number}</span>
            </p>
            <p className="text-xs text-slate-600">
              Date: <span className="font-medium text-slate-900">{formatAppDate(invoice.date)}</span>
            </p>
            {cfg.showDueDate !== false && invoice.due_date && (
              <p className="text-xs text-rose-600 font-bold">
                Due Date: <span>{formatAppDate(invoice.due_date)}</span>
              </p>
            )}
            <p className="text-xs text-slate-600">
              Payment: <span className="font-bold text-slate-900">{(invoice.balance_due || 0) <= 0.001 && typeof invoice.payment_mode === 'string' && invoice.payment_mode.includes('Due:') ? 'Paid in Full' : (invoice.payment_mode || 'CASH')}</span>
            </p>
          </div>
        </div>

        <div className="py-4 border-b border-slate-200">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">Bill To Customer</span>
          <p className="text-sm font-black text-slate-900">{invoice.party_name || 'Walk-in Customer'}</p>
          {invoice.party_phone && (
            <table className="border-collapse text-xs text-slate-600 mt-1">
              <tbody>
                <tr>
                  <td className="pr-1.5 align-middle w-4 text-left">
                    <Phone size={11} className="text-slate-400 block" />
                  </td>
                  <td className="align-middle leading-none">{invoice.party_phone}</td>
                </tr>
              </tbody>
            </table>
          )}
          {invoice.party_address && (
            <table className="border-collapse text-xs text-slate-600 mt-1">
              <tbody>
                <tr>
                  <td className="pr-1.5 align-top pt-0.5 w-4 text-left">
                    <MapPin size={11} className="text-slate-400 block" />
                  </td>
                  <td className="align-top leading-relaxed">{invoice.party_address}</td>
                </tr>
              </tbody>
            </table>
          )}
          {invoice.party_gst_number && (
            <p className="text-xs text-slate-700 font-mono mt-1 font-bold">
              Customer GSTIN: {invoice.party_gst_number}
            </p>
          )}
        </div>

        <div className="py-4">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                {cfg.showSerialNo !== false && <th className="py-2.5 text-center w-8">#</th>}
                {cfg.showItemName !== false && <th className="py-2.5 text-left">Item Description</th>}
                {cfg.showHsnColumn && <th className="py-2.5 text-center w-[11%] whitespace-nowrap">HSN/SAC</th>}
                {cfg.showQty !== false && <th className="py-2.5 text-center w-[10%] whitespace-nowrap">Qty</th>}
                {cfg.showMrpColumn && <th className="py-2.5 text-right w-[11%] whitespace-nowrap">MRP</th>}
                {cfg.showRate !== false && <th className="py-2.5 text-right w-[12%] whitespace-nowrap">Rate</th>}
                {cfg.showDiscountColumn && <th className="py-2.5 text-right w-[10%] whitespace-nowrap">Disc</th>}
                {cfg.showTaxColumn && isRegistered && <th className="py-2.5 text-right w-[10%] whitespace-nowrap">GST %</th>}
                {cfg.showAmount !== false && <th className="py-2.5 text-right w-[14%] whitespace-nowrap">Amount</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((it, idx) => {
                const itemAmt = it.total !== undefined ? Number(it.total) : (it.quantity * it.rate - (it.discount || 0));
                const unitRate = (!isRegistered && it.quantity > 0) ? (itemAmt / it.quantity) : it.rate;
                const matchedCatalogItem = (catalog || []).find(c => String(c.id) === String(it.item_id) || (c.name && it.item_name && c.name.toLowerCase() === it.item_name.toLowerCase()));
                const mrpVal = it.item_mrp || it.mrp || matchedCatalogItem?.mrp;
                const hsnVal = it.hsn || matchedCatalogItem?.hsn;
                const batchVal = it.batch_number || matchedCatalogItem?.batch_number;
                const expiryVal = it.expiry_date || matchedCatalogItem?.expiry_date;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {cfg.showSerialNo !== false && <td className="py-3 text-center text-slate-400 text-[11px] align-top">{idx + 1}</td>}
                    {cfg.showItemName !== false && (
                      <td className="py-3 pr-2.5 align-top">
                        <span className="font-bold text-slate-900 block leading-snug break-words" title={it.item_name}>
                          {truncateItemName(it.item_name, 98)}
                        </span>
                        {cfg.showBatchExpiry && (batchVal || expiryVal) && (
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                            {batchVal ? `Batch: ${batchVal}` : ''} {expiryVal ? `Exp: ${expiryVal}` : ''}
                          </span>
                        )}
                      </td>
                    )}
                    {cfg.showHsnColumn && (
                      <td className="py-3 text-center text-slate-500 font-mono text-[11px] align-top whitespace-nowrap">{hsnVal || '-'}</td>
                    )}
                    {cfg.showQty !== false && (
                      <td className="py-3 text-center font-bold text-slate-800 align-top whitespace-nowrap">
                        {it.quantity} {cfg.showUnitColumn ? (it.unit || '') : ''}
                      </td>
                    )}
                    {cfg.showMrpColumn && (
                      <td className="py-3 text-right text-slate-400 number-cell align-top whitespace-nowrap">{mrpVal ? fmtCurrency(mrpVal) : '-'}</td>
                    )}
                    {cfg.showRate !== false && (
                      <td className="py-3 text-right text-slate-700 number-cell align-top whitespace-nowrap">{fmtCurrency(unitRate)}</td>
                    )}
                    {cfg.showDiscountColumn && (
                      <td className="py-3 text-right text-slate-500 number-cell align-top whitespace-nowrap">{it.discount ? fmtCurrency(it.discount) : '-'}</td>
                    )}
                    {cfg.showTaxColumn && isRegistered && (
                      <td className="py-3 text-right text-slate-500 align-top whitespace-nowrap">{it.tax_rate ? `${it.tax_rate}%` : '0%'}</td>
                    )}
                    {cfg.showAmount !== false && (
                      <td className="py-3 text-right font-black text-slate-900 number-cell align-top whitespace-nowrap">
                        {fmtCurrency(it.total !== undefined ? it.total : (it.quantity * it.rate - (it.discount || 0)))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-stretch text-xs">
          <div className="max-w-[48%] flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {cfg.showBankDetails && (bankName || bankAcc) && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-800 block mb-1">Bank Details for Payment:</span>
                  {bankName && <p className="text-slate-600">Bank: <strong className="text-slate-900">{bankName}</strong></p>}
                  {bankAcc && <p className="text-slate-600">A/C No: <strong className="text-slate-900 font-mono">{bankAcc}</strong></p>}
                  {bankIfsc && <p className="text-slate-600">IFSC: <strong className="text-slate-900 font-mono">{bankIfsc}</strong></p>}
                  {bankBranch && <p className="text-slate-600">Branch: <strong className="text-slate-900">{bankBranch}</strong></p>}
                  {upiId && <p className="text-slate-600">UPI: <strong className="text-emerald-700 font-mono">{upiId}</strong></p>}
                </div>
              )}

              {cfg.showUpiQr && upiId && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center gap-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(company?.name || 'Store')}&am=${invoice.total_amount || 0}&cu=INR`)}`}
                    alt="UPI QR"
                    className="w-20 h-20 border border-slate-200 p-1 bg-white rounded-lg shadow-2xs"
                  />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Instant Scan & Pay</span>
                    <span className="text-[10px] text-slate-500 block">Scan with any UPI app (GPay, PhonePe, Paytm)</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 block mt-1">{upiId}</span>
                  </div>
                </div>
              )}

              {cfg.showTerms !== false && cfg.termsAndConditions && (
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider">Terms & Conditions:</span>
                  <p className="whitespace-pre-line leading-relaxed">{cfg.termsAndConditions}</p>
                </div>
              )}
            </div>

            <div className="space-y-0.5 pt-2 mt-auto">
              <p className="text-[11px] text-slate-500 font-medium">{cfg.invoiceFooterNote || `Thank you for your business. For queries, contact ${company?.phone || 'support'}.`}</p>
              <p className="text-[10px] text-slate-400">Powered by HisabKhata POS • Crafted by SumanOnline</p>
            </div>
          </div>

          <div className="w-64 space-y-1.5 text-right">
            <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
              <span className="text-slate-500">{isRegistered ? 'Taxable Value:' : 'Subtotal:'}</span>
              <span className="font-bold text-slate-800 number-cell">{fmtCurrency(displaySubtotal)}</span>
            </div>
            {isRegistered && displayTax > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-xs">
                <span className="text-slate-500">Total Tax (GST):</span>
                <span className="font-bold text-slate-800 number-cell">{fmtCurrency(displayTax)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm">
              <span className="font-black text-slate-900">Grand Total:</span>
              <span className="font-black text-slate-900 number-cell">{fmtCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-600 text-[11px]">
              <span>Amount Paid:</span>
              <span className="font-bold text-slate-900 number-cell">{fmtCurrency(invoice.amount_paid)}</span>
            </div>
            {(invoice.balance_due || 0) > 0 && (
              <div className="flex justify-between py-1 text-rose-600 font-bold text-[11px]">
                <span>Balance Due:</span>
                <span className="number-cell">{fmtCurrency(invoice.balance_due)}</span>
              </div>
            )}

            {cfg.showSignature !== false && (
              <div className="pt-4 text-center">
                {company?.signature_url && (
                  <img src={company.signature_url} alt="Signature" className="h-10 mx-auto object-contain mb-1" />
                )}
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  {cfg.signatureText || 'Authorized Signatory'}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
