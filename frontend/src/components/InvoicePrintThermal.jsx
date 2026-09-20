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

function truncateItemName(name, maxChars = 36) {
  if (!name) return '';
  if (name.length <= maxChars) return name;
  return name.slice(0, maxChars - 3).trim() + '...';
}

export default function InvoicePrintThermal() {
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

  const [cfg, setCfg] = useState(() => getPosSettings('thermal'));

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
    const element = document.getElementById('thermal-printable-receipt');
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
          filename: `${invoice?.invoice_number || 'receipt'}_thermal.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: [80, Math.max(120, (element.offsetHeight * 80) / (element.offsetWidth || 300))], orientation: 'portrait' }
        };
        await pdfEngine().set(opt).from(element).save();
      } else if (window.html2canvas && (window.jspdf?.jsPDF || window.jsPDF)) {
        const jsPdfClass = window.jspdf?.jsPDF || window.jsPDF;
        const canvas = await window.html2canvas(element, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdfWidth = 80;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pdf = new jsPdfClass({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`${invoice?.invoice_number || 'receipt'}_thermal.pdf`);
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
        Loading receipt...
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

  const handleBack = () => {
    try {
      if (window.opener) {
        window.close();
        return;
      }
    } catch { }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/sales');
    }
  };

  const isRegistered = isBusinessGstRegistered(company);
  const effectiveTitle = !isRegistered
    ? (cfg.invoiceTitle && cfg.invoiceTitle !== 'TAX INVOICE' ? cfg.invoiceTitle : 'BILL OF SUPPLY')
    : (cfg.invoiceTitle || 'TAX INVOICE');
  const displaySubtotal = isRegistered ? Number(invoice.subtotal) : Number(invoice.total_amount || invoice.subtotal);
  const effectiveLogo = logoBase64 || company?.logo_url;
  const upiId = cfg.upiId || company?.upi_id;
  const bankName = cfg.bankName || company?.bank_name;
  const bankAcc = cfg.bankAccountNo || company?.account_number;
  const bankIfsc = cfg.bankIfsc || company?.ifsc_code;

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
    <div className="min-h-screen bg-slate-100 py-6 px-2 print:bg-white print:p-0 print:m-0 flex flex-col items-center">

      <div className="w-full max-w-[320px] mb-4 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1.5 shadow-sm flex items-center justify-between gap-1.5 print:hidden">
        <button
          onClick={handleBack}
          className="h-9 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
          title="Back to Sales"
        >
          <ArrowLeft size={13} className="text-slate-500" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={getWhatsAppInvoiceUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-2xs"
            title="Share Digital Bill on WhatsApp"
          >
            <WhatsAppIcon size={13} />
            <span>WhatsApp</span>
          </a>

          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="h-9 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 active:scale-95"
            title="Download PDF receipt"
          >
            <Download size={13} className="text-emerald-600 shrink-0" />
            <span>{downloading ? 'PDF…' : 'PDF'}</span>
          </button>

          <button
            onClick={handleDirectPrint}
            disabled={printingBt}
            className={`h-9 px-3 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              btPrinter
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/25'
            }`}
            title={btPrinter ? `Connected: ${btPrinter.name} (Direct ESC/POS output)` : 'Print thermal receipt'}
          >
            {btPrinter ? <Bluetooth size={13} className="shrink-0 animate-pulse" /> : <Printer size={13} className="shrink-0" />}
            <span>{printingBt ? '…' : btPrinter ? 'Print (BT)' : 'Print'}</span>
          </button>
        </div>
      </div>

      <div className="w-[300px] max-w-[300px] bg-white rounded-lg shadow-sm print:shadow-none overflow-hidden">
        <div
          id="thermal-printable-receipt"
          className="w-full box-border bg-white border-none px-1.5 py-1.5 font-mono text-[11.5px] text-slate-950 print:w-full select-none"
        >

        <div className="text-center pb-1.5">
          {cfg.showLogo !== false && effectiveLogo && (
            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center p-1 shadow-xs mb-1.5 mx-auto overflow-hidden">
              <img
                src={effectiveLogo}
                alt={company?.name || 'Store Logo'}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {cfg.showCompanyName !== false && (
            <h1 className="text-sm font-black uppercase tracking-tight py-0.5 text-slate-950">{cfg.customCompanyName || company?.name || 'HISABKHATA STORE'}</h1>
          )}

          {cfg.isCompositionScheme && (
            <p className="text-[10px] font-bold text-slate-800 uppercase border-y border-dashed border-slate-400 py-0.5 my-1 leading-tight">
              Composition Taxable Person, not eligible to collect tax on supplies
            </p>
          )}

          {cfg.showAddress !== false && company?.address && (
            <table className="border-collapse text-[10.5px] font-bold text-slate-800 mx-auto my-0.5">
              <tbody>
                <tr>
                  <td className="pr-1 align-top pt-0.5 w-3 text-center">
                    <MapPin size={11} className="text-slate-500 block" />
                  </td>
                  <td className="align-top leading-tight text-center">{company.address}</td>
                </tr>
              </tbody>
            </table>
          )}

          {cfg.showContact !== false && (company?.phone || (cfg.showWebsite !== false && company?.website)) && (
            <table className="border-collapse text-[10.5px] font-bold text-slate-900 mx-auto my-0.5">
              <tbody>
                <tr>
                  {company?.phone && (
                    <>
                      <td className="pr-0.5 align-middle w-3 text-center">
                        <Phone size={11} className="text-slate-500 block" />
                      </td>
                      <td className="align-middle leading-none pr-2 whitespace-nowrap">{company.phone}</td>
                    </>
                  )}
                  {cfg.showWebsite !== false && company?.website && (
                    <>
                      <td className="pr-0.5 align-middle w-3 text-center">
                        <Globe size={11} className="text-slate-500 block" />
                      </td>
                      <td className="align-middle leading-none whitespace-nowrap">{company.website.replace(/^https?:\/\//, '')}</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          )}

          {cfg.showGstin !== false && isRegistered && (company?.gst_number || company?.trade_licence) && (
            <table className="border-collapse text-[10.5px] font-bold text-slate-950 mx-auto my-0.5">
              <tbody>
                <tr>
                  <td className="pr-1 align-middle w-3 text-center">
                    <FileText size={11} className="text-slate-500 block" />
                  </td>
                  <td className="align-middle leading-none whitespace-nowrap">
                    GSTIN: <span className="font-mono">{company.gst_number || company.trade_licence}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {cfg.invoiceTitle !== 'NAN' && cfg.invoiceTitle !== 'NONE' && (
            <div className="pt-1.5 pb-0.5 flex justify-center">
              <table className="border border-slate-950 border-collapse mx-auto rounded">
                <tbody>
                  <tr>
                    <td className="px-3 py-0.5 text-center font-black text-[11px] uppercase tracking-wider text-slate-950 whitespace-nowrap align-middle">
                      {effectiveTitle}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="w-full border-b border-dashed border-slate-500 my-1.5"></div>

        <table className="w-full text-[11px] font-bold border-collapse text-slate-950">
          <tbody>
            <tr>
              <td className="py-0.5 text-left">Bill: {invoice.invoice_number}</td>
              <td className="py-0.5 text-right">Date: {formatAppDate(invoice.date)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-left truncate max-w-[130px]">Cust: {invoice.party_name || 'Walk-in'}</td>
              <td className="py-0.5 text-right truncate max-w-[140px]">Mode: {(invoice.balance_due || 0) <= 0.001 && typeof invoice.payment_mode === 'string' && invoice.payment_mode.includes('Due:') ? 'Paid in Full' : (invoice.payment_mode || 'CASH')}</td>
            </tr>
            {cfg.showDueDate && invoice.due_date && (
              <tr>
                <td colSpan="2" className="py-0.5 text-left text-slate-700">Due Date: {formatAppDate(invoice.due_date)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="w-full border-b border-dashed border-slate-500 my-1.5"></div>

        <table className="w-full text-left table-fixed border-collapse text-slate-950">
          <thead>
            <tr className="border-b border-slate-400 text-[11px] uppercase font-black text-slate-950">
              {cfg.showItemName !== false && <th className="pb-1 text-left">Item</th>}
              {cfg.showQty !== false && <th className={`pb-1 ${cfg.showMrpColumn ? 'w-[14%]' : 'w-[15%]'} text-center`}>Qty</th>}
              {cfg.showMrpColumn && <th className="pb-1 w-[16%] text-right">MRP</th>}
              {cfg.showRate !== false && <th className={`pb-1 ${cfg.showMrpColumn ? 'w-[16%]' : 'w-[17%]'} text-right`}>Price</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(invoice.items || []).map((it, idx) => {
              const itemAmt = it.total !== undefined ? it.total : (it.quantity * it.rate);
              const unitPrice = it.quantity > 0 ? (itemAmt / it.quantity) : it.rate;
              const matchedCatalogItem = (catalog || []).find(c => String(c.id) === String(it.item_id) || (c.name && it.item_name && c.name.toLowerCase() === it.item_name.toLowerCase()));
              const mrpVal = it.item_mrp || it.mrp || matchedCatalogItem?.mrp || unitPrice;
              return (
                <tr key={idx}>
                  {cfg.showItemName !== false && (
                    <td className="py-1 font-bold text-[11px] pr-1 align-top leading-snug">
                      <div>
                        <div className="break-words leading-snug" title={it.item_name}>
                          {truncateItemName(it.item_name, 42)}
                        </div>
                        {cfg.showHsnColumn && (it.hsn || matchedCatalogItem?.hsn) && (
                          <span className="block text-[9px] font-normal text-slate-600">HSN: {it.hsn || matchedCatalogItem?.hsn}</span>
                        )}
                        {cfg.showBatchExpiry && (it.batch_number || matchedCatalogItem?.batch_number) && (
                          <span className="block text-[9px] font-normal text-slate-600">
                            B: {it.batch_number || matchedCatalogItem?.batch_number} {it.expiry_date ? `Exp: ${it.expiry_date}` : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {cfg.showQty !== false && (
                    <td className="py-1 text-center whitespace-nowrap align-top leading-normal font-bold">{it.quantity} {cfg.showUnitColumn ? (it.unit || '') : ''}</td>
                  )}
                  {cfg.showMrpColumn && (
                    <td className="py-1 text-right text-slate-600 whitespace-nowrap align-top leading-normal font-bold">{(mrpVal || 0).toFixed(0)}</td>
                  )}
                  {cfg.showRate !== false && (
                    <td className="py-1 text-right font-black whitespace-nowrap align-top leading-normal text-slate-950">{(unitPrice || 0).toFixed(0)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="w-full border-b border-dashed border-slate-500 my-1.5"></div>

        <table className="w-full text-right text-[11.5px] font-bold border-collapse text-slate-950">
          <tbody>
            <tr>
              <td className="py-0.5 text-left">Subtotal:</td>
              <td className="py-0.5 text-right">{fmtCurrency(displaySubtotal)}</td>
            </tr>
            {isRegistered && (
              <tr>
                <td className="py-0.5 text-left">GST Tax:</td>
                <td className="py-0.5 text-right">{fmtCurrency(invoice.tax_amount)}</td>
              </tr>
            )}
            <tr className="border-t border-slate-400 font-black text-sm text-slate-950">
              <td className="pt-1.5 pb-0.5 text-left">TOTAL:</td>
              <td className="pt-1.5 pb-0.5 text-right">{fmtCurrency(invoice.total_amount)}</td>
            </tr>
            <tr className="text-[11px] font-bold">
              <td className="py-0.5 text-left">Paid:</td>
              <td className="py-0.5 text-right">{fmtCurrency(invoice.amount_paid)}</td>
            </tr>
            {(invoice.balance_due || 0) > 0 && (
              <tr className="font-bold text-rose-600 text-[11px]">
                <td className="py-0.5 text-left">Due:</td>
                <td className="py-0.5 text-right">{fmtCurrency(invoice.balance_due)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {cfg.showUpiQr && upiId && (
          <div className="pt-2 pb-1 text-center border-t border-dashed border-slate-400 my-1.5">
            <span className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Scan & Pay via UPI</span>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`upi://pay?pa=${upiId}&pn=${encodeURIComponent(company?.name || 'Store')}&am=${invoice.total_amount || 0}&cu=INR`)}`}
              alt="UPI QR"
              className="w-24 h-24 mx-auto border border-slate-300 p-1 bg-white rounded"
            />
            <span className="text-[9px] font-mono text-slate-600 block mt-0.5">{upiId}</span>
          </div>
        )}

        {cfg.showBankDetails && (bankName || bankAcc) && (
          <div className="text-[9.5px] text-slate-700 pt-1.5 border-t border-dashed border-slate-400">
            <p className="font-bold text-slate-900 uppercase">Bank Details:</p>
            {bankName && <p>Bank: {bankName}</p>}
            {bankAcc && <p>A/C: {bankAcc}</p>}
            {bankIfsc && <p>IFSC: {bankIfsc}</p>}
          </div>
        )}

        {cfg.showTerms !== false && cfg.termsAndConditions && (
          <div className="text-[9px] text-slate-600 pt-1.5 border-t border-dashed border-slate-400 leading-tight">
            <p className="font-bold text-slate-800 uppercase">Terms & Conditions:</p>
            <p className="whitespace-pre-line">{cfg.termsAndConditions}</p>
          </div>
        )}

        {cfg.showSignature !== false && (
          <div className="pt-3 text-center">
            {company?.signature_url && (
              <img src={company.signature_url} alt="Signature" className="h-8 mx-auto object-contain mb-0.5" />
            )}
            <span className="text-[9.5px] text-slate-600 uppercase tracking-wider block font-bold border-t border-slate-400 pt-1 mt-2">
              {cfg.signatureText || 'Authorized Signatory'}
            </span>
          </div>
        )}

        <div className="pt-2 pb-1 text-center text-slate-600">
          <p className="font-bold text-[10.5px] whitespace-nowrap overflow-hidden text-ellipsis tracking-tight py-0.5 text-slate-900">
            {cfg.invoiceFooterNote || 'Thank you for shopping with us! Please visit again.'}
          </p>
          <p className="text-[9px] font-bold text-slate-500 pt-0.5">
            Powered by HisabKhata POS • Crafted by SumanOnline
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
