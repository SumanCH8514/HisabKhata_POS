import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Plus, Search, Filter, Printer, Download,
  CheckCircle2, Clock, AlertCircle, ChevronDown, Trash2,
  Calendar, User, ArrowRight, Eye, RefreshCw, X, Check,
  CreditCard, Banknote, Building2, Phone, FileText,
  DollarSign, Percent, ArrowDownToLine, Receipt, Layers,
  ScanLine, HelpCircle, Package, ArrowUpRight, Minus,
  Tag, Box, Sparkles, Wand2, TrendingUp, ShieldAlert, Hash, Camera
} from 'lucide-react';
import { 
  getInvoices, 
  getInvoice, 
  createInvoice, 
  getParties, 
  createParty, 
  getItems, 
  createItem, 
  getUnits, 
  getCategories, 
  syncUserSettingsFromCloud,
  fmtCurrency 
} from '../api/client.js';

function CustomSelect({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select Option', 
  className = '', 
  searchable = false, 
  disabled = false,
  onAddNew = null,
  addNewLabel = '+ Add New',
  align = 'left'
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUp, setOpenUp] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 200) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => String(o.label || '').toLowerCase().includes(q));
  }, [options, search, searchable]);

  const selectedOption = options.find(o => 
    String(o.value).toLowerCase() === String(value).toLowerCase() ||
    String(o.label).toLowerCase() === String(value).toLowerCase()
  );
  const displayText = selectedOption ? selectedOption.label : (value || placeholder);

  return (
    <div className={`relative ${open ? 'z-[150]' : 'z-10'} ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(prev => !prev);
          setSearch('');
        }}
        className={`w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border rounded-xl shadow-xs transition-all flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {open && (
        <div className={`absolute ${openUp ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'} ${align === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'} z-[9999] ${searchable ? 'w-64 max-w-[calc(100vw-3rem)]' : 'min-w-full w-max max-w-[240px]'} bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 flex flex-col p-1 animate-fade-in`}>
          {searchable && (
            <div className="p-1.5 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>
            </div>
          )}

          {onAddNew && (
            <div className="p-1 border-b border-slate-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  const currentSearch = search;
                  setOpen(false);
                  setSearch('');
                  onAddNew(currentSearch);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={13} strokeWidth={3} />
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}

          <div className="overflow-y-auto max-h-52 scrollbar-thin p-0.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.key || opt.value || idx}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={13} className="text-blue-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-slate-400 font-medium">No matching items found</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentSearch = search;
                      setOpen(false);
                      setSearch('');
                      onAddNew(currentSearch);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>Create "{search || 'New Item'}"</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BarcodeScannerDialog({ onClose, onDetected }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported on this device/browser');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new window.BarcodeDetector({
              formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'data_matrix']
            });
            intervalRef.current = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2 && active) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const raw = barcodes[0].rawValue;
                    if (raw && active) {
                      active = false;
                      onDetected(raw);
                    }
                  }
                } catch {}
              }
            }, 250);
          } catch {}
        }
      } catch (err) {
        if (active) setError(err.message || 'Unable to access camera');
      }
    }

    startCamera();

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onDetected]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onDetected(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="max-w-md w-full bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <ScanLine size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">Scan Product Barcode / SKU</h3>
              <p className="text-[10px] text-slate-400 font-medium">Position barcode inside camera frame</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3">
          <div className="relative w-full aspect-16/10 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-emerald-500/70 m-4 rounded-xl pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
            {error && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center">
                <Camera size={26} className="text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-white mb-0.5">Camera Not Accessible</p>
                <p className="text-[10px] text-slate-300 max-w-[220px] mb-2">{error}</p>
                <p className="text-[9px] text-emerald-400 font-semibold">Type barcode code manually below</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white"
              placeholder="Or type barcode here..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
            >
              Use Code
            </button>
          </form>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] text-slate-500 shrink-0">
          <span>USB/Wireless handheld scanners work directly</span>
          <button onClick={onClose} className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Purchase() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedBillDetail, setSelectedBillDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({ name: '', phone: '', address: '', gstin: '' });
  const [savingVendor, setSavingVendor] = useState(false);
  const [vendorError, setVendorError] = useState('');

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [activeItemRowIdx, setActiveItemRowIdx] = useState(null);
  const defaultTaxRate = useMemo(() => Number(localStorage.getItem('default_tax_rate')) || 18, []);
  const [taxMode, setTaxMode] = useState(() => localStorage.getItem('hk_purchase_tax_mode') || 'INCLUSIVE');
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    unit: 'Pcs',
    purchase_price: '',
    sale_price: '',
    tax_rate: Number(localStorage.getItem('default_tax_rate')) || 18,
    barcode: '',
    category_name: '',
    hsn_code: '',
    min_stock_alert: 5
  });
  const [savingItem, setSavingItem] = useState(false);
  const [itemModalError, setItemModalError] = useState('');

  const [form, setForm] = useState({
    type: 'PURCHASE',
    invoice_number: `PUR-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    party_id: '',
    payment_status: 'PAID',
    payment_mode: 'CASH',
    amount_paid: 0,
    discount_amount: 0,
    notes: '',
    supplier_invoice_ref: '',
    items: [{ item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: Number(localStorage.getItem('default_tax_rate')) || 18 }]
  });

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getInvoices({ type: 'PURCHASE' }),
      getParties({ type: 'VENDOR' }),
      getItems(),
      getUnits().catch(() => []),
      getCategories().catch(() => []),
      syncUserSettingsFromCloud().catch(() => null)
    ])
      .then(([billList, partyList, itemList, unitList, categoryList, cfg]) => {
        setBills(billList || []);
        setParties(partyList || []);
        setItems(itemList || []);
        setUnits(unitList || []);
        setCategories(categoryList || []);
        if (cfg?.taxCalculationMode && !localStorage.getItem('hk_purchase_tax_mode')) {
          setTaxMode(cfg.taxCalculationMode);
        } else if (!localStorage.getItem('hk_purchase_tax_mode')) {
          setTaxMode('INCLUSIVE');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewPurchaseModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const preferredMode = localStorage.getItem('hk_purchase_tax_mode') || 'INCLUSIVE';
    setTaxMode(preferredMode);
    setForm({
      type: 'PURCHASE',
      invoice_number: `PUR-${Date.now().toString().slice(-6)}`,
      date: today,
      due_date: dueDate,
      party_id: '',
      payment_status: 'PAID',
      payment_mode: 'CASH',
      amount_paid: 0,
      discount_amount: 0,
      notes: '',
      supplier_invoice_ref: '',
      items: [{ item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: defaultTaxRate }]
    });
    setShowModal(true);
  };

  const handleAddItemRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { item_id: '', item_name: '', unit: 'Pcs', quantity: 1, rate: 0, discount: 0, tax_rate: defaultTaxRate }]
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
            rate: selected.purchase_price || 0,
            tax_rate: selected.tax_rate !== undefined ? selected.tax_rate : 18
          };
        }
      } else {
        updated[idx][field] = val;
      }
      return { ...prev, items: updated };
    });
  };

  const openQuickAddItemModal = (rowIdx, initialName = '') => {
    setActiveItemRowIdx(rowIdx);
    const existingName = initialName || (rowIdx !== null ? form.items[rowIdx]?.item_name || '' : '');
    const existingRate = rowIdx !== null && form.items[rowIdx]?.rate > 0 ? form.items[rowIdx]?.rate : '';
    const existingTax = rowIdx !== null ? form.items[rowIdx]?.tax_rate || defaultTaxRate : defaultTaxRate;
    const existingUnit = rowIdx !== null ? form.items[rowIdx]?.unit || 'Pcs' : 'Pcs';

    setNewItemForm({
      name: existingName,
      unit: existingUnit,
      purchase_price: existingRate ? String(existingRate) : '',
      sale_price: existingRate ? String(Math.round(Number(existingRate) * 1.2)) : '',
      tax_rate: existingTax,
      barcode: `890${Date.now().toString().slice(-9)}`,
      category_name: '',
      hsn_code: '',
      min_stock_alert: 5
    });
    setItemModalError('');
    setShowAddItemModal(true);
  };

  const handleQuickCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemForm.name.trim()) {
      setItemModalError('Product name is required');
      return;
    }
    setSavingItem(true);
    setItemModalError('');
    try {
      const costNum = Number(newItemForm.purchase_price) || 0;
      const saleNum = Number(newItemForm.sale_price) || costNum;

      const res = await createItem({
        name: newItemForm.name.trim(),
        unit: newItemForm.unit || 'Pcs',
        purchase_price: costNum,
        sale_price: saleNum,
        tax_rate: Number(newItemForm.tax_rate) || 0,
        barcode: newItemForm.barcode?.trim() || null,
        category_name: newItemForm.category_name?.trim() || null,
        hsn_code: newItemForm.hsn_code?.trim() || null,
        min_stock_alert: Number(newItemForm.min_stock_alert) || 5,
        current_stock: 0
      });

      const createdItem = {
        id: res.id,
        name: newItemForm.name.trim(),
        unit: newItemForm.unit || 'Pcs',
        purchase_price: costNum,
        sale_price: saleNum,
        tax_rate: Number(newItemForm.tax_rate) || 0,
        current_stock: 0
      };

      setItems(prev => [createdItem, ...prev]);

      if (activeItemRowIdx !== null) {
        setForm(prev => {
          const updated = [...prev.items];
          updated[activeItemRowIdx] = {
            ...updated[activeItemRowIdx],
            item_id: createdItem.id,
            item_name: createdItem.name,
            unit: createdItem.unit,
            rate: createdItem.purchase_price,
            tax_rate: createdItem.tax_rate
          };
          return { ...prev, items: updated };
        });
      }

      setShowAddItemModal(false);
    } catch (err) {
      setItemModalError(err.message || 'Failed to register new product');
    } finally {
      setSavingItem(false);
    }
  };

  const applyMarkupPreset = (pct) => {
    const cost = Number(newItemForm.purchase_price) || 0;
    if (cost > 0) {
      const calculated = Math.round(cost * (1 + pct / 100));
      setNewItemForm(prev => ({ ...prev, sale_price: String(calculated) }));
    }
  };

  const unitOptions = useMemo(() => {
    if (units && units.length > 0) {
      return units.map(u => {
        const short = (u.short_name || u.name).trim();
        return {
          value: short,
          label: short.toLowerCase() === 'kilogram' ? 'Kg' : short
        };
      });
    }
    return [
      { value: 'Pcs', label: 'Pcs' },
      { value: 'Box', label: 'Box' },
      { value: 'Kg', label: 'Kg' },
      { value: 'Gm', label: 'Gm' },
      { value: 'Ltr', label: 'Ltr' },
      { value: 'Mtr', label: 'Mtr' },
      { value: 'Set', label: 'Set' },
      { value: 'Roll', label: 'Roll' }
    ];
  }, [units]);

  const gstOptions = useMemo(() => {
    let raw = null;
    try {
      raw = JSON.parse(localStorage.getItem('hk_active_tax_rates'));
    } catch {}
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(r => ({ value: Number(r), label: `${r}%` }));
    }
    return [
      { value: 0, label: '0%' },
      { value: 3, label: '3%' },
      { value: 5, label: '5%' },
      { value: 12, label: '12%' },
      { value: 18, label: '18%' },
      { value: 28, label: '28%' }
    ];
  }, []);

  const categoryOptions = useMemo(() => {
    const list = categories.map(c => ({ value: c.name, label: c.name }));
    const existing = new Set(list.map(l => l.value.toLowerCase()));
    items.forEach(it => {
      if (it.category_name && !existing.has(it.category_name.toLowerCase())) {
        existing.add(it.category_name.toLowerCase());
        list.push({ value: it.category_name, label: it.category_name });
      }
    });
    return list;
  }, [categories, items]);

  const itemTotals = useMemo(() => {
    return form.items.map(it => {
      const qty = Number(it.quantity) || 0;
      const rate = Number(it.rate) || 0;
      const disc = Number(it.discount) || 0;
      const taxRate = Number(it.tax_rate) || 0;

      if (taxMode === 'INCLUSIVE') {
        const gross = Math.max(0, (qty * rate) - disc);
        const base = taxRate > 0 ? (gross / (1 + (taxRate / 100))) : gross;
        const taxAmt = gross - base;
        const rowTotal = gross;
        return { base, taxAmt, rowTotal, qty };
      } else {
        const base = Math.max(0, (qty * rate) - disc);
        const taxAmt = base * (taxRate / 100);
        const rowTotal = base + taxAmt;
        return { base, taxAmt, rowTotal, qty };
      }
    });
  }, [form.items, taxMode]);

  const totalQty = useMemo(() => itemTotals.reduce((sum, r) => sum + r.qty, 0), [itemTotals]);
  const subtotal = useMemo(() => itemTotals.reduce((sum, r) => sum + r.base, 0), [itemTotals]);
  const taxTotal = useMemo(() => itemTotals.reduce((sum, r) => sum + r.taxAmt, 0), [itemTotals]);
  const billDiscount = Number(form.discount_amount) || 0;
  const rawGrandTotal = Math.max(0, subtotal + taxTotal - billDiscount);
  const grandTotal = Math.round(rawGrandTotal * 100) / 100;
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  const paidAmount = useMemo(() => {
    if (form.payment_status === 'PAID') return grandTotal;
    if (form.payment_status === 'UNPAID') return 0;
    return Math.min(grandTotal, Math.max(0, Number(form.amount_paid) || 0));
  }, [form.payment_status, form.amount_paid, grandTotal]);

  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const profitInfo = useMemo(() => {
    const cost = Number(newItemForm.purchase_price) || 0;
    const sale = Number(newItemForm.sale_price) || 0;
    if (cost > 0 && sale > 0) {
      const diff = sale - cost;
      const pct = ((diff / cost) * 100).toFixed(1);
      return { diff, pct, isProfit: diff >= 0 };
    }
    return null;
  }, [newItemForm.purchase_price, newItemForm.sale_price]);

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!newVendorForm.name.trim()) {
      setVendorError('Vendor name is required');
      return;
    }
    setSavingVendor(true);
    setVendorError('');
    try {
      const res = await createParty({
        ...newVendorForm,
        type: 'VENDOR'
      });
      const newParty = { id: res.id, ...newVendorForm, type: 'VENDOR' };
      setParties(prev => [newParty, ...prev]);
      setForm(prev => ({ ...prev, party_id: res.id }));
      setShowAddVendorModal(false);
      setNewVendorForm({ name: '', phone: '', address: '', gstin: '' });
    } catch (err) {
      setVendorError(err.message || 'Failed to create vendor');
    } finally {
      setSavingVendor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.items.some(it => !it.item_name?.trim())) {
      alert('Please provide a name for all inward stock items');
      return;
    }
    if (form.items.some(it => (Number(it.quantity) || 0) <= 0)) {
      alert('Quantity for all items must be greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      await createInvoice({
        type: 'PURCHASE',
        invoice_number: form.invoice_number.trim(),
        date: form.date,
        due_date: form.due_date,
        party_id: form.party_id ? Number(form.party_id) : null,
        payment_mode: form.payment_mode,
        subtotal,
        tax_amount: taxTotal,
        discount_amount: billDiscount,
        total_amount: grandTotal,
        amount_paid: paidAmount,
        notes: [
          form.supplier_invoice_ref ? `Supplier Ref: ${form.supplier_invoice_ref}` : '',
          form.notes
        ].filter(Boolean).join(' | '),
        items: form.items.map((it, idx) => ({
          item_id: it.item_id ? Number(it.item_id) : null,
          item_name: it.item_name.trim(),
          unit: it.unit || 'Pcs',
          quantity: Number(it.quantity) || 1,
          rate: Number(it.rate) || 0,
          discount: Number(it.discount) || 0,
          tax_rate: Number(it.tax_rate) || 0,
          tax_amount: itemTotals[idx]?.taxAmt || 0,
          total: itemTotals[idx]?.rowTotal || 0
        }))
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Error recording purchase bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBillDetail = async (bill) => {
    setSelectedBillDetail(bill);
    setLoadingDetail(true);
    try {
      const full = await getInvoice(bill.id);
      setSelectedBillDetail(full || bill);
    } catch {
      setSelectedBillDetail(bill);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredBills = bills.filter(b => {
    if (activeTab === 'PAID' && (b.balance_due || 0) > 0) return false;
    if (activeTab === 'DUE' && (b.balance_due || 0) <= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      return (b.invoice_number || '').toLowerCase().includes(q) || (b.party_name || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalPurchasesSum = useMemo(() => bills.reduce((s, b) => s + (b.total_amount || 0), 0), [bills]);
  const totalPayableSum = useMemo(() => bills.reduce((s, b) => s + (b.balance_due || 0), 0), [bills]);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:px-5 sm:py-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag size={18} className="text-blue-600 shrink-0" />
              <span className="truncate">Purchases & Supplier Bills</span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate hidden sm:block">Record stock inwards, vendor bills, and supplier ledger entries</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openNewPurchaseModal}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="whitespace-nowrap">Record Purchase</span>
            </button>
            
            <button
              onClick={loadData}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Refresh Purchases"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchase Volume</p>
            <p className="text-lg font-black text-slate-900 number-cell mt-0.5">{fmtCurrency(totalPurchasesSum)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{bills.length} Inward Vouchers</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Supplier Payables (Dues)</p>
            <p className="text-lg font-black text-rose-600 number-cell mt-0.5">{fmtCurrency(totalPayableSum)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Pending settlement to vendors</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Settled / Paid Bills</p>
            <p className="text-lg font-black text-emerald-700 number-cell mt-0.5">
              {fmtCurrency(Math.max(0, totalPurchasesSum - totalPayableSum))}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{bills.filter(b => (b.balance_due || 0) <= 0).length} Fully Settled</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 shadow-xs">
        <div className="inline-flex rounded-xl border border-slate-200/80 p-0.5 bg-slate-100/90 text-xs font-bold text-slate-600 shadow-inner overflow-x-auto no-scrollbar shrink-0">
          {['ALL', 'PAID', 'DUE'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 sm:py-1.5 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? 'All Purchases' : t === 'PAID' ? 'Fully Paid' : 'Pending Payable'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bill # or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 transition-all font-medium shadow-2xs"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading purchase records…</span>
          </div>
        ) : filteredBills.length > 0 ? (
          <>
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filteredBills.map(b => {
                const isPaid = (b.balance_due || 0) <= 0;
                return (
                  <div
                    key={b.id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-xs">{b.invoice_number}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPaid ? 'PAID' : `DUE: ${fmtCurrency(b.balance_due)}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{b.date}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{b.party_name || 'Direct Supplier'}</p>
                        <p className="text-[10px] text-slate-400">GST: {fmtCurrency(b.tax_amount || 0)}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 font-mono block">
                            {fmtCurrency(b.total_amount || 0)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleViewBillDetail(b)}
                          className="px-2 py-1 text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-2xs cursor-pointer"
                        >
                          View
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
                    <th className="py-3 px-4">Bill #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier / Vendor</th>
                    <th className="py-3 px-4 text-right">Tax (GST)</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map(b => {
                    const isPaid = (b.balance_due || 0) <= 0;
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <button
                            onClick={() => handleViewBillDetail(b)}
                            className="hover:text-blue-600 hover:underline font-mono cursor-pointer"
                          >
                            {b.invoice_number}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{b.date}</td>
                        <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{b.party_name || 'Direct Supplier'}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 number-cell whitespace-nowrap">{fmtCurrency(b.tax_amount || 0)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900 number-cell whitespace-nowrap">{fmtCurrency(b.total_amount || 0)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 number-cell whitespace-nowrap">{fmtCurrency(b.amount_paid || 0)}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isPaid ? 'PAID' : `DUE: ${fmtCurrency(b.balance_due)}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleViewBillDetail(b)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                          >
                            View Bill
                          </button>
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
            <ShoppingBag size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No purchase records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click "Record Purchase" to record your vendor invoices.</p>
          </div>
        )}
      </div>

      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="w-full max-w-5xl xl:max-w-6xl max-h-[96vh] sm:max-h-[90vh] h-full sm:h-auto flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-fade-in overflow-hidden">
            
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                  <ShoppingBag size={18} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">Record Inward Purchase Bill</h2>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Stock items will be credited to inventory and supplier khata updated.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
              
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Vendor / Supplier <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setShowAddVendorModal(true)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={10} strokeWidth={3} /> Add New
                    </button>
                  </div>
                  <CustomSelect
                    value={form.party_id}
                    onChange={(val) => setForm({ ...form, party_id: val })}
                    options={parties.map(p => ({
                      value: p.id,
                      label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`
                    }))}
                    placeholder="Select Supplier"
                    searchable={true}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Supplier Bill / Inv #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-84920"
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-bold text-slate-800 bg-white focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Bill Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-800 bg-white focus:border-blue-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-800 bg-white focus:border-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <Package size={14} className="text-blue-600" />
                    <span className="text-xs font-extrabold text-slate-900">Inward Stock Line Items</span>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                      {form.items.length} {form.items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setTaxMode('EXCLUSIVE');
                          localStorage.setItem('hk_purchase_tax_mode', 'EXCLUSIVE');
                          localStorage.setItem('hk_tax_calculation_mode', 'EXCLUSIVE');
                        }}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          taxMode === 'EXCLUSIVE'
                            ? 'bg-white text-blue-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        + GST (Exclusive)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaxMode('INCLUSIVE');
                          localStorage.setItem('hk_purchase_tax_mode', 'INCLUSIVE');
                          localStorage.setItem('hk_tax_calculation_mode', 'INCLUSIVE');
                        }}
                        className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                          taxMode === 'INCLUSIVE'
                            ? 'bg-white text-emerald-700 shadow-2xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Incl. GST (MRP)
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openQuickAddItemModal(form.items.length - 1)}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Quick register a new product to your inventory catalog"
                    >
                      <Sparkles size={13} className="text-emerald-600" />
                      <span>+ Register Item</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus size={13} strokeWidth={3} /> Add Row
                    </button>
                  </div>
                </div>

                <div className="hidden md:block overflow-visible">
                  <table className="w-full text-left text-xs min-w-[780px]">
                    <thead>
                      <tr className="bg-slate-100/60 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">
                        <th className="py-2.5 px-3 w-8 text-center whitespace-nowrap">#</th>
                        <th className="py-2.5 px-3 min-w-[240px] whitespace-nowrap">Catalog Product / Description</th>
                        <th className="py-2.5 px-3 w-24 whitespace-nowrap">Unit</th>
                        <th className="py-2.5 px-3 w-20 text-center whitespace-nowrap">Qty</th>
                        <th className="py-2.5 px-3 w-32 text-right whitespace-nowrap">
                          {taxMode === 'INCLUSIVE' ? 'Cost (Incl. GST)' : 'Unit Cost (₹)'}
                        </th>
                        <th className="py-2.5 px-3 w-20 text-right whitespace-nowrap">Disc (₹)</th>
                        <th className="py-2.5 px-3 w-24 whitespace-nowrap">GST Slab</th>
                        <th className="py-2.5 px-3 w-28 text-right whitespace-nowrap">Net Amount</th>
                        <th className="py-2.5 px-2 w-8 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {form.items.map((row, idx) => {
                        const rTotal = itemTotals[idx]?.rowTotal || 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px] align-top pt-3.5">
                              {idx + 1}
                            </td>

                            <td className="py-2 px-3 space-y-1">
                              <CustomSelect
                                value={row.item_id}
                                onChange={(val) => handleItemChange(idx, 'item_id', val)}
                                options={items.map(it => ({
                                  value: it.id,
                                  label: `${it.name} (Stock: ${it.current_stock || 0}, Cost: ₹${it.purchase_price || 0})`
                                }))}
                                placeholder="Choose catalog item or type below..."
                                searchable={true}
                                onAddNew={(searchQuery) => openQuickAddItemModal(idx, searchQuery)}
                                addNewLabel="+ Add New Product to Catalog"
                              />
                              <input
                                type="text"
                                placeholder="Item name / description"
                                required
                                value={row.item_name}
                                onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white font-medium focus:border-blue-500"
                              />
                            </td>

                            <td className="py-2 px-3 align-top pt-2">
                              <CustomSelect
                                value={row.unit}
                                onChange={(val) => handleItemChange(idx, 'unit', val)}
                                options={unitOptions}
                                placeholder="Unit"
                              />
                            </td>

                            <td className="py-2 px-3 align-top pt-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={row.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white text-center font-mono font-bold outline-none focus:border-blue-500"
                              />
                            </td>

                            <td className="py-2 px-3 align-top pt-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.rate}
                                onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                                className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white text-right font-mono font-bold outline-none focus:border-blue-500"
                              />
                            </td>

                            <td className="py-2 px-3 align-top pt-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.discount}
                                onChange={(e) => handleItemChange(idx, 'discount', Number(e.target.value))}
                                className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white text-right font-mono outline-none focus:border-blue-500"
                              />
                            </td>

                            <td className="py-2 px-3 align-top pt-2">
                              <CustomSelect
                                value={row.tax_rate}
                                onChange={(val) => handleItemChange(idx, 'tax_rate', Number(val))}
                                options={gstOptions}
                              />
                            </td>

                            <td className="py-2 px-3 text-right align-top pt-3.5 font-mono font-extrabold text-slate-900 number-cell">
                              {fmtCurrency(rTotal)}
                            </td>

                            <td className="py-2 px-2 text-center align-top pt-3">
                              <button
                                type="button"
                                disabled={form.items.length === 1}
                                onClick={() => handleRemoveItemRow(idx)}
                                className="p-1 text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

                <div className="block md:hidden divide-y divide-slate-100 p-2 space-y-3">
                  {form.items.map((row, idx) => {
                    const rTotal = itemTotals[idx]?.rowTotal || 0;
                    return (
                      <div key={idx} className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">Item #{idx + 1}</span>
                          <button
                            type="button"
                            disabled={form.items.length === 1}
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-xs text-rose-600 font-bold p-1 hover:bg-rose-50 rounded flex items-center gap-1 disabled:opacity-30"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-600 block">Catalog Item</label>
                            <button
                              type="button"
                              onClick={() => openQuickAddItemModal(idx, row.item_name)}
                              className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Plus size={10} /> Add New
                            </button>
                          </div>
                          <CustomSelect
                            value={row.item_id}
                            onChange={(val) => handleItemChange(idx, 'item_id', val)}
                            options={items.map(it => ({
                              value: it.id,
                              label: `${it.name} (Stock: ${it.current_stock || 0}, Cost: ₹${it.purchase_price || 0})`
                            }))}
                            placeholder="Select product..."
                            searchable={true}
                            onAddNew={(searchQuery) => openQuickAddItemModal(idx, searchQuery)}
                            addNewLabel="+ Add New Product to Catalog"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Custom Item Name</label>
                          <input
                            type="text"
                            placeholder="Item name"
                            required
                            value={row.item_name}
                            onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white font-medium focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Unit</label>
                            <CustomSelect
                              value={row.unit}
                              onChange={(val) => handleItemChange(idx, 'unit', val)}
                              options={unitOptions}
                              placeholder="Unit"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Quantity</label>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-center font-mono font-bold outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Cost Rate</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', Number(e.target.value))}
                              className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white text-right font-mono font-bold outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">Disc (₹)</label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.discount}
                              onChange={(e) => handleItemChange(idx, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-2 text-xs border border-slate-200 rounded-xl bg-white text-right font-mono outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-1">GST Slab</label>
                            <CustomSelect
                              value={row.tax_rate}
                              onChange={(val) => handleItemChange(idx, 'tax_rate', Number(val))}
                              options={gstOptions}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                          <span className="text-slate-500 font-medium">Row Net Total:</span>
                          <span className="font-mono font-black text-slate-900">{fmtCurrency(rTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4">
                
                <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-200 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-blue-600" />
                    Payment & Settlement Status
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Payment Status</label>
                      <CustomSelect
                        value={form.payment_status}
                        onChange={(val) => setForm({ ...form, payment_status: val })}
                        options={[
                          { value: 'PAID', label: 'Fully Paid (Cash / Bank)' },
                          { value: 'PARTIAL', label: 'Partial Payment (Split / Advance)' },
                          { value: 'UNPAID', label: 'Unpaid / Credit (Add to Khata)' }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Payment Method</label>
                      <CustomSelect
                        value={form.payment_mode}
                        onChange={(val) => setForm({ ...form, payment_mode: val })}
                        options={[
                          { value: 'CASH', label: 'Cash In Hand' },
                          { value: 'UPI', label: 'UPI / QR Code' },
                          { value: 'BANK', label: 'Bank Transfer / NEFT' },
                          { value: 'CHEQUE', label: 'Cheque' }
                        ]}
                        disabled={form.payment_status === 'UNPAID'}
                      />
                    </div>
                  </div>

                  {form.payment_status === 'PARTIAL' && (
                    <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1 animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">Amount Paid Now (₹):</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={grandTotal}
                          value={form.amount_paid}
                          onChange={(e) => setForm({ ...form, amount_paid: Number(e.target.value) })}
                          className="w-36 px-2.5 py-1 text-right text-xs font-mono font-extrabold bg-white border border-blue-300 rounded-lg outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200 text-blue-900 font-medium">
                        <span>Remaining Supplier Balance Due:</span>
                        <span className="font-bold font-mono">{fmtCurrency(dueAmount)}</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Supplier Ref / E-Way No.</label>
                      <input
                        type="text"
                        placeholder="e.g. Challan # / LR No."
                        value={form.supplier_invoice_ref}
                        onChange={(e) => setForm({ ...form, supplier_invoice_ref: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white font-medium focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Bill Notes / Remarks</label>
                      <input
                        type="text"
                        placeholder="Transport details, warehouse, etc."
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-white font-medium focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>Purchase Summary</span>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">{totalQty} Total Units</span>
                    </h3>

                    <div className="space-y-1.5 text-xs pt-2">
                      <div className="flex justify-between text-slate-600">
                        <span>Taxable Item Subtotal:</span>
                        <span className="font-bold font-mono text-slate-900">{fmtCurrency(subtotal)}</span>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Total GST (Tax):</span>
                        <span className="font-bold font-mono text-slate-900">{fmtCurrency(taxTotal)}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span>Bill Discount (₹):</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={form.discount_amount}
                          onChange={(e) => setForm({ ...form, discount_amount: Number(e.target.value) })}
                          className="w-24 px-2 py-0.5 text-xs text-right font-mono font-bold border border-slate-200 rounded-md outline-none bg-slate-50 focus:bg-white focus:border-blue-500"
                        />
                      </div>

                      {roundOff !== 0 && (
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Round-off:</span>
                          <span className="font-mono">{roundOff > 0 ? `+${roundOff}` : roundOff}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-black text-slate-900">Grand Total:</span>
                      <span className="text-xl font-black text-blue-600 number-cell font-mono">{fmtCurrency(grandTotal)}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Paid Amount</span>
                        <span className="font-black text-emerald-700 font-mono">{fmtCurrency(paidAmount)}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px] font-bold uppercase">Supplier Balance Due</span>
                        <span className={`font-black font-mono ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {fmtCurrency(dueAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} strokeWidth={3} />
                  )}
                  <span>{submitting ? 'Recording Purchase…' : 'Record Purchase & Update Stock'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {showAddVendorModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && setShowAddVendorModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 border border-slate-200 animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Add New Supplier / Vendor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {vendorError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {vendorError}
              </div>
            )}

            <form onSubmit={handleCreateVendor} className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Company / Vendor Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Electronics Ltd"
                  value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Phone / Mobile</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newVendorForm.phone}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">GSTIN (Tax ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 19ABCDE1234F1Z5"
                  value={newVendorForm.gstin}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-mono font-medium text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Address / Location</label>
                <textarea
                  rows={2}
                  placeholder="Warehouse or office address"
                  value={newVendorForm.address}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-medium text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingVendor}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  {savingVendor ? 'Saving…' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showAddItemModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && setShowAddItemModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-5 sm:p-6 border border-slate-200 animate-fade-in space-y-4 max-h-[92vh] overflow-y-auto sm:overflow-visible">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs border border-emerald-100">
                  <Package size={17} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">Register New Product in Catalog</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Quick add product to inventory database & select for this bill.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {itemModalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{itemModalError}</span>
              </div>
            )}

            <form onSubmit={handleQuickCreateItem} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Product Title / Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Havells Table Fan 400mm"
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={newItemForm.purchase_price}
                    onChange={(e) => {
                      const cost = e.target.value;
                      setNewItemForm(prev => ({
                        ...prev,
                        purchase_price: cost,
                        sale_price: prev.sale_price || (cost ? String(Math.round(Number(cost) * 1.2)) : '')
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Selling Price (₹)</label>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={newItemForm.sale_price}
                    onChange={(e) => setNewItemForm({ ...newItemForm, sale_price: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Primary Unit</label>
                  <CustomSelect
                    value={newItemForm.unit}
                    onChange={(val) => setNewItemForm({ ...newItemForm, unit: val })}
                    options={unitOptions}
                    placeholder="Unit"
                    align="right"
                  />
                </div>
              </div>

              {Number(newItemForm.purchase_price) > 0 && (
                <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-[11px] animate-fade-in">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <TrendingUp size={13} className="text-emerald-600 shrink-0" />
                    <span>Quick Margin:</span>
                    <div className="flex items-center gap-1 ml-1">
                      {[15, 20, 25, 30, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => applyMarkupPreset(pct)}
                          className="px-1.5 py-0.5 bg-white hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded text-[10px] font-extrabold text-emerald-700 transition-colors cursor-pointer"
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {profitInfo && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
                      profitInfo.isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      Profit: ₹{profitInfo.diff} ({profitInfo.pct}%)
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Default GST Tax Rate</label>
                  <CustomSelect
                    value={newItemForm.tax_rate}
                    onChange={(val) => setNewItemForm({ ...newItemForm, tax_rate: Number(val) })}
                    options={gstOptions}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">Category / Group</label>
                  <CustomSelect
                    value={newItemForm.category_name}
                    onChange={(val) => setNewItemForm({ ...newItemForm, category_name: val })}
                    options={categoryOptions}
                    placeholder="Select or Create Group"
                    searchable={true}
                    onAddNew={(val) => setNewItemForm({ ...newItemForm, category_name: val })}
                    addNewLabel="+ Create New Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Barcode / SKU</label>
                    <button
                      type="button"
                      onClick={() => setNewItemForm(p => ({ ...p, barcode: `890${Date.now().toString().slice(-9)}` }))}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Wand2 size={10} /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 890123456789"
                      value={newItemForm.barcode}
                      onChange={(e) => setNewItemForm({ ...newItemForm, barcode: e.target.value })}
                      className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-xl outline-none font-mono text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCameraScanner(true)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
                      title="Scan Product Barcode with Camera"
                    >
                      <ScanLine size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 8415"
                    value={newItemForm.hsn_code}
                    onChange={(e) => setNewItemForm({ ...newItemForm, hsn_code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none font-mono text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingItem ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Check size={14} strokeWidth={3} />
                  )}
                  <span>{savingItem ? 'Registering…' : 'Save & Select Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {selectedBillDetail && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && setSelectedBillDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Purchase Voucher: {selectedBillDetail.invoice_number}</h3>
              </div>
              <button
                onClick={() => setSelectedBillDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Bill Date</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Supplier</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.party_name || 'Direct Supplier'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Payment Mode</span>
                  <span className="font-bold text-slate-800">{selectedBillDetail.payment_mode || 'CASH'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className={`font-bold inline-block px-1.5 py-0.2 rounded text-[10px] ${
                    (selectedBillDetail.balance_due || 0) <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {(selectedBillDetail.balance_due || 0) <= 0 ? 'Fully Settled' : `Due ${fmtCurrency(selectedBillDetail.balance_due)}`}
                  </span>
                </div>
              </div>

              {selectedBillDetail.items && selectedBillDetail.items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Cost</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBillDetail.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{it.item_name || it.name}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{it.quantity} {it.unit || ''}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{fmtCurrency(it.rate || it.purchase_price || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{it.tax_rate || 0}%</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono">{fmtCurrency(it.total || (it.quantity * it.rate) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Taxable Subtotal: </span>
                  <span className="font-bold font-mono">{fmtCurrency(selectedBillDetail.subtotal || 0)}</span>
                  <span className="text-slate-400 ml-3">Tax: </span>
                  <span className="font-bold font-mono">{fmtCurrency(selectedBillDetail.tax_amount || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-bold mr-2">Total Amount:</span>
                  <span className="text-base font-black text-blue-600 font-mono">{fmtCurrency(selectedBillDetail.total_amount || 0)}</span>
                </div>
              </div>

              {selectedBillDetail.notes && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
                  <span className="font-bold text-slate-700">Remarks / Notes: </span>
                  <span>{selectedBillDetail.notes}</span>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedBillDetail(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCameraScanner && typeof document !== 'undefined' && createPortal(
        <BarcodeScannerDialog
          onClose={() => setShowCameraScanner(false)}
          onDetected={(scannedCode) => {
            setNewItemForm(prev => ({ ...prev, barcode: scannedCode }));
            setShowCameraScanner(false);
          }}
        />,
        document.body
      )}

    </div>
  );
}
