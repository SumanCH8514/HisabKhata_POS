import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon, Globe, Receipt, Printer, Shield,
  Save, Check, RefreshCw, Smartphone, Volume2, Lock,
  FileText, Sparkles, Building2, Bell, AlertCircle, Percent,
  Bluetooth, BluetoothConnected, BluetoothOff, QrCode, Zap,
  ChevronDown, LayoutTemplate, Landmark, CreditCard, PenTool,
  CheckCircle2, Sliders, Eye
} from 'lucide-react';
import {
  isBluetoothSupported, connectBluetoothPrinter, disconnectBluetoothPrinter,
  getConnectedPrinter, printTestReceipt
} from '../utils/bluetoothPrinter.js';
import { getUserSettings, saveUserSettings } from '../api/client.js';
import StaffManagement from './StaffManagement.jsx';

function CustomSelect({ value, onChange, options = [], placeholder = 'Select Option', className = '' }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
          open ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+5px)] left-0 right-0 z-[70] bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 flex flex-col p-1 animate-fade-in">
          <div className="overflow-y-auto max-h-52 scrollbar-thin p-0.5 space-y-0.5">
            {options.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value || idx}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'INVOICE_CONFIG';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [savedToast, setSavedToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [btPrinter, setBtPrinter] = useState(null);
  const [btLoading, setBtLoading] = useState(false);
  const [btError, setBtError] = useState(null);
  const [scannerTest, setScannerTest] = useState('');
  const [scannerHits, setScannerHits] = useState([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [settings, setSettings] = useState({
    showLogo: true,
    showCompanyName: true,
    customCompanyName: '',
    showAddress: true,
    showContact: true,
    showWebsite: true,
    showGstin: true,

    invoiceTitle: 'TAX INVOICE',
    invoicePrefix: 'INV-',
    showDueDate: true,

    showSerialNo: true,
    showItemName: true,
    showQty: true,
    showRate: true,
    showAmount: true,
    showHsnColumn: true,
    showMrpColumn: true,
    showDiscountColumn: true,
    showTaxColumn: true,
    showBatchExpiry: true,
    showUnitColumn: true,

    showBankDetails: false,
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
    showUpiQr: false,
    upiId: '',

    showTerms: true,
    termsAndConditions: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to local jurisdiction only.',
    invoiceFooterNote: 'Thank you for shopping with us! Please visit again.',
    showSignature: true,
    signatureText: 'Authorized Signatory',

    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    decimalPlaces: '2',
    financialYear: 'APR_MAR',
    defaultTaxRate: '18',
    enabledTaxSlabs: ['0', '5', '12', '18', '28'],
    taxCalculationMode: 'INCLUSIVE',
    isCompositionScheme: false,
    autoPrintReceipt: true,
    preferredPrinter: 'THERMAL_58',
    scannerBeep: true,
    scannerAutoAdd: true,
    lowStockThreshold: 5,
    hideCostFromCashier: true,
    groqApiKey: localStorage.getItem('groq_api_key') || '',
    groqModel: localStorage.getItem('groq_model') || 'qwen/qwen3.6-27b'
  });

  useEffect(() => {
    setBtPrinter(getConnectedPrinter());
    const onConnected = (e) => setBtPrinter({ name: e.detail?.name || 'Bluetooth Printer' });
    const onDisconnected = () => setBtPrinter(null);
    window.addEventListener('hk_bluetooth_printer_connected', onConnected);
    window.addEventListener('hk_bluetooth_printer_disconnected', onDisconnected);
    return () => {
      window.removeEventListener('hk_bluetooth_printer_connected', onConnected);
      window.removeEventListener('hk_bluetooth_printer_disconnected', onDisconnected);
    };
  }, []);

  const handleConnectBt = async () => {
    setBtLoading(true);
    setBtError(null);
    try {
      const res = await connectBluetoothPrinter();
      setBtPrinter(res);
    } catch (err) {
      setBtError(err.message || 'Failed to connect Bluetooth printer.');
    } finally {
      setBtLoading(false);
    }
  };

  const handleDisconnectBt = () => {
    disconnectBluetoothPrinter();
    setBtPrinter(null);
  };

  const handleTestBtPrint = async () => {
    setBtLoading(true);
    setBtError(null);
    try {
      await printTestReceipt(localStorage.getItem('userName') || 'HisabKhata POS');
    } catch (err) {
      setBtError(err.message || 'Error sending ESC/POS test bytes.');
    } finally {
      setBtLoading(false);
    }
  };

  const handleScannerTestSubmit = (e) => {
    e.preventDefault();
    if (!scannerTest.trim()) return;
    setScannerHits(prev => [
      { id: Date.now(), code: scannerTest.trim(), time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4)
    ]);
    setScannerTest('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('hk_pos_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          groqApiKey: parsed.groqApiKey !== undefined ? parsed.groqApiKey : (localStorage.getItem('groq_api_key') || ''),
          groqModel: parsed.groqModel || (localStorage.getItem('groq_model') || 'qwen/qwen3.6-27b')
        }));
      } catch { }
    }

    getUserSettings()
      .then(res => {
        if (res && res.settings) {
          setSettings(prev => ({
            ...prev,
            ...res.settings
          }));
          localStorage.setItem('hk_pos_settings', JSON.stringify(res.settings));
          if (res.settings.currency) localStorage.setItem('app_currency', res.settings.currency);
          if (res.settings.defaultTaxRate !== undefined) localStorage.setItem('default_tax_rate', res.settings.defaultTaxRate);
          if (res.settings.enabledTaxSlabs) localStorage.setItem('hk_active_tax_rates', JSON.stringify(res.settings.enabledTaxSlabs));
          if (res.settings.taxCalculationMode) localStorage.setItem('hk_tax_calculation_mode', res.settings.taxCalculationMode);
          if (res.settings.groqApiKey) localStorage.setItem('groq_api_key', res.settings.groqApiKey);
          if (res.settings.groqModel) localStorage.setItem('groq_model', res.settings.groqModel);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('hk_pos_settings', JSON.stringify(settings));
      localStorage.setItem('app_currency', settings.currency);
      localStorage.setItem('default_tax_rate', settings.defaultTaxRate);
      localStorage.setItem('hk_active_tax_rates', JSON.stringify(settings.enabledTaxSlabs));
      localStorage.setItem('hk_tax_calculation_mode', settings.taxCalculationMode || 'EXCLUSIVE');
      localStorage.setItem('groq_api_key', settings.groqApiKey || '');
      localStorage.setItem('groq_model', settings.groqModel || 'qwen/qwen3.6-27b');
      window.dispatchEvent(new Event('hk_settings_updated'));

      await saveUserSettings(settings);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const toggleTaxSlab = (slab) => {
    setSettings(prev => {
      const exists = prev.enabledTaxSlabs.includes(slab);
      const next = exists
        ? prev.enabledTaxSlabs.filter(s => s !== slab)
        : [...prev.enabledTaxSlabs, slab].sort((a, b) => Number(a) - Number(b));
      if (next.length === 0) return prev;
      const defRate = next.includes(prev.defaultTaxRate) ? prev.defaultTaxRate : next[0];
      return { ...prev, enabledTaxSlabs: next, defaultTaxRate: defRate };
    });
  };

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', flag: '🇮🇳' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)', flag: '🇺🇸' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)', flag: '🇪🇺' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', flag: '🇬🇧' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)', flag: '🇦🇪' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (BDT)', flag: '🇧🇩' },
    { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee (NPR)', flag: '🇳🇵' }
  ];

  const standardSlabs = [
    { rate: '0', label: '0% (Nil / Exempted)', desc: 'Grains, Fresh Milk, Unprocessed Foods' },
    { rate: '3', label: '3% (Precious Metals)', desc: 'Gold, Silver, Diamond Jewelry' },
    { rate: '5', label: '5% (Essential Commodities)', desc: 'Sugar, Tea, Medicines, Spices' },
    { rate: '12', label: '12% (Standard Slab 1)', desc: 'Processed Food, Computer Hardware' },
    { rate: '18', label: '18% (Standard GST Rate)', desc: 'Consumer Electronics, POS Services, Software' },
    { rate: '28', label: '28% (Luxury & Sin Goods)', desc: 'Automobiles, Air Conditioners, Tobacco' }
  ];

  const tabs = [
    { id: 'INVOICE_CONFIG', label: 'Invoice Configurations', icon: Receipt },
    { id: 'TAX', label: 'Tax Rates & GST Slabs', icon: Percent },
    { id: 'GENERAL', label: 'Currency & Localization', icon: Globe },
    { id: 'AI', label: 'AI Catalog Auto-Writer', icon: Sparkles },
    { id: 'HARDWARE', label: 'POS Hardware & Printing', icon: Printer },
    { id: 'SECURITY', label: 'Staff & Security Guard', icon: Shield }
  ];

  const [invoiceFormatTab, setInvoiceFormatTab] = useState('THERMAL');

  const getFormatData = (fmt) => {
    const key = fmt.toLowerCase();
    const sub = settings[key] || {};
    return {
      showLogo: sub.showLogo !== undefined ? sub.showLogo : (settings.showLogo ?? true),
      showCompanyName: sub.showCompanyName !== undefined ? sub.showCompanyName : (settings.showCompanyName ?? true),
      customCompanyName: sub.customCompanyName !== undefined ? sub.customCompanyName : (settings.customCompanyName || ''),
      showAddress: sub.showAddress !== undefined ? sub.showAddress : (settings.showAddress ?? true),
      showContact: sub.showContact !== undefined ? sub.showContact : (settings.showContact ?? true),
      showWebsite: sub.showWebsite !== undefined ? sub.showWebsite : (settings.showWebsite ?? true),
      showGstin: sub.showGstin !== undefined ? sub.showGstin : (settings.showGstin ?? true),
      invoiceTitle: sub.invoiceTitle || settings.invoiceTitle || 'TAX INVOICE',
      invoicePrefix: sub.invoicePrefix || settings.invoicePrefix || 'INV-',
      showDueDate: sub.showDueDate !== undefined ? sub.showDueDate : (settings.showDueDate ?? true),
      showSerialNo: sub.showSerialNo !== undefined ? sub.showSerialNo : (settings.showSerialNo ?? true),
      showItemName: sub.showItemName !== undefined ? sub.showItemName : (settings.showItemName ?? true),
      showQty: sub.showQty !== undefined ? sub.showQty : (settings.showQty ?? true),
      showRate: sub.showRate !== undefined ? sub.showRate : (settings.showRate ?? true),
      showAmount: sub.showAmount !== undefined ? sub.showAmount : (settings.showAmount ?? true),
      showHsnColumn: sub.showHsnColumn !== undefined ? sub.showHsnColumn : (settings.showHsnColumn ?? true),
      showMrpColumn: sub.showMrpColumn !== undefined ? sub.showMrpColumn : (settings.showMrpColumn ?? true),
      showDiscountColumn: sub.showDiscountColumn !== undefined ? sub.showDiscountColumn : (settings.showDiscountColumn ?? true),
      showTaxColumn: sub.showTaxColumn !== undefined ? sub.showTaxColumn : (settings.showTaxColumn ?? true),
      showBatchExpiry: sub.showBatchExpiry !== undefined ? sub.showBatchExpiry : (settings.showBatchExpiry ?? true),
      showUnitColumn: sub.showUnitColumn !== undefined ? sub.showUnitColumn : (settings.showUnitColumn ?? true),
      showBankDetails: sub.showBankDetails !== undefined ? sub.showBankDetails : (settings.showBankDetails ?? false),
      bankName: sub.bankName !== undefined ? sub.bankName : (settings.bankName || ''),
      bankAccountNo: sub.bankAccountNo !== undefined ? sub.bankAccountNo : (settings.bankAccountNo || ''),
      bankIfsc: sub.bankIfsc !== undefined ? sub.bankIfsc : (settings.bankIfsc || ''),
      bankBranch: sub.bankBranch !== undefined ? sub.bankBranch : (settings.bankBranch || ''),
      showUpiQr: sub.showUpiQr !== undefined ? sub.showUpiQr : (settings.showUpiQr ?? false),
      upiId: sub.upiId !== undefined ? sub.upiId : (settings.upiId || ''),
      showTerms: sub.showTerms !== undefined ? sub.showTerms : (settings.showTerms ?? true),
      termsAndConditions: sub.termsAndConditions !== undefined ? sub.termsAndConditions : (settings.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed beyond due date.\n3. Subject to local jurisdiction only.'),
      invoiceFooterNote: sub.invoiceFooterNote !== undefined ? sub.invoiceFooterNote : (settings.invoiceFooterNote || 'Thank you for shopping with us! Please visit again.'),
      showSignature: sub.showSignature !== undefined ? sub.showSignature : (settings.showSignature ?? true),
      signatureText: sub.signatureText !== undefined ? sub.signatureText : (settings.signatureText || 'Authorized Signatory')
    };
  };

  const updateFormatData = (fmt, patch) => {
    const key = fmt.toLowerCase();
    const current = getFormatData(fmt);
    const updated = { ...current, ...patch };
    setSettings(prev => ({
      ...prev,
      [key]: updated,
      ...patch
    }));
  };

  const copyConfigAcrossFormats = (fromFmt, toFmt) => {
    const src = getFormatData(fromFmt);
    const targetKey = toFmt.toLowerCase();
    setSettings(prev => ({
      ...prev,
      [targetKey]: { ...src }
    }));
  };

  const renderTabContent = (tabId) => {
    if (tabId === 'INVOICE_CONFIG') {
      const curFmt = getFormatData(invoiceFormatTab);
      const isThermal = invoiceFormatTab === 'THERMAL';

      return (
        <div className="space-y-6 animate-fade-in">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt size={16} className="text-emerald-600" />
                Invoice Layout & Print Configurations
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure distinct layouts, visibility, and columns separately for Thermal Roll and A4 Full Page</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <Sliders size={12} /> Format Isolated
            </span>
          </div>

          <div className="bg-slate-100/80 dark:bg-slate-900/90 p-1.5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setInvoiceFormatTab('THERMAL')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isThermal
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Printer size={14} className={isThermal ? 'text-white' : 'text-slate-400'} />
                <span>Thermal Receipt (58/80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFormatTab('A4')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  !isThermal
                    ? 'bg-emerald-600 text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <FileText size={14} className={!isThermal ? 'text-white' : 'text-slate-400'} />
                <span>A4 Invoice (Full Page)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => copyConfigAcrossFormats(isThermal ? 'A4' : 'THERMAL', invoiceFormatTab)}
              className="py-1.5 px-3 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title={`Copy settings from ${isThermal ? 'A4' : 'Thermal'}`}
            >
              <RefreshCw size={11} className="text-emerald-600" />
              <span>Copy from {isThermal ? 'A4' : 'Thermal'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={14} className="text-emerald-600" /> Header & Store Identity Visibility ({isThermal ? 'Thermal' : 'A4'})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(isThermal
                ? [
                    { key: 'showLogo', label: 'Show Company Logo', desc: 'Display store logo on receipt header' },
                    { key: 'showCompanyName', label: 'Show Business Name', desc: 'Display official registered store name' },
                    { key: 'showGstin', label: 'Show GSTIN / Licence', desc: 'Print 15-digit GSTIN / trade licence' },
                    { key: 'showAddress', label: 'Show Store Address', desc: 'Print physical building, road, city & PIN' },
                    { key: 'showContact', label: 'Show Contact Phone', desc: 'Print customer support phone number' }
                  ]
                : [
                    { key: 'showLogo', label: 'Show Company Logo', desc: 'Display store logo on invoice top' },
                    { key: 'showCompanyName', label: 'Show Business Name', desc: 'Display official registered store name' },
                    { key: 'showGstin', label: 'Show GSTIN / Licence', desc: 'Print 15-digit GSTIN / trade licence' },
                    { key: 'showAddress', label: 'Show Store Address', desc: 'Print physical building, road, city & PIN' },
                    { key: 'showContact', label: 'Show Phone & Email', desc: 'Print customer support phone and email' },
                    { key: 'showWebsite', label: 'Show Website URL', desc: 'Print online store / web portal link' }
                  ]
              ).map((item) => (
                <label
                  key={item.key}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    curFmt[item.key]
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(curFmt[item.key])}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { [item.key]: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Custom Business Name ({isThermal ? 'Thermal Receipt' : 'A4 Invoice'})
              </label>
              <input
                type="text"
                placeholder="Leave blank to use default registered company name"
                value={curFmt.customCompanyName}
                onChange={(e) => updateFormatData(invoiceFormatTab, { customCompanyName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 bg-white focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Overrides the business name printed at the top of your {isThermal ? 'thermal receipts' : 'A4 invoices'}.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} className="text-emerald-600" /> Invoice Numbering & Headings ({isThermal ? 'Thermal' : 'A4'})
            </h3>
            <div className={`grid grid-cols-1 ${isThermal ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Invoice Heading Title</label>
                <CustomSelect
                  value={curFmt.invoiceTitle}
                  onChange={(val) => updateFormatData(invoiceFormatTab, { invoiceTitle: val })}
                  options={[
                    { value: 'TAX INVOICE', label: 'TAX INVOICE (Standard GST)' },
                    { value: 'RETAIL INVOICE', label: 'RETAIL INVOICE' },
                    { value: 'BILL OF SUPPLY', label: 'BILL OF SUPPLY (Composition / Non-Tax)' },
                    { value: 'CASH MEMO', label: 'CASH MEMO' },
                    { value: 'ESTIMATE / QUOTATION', label: 'ESTIMATE / QUOTATION' },
                    { value: 'NAN', label: 'NAN (Do Not Show Heading)' }
                  ]}
                />
              </div>

              {!isThermal && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Invoice Number Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-"
                    value={curFmt.invoicePrefix}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { invoicePrefix: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-900 focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="flex items-center pt-3 sm:pt-5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={curFmt.showDueDate}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { showDueDate: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Show Due Date on Credit Bills</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <LayoutTemplate size={14} className="text-emerald-600" /> Item Table Columns & Breakdown ({isThermal ? 'Thermal' : 'A4'})
            </h3>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isThermal ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-3`}>
              {(isThermal
                ? [
                    { key: 'showItemName', label: 'Item Name', desc: 'Display product title on receipt' },
                    { key: 'showQty', label: 'Quantity (Qty)', desc: 'Display sold item count' },
                    { key: 'showRate', label: 'Price / Rate', desc: 'Display unit selling rate' },
                    { key: 'showMrpColumn', label: 'MRP Column', desc: 'Show Maximum Retail Price alongside sale rate' },
                    { key: 'showUnitColumn', label: 'Unit (PCS, KG)', desc: 'Display measurement unit on quantity' },
                    { key: 'showHsnColumn', label: 'HSN / SAC Subtext', desc: 'Print HSN classification under item title' },
                    { key: 'showBatchExpiry', label: 'Batch No & Expiry Date', desc: 'Print batch & expiry subtext for pharma / food' }
                  ]
                : [
                    { key: 'showSerialNo', label: 'Serial Number (#)', desc: 'Print row index number column' },
                    { key: 'showItemName', label: 'Item Name / Description', desc: 'Print full product title and description' },
                    { key: 'showHsnColumn', label: 'HSN / SAC Code Column', desc: 'Print tax classification code per item' },
                    { key: 'showQty', label: 'Quantity Column', desc: 'Display item bill count/quantity' },
                    { key: 'showUnitColumn', label: 'Unit Column (PCS, KG)', desc: 'Display measurement unit on quantity' },
                    { key: 'showMrpColumn', label: 'MRP Column', desc: 'Show Maximum Retail Price alongside sale rate' },
                    { key: 'showRate', label: 'Price / Rate Column', desc: 'Print unit selling rate before taxes' },
                    { key: 'showDiscountColumn', label: 'Discount Column', desc: 'Show item-wise discount deductions' },
                    { key: 'showTaxColumn', label: 'GST Tax % Column', desc: 'Display applicable GST slab rate per item' },
                    { key: 'showBatchExpiry', label: 'Batch No & Expiry Date', desc: 'Print batch details for pharma and food items' },
                    { key: 'showAmount', label: 'Total Amount Column', desc: 'Print final line total per item' }
                  ]
              ).map((item) => (
                <label
                  key={item.key}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                    curFmt[item.key]
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/50 shadow-2xs'
                      : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(curFmt[item.key])}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { [item.key]: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{item.label}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={14} className="text-emerald-600" /> {isThermal ? 'Instant UPI QR Code' : 'Bank Details & Instant UPI QR Code'}
              </h3>
            </div>

            <div className={`grid grid-cols-1 ${isThermal ? '' : 'sm:grid-cols-2'} gap-4`}>
              {!isThermal && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={curFmt.showBankDetails}
                      onChange={(e) => updateFormatData(invoiceFormatTab, { showBankDetails: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-900">Print Bank Account on Invoice</span>
                  </label>

                  {curFmt.showBankDetails && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. State Bank of India"
                          value={curFmt.bankName}
                          onChange={(e) => updateFormatData(invoiceFormatTab, { bankName: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Account Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 309812345678"
                          value={curFmt.bankAccountNo}
                          onChange={(e) => updateFormatData(invoiceFormatTab, { bankAccountNo: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none font-mono font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">IFSC Code</label>
                          <input
                            type="text"
                            placeholder="e.g. SBIN0001234"
                            value={curFmt.bankIfsc}
                            onChange={(e) => updateFormatData(invoiceFormatTab, { bankIfsc: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none font-mono font-bold uppercase"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Branch Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Main Branch"
                            value={curFmt.bankBranch}
                            onChange={(e) => updateFormatData(invoiceFormatTab, { bankBranch: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={curFmt.showUpiQr}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { showUpiQr: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-900">Print Dynamic UPI QR Code (Scan & Pay)</span>
                </label>

                {curFmt.showUpiQr && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">UPI ID / VPA</label>
                      <input
                        type="text"
                        placeholder="e.g. merchant@upi or 8926171789@paytm"
                        value={curFmt.upiId}
                        onChange={(e) => updateFormatData(invoiceFormatTab, { upiId: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none font-mono font-bold text-emerald-700"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Generates a dynamic QR code encoding the invoice amount and your UPI handle on every customer bill.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <PenTool size={14} className="text-emerald-600" /> Terms, Declaration & Signatory ({isThermal ? 'Thermal' : 'A4'})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={curFmt.showTerms}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { showTerms: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-900">Terms & Conditions</span>
                </label>
                <textarea
                  rows={3}
                  value={curFmt.termsAndConditions}
                  onChange={(e) => updateFormatData(invoiceFormatTab, { termsAndConditions: e.target.value })}
                  placeholder="Enter business terms and return policy..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white text-slate-800 leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={curFmt.showSignature}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { showSignature: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="text-xs font-bold text-slate-900">Authorized Signature Area</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Signatory"
                  value={curFmt.signatureText}
                  onChange={(e) => updateFormatData(invoiceFormatTab, { signatureText: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white font-bold text-slate-800"
                />
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Greeting / Footer Message</label>
                  <input
                    type="text"
                    value={curFmt.invoiceFooterNote}
                    onChange={(e) => updateFormatData(invoiceFormatTab, { invoiceFooterNote: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      );
    }

    if (tabId === 'TAX') {
      return (
        <div className="space-y-5 animate-fade-in">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900">Tax Rates & GST Configuration</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure default GST tax slab, active rate categories, and computation rules</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Default Tax Rate (For New Items & Fast Billing)</label>
              <select
                value={settings.defaultTaxRate}
                onChange={(e) => setSettings({ ...settings, defaultTaxRate: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold bg-white focus:border-emerald-500"
              >
                {settings.enabledTaxSlabs.map(r => {
                  const matched = standardSlabs.find(s => s.rate === r);
                  return (
                    <option key={r} value={r}>
                      GST {r}% {matched ? `— ${matched.label}` : ''}
                    </option>
                  );
                })}
              </select>
              <span className="text-[10px] text-slate-400 block mt-1">Pre-selected automatically on POS counters and Item creation</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Tax Calculation Mode</label>
              <select
                value={settings.taxCalculationMode}
                onChange={(e) => setSettings({ ...settings, taxCalculationMode: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white font-semibold"
              >
                <option value="EXCLUSIVE">Tax Exclusive (Prices + GST computed at checkout)</option>
                <option value="INCLUSIVE">Tax Inclusive (Prices entered already include GST / MRP)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-2">Active GST Slabs (Available in Dropdowns)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {standardSlabs.map(slab => {
                const isEnabled = settings.enabledTaxSlabs.includes(slab.rate);
                const isDefault = settings.defaultTaxRate === slab.rate;
                return (
                  <div
                    key={slab.rate}
                    onClick={() => toggleTaxSlab(slab.rate)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isEnabled
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{slab.label}</span>
                        {isDefault && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-600 text-white rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">{slab.desc}</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => { }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.isCompositionScheme}
                onChange={(e) => setSettings({ ...settings, isCompositionScheme: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded mt-0.5"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">GST Composition Dealer Scheme (1% Flat)</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Prints "Composition Taxable Person, not eligible to collect tax on supplies" on customer tax invoices.
                </p>
              </div>
            </label>
          </div>
        </div>
      );
    }

    if (tabId === 'GENERAL') {
      return (
        <div className="space-y-5 animate-fade-in">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900">Currency & Regional Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select your primary accounting currency and date format</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Store Currency</label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold bg-white focus:border-emerald-500"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-1">Default is INR (₹ Indian Rupee) with Indian numerical format</span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Date Display Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 22/08/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Decimal Precision</label>
              <select
                value={settings.decimalPlaces}
                onChange={(e) => setSettings({ ...settings, decimalPlaces: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white"
              >
                <option value="2">2 Decimal Places (e.g. ₹ 100.50)</option>
                <option value="0">Round to Nearest Integer (e.g. ₹ 101)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Financial Year Cycle</label>
              <select
                value={settings.financialYear}
                onChange={(e) => setSettings({ ...settings, financialYear: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white"
              >
                <option value="APR_MAR">April 1st to March 31st (India FY)</option>
                <option value="JAN_DEC">January 1st to December 31st (Calendar Year)</option>
              </select>
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'AI') {
      return (
        <div className="space-y-5 animate-fade-in">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-purple-600" />
                AI Catalog Auto-Writer
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Automate descriptions, HSN codes, and category classifications with Groq LLM</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Groq Cloud API Key</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="gsk_..."
                  value={settings.groqApiKey}
                  onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-mono focus:border-purple-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Get your free key from console.groq.com</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">AI Inference Model</label>
              <CustomSelect
                value={settings.groqModel || 'qwen/qwen3.6-27b'}
                onChange={(val) => setSettings({ ...settings, groqModel: val })}
                options={[
                  { value: 'qwen/qwen3.6-27b', label: 'Qwen 3.6 27B (Recommended)' },
                  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
                  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Ultra Fast)' }
                ]}
              />
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'HARDWARE') {
      return (
        <div className="space-y-4 animate-fade-in">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Printer size={16} className="text-emerald-600" />
              Hardware & Bluetooth Devices
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage wireless thermal printers and barcode scanner peripherals</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${btPrinter ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {btPrinter ? <BluetoothConnected size={16} /> : <Bluetooth size={16} />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">Bluetooth Receipt Printer</h3>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${btPrinter ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-600'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${btPrinter ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {btPrinter ? btPrinter.name : 'Disconnected'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    1-click raw ESC/POS printing for portable 58mm & 80mm rollers
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-100">
              {btPrinter ? (
                <>
                  <button
                    type="button"
                    onClick={handleTestBtPrint}
                    disabled={btLoading}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={13} />
                    <span>{btLoading ? 'Sending...' : 'Test Print'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectBt}
                    className="py-2 px-3 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 rounded-lg text-xs font-bold transition-colors cursor-pointer text-center"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectBt}
                  disabled={btLoading}
                  className="w-full sm:w-auto py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Bluetooth size={14} />
                  <span>{btLoading ? 'Scanning…' : 'Scan & Pair Printer'}</span>
                </button>
              )}
            </div>

            {btError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{btError}</span>
              </div>
            )}

            {!isBluetoothSupported() && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
                Web Bluetooth API is supported on Google Chrome, Microsoft Edge, and Chrome on Android.
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <QrCode size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Barcode & QR Scanner Peripherals</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Hardware USB/Wireless scanner test console
                </p>
              </div>
            </div>

            <form onSubmit={handleScannerTestSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Scan any barcode or press Enter..."
                value={scannerTest}
                onChange={(e) => setScannerTest(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                Log Scan
              </button>
            </form>

            {scannerHits.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                {scannerHits.map(hit => (
                  <div key={hit.id} className="flex items-center justify-between text-[11px] font-mono py-1 px-2 bg-slate-50 rounded">
                    <span className="font-bold text-slate-800">{hit.code}</span>
                    <span className="text-slate-400">{hit.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Default Printer Driver</label>
              <select
                value={settings.preferredPrinter}
                onChange={(e) => setSettings({ ...settings, preferredPrinter: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white font-semibold"
              >
                <option value="THERMAL_58">58mm Thermal Receipt (Standard POS)</option>
                <option value="THERMAL_80">80mm Thermal Receipt (Wide Roll)</option>
                <option value="LASER_A4">A4 / Letter Laser / Inkjet Invoice</option>
              </select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.autoPrintReceipt}
                  onChange={(e) => setSettings({ ...settings, autoPrintReceipt: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Auto-open print dialog on payment checkout</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.scannerAutoAdd}
                  onChange={(e) => setSettings({ ...settings, scannerAutoAdd: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Auto-increment quantity on rapid barcode scan</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'SECURITY') {
      return (
        <div className="space-y-6 animate-fade-in">
          <StaffManagement />

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Counter Security & Visibility Rules</h2>
              <p className="text-xs text-slate-400 mt-0.5">Control what counter staff and cashiers can view</p>
            </div>

            <div className="space-y-3 mt-4">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.hideCostFromCashier}
                  onChange={(e) => setSettings({ ...settings, hideCostFromCashier: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Hide Cost Price & Profit Margins from Cashiers</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Restricts purchase costs, supplier margins, and financial reports from non-admin counter staff.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleSwitchTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId) {
      setSearchParams({ tab: tabId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <SettingsIcon size={18} className="text-emerald-600" />
            System & Billing Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Customize invoice configurations, GST rates, currency, thermal receipt drivers, and permissions</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Save size={14} strokeWidth={2.5} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      <div className="lg:hidden space-y-2.5">
        {tabs.map(tab => {
          const isOpen = activeTab === tab.id;
          return (
            <div key={tab.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs transition-all">
              <button
                type="button"
                onClick={() => handleSwitchTab(isOpen ? null : tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-xs font-bold text-left transition-colors cursor-pointer ${isOpen ? 'bg-emerald-50/70 text-emerald-900' : 'text-slate-800 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                    <tab.icon size={15} />
                  </div>
                  <span className="font-extrabold text-xs">{tab.label}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="p-4 bg-white border-t border-slate-100 animate-fade-in">
                  {renderTabContent(tab.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 gap-5">

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-2 shadow-xs space-y-1 self-start sticky top-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSwitchTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <tab.icon size={15} className={activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          {renderTabContent(activeTab)}
        </div>

      </div>

      {savedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700/80 animate-fade-in transition-all max-w-[calc(100vw-2rem)] sm:max-w-md whitespace-nowrap sm:whitespace-normal">
          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight">Settings Saved Successfully</p>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">All invoice layouts and billing configurations have been updated.</p>
          </div>
        </div>
      )}

    </div>
  );
}
