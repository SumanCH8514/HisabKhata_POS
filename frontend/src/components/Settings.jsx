import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Globe, Receipt, Printer, Users,
  Save, Check, RefreshCw, Smartphone, Volume2, Lock,
  FileText, Sparkles, Building2, Bell, AlertCircle, Percent,
  Bluetooth, BluetoothConnected, BluetoothOff, QrCode, Zap,
  ChevronDown, LayoutTemplate, Landmark, CreditCard, PenTool,
  CheckCircle2, Sliders, Eye, Mail, ShieldAlert, ShieldCheck
} from 'lucide-react';
import {
  isBluetoothSupported, connectBluetoothPrinter, disconnectBluetoothPrinter,
  getConnectedPrinter, printTestReceipt
} from '../utils/bluetoothPrinter.js';
import { getUserSettings, saveUserSettings, isBusinessGstRegistered, getAIConfig, testAIModel } from '../api/client.js';

import StaffManagement from './StaffManagement.jsx';
import SmtpConfiguration from './SmtpConfiguration.jsx';
import { toast } from '../utils/toast.js';

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

function CurrencySelect({ value, onChange, currencies = [], className = '' }) {
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

  const selected = currencies.find(c => String(c.code) === String(value)) || currencies[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all flex items-center justify-between gap-2 text-left cursor-pointer ${
          open
            ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/30'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selected?.iso && (
            <img
              src={`https://flagcdn.com/w40/${selected.iso}.png`}
              alt={selected.code}
              className="w-5 h-3.5 object-cover rounded-xs shadow-2xs shrink-0 border border-slate-200/60"
            />
          )}
          <span className="truncate">{selected?.name} ({selected?.symbol})</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+5px)] left-0 right-0 z-[70] bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 flex flex-col p-1 animate-fade-in">
          <div className="overflow-y-auto max-h-56 scrollbar-thin p-0.5 space-y-0.5">
            {currencies.map((c) => {
              const isSelected = String(c.code) === String(value);
              return (
                <div
                  key={c.code}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={`https://flagcdn.com/w40/${c.iso}.png`}
                      alt={c.code}
                      className="w-5 h-3.5 object-cover rounded-xs shadow-2xs shrink-0 border border-slate-200/60"
                    />
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-slate-400 dark:text-slate-500 font-bold text-[11px]">{c.symbol}</span>
                    {isSelected && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TabHeader({ title, description, icon: Icon, actions, onSave, saving }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          {Icon && <Icon size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
          <span>{title}</span>
        </h2>
        {description && (
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
        {actions}
        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) return tabParam;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    return isMobile ? null : 'INVOICE_CONFIG';
  });
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
    } else {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (isMobile) {
        setActiveTab(null);
      }
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
    groqModel: localStorage.getItem('groq_model') || 'env_default'
  });

  const [serverAIConfig, setServerAIConfig] = useState({ hasServerApiKey: false, serverModel: 'llama-3.3-70b-versatile', models: [] });
  const [testingAI, setTestingAI] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [customModelInput, setCustomModelInput] = useState('');


  const [isGstRegistered, setIsGstRegistered] = useState(() => isBusinessGstRegistered());


  useEffect(() => {
    const onProfileUpdated = () => {
      setIsGstRegistered(isBusinessGstRegistered());
    };
    window.addEventListener('company_profile_updated', onProfileUpdated);
    window.addEventListener('storage', onProfileUpdated);
    return () => {
      window.removeEventListener('company_profile_updated', onProfileUpdated);
      window.removeEventListener('storage', onProfileUpdated);
    };
  }, []);

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
    getAIConfig()
      .then(cfg => {
        if (cfg) {
          setServerAIConfig(cfg);
        }
      })
      .catch(() => {});

    const saved = localStorage.getItem('hk_pos_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({
          ...prev,
          ...parsed,
          groqApiKey: parsed.groqApiKey !== undefined ? parsed.groqApiKey : (localStorage.getItem('groq_api_key') || ''),
          groqModel: parsed.groqModel || (localStorage.getItem('groq_model') || 'env_default')
        }));
        if (parsed.groqModel && !['env_default', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].includes(parsed.groqModel)) {
          setCustomModelInput(parsed.groqModel);
        }
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
          if (res.settings.groqModel) {
            localStorage.setItem('groq_model', res.settings.groqModel);
            if (!['env_default', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].includes(res.settings.groqModel)) {
              setCustomModelInput(res.settings.groqModel);
            }
          }
        }
      })

      .catch(() => {});
  }, []);

  const handleTestAI = async () => {
    setTestingAI(true);
    setTestResult(null);
    try {
      const activeModel = settings.groqModel === 'custom'
        ? (customModelInput.trim() || 'env_default')
        : settings.groqModel;

      const res = await testAIModel({
        apiKey: settings.groqApiKey?.trim() || '',
        aiModel: activeModel || 'env_default'
      });
      setTestResult(res);
      if (res?.success) {
        toast.success(`AI Model is operational (${res.latencyMs}ms)`);
      } else {
        toast.error(res?.error || 'AI test failed');
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message || 'Connection error to AI service'
      });
      toast.error('AI test failed');
    } finally {
      setTestingAI(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const finalModel = settings.groqModel === 'custom' ? (customModelInput.trim() || 'env_default') : settings.groqModel;
      const updatedSettings = { ...settings, groqModel: finalModel };
      if (!isGstRegistered) {
        updatedSettings.defaultTaxRate = '0';
        updatedSettings.enabledTaxSlabs = ['0'];
      }
      localStorage.setItem('hk_pos_settings', JSON.stringify(updatedSettings));
      localStorage.setItem('app_currency', updatedSettings.currency);
      localStorage.setItem('default_tax_rate', updatedSettings.defaultTaxRate);
      localStorage.setItem('hk_active_tax_rates', JSON.stringify(updatedSettings.enabledTaxSlabs));
      localStorage.setItem('hk_tax_calculation_mode', updatedSettings.taxCalculationMode || 'EXCLUSIVE');
      localStorage.setItem('groq_api_key', updatedSettings.groqApiKey || '');
      localStorage.setItem('groq_model', updatedSettings.groqModel || 'env_default');
      window.dispatchEvent(new Event('hk_settings_updated'));

      await saveUserSettings(updatedSettings);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
      toast.success('Settings saved successfully');
    } catch {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
      toast.success('Settings saved locally');
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
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', iso: 'in' },
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)', iso: 'us' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)', iso: 'eu' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', iso: 'gb' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)', iso: 'ae' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (BDT)', iso: 'bd' },
    { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee (NPR)', iso: 'np' }
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
    { id: 'SECURITY', label: 'Staff Management', icon: Users },
    { id: 'SMTP', label: 'SMTP Configurations', icon: Mail }
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
          <TabHeader
            title="Invoice Layout & Print Configurations"
            description="Configure distinct layouts, visibility, and columns separately for Thermal Roll and A4 Full Page"
            icon={Receipt}
            actions={
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Sliders size={12} /> Format Isolated
              </span>
            }
            onSave={handleSave}
            saving={saving}
          />

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
          <TabHeader
            title="Tax Rates & GST Slabs"
            description="Configure default GST tax slab, active rate categories, and computation rules"
            icon={Percent}
            onSave={handleSave}
            saving={saving}
          />

          {!isGstRegistered && (
            <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">Business Operating as Unregistered (Non-GST)</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                      Tax Disabled
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                    GST tax calculation is disabled across the whole system. All sales and purchases will automatically be issued as non-tax Bills of Supply with 0% tax.
                  </p>
                </div>
              </div>
              <Link
                to="/company-profile"
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs inline-flex items-center gap-1.5"
              >
                <span>Register GSTIN</span>
              </Link>
            </div>
          )}

          <div className={`space-y-5 ${!isGstRegistered ? 'opacity-60 pointer-events-none select-none' : ''}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Default Tax Rate (For New Items & Fast Billing)</label>
                <select
                  value={!isGstRegistered ? '0' : settings.defaultTaxRate}
                  onChange={(e) => setSettings({ ...settings, defaultTaxRate: e.target.value })}
                  disabled={!isGstRegistered}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold bg-white focus:border-emerald-500 disabled:bg-slate-100"
                >
                  {!isGstRegistered ? (
                    <option value="0">GST 0% — Non-GST / Exempt (Unregistered)</option>
                  ) : (
                    settings.enabledTaxSlabs.map(r => {
                      const matched = standardSlabs.find(s => s.rate === r);
                      return (
                        <option key={r} value={r}>
                          GST {r}% {matched ? `— ${matched.label}` : ''}
                        </option>
                      );
                    })
                  )}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {!isGstRegistered ? 'Locked to 0% because business is unregistered' : 'Pre-selected automatically on POS counters and Item creation'}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Tax Calculation Mode</label>
                <select
                  value={settings.taxCalculationMode}
                  onChange={(e) => setSettings({ ...settings, taxCalculationMode: e.target.value })}
                  disabled={!isGstRegistered}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none bg-white font-semibold disabled:bg-slate-100"
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
                  const isEnabled = !isGstRegistered ? slab.rate === '0' : settings.enabledTaxSlabs.includes(slab.rate);
                  const isDefault = !isGstRegistered ? slab.rate === '0' : settings.defaultTaxRate === slab.rate;
                  return (
                    <div
                      key={slab.rate}
                      onClick={() => isGstRegistered && toggleTaxSlab(slab.rate)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isGstRegistered ? 'cursor-pointer' : 'cursor-not-allowed'
                      } ${isEnabled
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
                        disabled={!isGstRegistered}
                        onChange={() => { }}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors ${
                isGstRegistered ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}>
                <input
                  type="checkbox"
                  checked={Boolean(isGstRegistered && settings.isCompositionScheme)}
                  disabled={!isGstRegistered}
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
        </div>
      );
    }

    if (tabId === 'GENERAL') {
      return (
        <div className="space-y-5 animate-fade-in">
          <TabHeader
            title="Currency & Localization"
            description="Select your primary accounting currency and date format preferences"
            icon={Globe}
            onSave={handleSave}
            saving={saving}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Store Currency</label>
              <CurrencySelect
                value={settings.currency}
                onChange={(code) => setSettings({ ...settings, currency: code })}
                currencies={currencies}
              />
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
      const isCustomModel = !['env_default', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'].includes(settings.groqModel);
      const effectiveDisplayModel = settings.groqModel === 'env_default'
        ? (serverAIConfig.serverModel || 'llama-3.3-70b-versatile')
        : (settings.groqModel === 'custom' ? (customModelInput || 'custom') : settings.groqModel);

      return (
        <div className="space-y-5 animate-fade-in">
          <TabHeader
            title="AI Catalog Auto-Writer"
            description="Automate descriptions, HSN codes, and category classifications with Groq LLM"
            icon={Sparkles}
            onSave={handleSave}
            saving={saving}
          />

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                  Groq Cloud API Key
                </label>
                {serverAIConfig.hasServerApiKey && !settings.groqApiKey && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/60">
                    <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
                    Cloudflare Active
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="password"
                  placeholder={serverAIConfig.hasServerApiKey ? 'Using Cloudflare secret (GROQ_API_KEY) — type to override' : 'gsk_...'}
                  value={settings.groqApiKey}
                  onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-mono focus:border-purple-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {serverAIConfig.hasServerApiKey && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50 mt-1.5 font-medium">
                  <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Configured in Cloudflare runtime variables (<code>GROQ_API_KEY</code>). Leave empty to use the server key, or enter a personal key here to override.</span>
                </div>
              )}

              {!serverAIConfig.hasServerApiKey && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Get your free API key from console.groq.com or set <code>GROQ_API_KEY</code> in Cloudflare dashboard runtime variables.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                  AI Inference Model
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Active: <code className="font-mono text-purple-600 dark:text-purple-400">{effectiveDisplayModel}</code>
                </span>
              </div>

              <CustomSelect
                value={isCustomModel ? 'custom' : (settings.groqModel || 'env_default')}
                onChange={(val) => {
                  if (val === 'custom') {
                    setSettings({ ...settings, groqModel: 'custom' });
                  } else {
                    setSettings({ ...settings, groqModel: val });
                  }
                }}
                options={[
                  {
                    value: 'env_default',
                    label: `Cloudflare Environment Default (${serverAIConfig.serverModel || 'llama-3.3-70b-versatile'})`
                  },
                  {
                    value: 'llama-3.3-70b-versatile',
                    label: 'Llama 3.3 70B Versatile (Flagship - Recommended)'
                  },
                  {
                    value: 'llama-3.1-8b-instant',
                    label: 'Llama 3.1 8B Instant (Ultra Fast)'
                  },
                  {
                    value: 'deepseek-r1-distill-llama-70b',
                    label: 'DeepSeek R1 Distill 70B (High Reasoning)'
                  },
                  {
                    value: 'qwen/qwen3.8-27b',
                    label: 'Qwen 3.8 27B (Catalog & Vision Specialist)'
                  },
                  {
                    value: 'openai/gpt-oss-120b',
                    label: 'OpenAI GPT-OSS 120B'
                  },
                  {
                    value: 'openai/gpt-oss-20b',
                    label: 'OpenAI GPT-OSS 20B (Fast)'
                  },
                  {
                    value: 'custom',
                    label: 'Custom Model ID (Specify manually)...'
                  }
                ]}
              />


              {(settings.groqModel === 'custom' || isCustomModel) && (
                <div className="mt-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Enter Groq Model ID (e.g. llama-3.2-11b-vision-preview)"
                    value={customModelInput}
                    onChange={(e) => {
                      setCustomModelInput(e.target.value);
                      setSettings({ ...settings, groqModel: e.target.value || 'custom' });
                    }}
                    className="w-full px-3 py-2 text-xs border border-purple-200 dark:border-purple-800 rounded-xl outline-none font-mono focus:border-purple-500 bg-purple-50/30 dark:bg-purple-950/20 text-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter any valid model ID supported by your Groq Cloud account.
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                Set <code>GROQ_MODEL</code>, <code>GROQ_AI_MODEL</code>, or <code>AI_MODEL</code> in Cloudflare environment variables to change the default model globally.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Test AI Model & Connectivity</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Send a test ping to benchmark latency and verify Groq credentials and model availability.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestAI}
                  disabled={testingAI}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0 active:scale-95"
                >
                  {testingAI ? (
                    <RefreshCw size={14} className="animate-spin text-white" />
                  ) : (
                    <Zap size={14} className="text-white fill-white" />
                  )}
                  <span>{testingAI ? 'Testing Model...' : 'Test AI Model'}</span>
                </button>
              </div>

              {testingAI && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 rounded-xl text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2.5 animate-pulse">
                  <RefreshCw size={15} className="animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Connecting to Groq API and testing <strong>{effectiveDisplayModel}</strong>...</span>
                </div>
              )}

              {testResult && !testingAI && (
                testResult.success ? (
                  <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-100 space-y-2 animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>AI Model Operational</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                        {testResult.latencyMs} ms
                      </span>
                    </div>

                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300 flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Model:</strong> <code className="font-mono text-[10px] bg-white/70 dark:bg-slate-900/70 px-1 py-0.5 rounded border border-emerald-200/50">{testResult.model}</code></span>
                      <span><strong>Key Source:</strong> {testResult.keySource}</span>
                      <span><strong>Model Source:</strong> {testResult.modelSource}</span>
                    </div>

                    {testResult.reply && (
                      <div className="text-[11px] bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/40 text-slate-700 dark:text-slate-200 font-medium">
                        <span className="text-slate-400 dark:text-slate-500 text-[10px] block mb-0.5 font-bold uppercase tracking-wider">Test Inference Output</span>
                        "{testResult.reply}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-900 dark:text-rose-100 space-y-1.5 animate-fade-in shadow-xs">
                    <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                      <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>AI Model Test Failed</span>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 font-mono bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-rose-100 dark:border-rose-800/40 break-words">
                      {testResult.error}
                    </p>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400">
                      Please verify your Groq API key and confirm that the selected model is enabled on Groq Cloud.
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    }


    if (tabId === 'HARDWARE') {
      return (
        <div className="space-y-4 animate-fade-in">
          <TabHeader
            title="POS Hardware & Printing"
            description="Manage wireless thermal printers, Bluetooth devices, and barcode scanner peripherals"
            icon={Printer}
            onSave={handleSave}
            saving={saving}
          />

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
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <TabHeader
            title="Staff Management"
            description="Manage team accounts, staff roles, and counter data security permissions"
            icon={Users}
            onSave={handleSave}
            saving={saving}
          />

          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  Counter Security & Visibility Rules
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Control what counter staff and cashiers can view</p>
              </div>
            </div>

            <div className="mt-3">
              <label className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={settings.hideCostFromCashier}
                  onChange={(e) => {
                    const next = { ...settings, hideCostFromCashier: e.target.checked };
                    setSettings(next);
                    localStorage.setItem('hk_pos_settings', JSON.stringify(next));
                    window.dispatchEvent(new Event('hk_settings_updated'));
                    saveUserSettings(next).catch(() => {});
                  }}
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Hide Cost Price & Profit Margins from Cashiers</span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Restricts purchase costs, supplier margins, and financial reports from non-admin counter staff.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <StaffManagement />
        </div>
      );
    }

    if (tabId === 'SMTP') {
      return <SmtpConfiguration />;
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

      <div className="lg:hidden space-y-2.5">
        {tabs.map(tab => {
          const isOpen = activeTab === tab.id;
          return (
            <div key={tab.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-all">
              <button
                type="button"
                onClick={() => handleSwitchTab(isOpen ? null : tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-xs font-bold text-left transition-colors cursor-pointer ${isOpen ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isOpen ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                    <tab.icon size={15} />
                  </div>
                  <span className="font-extrabold text-xs">{tab.label}</span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="p-3 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                  {renderTabContent(tab.id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden lg:grid lg:grid-cols-12 gap-5">

        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-xs space-y-1 self-start sticky top-4">
          {tabs.map(tab => {
            const isSelected = (activeTab || 'INVOICE_CONFIG') === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSwitchTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
              >
                <tab.icon size={15} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
          {renderTabContent(activeTab || 'INVOICE_CONFIG')}
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
