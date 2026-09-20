import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Package, Plus, Search, Edit2, Trash2, AlertTriangle,
  CheckCircle, X, RefreshCw, ChevronUp, ChevronDown, ChevronRight,
  Settings, Star, Languages, LogOut, Check, ArrowDown, ArrowUpRight,
  ArrowDownToLine, CalendarClock, Calendar, Folder, Info,
  Tag, ArrowLeftRight, Calculator, MoreVertical, Sparkles,
  Download, Upload, FileSpreadsheet, FileText, Award, Layers, CornerDownRight, FolderTree,
  Camera, ScanLine, MapPin, Image as ImageIcon
} from 'lucide-react';
import { getItems, createItem, updateItem, deleteItem, getCategories, createCategory,
  getSubCategories, createSubCategory, deleteSubCategory,
  getBrands, createBrand, deleteBrand,
  getUnits, createUnit, deleteUnit, getUnitConversions, createUnitConversion, deleteUnitConversion,
  uploadFile, fmtCurrency, fmt, generateAIDescription, getPosSettings } from '../api/client.js';

const UNITS   = ['Pcs', 'Mtr', 'Kg', 'Ltr', 'Box', 'Pair', 'Set', 'Roll'];
const getActiveTaxRates = () => {
  try {
    const posCfg = getPosSettings();
    if (Array.isArray(posCfg.enabledTaxSlabs) && posCfg.enabledTaxSlabs.length > 0) {
      return posCfg.enabledTaxSlabs.map(Number).sort((a, b) => a - b);
    }
    const raw = localStorage.getItem('hk_active_tax_rates');
    if (raw) return JSON.parse(raw).map(Number).sort((a, b) => a - b);
  } catch {}
  return [0, 5, 12, 18, 28];
};

const getDefaultTaxMode = () => {
  try {
    const direct = localStorage.getItem('hk_tax_calculation_mode');
    if (direct === 'INCLUSIVE') return 'Incl';
    if (direct === 'EXCLUSIVE') return 'Excl';
    const parsed = getPosSettings();
    if (parsed.taxCalculationMode === 'INCLUSIVE') return 'Incl';
    if (parsed.taxCalculationMode === 'EXCLUSIVE') return 'Excl';
  } catch {}
  return 'Excl';
};

function CustomSelect({ value, onChange, options = [], placeholder = 'Select option...', className = '', searchable = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => String(o.label || '').toLowerCase().includes(q));
  }, [options, search, searchable]);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(prev => !prev);
          setSearch('');
        }}
        className={`w-full px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/60'
        }`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+5px)] left-0 right-0 z-[70] bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 flex flex-col p-1 animate-fade-in">
          {searchable && options.length > 4 && (
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search options…"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-52 scrollbar-thin p-0.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isAddNew = opt.value === '__add_new__';
                return (
                  <div
                    key={opt.key || opt.value || idx}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 text-xs rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      isAddNew
                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-black border-t border-slate-100 dark:border-slate-800 mt-1'
                        : isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-4 text-xs text-slate-400 text-center font-medium">
                No matching options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const getInitialDefaultTaxRate = () => {
  try {
    const cfg = getPosSettings();
    if (cfg.defaultTaxRate !== undefined && cfg.defaultTaxRate !== '') {
      return Number(cfg.defaultTaxRate);
    }
    return Number(localStorage.getItem('default_tax_rate') || 18);
  } catch {
    return 18;
  }
};

const EMPTY_ITEM = {
  name: '', category_id: null, sub_category_id: null, sub_category: '', brand: '', unit: 'Pcs', barcode: '', sale_price: '', purchase_price: '',
  tax_rate: getInitialDefaultTaxRate(), opening_stock: '', low_stock_alert: 5, description: '',
  batch_number: '', expiry_date: '', aisle: '', rack: '', shelf: '', rack_location: ''
};

function ItemModal({ item, categories, subCategories: propSubCats = [], units: unitList = [], brands: propBrands = [], onClose, onSave }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState(isEdit
    ? { ...item, category_id: item.category_id || null, sub_category_id: item.sub_category_id || null, sub_category: item.sub_category || '', brand: item.brand || '', unit: item.unit || 'Pcs', aisle: item.aisle || '', rack: item.rack || '', shelf: item.shelf || '', rack_location: item.rack_location || '' }
    : { ...EMPTY_ITEM, image_url: null, wholesale_price: '', dealer_price: '', min_sale_price: '', brand: '', model: '', rack_location: '', size_color: '', aisle: '', rack: '', shelf: '' }
  );
  const [categoryList, setCategoryList] = useState(categories || []);
  const [subCategoryList, setSubCategoryList] = useState(propSubCats || []);
  const [brandList, setBrandList] = useState(propBrands || []);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [itemType, setItemType]   = useState((form.unit || '').toLowerCase() === 'service' ? 'service' : 'item');
  const [activeTab, setActiveTab] = useState('pricing');
  const [calcSalePrice, setCalcSalePrice] = useState(false);
  const [showMultiPrice, setShowMultiPrice] = useState(!!(form.wholesale_price || form.dealer_price || form.min_sale_price));
  const [showCustomFields, setShowCustomFields] = useState(!!(form.brand || form.model || form.size_color));

  const handleLocationChange = (field, val) => {
    setForm(prev => {
      const next = { ...prev, [field]: val };
      const parts = [
        next.aisle ? `Aisle ${next.aisle.trim()}` : null,
        next.rack ? `Rack ${next.rack.trim()}` : null,
        next.shelf ? `Shelf ${next.shelf.trim()}` : null
      ].filter(Boolean);
      next.rack_location = parts.join(' • ');
      return next;
    });
  };
  
  const [saleTaxType, setSaleTaxType] = useState(item?.sale_tax_type || item?.tax_type || getDefaultTaxMode());
  const [purchaseTaxType, setPurchaseTaxType] = useState(item?.purchase_tax_type || getDefaultTaxMode());

  const [saleDiscPercent, setSaleDiscPercent] = useState('');
  const [saleDiscAmt, setSaleDiscAmt] = useState('');
  const [mrpDiscPercent, setMrpDiscPercent] = useState('');
  const [mrpDiscAmt, setMrpDiscAmt] = useState('');

  const [isDragOver, setIsDragOver] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError]         = useState(null);
  const photoInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const combinedUnits = useMemo(() => {
    const list = [...UNITS];
    if (unitList && unitList.length > 0) {
      unitList.forEach(u => {
        const n = u.name || u.short_name;
        if (n && !list.some(existing => existing.toLowerCase() === n.toLowerCase())) {
          list.push(n);
        }
        if (u.short_name && !list.some(existing => existing.toLowerCase() === u.short_name.toLowerCase())) {
          list.push(u.short_name);
        }
      });
    }
    if (form.unit && !list.some(existing => existing.toLowerCase() === form.unit.toLowerCase())) {
      list.push(form.unit);
    }
    if (!list.some(u => u.toLowerCase() === 'service')) list.push('Service');
    return list;
  }, [unitList, form.unit]);

  const selectedUnitValue = useMemo(() => {
    if (!form.unit) return '';
    const match = combinedUnits.find(u => u.toLowerCase() === form.unit.toLowerCase());
    return match || form.unit;
  }, [combinedUnits, form.unit]);

  useEffect(() => {
    if (isEdit && item) {
      if (!form.sub_category_id && item.sub_category && subCategoryList.length > 0) {
        const found = subCategoryList.find(sc => sc.name.toLowerCase() === item.sub_category.toLowerCase());
        if (found) {
          setForm(prev => ({ ...prev, sub_category_id: found.id }));
        }
      }
    }
  }, [isEdit, item, subCategoryList]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUploadImageFile = async (file) => {
    if (!file || !file.type?.startsWith('image/')) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const res = await uploadFile(file, 'item');
      if (res.url) {
        set('image_url', res.url);
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type && it.type.startsWith('image/')) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            handleUploadImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    const mrpNum = parseFloat(form.mrp) || 0;
    const saleNum = parseFloat(form.sale_price) || 0;
    if (mrpNum > 0 && saleNum > 0 && mrpNum >= saleNum) {
      const diff = mrpNum - saleNum;
      const dAmt = diff.toFixed(2);
      const dPct = ((diff / mrpNum) * 100).toFixed(1);
      setSaleDiscAmt(dAmt);
      setSaleDiscPercent(dPct);
      setMrpDiscAmt(dAmt);
      setMrpDiscPercent(dPct);
    }
  }, []);

  const handleGenerateItemDesc = async () => {
    if (!form.name?.trim()) return;
    setAiLoading(true);
    try {
      const catName = categoryList.find(c => c.id === form.category_id)?.name || '';
      const res = await generateAIDescription({
        type: 'item',
        name: form.name.trim(),
        category: catName,
        unit: form.unit,
        brand: form.brand || '',
        model: form.model || ''
      });
      if (res?.description) {
        set('description', res.description);
      }
    } catch (err) {
      setError(err.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleBarcodeGen = () => {
    const generated = `HK${Date.now().toString().slice(-8)}`;
    set('barcode', generated);
  };

  const handleSalePriceChange = (val) => {
    set('sale_price', val);
    const saleNum = parseFloat(val);
    const mrpNum = parseFloat(form.mrp) || 0;
    if (!isNaN(saleNum) && mrpNum > 0 && mrpNum >= saleNum) {
      const diff = mrpNum - saleNum;
      setSaleDiscAmt(diff.toFixed(2));
      setSaleDiscPercent(((diff / mrpNum) * 100).toFixed(1));
      if (calcSalePrice) {
        setMrpDiscAmt(diff.toFixed(2));
        setMrpDiscPercent(((diff / mrpNum) * 100).toFixed(1));
      }
    }
  };

  const handleSaleDiscPercentChange = (val) => {
    setSaleDiscPercent(val);
    const p = parseFloat(val);
    const mrpNum = parseFloat(form.mrp) || 0;
    const base = mrpNum > 0 ? mrpNum : (parseFloat(form.sale_price) || 0);
    if (!isNaN(p) && p >= 0 && base > 0) {
      const amt = (base * p) / 100;
      setSaleDiscAmt(amt.toFixed(2));
      set('sale_price', (base - amt).toFixed(2));
    } else if (!val) {
      setSaleDiscAmt('');
      if (mrpNum > 0) set('sale_price', String(mrpNum));
    }
  };

  const handleSaleDiscAmtChange = (val) => {
    setSaleDiscAmt(val);
    const amt = parseFloat(val);
    const mrpNum = parseFloat(form.mrp) || 0;
    const base = mrpNum > 0 ? mrpNum : (parseFloat(form.sale_price) || 0);
    if (!isNaN(amt) && amt >= 0 && base > 0) {
      const p = (amt / base) * 100;
      setSaleDiscPercent(p.toFixed(1));
      set('sale_price', (base - amt).toFixed(2));
    } else if (!val) {
      setSaleDiscPercent('');
      if (mrpNum > 0) set('sale_price', String(mrpNum));
    }
  };

  const handleMrpChange = (val) => {
    set('mrp', val);
    const mrpNum = parseFloat(val);
    if (!isNaN(mrpNum) && mrpNum > 0) {
      if (calcSalePrice) {
        const p = parseFloat(mrpDiscPercent) || 0;
        const amt = parseFloat(mrpDiscAmt) || 0;
        if (p > 0) {
          const disc = (mrpNum * p) / 100;
          setMrpDiscAmt(disc.toFixed(2));
          set('sale_price', (mrpNum - disc).toFixed(2));
        } else if (amt > 0) {
          const perc = (amt / mrpNum) * 100;
          setMrpDiscPercent(perc.toFixed(1));
          set('sale_price', (mrpNum - amt).toFixed(2));
        } else {
          set('sale_price', String(mrpNum));
        }
      } else {
        const saleNum = parseFloat(form.sale_price) || 0;
        if (saleNum > 0 && mrpNum >= saleNum) {
          const diff = mrpNum - saleNum;
          setSaleDiscAmt(diff.toFixed(2));
          setSaleDiscPercent(((diff / mrpNum) * 100).toFixed(1));
        }
      }
    }
  };

  const handleToggleCalcSale = () => {
    const next = !calcSalePrice;
    setCalcSalePrice(next);
    const mrpNum = parseFloat(form.mrp) || 0;
    const saleNum = parseFloat(form.sale_price) || 0;
    if (next && mrpNum > 0) {
      const p = parseFloat(mrpDiscPercent) || 0;
      const amt = parseFloat(mrpDiscAmt) || 0;
      if (p > 0) {
        const disc = (mrpNum * p) / 100;
        setMrpDiscAmt(disc.toFixed(2));
        set('sale_price', (mrpNum - disc).toFixed(2));
      } else if (amt > 0) {
        const perc = (amt / mrpNum) * 100;
        setMrpDiscPercent(perc.toFixed(1));
        set('sale_price', (mrpNum - amt).toFixed(2));
      } else if (saleNum > 0 && mrpNum >= saleNum) {
        const diff = mrpNum - saleNum;
        setMrpDiscAmt(diff.toFixed(2));
        setMrpDiscPercent(((diff / mrpNum) * 100).toFixed(1));
      } else {
        set('sale_price', String(mrpNum));
      }
    }
  };

  const handleMrpDiscPercentChange = (val) => {
    setMrpDiscPercent(val);
    const p = parseFloat(val);
    const mrpNum = parseFloat(form.mrp) || 0;
    if (!isNaN(p) && p >= 0 && mrpNum > 0) {
      const amt = (mrpNum * p) / 100;
      setMrpDiscAmt(amt.toFixed(2));
      if (calcSalePrice) {
        set('sale_price', (mrpNum - amt).toFixed(2));
      }
    } else if (!val) {
      setMrpDiscAmt('');
      if (calcSalePrice && mrpNum > 0) {
        set('sale_price', String(mrpNum));
      }
    }
  };

  const handleMrpDiscAmtChange = (val) => {
    setMrpDiscAmt(val);
    const amt = parseFloat(val);
    const mrpNum = parseFloat(form.mrp) || 0;
    if (!isNaN(amt) && amt >= 0 && mrpNum > 0) {
      const p = (amt / mrpNum) * 100;
      setMrpDiscPercent(p.toFixed(1));
      if (calcSalePrice) {
        set('sale_price', (mrpNum - amt).toFixed(2));
      }
    } else if (!val) {
      setMrpDiscPercent('');
      if (calcSalePrice && mrpNum > 0) {
        set('sale_price', String(mrpNum));
      }
    }
  };

  const doSave = async (keepOpen = false) => {
    if (!form.name.trim()) return setError('Item name is required');
    keepOpen ? setSavingNew(true) : setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateItem(item.id, { 
          ...form, 
          tax_type: saleTaxType,
          sale_tax_type: saleTaxType,
          purchase_tax_type: purchaseTaxType,
          sale_price: Number(form.sale_price) || 0,
          purchase_price: Number(form.purchase_price) || 0,
          wholesale_price: Number(form.wholesale_price) || 0,
          mrp: Number(form.mrp) || 0,
          tax_rate: Number(form.tax_rate) || 0,
          current_stock: itemType === 'service' ? 0 : (Number(form.current_stock) || 0) 
        });
      } else {
        await createItem({ 
          ...form, 
          tax_type: saleTaxType,
          sale_tax_type: saleTaxType,
          purchase_tax_type: purchaseTaxType,
          sale_price: Number(form.sale_price) || 0,
          purchase_price: Number(form.purchase_price) || 0,
          wholesale_price: Number(form.wholesale_price) || 0,
          mrp: Number(form.mrp) || 0,
          tax_rate: Number(form.tax_rate) || 0,
          opening_stock: itemType === 'service' ? 0 : (Number(form.opening_stock) || 0) 
        });
      }
      if (keepOpen) {
        setForm({ ...EMPTY_ITEM, image_url: null, wholesale_price: '', dealer_price: '', min_sale_price: '', brand: '', model: '', rack_location: '', size_color: '' });
        setSaleTaxType(getDefaultTaxMode());
        setPurchaseTaxType(getDefaultTaxMode());
        setItemType('item');
        setActiveTab('pricing');
        setError(null);
      } else {
        onSave();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setSavingNew(false);
    }
  };

  const inp  = 'w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder-slate-400 bg-white transition-all';
  const lbl  = 'flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1';
  const dot  = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && onClose()}>
      <div 
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl xl:max-w-6xl flex flex-col bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 animate-fade-in overflow-hidden"
      >

        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-b border-slate-100 flex-shrink-0 bg-slate-50/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
              <Package size={17} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">{isEdit ? 'Edit Item' : 'Add Item'}</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 truncate">Create Product Or Service Catalog Entry</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="Close modal"
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-5 space-y-4 sm:space-y-5">

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">{error}</div>
          )}

          <div className="border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4 bg-slate-50/50">

            {/* ── MOBILE VIEW ONLY (sm:hidden): Balanced Type Selector & Unified Photo Card ── */}
            <div className="sm:hidden w-full space-y-2.5 pb-2.5 border-b border-slate-200/70">
              {/* 1. Full-width Segmented Type Switcher */}
              <div className="flex p-1 bg-slate-200/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setItemType('item')}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    itemType === 'item' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Package size={14} strokeWidth={2.2} />
                  <span>Physical Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType('service');
                    set('unit', 'Service');
                  }}
                  className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    itemType === 'service' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={14} strokeWidth={2.2} />
                  <span>Service</span>
                </button>
              </div>

              {/* 2. Unified Photo Card with Preview & Direct Actions */}
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="relative shrink-0">
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="w-[66px] h-[66px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-all"
                    title="Click to view or upload photo"
                  >
                    {uploadingPhoto ? (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : form.image_url ? (
                      <img src={form.image_url} alt="Item Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <Package size={18} strokeWidth={1.5} />
                        <span className="text-[7.5px] font-bold mt-0.5 tracking-wider">NO PHOTO</span>
                      </div>
                    )}
                  </div>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        set('image_url', null);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer z-10"
                      title="Remove image"
                    >
                      <X size={11} strokeWidth={3} />
                    </button>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200/70 border border-emerald-200/80 rounded-lg text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98 shadow-2xs"
                  >
                    <Camera size={14} className="text-emerald-600 shrink-0" strokeWidth={2.2} />
                    <span>{form.image_url ? 'Retake with Camera' : 'Take Photo (Camera)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300/60 border border-slate-200 rounded-lg text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    <ImageIcon size={14} className="text-slate-500 shrink-0" strokeWidth={2.2} />
                    <span>{form.image_url ? 'Change from Gallery' : 'Choose from Gallery'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── DESKTOP VIEW ONLY (sm:flex): Compact Left Column ── */}
            <div className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0">
              <div 
                onClick={() => photoInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    handleUploadImageFile(file);
                  }
                }}
                className={`w-[88px] h-[80px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-0.5 bg-white cursor-pointer transition-all relative overflow-hidden group shadow-xs shrink-0 ${
                  isDragOver ? 'border-emerald-500 bg-emerald-50 scale-105 ring-2 ring-emerald-400' : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30'
                }`}
                title="Click to browse, drag & drop, or paste (Ctrl+V) image"
              >
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : form.image_url ? (
                  <>
                    <img src={form.image_url} alt="Item Photo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[8px] text-white font-bold uppercase tracking-wider">Change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Package size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" strokeWidth={1.5} />
                    <span className="text-[8px] font-bold text-slate-400 group-hover:text-emerald-600 uppercase tracking-wider">ADD PHOTO</span>
                    <span className="text-[7px] text-slate-400/80 font-semibold leading-none">or Paste</span>
                  </>
                )}
              </div>
              {form.image_url && (
                <button
                  type="button"
                  onClick={() => set('image_url', null)}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline transition-colors cursor-pointer"
                >
                  Remove Photo
                </button>
              )}
              <div className="flex rounded-full overflow-hidden border border-slate-200 text-[10px] font-bold bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setItemType('item')}
                  className={`px-3 py-1.5 transition-colors cursor-pointer ${
                    itemType === 'item' ? 'bg-emerald-500 text-white font-black' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >Item</button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType('service');
                    set('unit', 'Service');
                  }}
                  className={`px-3 py-1.5 transition-colors cursor-pointer ${
                    itemType === 'service' ? 'bg-emerald-500 text-white font-black' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >Service</button>
              </div>
            </div>

            {/* Hidden native inputs for file picker and camera */}
            <input 
              id="item-photo-input" 
              ref={photoInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImageFile(file);
                e.target.value = '';
              }} 
            />
            <input 
              id="item-camera-input" 
              ref={cameraInputRef}
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImageFile(file);
                e.target.value = '';
              }} 
            />

            <div className="flex-1 grid grid-cols-12 gap-3 w-full">
              <div className="col-span-12 sm:col-span-6">
                <label className={lbl}>{dot} ITEM NAME <span className="text-rose-500">*</span></label>
                <input id="item-name-input" className={inp} placeholder="e.g. Wireless Mouse" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-6 md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> CATEGORY
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer"
                    title="Create new category"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>Add</span>
                  </button>
                </div>
                <CustomSelect
                  value={form.category_id || ''}
                  onChange={val => {
                    if (val === '__add_new__') {
                      setShowCategoryModal(true);
                    } else {
                      const newCatId = val ? Number(val) : null;
                      setForm(prev => ({
                        ...prev,
                        category_id: newCatId,
                        sub_category_id: null,
                        sub_category: ''
                      }));
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Category' },
                    ...categoryList.map(cat => ({ value: cat.id, label: cat.name })),
                    { value: '__add_new__', label: '+ Add New Category...' }
                  ]}
                  placeholder="Select Category"
                  searchable={true}
                />
              </div>
              <div className="col-span-12 sm:col-span-6 md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> SUB-CATEGORY
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.category_id && categoryList.length === 0) {
                        setShowCategoryModal(true);
                      } else {
                        setShowSubCategoryModal(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-all cursor-pointer"
                    title="Create new subcategory"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>Add</span>
                  </button>
                </div>
                <CustomSelect
                  value={form.sub_category_id || ''}
                  onChange={val => {
                    if (val === '__add_new__') {
                      setShowSubCategoryModal(true);
                    } else {
                      const chosen = subCategoryList.find(sc => String(sc.id) === String(val));
                      setForm(prev => ({
                        ...prev,
                        sub_category_id: chosen ? chosen.id : null,
                        sub_category: chosen ? chosen.name : ''
                      }));
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Sub-category' },
                    ...subCategoryList
                      .filter(sc => !form.category_id || String(sc.category_id) === String(form.category_id))
                      .map(sc => ({ value: sc.id, label: sc.name })),
                    { value: '__add_new__', label: '+ Add New Sub-category...' }
                  ]}
                  placeholder="Select Sub-category"
                  searchable={true}
                />
              </div>

              <div className="col-span-12 sm:col-span-6 md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> BRAND
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowBrandModal(true)}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-all cursor-pointer"
                    title="Create new brand"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>Add</span>
                  </button>
                </div>
                <CustomSelect
                  value={form.brand || ''}
                  onChange={val => {
                    if (val === '__add_new__') {
                      setShowBrandModal(true);
                    } else {
                      set('brand', val);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Brand' },
                    ...brandList.map(b => ({ value: b.name, label: b.name })),
                    { value: '__add_new__', label: '+ Add New Brand...' }
                  ]}
                  placeholder="Select Brand"
                  searchable={true}
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label className={lbl}>{dot} UNIT <span className="text-rose-500">*</span></label>
                <CustomSelect 
                  value={selectedUnitValue} 
                  onChange={val => set('unit', val)}
                  options={[
                    { value: '', label: 'Select Unit' },
                    ...combinedUnits.map(u => ({ value: u, label: u }))
                  ]}
                  placeholder="Select Unit"
                  searchable={true}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className={lbl}><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> HSN CODE</label>
                <input className={inp} placeholder="HSN/SAC" value={form.hsn_code || ''} onChange={e => set('hsn_code', e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-6 md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> ITEM CODE / BARCODE
                  </label>
                  <button
                    type="button"
                    onClick={handleBarcodeGen}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer"
                    title="Auto Generate Barcode"
                  >
                    <Plus size={10} strokeWidth={3} />
                    <span>Add</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    className={inp + ' pr-9 font-mono'}
                    placeholder="Scan or enter code"
                    value={form.barcode || ''}
                    onChange={e => set('barcode', e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowBarcodeScanner(true)}
                    title="Scan barcode from product"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-md hover:bg-slate-100 cursor-pointer"
                  >
                    <ScanLine size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="col-span-12">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> DESCRIPTION
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateItemDesc}
                    disabled={aiLoading || !form.name?.trim()}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer disabled:opacity-40"
                    title="Fill description from item name and attributes using AI"
                  >
                    <Sparkles size={10} className={aiLoading ? 'animate-spin' : ''} />
                    <span>{aiLoading ? 'Writing…' : 'AI Write'}</span>
                  </button>
                </div>
                <textarea
                  className="w-full px-3 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-slate-800 placeholder-slate-400 bg-white min-h-[72px] sm:min-h-[88px] resize-y transition-all leading-relaxed"
                  placeholder="Enter detailed product description, specifications, features, key attributes..."
                  rows={2}
                  value={form.description || ''}
                  onChange={e => set('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-0 border border-slate-200 rounded-xl sm:rounded-full w-full sm:w-fit overflow-hidden bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`flex-1 sm:flex-initial text-center px-5 py-1.5 text-xs font-bold rounded-lg sm:rounded-full transition-all cursor-pointer ${
                activeTab === 'pricing' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >Pricing</button>
            {itemType !== 'service' && (
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className={`flex-1 sm:flex-initial text-center px-5 py-1.5 text-xs font-bold rounded-lg sm:rounded-full transition-all cursor-pointer ${
                  activeTab === 'stock' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >Stock</button>
            )}
          </div>

          {activeTab === 'pricing' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
                  <p className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> SALE PRICE
                  </p>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500">
                    <span className="px-2.5 py-2 text-xs text-slate-500 bg-slate-50 border-r border-slate-200 font-bold">₹</span>
                    <input className="flex-1 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none w-0" type="number" min="0" step="0.01" placeholder="0.00" value={form.sale_price || ''} onChange={e => handleSalePriceChange(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setSaleTaxType(prev => prev === 'Excl' ? 'Incl' : 'Excl')}
                      className="px-2.5 py-1.5 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border-l border-slate-200 cursor-pointer transition-colors"
                      title="Click to toggle Tax Inclusive / Exclusive"
                    >
                      {saleTaxType}
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-400 font-semibold mb-1">Disc %</p>
                      <input className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" type="number" placeholder="0" min="0" max="100" value={saleDiscPercent} onChange={e => handleSaleDiscPercentChange(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-400 font-semibold mb-1">Disc ₹</p>
                      <input className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" type="number" placeholder="0.00" min="0" value={saleDiscAmt} onChange={e => handleSaleDiscAmtChange(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
                  <p className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> PURCHASE PRICE
                  </p>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500">
                    <span className="px-2.5 py-2 text-xs text-slate-500 bg-slate-50 border-r border-slate-200 font-bold">₹</span>
                    <input className="flex-1 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none w-0" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchase_price || ''} onChange={e => set('purchase_price', e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setPurchaseTaxType(prev => prev === 'Excl' ? 'Incl' : 'Excl')}
                      className="px-2.5 py-1.5 text-[10px] font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border-l border-slate-200 cursor-pointer transition-colors"
                      title="Click to toggle Tax Inclusive / Exclusive"
                    >
                      {purchaseTaxType}
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium mt-2 leading-relaxed">Cost price for gross margin reports.</p>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <p className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> MRP
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">CALC SALE</span>
                      <button
                        type="button"
                        onClick={handleToggleCalcSale}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          calcSalePrice ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                        title="Toggle Auto Calculate Sale Price"
                      >
                        <span className="w-3.5 h-3.5 bg-white rounded-full shadow-xs" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500">
                    <span className="px-2.5 py-2 text-xs text-slate-500 bg-slate-50 border-r border-slate-200 font-bold">₹</span>
                    <input className="flex-1 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none w-0" type="number" min="0" step="0.01" placeholder="0.00" value={form.mrp || ''} onChange={e => handleMrpChange(e.target.value)} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-400 font-semibold mb-1">MRP Disc %</p>
                      <input className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" type="number" placeholder="0" min="0" max="100" value={mrpDiscPercent} onChange={e => handleMrpDiscPercentChange(e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] text-slate-400 font-semibold mb-1">MRP Disc ₹</p>
                      <input className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-500" type="number" placeholder="0.00" min="0" value={mrpDiscAmt} onChange={e => handleMrpDiscAmtChange(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
                  <p className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" /> FLAT WHOLESALE PRICE
                  </p>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500">
                    <span className="px-2.5 py-2 text-xs text-slate-500 bg-slate-50 border-r border-slate-200 font-bold">₹</span>
                    <input className="flex-1 px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none w-0" type="number" min="0" step="0.01" placeholder="0.00" value={form.wholesale_price || ''} onChange={e => set('wholesale_price', e.target.value)} />
                  </div>
                  <p className="text-[9px] text-emerald-600 font-semibold mt-2 leading-relaxed">Wholesale bulk sale rate.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5">TAX RATE</p>
                  <CustomSelect
                    value={form.tax_rate}
                    onChange={val => set('tax_rate', Number(val))}
                    options={getActiveTaxRates().map(r => ({
                      value: r,
                      label: r > 0 ? `GST ${r}%` : 'No Tax (0%)'
                    }))}
                    placeholder="Select Tax Rate"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Multi Price Tier</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{showMultiPrice ? 'ENABLED' : 'DISABLED'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMultiPrice(v => !v)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                      showMultiPrice ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-xs" />
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">Custom Attributes</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{showCustomFields ? 'ENABLED' : 'DISABLED'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomFields(v => !v)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                      showCustomFields ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 bg-white rounded-full shadow-xs" />
                  </button>
                </div>
              </div>

              {showMultiPrice && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                  <div>
                    <label className={lbl}>Wholesale Price (₹)</label>
                    <input className={inp} type="number" placeholder="0.00" value={form.wholesale_price || ''} onChange={e => set('wholesale_price', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Dealer Price (₹)</label>
                    <input className={inp} type="number" placeholder="0.00" value={form.dealer_price || ''} onChange={e => set('dealer_price', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Minimum Sale Price (₹)</label>
                    <input className={inp} type="number" placeholder="0.00" value={form.min_sale_price || ''} onChange={e => set('min_sale_price', e.target.value)} />
                  </div>
                </div>
              )}

              {showCustomFields && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in">
                  <div>
                    <label className={lbl}>Brand / Manufacturer</label>
                    <input className={inp} placeholder="e.g. Sony" value={form.brand || ''} onChange={e => set('brand', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Model / Version</label>
                    <input className={inp} placeholder="e.g. Pro V2" value={form.model || ''} onChange={e => set('model', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Size / Color</label>
                    <input className={inp} placeholder="e.g. XL / Black" value={form.size_color || ''} onChange={e => set('size_color', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Custom Note</label>
                    <input className={inp} placeholder="Extra notes" value={form.model ? '' : (form.custom_note || '')} onChange={e => set('custom_note', e.target.value)} />
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MapPin size={13} />
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-800">Storage & Warehouse Location</p>
                      <p className="text-[10px] font-medium text-slate-400">Track exact aisle, rack, shelf, or bin position</p>
                    </div>
                  </div>
                  {form.rack_location && (
                    <span className="self-start sm:self-auto px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                      <MapPin size={10} />
                      <span className="truncate max-w-[240px]">{form.rack_location}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Aisle</label>
                    <input
                      className={inp}
                      placeholder="e.g. Aisle 3, Zone A"
                      value={form.aisle || ''}
                      onChange={e => handleLocationChange('aisle', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Rack</label>
                    <input
                      className={inp}
                      placeholder="e.g. Rack B, R-12"
                      value={form.rack || ''}
                      onChange={e => handleLocationChange('rack', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Shelf / Bin</label>
                    <input
                      className={inp}
                      placeholder="e.g. Shelf 4, Bin 02"
                      value={form.shelf || ''}
                      onChange={e => handleLocationChange('shelf', e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'stock' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>{dot} {isEdit ? 'CURRENT STOCK' : 'OPENING STOCK'}</label>
                <input id="item-stock-input" className={inp + ' font-bold'} type="number" min="0" step="any" placeholder="0"
                  value={isEdit ? (form.current_stock ?? '') : (form.opening_stock ?? '')}
                  onChange={e => set(isEdit ? 'current_stock' : 'opening_stock', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>{dot} LOW STOCK ALERT THRESHOLD</label>
                <input className={inp + ' font-bold'} type="number" min="0" value={form.low_stock_alert || ''}
                  onChange={e => set('low_stock_alert', Number(e.target.value))} />
              </div>
              <div>
                <label className={lbl}>{dot} EXPIRY DATE</label>
                <input className={inp} type="date" value={form.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>{dot} BATCH / LOT NUMBER</label>
                <input className={inp} placeholder="e.g. BATCH-2026-A" value={form.batch_number || ''} onChange={e => set('batch_number', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>{dot} OPENING STOCK VALUATION (₹)</label>
                <input className={inp} type="number" placeholder="0.00" value={((Number(form.opening_stock) || 0) * (Number(form.purchase_price) || 0)).toFixed(2)} disabled />
              </div>
            </div>
          )}

        </div>

        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3.5 py-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between sm:justify-end gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:shadow-none flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:scale-98 rounded-xl transition-all cursor-pointer text-center border border-transparent hover:border-slate-200"
          >
            Cancel
          </button>
          {isEdit ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="sm:hidden flex-1 py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-98 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                id="item-save-btn"
                type="button"
                onClick={() => doSave(false)}
                disabled={saving || savingNew}
                className="flex-1 sm:flex-initial px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={3} />
                )}
                <span>Update Item</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => doSave(true)}
                disabled={savingNew || saving}
                className="flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 sm:py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-98 border border-slate-200 rounded-xl transition-all cursor-pointer text-center shadow-2xs whitespace-nowrap disabled:opacity-50"
              >
                {savingNew ? 'Saving…' : 'Save & Add New'}
              </button>
              <button
                id="item-save-btn"
                type="button"
                onClick={() => doSave(false)}
                disabled={saving || savingNew}
                className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-2.5 text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={3} />
                )}
                <span>Save Item</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSave={async (createdCat) => {
            try {
              const res = await getCategories();
              if (res && Array.isArray(res)) {
                setCategoryList(res);
                if (createdCat?.id) {
                  setForm(prev => ({ ...prev, category_id: createdCat.id, sub_category_id: null, sub_category: '' }));
                } else if (res.length > 0) {
                  setForm(prev => ({ ...prev, category_id: res[res.length - 1].id, sub_category_id: null, sub_category: '' }));
                }
              }
            } catch {}
            setShowCategoryModal(false);
          }}
        />
      )}

      {showSubCategoryModal && (
        <AddSubCategoryModal
          categories={categoryList}
          defaultCategoryId={form.category_id}
          onClose={() => setShowSubCategoryModal(false)}
          onSave={async (createdSubCat) => {
            try {
              const res = await getSubCategories();
              if (res && Array.isArray(res)) {
                setSubCategoryList(res);
                if (createdSubCat?.id) {
                  setForm(prev => ({
                    ...prev,
                    category_id: createdSubCat.category_id || prev.category_id,
                    sub_category_id: createdSubCat.id,
                    sub_category: createdSubCat.name
                  }));
                }
              }
            } catch {}
            setShowSubCategoryModal(false);
          }}
        />
      )}

      {showBrandModal && (
        <AddBrandModal
          onClose={() => setShowBrandModal(false)}
          onSave={async (createdBrand) => {
            try {
              const res = await getBrands();
              if (res && Array.isArray(res)) {
                setBrandList(res);
                if (createdBrand?.name) {
                  set('brand', createdBrand.name);
                }
              }
            } catch {}
            setShowBrandModal(false);
          }}
        />
      )}

      {showBarcodeScanner && (
        <BarcodeScanModal
          onClose={() => setShowBarcodeScanner(false)}
          onDetected={(scanned) => {
            set('barcode', scanned);
            setShowBarcodeScanner(false);
          }}
        />
      )}

    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

function BarcodeScanModal({ onClose, onDetected }) {
  const videoRef = React.useRef(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const streamRef = React.useRef(null);
  const intervalRef = React.useRef(null);

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
    <div className="modal-overlay p-2 sm:p-4 fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <ScanLine size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate">Scan Product Barcode</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Align barcode inside the camera frame</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3.5 overflow-y-auto">
          <div className="relative w-full aspect-16/10 sm:aspect-4/3 max-h-[30vh] sm:max-h-[36vh] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-0 border-2 border-emerald-500/70 m-3 sm:m-6 rounded-xl pointer-events-none flex flex-col justify-between p-1.5 sm:p-2">
              <div className="flex justify-between">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-t-2 border-r-2 border-emerald-400" />
              </div>
              <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <div className="flex justify-between">
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-b-2 border-r-2 border-emerald-400" />
              </div>
            </div>
            {error && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-3 text-center">
                <Camera size={26} className="text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-white mb-0.5">Camera Not Available</p>
                <p className="text-[10px] text-slate-300 max-w-[220px] mb-2">{error}</p>
                <p className="text-[9px] text-emerald-400 font-semibold">Enter barcode manually below</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="flex gap-1.5 sm:gap-2">
            <input
              type="text"
              autoFocus
              className="flex-1 px-2.5 py-1.5 sm:py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white"
              placeholder="Or type barcode here..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Use
            </button>
          </form>
        </div>

        <div className="px-3.5 py-2 sm:px-5 sm:py-2.5 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] sm:text-[11px] text-slate-500 shrink-0">
          <span className="truncate pr-2">USB Scanners can also scan directly</span>
          <button onClick={onClose} className="px-2 py-0.5 bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs cursor-pointer transition-colors shrink-0">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSubCategoryModal({ categories, defaultCategoryId, onClose, onSave }) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId || (categories[0]?.id || ''));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSubCategoryDesc = async () => {
    if (!name.trim()) return setError('Please enter a sub-category name first');
    setAiLoading(true);
    setError(null);
    try {
      const parentCat = categories.find(c => String(c.id) === String(categoryId))?.name || '';
      const res = await generateAIDescription({
        type: 'sub_category',
        name: name.trim(),
        category: parentCat,
        customPrompt: `Provide a strictly to-the-point, 1-sentence catalog definition (under 18 words) for product sub-category "${name.trim()}"${parentCat ? ` under parent category "${parentCat}"` : ''}. Direct facts only, no filler or quotes.`
      });
      if (res?.description) {
        setDescription(res.description);
      }
    } catch (e) {
      setError(e.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!categoryId) return setError('Parent category is required');
    if (!name.trim()) return setError('Sub-category name is required');
    setSaving(true);
    setError(null);
    try {
      const res = await createSubCategory({
        category_id: Number(categoryId),
        name: name.trim(),
        description: description.trim()
      });
      onSave(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full bg-white text-gray-800 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layers size={20} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-base font-extrabold text-gray-800 leading-tight">Add Sub-category</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Create a sub-category under a parent category.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs font-semibold text-gray-500 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Parent Category <span className="text-red-500">*</span></label>
            <select
              className="w-full px-3 py-2 text-sm border-2 border-gray-250 focus:border-indigo-500 focus:outline-none rounded-lg text-gray-800 bg-white font-medium"
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
            >
              <option value="">Select Parent Category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Sub-category Name <span className="text-red-500">*</span></label>
            <input 
              className="w-full px-3 py-2 text-sm border-2 border-gray-250 focus:border-indigo-500 focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans"
              placeholder="e.g. LED Light, Switch, Board, Wire"
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-gray-700 uppercase">Description (Optional)</label>
              <button
                type="button"
                onClick={generateSubCategoryDesc}
                disabled={aiLoading || !name.trim()}
                className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition-all cursor-pointer disabled:opacity-40"
                title="Generate sub-category description using AI"
              >
                <Sparkles size={10} className={aiLoading ? 'animate-spin' : ''} />
                <span>{aiLoading ? 'Writing…' : 'AI Write'}</span>
              </button>
            </div>
            <textarea 
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:border-indigo-500 focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans h-20 resize-none"
              placeholder="Sub-category specifications or details"
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-150 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
            Add <Check size={12} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddBrandModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateBrandDesc = async () => {
    if (!name.trim()) return setError('Please enter a brand name first');
    setAiLoading(true);
    setError(null);
    try {
      const res = await generateAIDescription({
        type: 'brand',
        name: name.trim(),
        customPrompt: `Provide a strictly to-the-point, 1-sentence catalog summary (under 18 words) for brand "${name.trim()}". Direct facts only, no filler or quotes.`
      });
      if (res?.description) {
        setDescription(res.description);
      }
    } catch (e) {
      setError(e.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Brand name is required');
    setSaving(true);
    setError(null);
    try {
      const res = await createBrand({ name: name.trim(), description: description.trim() });
      onSave(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full bg-white text-gray-800 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#e6fbf7] flex items-center justify-center text-[#00c795]">
            <Award size={20} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-base font-extrabold text-gray-800 leading-tight">Add New Brand</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Create a brand or manufacturer name.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs font-semibold text-gray-500 text-left">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Brand Name <span className="text-red-500">*</span></label>
            <input 
              className="w-full px-3 py-2 text-sm border-2 border-gray-250 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans"
              placeholder="e.g. Apple, Samsung, Nike, Boat"
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-gray-700 uppercase">Description (Optional)</label>
              <button
                type="button"
                onClick={generateBrandDesc}
                disabled={aiLoading || !name.trim()}
                className="inline-flex items-center gap-1 text-[9px] font-bold text-[#00c795] hover:text-[#00b084] bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-all cursor-pointer disabled:opacity-40"
                title="Generate brand description using AI"
              >
                <Sparkles size={10} className={aiLoading ? 'animate-spin' : ''} />
                <span>{aiLoading ? 'Writing…' : 'AI Write'}</span>
              </button>
            </div>
            <textarea 
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans h-24 resize-none"
              placeholder="Brand details or origin"
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-150 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-white bg-[#00c795] hover:bg-[#00b084] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
            Add <Check size={12} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateCategoryDesc = async () => {
    if (!name.trim()) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await generateAIDescription({
        type: 'category',
        name: name.trim()
      });
      if (res?.description) {
        setDescription(res.description);
      }
    } catch (e) {
      setError(e.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return setError('Category name is required');
    setSaving(true);
    setError(null);
    try {
      const res = await createCategory({ name: name.trim(), description: description.trim() });
      onSave(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-md w-full bg-white text-gray-800 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#e6fbf7] flex items-center justify-center text-[#00c795]">
            <Folder size={20} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-base font-extrabold text-gray-800 leading-tight">Add New Category</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Create a new category to organize your inventory.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4 text-xs font-semibold text-gray-500">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Category Name <span className="text-red-500">*</span></label>
            <input 
              className="w-full px-3 py-2 text-sm border-2 border-gray-250 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans"
              placeholder="e.g. Electronics"
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold text-gray-700 uppercase">Description (Optional)</label>
              <button
                type="button"
                onClick={generateCategoryDesc}
                disabled={aiLoading || !name.trim()}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-all cursor-pointer disabled:opacity-40"
                title="Fill description from category name using AI"
              >
                <Sparkles size={11} className={aiLoading ? 'animate-spin' : ''} />
                <span>{aiLoading ? 'Writing…' : 'AI Write'}</span>
              </button>
            </div>
            <textarea 
              className="w-full px-3 py-2 text-sm border border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400 font-sans h-24 resize-none"
              placeholder="Brief description of this category"
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-600 text-[10px] font-bold">
            <Info size={14} className="flex-shrink-0 text-blue-500" />
            <span>Tip: Categories help you organize and filter your inventory.</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t border-gray-150 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-white bg-[#00c795] hover:bg-[#00b084] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
            Add <Check size={12} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddUnitModal({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) return setError('Unit name is required');
    if (!shortName.trim()) return setError('Short name is required');
    setSaving(true);
    setError(null);
    try {
      await createUnit({ name: name.trim(), short_name: shortName.trim() });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-sm w-full bg-white text-gray-800 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#e6fbf7] flex items-center justify-center text-[#00c795]">
            <Tag size={20} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-gray-800 leading-tight">Add New Unit</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Create a measurement unit for your inventory.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Unit Name <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400"
              placeholder="e.g. PIECES"
              value={name}
              onChange={e => { setName(e.target.value); if (!shortName) setShortName(e.target.value.slice(0, 3).toUpperCase()); }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Short Name <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400"
              placeholder="e.g. PCS"
              value={shortName}
              maxLength={6}
              onChange={e => setShortName(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-white bg-[#00c795] hover:bg-[#00b084] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
            {saving ? 'Saving…' : <><Plus size={12} /> Add Unit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddConversionModal({ units, onClose, onSave }) {
  const [fromUnitId, setFromUnitId] = useState('');
  const [toUnitId, setToUnitId] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!fromUnitId) return setError('From unit is required');
    if (!toUnitId) return setError('To unit is required');
    if (fromUnitId === toUnitId) return setError('From and To units must be different');
    if (!rate || isNaN(rate) || Number(rate) <= 0) return setError('Enter a valid positive rate');
    setSaving(true);
    setError(null);
    try {
      await createUnitConversion({ from_unit_id: Number(fromUnitId), to_unit_id: Number(toUnitId), rate: Number(rate) });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 bg-white font-medium";

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-sm w-full bg-white text-gray-800 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#e6fbf7] flex items-center justify-center text-[#00c795]">
            <ArrowLeftRight size={20} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold text-gray-800 leading-tight">New Unit Conversion</h2>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">Define the conversion rate between two units.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">{error}</div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">From Unit <span className="text-red-500">*</span></label>
            <CustomSelect
              value={fromUnitId}
              onChange={setFromUnitId}
              options={units.map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
              placeholder="Select unit..."
              searchable={true}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">To Unit <span className="text-red-500">*</span></label>
            <CustomSelect
              value={toUnitId}
              onChange={setToUnitId}
              options={units.filter(u => String(u.id) !== String(fromUnitId)).map(u => ({ value: u.id, label: `${u.name} (${u.short_name})` }))}
              placeholder="Select unit..."
              searchable={true}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Rate <span className="text-red-500">*</span></label>
            <input
              className="w-full px-3 py-2 text-sm border-2 border-gray-200 focus:border-[#00c795] focus:outline-none rounded-lg text-gray-800 placeholder-gray-400"
              placeholder="e.g. 1000 (1 KG = 1000 GM)"
              type="number"
              min="0.0001"
              step="any"
              value={rate}
              onChange={e => setRate(e.target.value)}
            />
          </div>
          {fromUnitId && toUnitId && rate && (
            <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-600 text-[10px] font-bold">
              <Info size={14} className="flex-shrink-0" />
              1 {units.find(u => String(u.id) === String(fromUnitId))?.short_name} = {rate} {units.find(u => String(u.id) === String(toUnitId))?.short_name}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-white bg-[#00c795] hover:bg-[#00b084] rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm">
            {saving ? 'Saving…' : <><Check size={12} strokeWidth={3} /> Add</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ categories, units, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          setError('The uploaded CSV file is empty or missing data rows.');
          return;
        }

        const parseCSVLine = (line) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === 0 || (values.length === 1 && !values[0])) continue;

          const rowData = {};
          headers.forEach((h, idx) => {
            rowData[h] = values[idx] || '';
          });

          const name = rowData.itemname || rowData.name || rowData.productname || values[0];
          if (!name) continue;

          const categoryName = rowData.category || rowData.categoryname || values[1] || '';
          const barcode = rowData.barcode || rowData.code || rowData.sku || values[2] || '';
          const hsn = rowData.hsncode || rowData.hsn || values[3] || '';
          const salePrice = parseFloat(rowData.saleprice || rowData.price || values[4] || 0) || 0;
          const purchasePrice = parseFloat(rowData.purchaseprice || rowData.cost || values[5] || 0) || 0;
          const mrp = parseFloat(rowData.mrp || values[6] || 0) || 0;
          const taxRate = parseFloat(rowData.taxrate || rowData.gst || values[7] || 18) || 0;
          const currentStock = parseFloat(rowData.currentstock || rowData.stock || rowData.quantity || rowData.qty || values[8] || 0) || 0;
          const unit = rowData.unit || values[9] || 'Pcs';
          const lowStockAlert = parseFloat(rowData.lowstockalert || rowData.lowstock || values[10] || 5) || 5;
          const batchNumber = rowData.batchnumber || rowData.batch || values[11] || '';
          const expiryDate = rowData.expirydate || rowData.expiry || values[12] || '';
          const aisle = rowData.aisle || '';
          const rack = rowData.rack || '';
          const shelf = rowData.shelf || '';
          const rackLocation = rowData.location || rowData.racklocation || rowData.rack_location || '';
          const description = rowData.description || values[13] || '';

          const matchedCat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

          rows.push({
            name,
            category_id: matchedCat ? matchedCat.id : null,
            category_name: categoryName,
            barcode,
            hsn,
            sale_price: salePrice,
            purchase_price: purchasePrice,
            mrp,
            tax_rate: taxRate,
            current_stock: currentStock,
            unit: unit || 'Pcs',
            low_stock_alert: lowStockAlert,
            batch_number: batchNumber,
            expiry_date: expiryDate,
            aisle,
            rack,
            shelf,
            rack_location: rackLocation,
            description
          });
        }

        if (rows.length === 0) {
          setError('No valid product rows could be found in this CSV.');
        } else {
          setParsedRows(rows);
        }
      } catch (err) {
        setError('Failed to parse CSV file: ' + err.message);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleStartImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError(null);
    setProgress({ current: 0, total: parsedRows.length });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const item = parsedRows[i];
      try {
        await createItem({
          name: item.name,
          category_id: item.category_id,
          unit: item.unit || 'Pcs',
          barcode: item.barcode || '',
          sale_price: item.sale_price || 0,
          purchase_price: item.purchase_price || 0,
          mrp: item.mrp || 0,
          tax_rate: item.tax_rate || 0,
          current_stock: item.current_stock || 0,
          low_stock_alert: item.low_stock_alert || 5,
          description: item.description || '',
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
          aisle: item.aisle || '',
          rack: item.rack || '',
          shelf: item.shelf || '',
          rack_location: item.rack_location || ''
        });
        success++;
      } catch (e) {
        failed++;
      }
      setProgress({ current: i + 1, total: parsedRows.length });
    }

    setImporting(false);
    setSummary({ success, failed });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-2xl w-full bg-white text-gray-800 border border-gray-200 p-6 rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-gray-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6fbf7] flex items-center justify-center text-[#00c795]">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">Import Products from CSV / Excel</h2>
              <p className="text-xs text-gray-500">Bulk upload your catalog with stock, barcode, and prices.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          {summary ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check size={24} strokeWidth={3} />
              </div>
              <h3 className="text-base font-bold text-emerald-900">Import Completed Successfully!</h3>
              <p className="text-xs text-emerald-700 font-medium">
                Successfully imported <strong>{summary.success}</strong> items. {summary.failed > 0 && `(${summary.failed} skipped/failed)`}
              </p>
              <button
                onClick={() => { onSave(); onClose(); }}
                className="px-6 py-2.5 bg-[#00c795] hover:bg-[#00b084] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Done & Refresh Inventory
              </button>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-gray-300 hover:border-[#00c795] rounded-2xl p-6 text-center transition-colors bg-gray-50/50">
                <input
                  type="file"
                  accept=".csv"
                  id="csvFileInput"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="csvFileInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-500">
                    <Upload size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-800">
                    {file ? file.name : 'Click to browse or drop CSV file'}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Supports comma-separated CSV with standard headers
                  </span>
                </label>
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                    <span>Parsed Items Preview ({parsedRows.length} total):</span>
                    <span className="text-[#00c795]">Ready to Import</span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Item Name</th>
                          <th className="p-2">Sale Price</th>
                          <th className="p-2">Stock</th>
                          <th className="p-2">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2 font-medium text-gray-800 truncate max-w-[160px]">{row.name}</td>
                            <td className="p-2 text-gray-700 font-mono">₹{row.sale_price}</td>
                            <td className="p-2 text-gray-700 font-mono">{row.current_stock}</td>
                            <td className="p-2 text-gray-500">{row.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 15 && (
                    <p className="text-[11px] text-gray-400 italic">Showing first 15 of {parsedRows.length} items</p>
                  )}
                </div>
              )}

              {importing && (
                <div className="space-y-1.5 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs">
                  <div className="flex justify-between font-bold text-[#4c3cce]">
                    <span>Importing items...</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-purple-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#4c3cce] h-full transition-all duration-150"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!summary && (
          <div className="flex justify-between items-center border-t border-gray-150 pt-4 mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartImport}
              disabled={importing || parsedRows.length === 0}
              className="px-6 py-2.5 bg-[#00c795] hover:bg-[#00b084] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              {importing ? 'Processing...' : `Import ${parsedRows.length} Items`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Inventory() {
  const [items, setItems]               = useState([]);
  const [categories, setCategories]     = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands]             = useState([]);
  const [units, setUnits]               = useState([]);
  const [unitConversions, setUnitConversions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [lowStock, setLowStock]         = useState(false);
  
  const [activeTab, setActiveTab]       = useState('inventory');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const [modal, setModal]               = useState(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [subCategoryModal, setSubCategoryModal] = useState(null);
  const [brandModal, setBrandModal]     = useState(false);
  const [unitModal, setUnitModal]       = useState(false);
  const [conversionModal, setConversionModal] = useState(false);
  const [importModal, setImportModal]   = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [brandSearch, setBrandSearch]   = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);

  // Unit tab state
  const [unitSearch, setUnitSearch] = useState('');
  const [conversionSearch, setConversionSearch] = useState('');
  const [unitMenuOpen, setUnitMenuOpen] = useState(null); // unit id with open menu
  
  const [deleting, setDeleting]         = useState(null);
  const [sortKey, setSortKey]           = useState('name');
  const [sortDir, setSortDir]           = useState('asc');
  const [searchParams]                  = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (lowStock) params.lowStock = 'true';
      const [resItems, resCats, resSubCats, resBrands, resUnits, resConversions] = await Promise.all([
        getItems(params), getCategories(), getSubCategories(), getBrands(), getUnits(), getUnitConversions()
      ]);
      setItems(resItems);
      setCategories(resCats);
      setSubCategories(resSubCats || []);
      setBrands(resBrands || []);
      setUnits(resUnits);
      setUnitConversions(resConversions);
      
      if (selectedItem) {
        const updated = resItems.find(i => i.id === selectedItem.id);
        setSelectedItem(updated || null);
      }
    } catch {
      setItems([]);
      setCategories([]);
      setSubCategories([]);
      setBrands([]);
      setUnits([]);
      setUnitConversions([]);
    } finally {
      setLoading(false);
    }
  }, [search, lowStock, selectedItem]);

  useEffect(() => { load(); }, [search, lowStock]);

  useEffect(() => {
    if (searchParams.get('new') === '1') setModal('new');
    if (searchParams.get('filter') === 'low') {
      setActiveFilter('low');
      setLowStock(true);
    }
  }, [searchParams]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await deleteItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleExportCSV = (exportType = 'all') => {
    const listToExport = exportType === 'low' 
      ? items.filter(item => item.current_stock <= item.low_stock_alert)
      : items;

    if (listToExport.length === 0 && exportType !== 'template') {
      alert('No items available to export.');
      return;
    }

    const headers = [
      'Item Name',
      'Category',
      'Barcode',
      'HSN Code',
      'Sale Price',
      'Purchase Price',
      'MRP',
      'Tax Rate (%)',
      'Current Stock',
      'Unit',
      'Low Stock Alert',
      'Batch Number',
      'Expiry Date',
      'Aisle',
      'Rack',
      'Shelf',
      'Location',
      'Description'
    ];

    let rows = [];
    if (exportType === 'template') {
      rows = [
        [
          'Sample Product A',
          categories[0]?.name || 'General',
          'HK89012345',
          '3004',
          '150.00',
          '100.00',
          '160.00',
          '18',
          '50',
          'Pcs',
          '5',
          'BAT-001',
          '2027-12-31',
          'Aisle 2',
          'Rack B',
          'Shelf 4',
          'Aisle 2 • Rack B • Shelf 4',
          'Sample high quality retail item'
        ]
      ];
    } else {
      rows = listToExport.map(item => {
        const catName = categories.find(c => c.id === item.category_id)?.name || '';
        return [
          item.name || '',
          catName,
          item.barcode || '',
          item.hsn_code || '',
          item.sale_price ?? 0,
          item.purchase_price ?? 0,
          item.mrp ?? 0,
          item.tax_rate ?? 18,
          item.current_stock ?? 0,
          item.unit || 'Pcs',
          item.low_stock_alert ?? 5,
          item.batch_number || '',
          item.expiry_date || '',
          item.aisle || '',
          item.rack || '',
          item.shelf || '',
          item.rack_location || '',
          (item.description || '').replace(/\r?\n/g, ' ')
        ];
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportType === 'template' 
      ? 'hisabkhata_sample_items_template.csv'
      : exportType === 'low'
      ? `hisabkhata_low_stock_items_${new Date().toISOString().slice(0, 10)}.csv`
      : `hisabkhata_inventory_items_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...items].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Client-side statistics
  const totalInventoryValue = items.reduce((acc, item) => acc + (item.current_stock * (item.purchase_price || 0)), 0);
  const lowStockCount = items.filter(item => item.current_stock <= item.low_stock_alert).length;

  // Filter products / services / low stock locally
  const filteredItems = sorted.filter(item => {
    if (activeFilter === 'low') {
      return item.current_stock <= item.low_stock_alert;
    }
    if (activeFilter === 'services') {
      return item.unit.toLowerCase().startsWith('serv') || item.unit === 'Hour';
    }
    if (activeFilter === 'products') {
      return !item.unit.toLowerCase().startsWith('serv') && item.unit !== 'Hour';
    }
    return true;
  });

  // Filter categories list based on category tab search box
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-transparent mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Inventory Management
          </h1>
          <p className="text-xs font-medium text-gray-500 mt-0.5">
            Manage products, services, categories, and real-time stock levels
          </p>
          
          <div className="flex gap-6 mt-3 border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`text-xs sm:text-sm font-bold pb-2 px-1 transition-colors ${activeTab === 'inventory' ? 'text-[#00c795] border-b-2 border-[#00c795]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('category')}
              className={`text-xs sm:text-sm font-bold pb-2 px-1 transition-colors ${activeTab === 'category' ? 'text-[#00c795] border-b-2 border-[#00c795]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Category
            </button>
            <button 
              onClick={() => setActiveTab('brand')}
              className={`text-xs sm:text-sm font-bold pb-2 px-1 transition-colors ${activeTab === 'brand' ? 'text-[#00c795] border-b-2 border-[#00c795]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Brand
            </button>
            <button 
              onClick={() => setActiveTab('unit')}
              className={`text-xs sm:text-sm font-bold pb-2 px-1 transition-colors ${activeTab === 'unit' ? 'text-[#00c795] border-b-2 border-[#00c795]' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Unit
            </button>
          </div>
        </div>

        {/* Stat Cards & Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          
          {/* Stats Outline Box */}
          <div className="grid grid-cols-2 sm:flex items-center border border-gray-200 rounded-xl bg-white p-1 text-xs shadow-xs min-h-[44px]">
            {/* Inventory Value */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-150">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00c795] shrink-0"></span>
              <div className="leading-tight text-left min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">INVENTORY VALUE</p>
                <p className="text-xs sm:text-sm font-black text-gray-800 truncate">{fmtCurrency(totalInventoryValue)}</p>
              </div>
            </div>
            {/* Low Stock */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
              <div className="leading-tight text-left min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">LOW STOCK</p>
                <p className="text-xs sm:text-sm font-black text-gray-800 truncate">{lowStockCount} Items</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <div className="relative flex-1 sm:flex-initial">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 sm:px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 bg-white shadow-xs transition-colors h-11 cursor-pointer"
              >
                <FileSpreadsheet size={15} className="text-[#00c795]" />
                <span>Import/Export</span>
                <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)} />
                  <div className="absolute left-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-2xl shadow-xl p-1.5 z-40 space-y-0.5 animate-fade-in text-xs font-semibold">
                    <button
                      onClick={() => { setExportMenuOpen(false); setImportModal(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                    >
                      <Upload size={15} className="text-[#00c795]" />
                      <span>Import Products (CSV)</span>
                    </button>
                    <button
                      onClick={() => handleExportCSV('all')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                    >
                      <Download size={15} className="text-blue-500" />
                      <span>Export All Items to CSV</span>
                    </button>
                    <button
                      onClick={() => handleExportCSV('low')}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left cursor-pointer"
                    >
                      <AlertTriangle size={15} className="text-amber-500" />
                      <span>Export Low Stock Items</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onClick={() => handleExportCSV('template')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors text-left cursor-pointer text-[11px]"
                    >
                      <FileText size={14} />
                      <span>Download Sample CSV Template</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button onClick={() => setModal('new')} className="flex-1 sm:flex-initial bg-[#00c795] hover:bg-[#00b084] text-white text-xs font-bold px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors h-11 cursor-pointer">
              <Plus size={16} strokeWidth={2.5} className="shrink-0" /> Add Item
            </button>
          </div>

        </div>
      </div>

      {/* ─── TAB 1: INVENTORY ─────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          
          {/* Left Panel - Items List */}
          <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[580px] max-h-[720px]">
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                className="w-full pl-9 pr-4 py-2 text-xs font-medium border border-gray-200 rounded-xl focus:outline-none focus:border-[#00c795] focus:ring-1 focus:ring-[#00c795] text-gray-800 placeholder-gray-400 bg-[#fcfdfe]"
                placeholder="Search items by name or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Toggle Tabs / Filter buttons */}
            <div className="flex gap-1 mb-3">
              {[
                { key: 'all', label: 'All' },
                { key: 'products', label: 'Products' },
                { key: 'services', label: 'Services' },
                { key: 'low', label: 'Low Stock' }
              ].map(tab => {
                const isActive = tab.key === activeFilter;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveFilter(tab.key);
                      if (tab.key === 'low') setLowStock(true);
                      else setLowStock(false);
                    }}
                    className={`flex-1 py-1 px-1.5 text-[11px] font-bold rounded-lg transition-colors border text-center ${
                      isActive 
                        ? 'bg-[#00c795] border-[#00c795] text-white shadow-xs' 
                        : 'bg-[#eef2f6]/70 border-transparent text-gray-600 hover:bg-gray-150 hover:border-gray-250'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center px-3 py-2 bg-gray-50 border-y border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 select-none rounded-t-lg">
              <div className="cursor-pointer flex items-center gap-1 hover:text-gray-800" onClick={() => toggleSort('name')}>
                <span>ITEM & CODE</span>
                <SortIcon col="name" />
              </div>
              <div className="cursor-pointer flex items-center gap-1 hover:text-gray-800" onClick={() => toggleSort('current_stock')}>
                <span>STOCK & PRICE</span>
                <SortIcon col="current_stock" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <div className="w-6 h-6 border-2 border-[#00c795] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 font-semibold">Loading items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 text-xs text-gray-400 font-semibold">
                  No items found.
                </div>
              ) : filteredItems.map(item => {
                const isSelected = selectedItem?.id === item.id;
                const isLow = item.current_stock <= item.low_stock_alert;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-emerald-50/50 border-[#00c795] shadow-xs' 
                        : 'bg-white border-gray-150 hover:bg-gray-50/80 hover:border-gray-250'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5 flex-1 pr-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                          <Package size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 font-medium flex-wrap">
                          {item.barcode && <span className="font-mono">{item.barcode}</span>}
                          {item.barcode && item.category_id && <span>•</span>}
                          {item.category_id && (
                            <span className="truncate max-w-[90px]">
                              {categories.find(c => c.id === item.category_id)?.name}
                            </span>
                          )}
                          {(item.rack_location || item.rack || item.shelf || item.aisle) && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold text-[9.5px] border border-emerald-200/80 truncate max-w-[130px]" title={item.rack_location || `Rack: ${item.rack || ''} Shelf: ${item.shelf || ''}`}>
                                <MapPin size={9} className="shrink-0 text-emerald-600" />
                                <span className="truncate">{item.rack_location || [item.aisle ? `A:${item.aisle}` : null, item.rack ? `R:${item.rack}` : null, item.shelf ? `S:${item.shelf}` : null].filter(Boolean).join(' ')}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xs font-black number-cell ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                          {fmt(item.current_stock, 0)}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">{item.unit}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 font-mono mt-0.5">
                        {fmtCurrency(item.sale_price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Panel - Item Details or Empty State */}
          <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[580px]">
            {selectedItem ? (
              <div className="w-full flex flex-col text-left space-y-5">
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4 pb-4 sm:pb-5 border-b border-gray-150">
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 w-full sm:flex-1">
                    {selectedItem.image_url ? (
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.name} 
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-slate-200/85 shadow-xs shrink-0 bg-white" 
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-xs">
                        <Package size={28} strokeWidth={1.8} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 leading-snug break-words">
                        {selectedItem.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-bold inline-flex items-center gap-1 shrink-0 ${
                          selectedItem.current_stock <= selectedItem.low_stock_alert
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${selectedItem.current_stock <= selectedItem.low_stock_alert ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {selectedItem.current_stock <= selectedItem.low_stock_alert ? 'Low Stock Warning' : 'In Stock'}
                        </span>
                        {selectedItem.brand && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-[10.5px] font-bold shrink-0">
                            Brand: {selectedItem.brand}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-mono shrink-0">
                          Unit: {selectedItem.unit}
                        </span>
                        {selectedItem.category_id && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-[10.5px] font-semibold">
                            {categories.find(c => c.id === selectedItem.category_id)?.name || 'Categorized'}
                            {selectedItem.sub_category ? ` › ${selectedItem.sub_category}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
                    <button 
                      onClick={() => setModal(selectedItem)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-xs shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Edit2 size={13} strokeWidth={2.4} />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedItem.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 border border-rose-200 hover:border-rose-300 rounded-xl bg-rose-50/70 hover:bg-rose-100 active:scale-98 text-rose-600 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      title="Delete item"
                    >
                      <Trash2 size={13} strokeWidth={2.2} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-left space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Sale Price</span>
                    <p className="text-base sm:text-lg font-black text-emerald-700 number-cell">
                      {fmtCurrency(selectedItem.sale_price)}
                    </p>
                    {selectedItem.purchase_price > 0 && selectedItem.sale_price > selectedItem.purchase_price && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        +{(((selectedItem.sale_price - selectedItem.purchase_price) / selectedItem.purchase_price) * 100).toFixed(0)}% margin
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Purchase Cost</span>
                    <p className="text-base sm:text-lg font-black text-slate-800 number-cell">
                      {fmtCurrency(selectedItem.purchase_price)}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Cost per {selectedItem.unit}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Stock</span>
                    <p className={`text-base sm:text-lg font-black number-cell ${selectedItem.current_stock <= selectedItem.low_stock_alert ? 'text-red-600' : 'text-slate-800'}`}>
                      {fmt(selectedItem.current_stock, 0)} <span className="text-xs text-slate-400 font-normal">{selectedItem.unit}</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Min Alert: {selectedItem.low_stock_alert} {selectedItem.unit}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-left space-y-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Stock Value</span>
                    <p className="text-base sm:text-lg font-black text-purple-800 number-cell">
                      {fmtCurrency((selectedItem.current_stock || 0) * (selectedItem.purchase_price || 0))}
                    </p>
                    <span className="text-[10px] text-purple-600 font-medium block">
                      Asset valuation
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3 text-left">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                      <Tag size={13} className="text-[#00c795]" />
                      <span>Pricing & Tax Breakdown</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">GST Tax Rate</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedItem.tax_rate ?? 18}%</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">HSN / SAC Code</span>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedItem.hsn_code || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">MRP (Max Retail)</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedItem.mrp ? fmtCurrency(selectedItem.mrp) : '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Wholesale Price</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedItem.wholesale_price ? fmtCurrency(selectedItem.wholesale_price) : '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-3 text-left">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                      <Package size={13} className="text-[#00c795]" />
                      <span>Identification & Traceability</span>
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Barcode / SKU</span>
                        <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">{selectedItem.barcode || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Batch Number</span>
                        <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedItem.batch_number || '—'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</span>
                        <p className={`font-bold mt-0.5 ${selectedItem.expiry_date ? 'text-red-600' : 'text-slate-800'}`}>
                          {selectedItem.expiry_date ? new Date(selectedItem.expiry_date).toLocaleDateString('en-IN') : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Measurement</span>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedItem.unit}</p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 text-left">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 flex-wrap gap-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={13} className="text-emerald-600" />
                        <span>Storage & Warehouse Location</span>
                      </h3>
                      {selectedItem.rack_location ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 inline-flex items-center gap-1">
                          <MapPin size={10} />
                          <span>{selectedItem.rack_location}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">Not assigned</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aisle</span>
                        <p className="font-black text-slate-900 text-sm mt-0.5 truncate">{selectedItem.aisle || '—'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rack</span>
                        <p className="font-black text-slate-900 text-sm mt-0.5 truncate">{selectedItem.rack || '—'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shelf / Bin</span>
                        <p className="font-black text-slate-900 text-sm mt-0.5 truncate">{selectedItem.shelf || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedItem.description && (
                    <div className="col-span-1 md:col-span-2 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/80 space-y-1.5 text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description & Specs</span>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {selectedItem.description}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-gray-200 flex items-center justify-center mb-4 text-[#8a94a6] shadow-sm">
                  <Package size={28} strokeWidth={1.5} />
                </div>
                <p className="text-base font-extrabold text-[#1a1f36]">No Item Selected</p>
                <p className="text-xs text-gray-400 font-medium mt-1 max-w-[240px]">Select an item from the list on the left to view details and options.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'category' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL CATEGORIES</p>
                <p className="text-3xl font-black text-gray-800">{categories.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00c795] shadow-sm">
                <Folder size={24} strokeWidth={1.5} />
              </div>
            </div>

            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL SUB-CATEGORIES</p>
                <p className="text-3xl font-black text-indigo-600">{subCategories.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <Layers size={24} strokeWidth={1.5} />
              </div>
            </div>

            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL ITEMS</p>
                <p className="text-3xl font-black text-gray-800">{items.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Package size={24} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[440px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[500px] max-h-[620px]">
              <div className="flex items-center justify-between mb-3.5 gap-2">
                <h3 className="text-base font-extrabold text-[#1a1f36] shrink-0">Categories</h3>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setSubCategoryModal({ category_id: selectedCategory?.id || categories[0]?.id || '' })}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-indigo-200 transition-colors cursor-pointer"
                    title="Add Sub-category"
                  >
                    <Plus size={12} strokeWidth={3} /> Sub-category
                  </button>
                  <button 
                    onClick={() => setCategoryModal(true)}
                    className="bg-[#00c795] hover:bg-[#00b084] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus size={12} strokeWidth={3} /> Category
                  </button>
                </div>
              </div>

              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#00c795] focus:ring-1 focus:ring-[#00c795] text-gray-800 placeholder-gray-400 bg-[#fcfdfe]"
                  placeholder="Search categories or sub-categories..."
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 px-3 py-2 bg-gray-50 border-y border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                <div className="col-span-8">CATEGORY & SUB-CATEGORIES</div>
                <div className="col-span-4 text-center">ITEMS</div>
              </div>

              <div className="flex-1 overflow-y-auto pr-0.5 space-y-1.5">
                <div
                  onClick={() => { setSelectedCategory('uncategorized'); setSelectedSubCategory(null); }}
                  className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                    selectedCategory === 'uncategorized'
                      ? 'bg-brand-50/50 border-[#00c795] shadow-sm'
                      : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="col-span-8 font-bold text-xs text-gray-700 uppercase">
                    Items not in any Category
                  </div>
                  <div className="col-span-4 text-center">
                    <span className="px-2 py-0.5 bg-[#e6fbf7] text-[10px] font-black text-[#00c795] rounded-full border border-[#00c795]/10">
                      {items.filter(i => !i.category_id).length}
                    </span>
                  </div>
                </div>

                {filteredCategories.map(cat => {
                  const isCatSelected = selectedCategory?.id === cat.id && !selectedSubCategory;
                  const catSubCats = subCategories.filter(sc => sc.category_id === cat.id);
                  const isExpanded = expandedCategories[cat.id] ?? true;
                  const count = items.filter(i => i.category_id === cat.id).length;

                  return (
                    <div key={cat.id} className="rounded-xl border border-gray-150 overflow-hidden bg-white shadow-2xs">
                      <div
                        onClick={() => { setSelectedCategory(cat); setSelectedSubCategory(null); }}
                        className={`grid grid-cols-12 items-center px-3 py-2.5 cursor-pointer transition-all ${
                          isCatSelected
                            ? 'bg-emerald-50/70 border-l-4 border-l-[#00c795]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="col-span-8 flex items-center gap-1.5 min-w-0 pr-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategories(prev => ({ ...prev, [cat.id]: !isExpanded }));
                            }}
                            className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            <ChevronDown size={14} className={`transition-transform duration-150 ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 uppercase truncate leading-tight">{cat.name}</p>
                            {cat.description && <p className="text-[10px] text-gray-400 truncate">{cat.description}</p>}
                          </div>
                        </div>
                        <div className="col-span-4 flex items-center justify-end gap-1.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-bold text-gray-700 rounded-full">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubCategoryModal({ category_id: cat.id });
                            }}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-100"
                            title="Add sub-category under this category"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`Delete category "${cat.name}" and its subcategories?`)) {
                                await deleteCategory(cat.id);
                                if (selectedCategory?.id === cat.id) setSelectedCategory(null);
                                load();
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete Category"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="bg-slate-50/50 border-t border-gray-100 px-2 py-1 space-y-1">
                          {catSubCats.length === 0 ? (
                            <div className="flex items-center justify-between py-1.5 px-3 text-[11px] text-slate-400 italic">
                              <span>No subcategories yet</span>
                              <button
                                type="button"
                                onClick={() => setSubCategoryModal({ category_id: cat.id })}
                                className="text-indigo-600 font-bold hover:underline text-[10px]"
                              >
                                + Add (e.g. LED Light, Switch)
                              </button>
                            </div>
                          ) : (
                            catSubCats.map(sc => {
                              const isSubSelected = selectedCategory?.id === cat.id && selectedSubCategory?.id === sc.id;
                              const subCount = items.filter(i => i.sub_category_id === sc.id || (i.sub_category === sc.name && i.category_id === cat.id)).length;
                              return (
                                <div
                                  key={sc.id}
                                  onClick={() => { setSelectedCategory(cat); setSelectedSubCategory(sc); }}
                                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                                    isSubSelected
                                      ? 'bg-indigo-100/70 text-indigo-900 font-bold'
                                      : 'hover:bg-indigo-50/50 text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <CornerDownRight size={12} className="text-indigo-400 shrink-0" />
                                    <span className="text-xs font-semibold truncate">{sc.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-1.5 py-0.5 bg-white text-[9px] font-bold text-indigo-700 border border-indigo-200 rounded-full">
                                      {subCount}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm(`Delete sub-category "${sc.name}"?`)) {
                                          await deleteSubCategory(sc.id);
                                          if (selectedSubCategory?.id === sc.id) setSelectedSubCategory(null);
                                          load();
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                                      title="Delete Sub-category"
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[500px] justify-center items-center">
              {selectedCategory ? (
                <div className="w-full h-full flex flex-col text-left">
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-[#1a1f36] uppercase tracking-wide">
                            {selectedCategory === 'uncategorized' ? 'Items not in any Category' : selectedCategory.name}
                          </h2>
                          {selectedSubCategory && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                              <CornerDownRight size={11} />
                              {selectedSubCategory.name}
                            </span>
                          )}
                        </div>
                        {selectedCategory !== 'uncategorized' && selectedCategory.description && (
                          <p className="text-xs text-gray-400 mt-1 font-medium">{selectedCategory.description}</p>
                        )}
                      </div>

                      {selectedCategory !== 'uncategorized' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSubCategoryModal({ category_id: selectedCategory.id })}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus size={12} strokeWidth={3} /> Add Sub-category
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedCategory !== 'uncategorized' && subCategories.filter(sc => sc.category_id === selectedCategory.id).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filter Sub-category:</span>
                        <button
                          onClick={() => setSelectedSubCategory(null)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            !selectedSubCategory
                              ? 'bg-[#00c795] text-white border-[#00c795] shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          All ({items.filter(i => i.category_id === selectedCategory.id).length})
                        </button>
                        {subCategories.filter(sc => sc.category_id === selectedCategory.id).map(sc => {
                          const isSubSelected = selectedSubCategory?.id === sc.id;
                          const count = items.filter(i => i.sub_category_id === sc.id || (i.sub_category === sc.name && i.category_id === selectedCategory.id)).length;
                          return (
                            <button
                              key={sc.id}
                              onClick={() => setSelectedSubCategory(isSubSelected ? null : sc)}
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                isSubSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-indigo-50/60 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100'
                              }`}
                            >
                              <span>{sc.name}</span>
                              <span className={`text-[10px] px-1 rounded-full ${isSubSelected ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'}`}>{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-xs font-semibold text-gray-500">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-2.5">Item Name</th>
                          <th className="py-2.5">Sub-category</th>
                          <th className="py-2.5">Brand</th>
                          <th className="py-2.5 text-right">Sale Price</th>
                          <th className="py-2.5 text-center">Stock</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.filter(i => {
                          if (selectedCategory === 'uncategorized') return !i.category_id;
                          if (selectedSubCategory) {
                            return i.category_id === selectedCategory.id && (i.sub_category_id === selectedSubCategory.id || i.sub_category === selectedSubCategory.name);
                          }
                          return i.category_id === selectedCategory.id;
                        }).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-400 font-medium">
                              No items in this category or sub-category.
                            </td>
                          </tr>
                        ) : items.filter(i => {
                          if (selectedCategory === 'uncategorized') return !i.category_id;
                          if (selectedSubCategory) {
                            return i.category_id === selectedCategory.id && (i.sub_category_id === selectedSubCategory.id || i.sub_category === selectedSubCategory.name);
                          }
                          return i.category_id === selectedCategory.id;
                        }).map(item => {
                          const isLow = item.current_stock <= item.low_stock_alert;
                          return (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                              <td className="py-3 font-bold text-gray-800 uppercase">{item.name}</td>
                              <td className="py-3">
                                {item.sub_category ? (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[10px] font-bold">
                                    {item.sub_category}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="py-3">
                                {item.brand ? (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-bold">
                                    {item.brand}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="py-3 text-right font-black text-emerald-600">{fmtCurrency(item.sale_price)}</td>
                              <td className="py-3 text-center">
                                <span className={`font-black ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                                  {fmt(item.current_stock, 0)}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold ml-0.5">{item.unit}</span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => setModal(item)}
                                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                                    title="Edit Item"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                    title="Delete Item"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-gray-200 flex items-center justify-center mb-4 text-[#8a94a6] shadow-sm">
                    <FolderTree size={28} strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-extrabold text-[#1a1f36]">Select a Category or Sub-category</p>
                  <p className="text-xs text-gray-400 font-medium mt-1 max-w-[240px]">Select a category or sub-category from the list on the left to view the products grouped inside.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: BRAND ────────────────────────────────────────────────────── */}
      {activeTab === 'brand' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL BRANDS</p>
                <p className="text-3xl font-black text-gray-800">{brands.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Award size={24} strokeWidth={1.5} />
              </div>
            </div>

            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL BRANDED ITEMS</p>
                <p className="text-3xl font-black text-gray-800">{items.filter(i => i.brand).length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Package size={24} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[420px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[450px] max-h-[550px]">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-base font-extrabold text-[#1a1f36]">Brand List</h3>
                <button 
                  onClick={() => setBrandModal(true)}
                  className="bg-[#00c795] hover:bg-[#00b084] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={13} strokeWidth={3} /> Add Brand
                </button>
              </div>

              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#00c795] focus:ring-1 focus:ring-[#00c795] text-gray-800 placeholder-gray-400 bg-[#fcfdfe]"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={e => setBrandSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 px-3 py-2 bg-gray-50 border-y border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                <div className="col-span-8">BRAND NAME</div>
                <div className="col-span-4 text-center">ITEMS</div>
              </div>

              <div className="flex-1 overflow-y-auto pr-0.5 space-y-1">
                {brands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => {
                  const isSelected = selectedBrand?.id === brand.id;
                  const count = items.filter(i => i.brand === brand.name).length;
                  return (
                    <div
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand)}
                      className={`grid grid-cols-12 items-center px-3 py-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-brand-50/50 border-[#00c795] shadow-sm'
                          : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <div className="col-span-8 min-w-0 pr-2">
                        <p className="text-xs font-bold text-gray-800 uppercase truncate leading-tight">{brand.name}</p>
                        {brand.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{brand.description}</p>}
                      </div>
                      <div className="col-span-4 text-center">
                        <span className="px-2.5 py-0.5 bg-gray-50 text-[10px] font-bold text-gray-500 rounded-full border border-gray-200">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col min-h-[450px] justify-center items-center">
              {selectedBrand ? (
                <div className="w-full h-full flex flex-col text-left">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <h2 className="text-base font-extrabold text-[#1a1f36] uppercase tracking-wide">
                        {selectedBrand.name}
                      </h2>
                      {selectedBrand.description && (
                        <p className="text-xs text-gray-400 mt-1 font-medium">{selectedBrand.description}</p>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete brand ${selectedBrand.name}?`)) {
                          await deleteBrand(selectedBrand.id);
                          setSelectedBrand(null);
                          load();
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors"
                      title="Delete brand"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-xs font-semibold text-gray-500">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-2.5">Item Name</th>
                          <th className="py-2.5 text-right">Sale Price</th>
                          <th className="py-2.5 text-center">Stock</th>
                          <th className="py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.filter(i => i.brand === selectedBrand.name).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-10 text-center text-xs text-gray-400">
                              No items assigned to this brand yet.
                            </td>
                          </tr>
                        ) : (
                          items.filter(i => i.brand === selectedBrand.name).map(item => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 font-bold text-gray-800">{item.name}</td>
                              <td className="py-3 text-right font-mono text-emerald-600 font-bold">{fmtCurrency(item.sale_price)}</td>
                              <td className="py-3 text-center font-bold text-gray-700">{item.current_stock} {item.unit}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => setModal(item)}
                                  className="text-[#00c795] hover:underline font-bold"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-gray-200 flex items-center justify-center mb-4 text-[#8a94a6] shadow-sm">
                    <Award size={28} strokeWidth={1.5} />
                  </div>
                  <p className="text-base font-extrabold text-[#1a1f36]">Select a Brand</p>
                  <p className="text-xs text-gray-400 font-medium mt-1 max-w-[240px]">Select a brand from the list on the left to view the products grouped inside.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: UNIT ─────────────────────────────────────────────────────── */}
      {activeTab === 'unit' && (
        <div className="space-y-5">

          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL UNITS</p>
                <p className="text-3xl font-black text-gray-800">{units.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Tag size={24} strokeWidth={1.5} />
              </div>
            </div>
            <div className="flat-card p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL CONVERSIONS</p>
                <p className="text-3xl font-black text-gray-800">{unitConversions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                <Calculator size={24} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">

            <div className="w-full lg:w-[380px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[480px] max-h-[580px]">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-base font-extrabold text-[#1a1f36]">Units Directory</h3>
                <button
                  onClick={() => setUnitModal(true)}
                  className="bg-[#00c795] hover:bg-[#00b084] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus size={12} /> Add Unit
                </button>
              </div>

              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#00c795] text-gray-800 placeholder-gray-400 bg-[#fcfdfe]"
                  placeholder="Search units (Pcs, Box, Kg)..."
                  value={unitSearch}
                  onChange={e => setUnitSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-12 px-3 py-2 bg-gray-50 border-y border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                <div className="col-span-7">UNIT NAME</div>
                <div className="col-span-4 text-center">SHORT NAME</div>
                <div className="col-span-1"></div>
              </div>

              <div className="flex-1 overflow-y-auto pr-0.5">
                {units.filter(u => u.name.toLowerCase().includes(unitSearch.toLowerCase())).length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-400 font-semibold">
                    {units.length === 0 ? 'No units yet. Click + Add Unit to get started.' : 'No units match your search.'}
                  </div>
                ) : units.filter(u => u.name.toLowerCase().includes(unitSearch.toLowerCase())).map(unit => (
                  <div key={unit.id} className="grid grid-cols-12 items-center px-3 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
                    <div className="col-span-7 text-xs font-bold text-gray-800 uppercase tracking-wide">{unit.name}</div>
                    <div className="col-span-4 flex justify-center">
                      <span className="px-2 py-0.5 bg-white border border-gray-300 text-[10px] font-bold text-gray-600 rounded">{unit.short_name}</span>
                    </div>
                    <div className="col-span-1 relative">
                      <button
                        onClick={() => setUnitMenuOpen(unitMenuOpen === unit.id ? null : unit.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {unitMenuOpen === unit.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setUnitMenuOpen(null)} />
                          <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[100px] py-1">
                            <button
                              onClick={async () => { setUnitMenuOpen(null); if (confirm('Delete this unit?')) { await deleteUnit(unit.id); load(); } }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col min-h-[480px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#1a1f36] font-extrabold text-base">
                  <ArrowLeftRight size={18} className="text-gray-500" strokeWidth={2} />
                  Unit Conversions
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#00c795] text-gray-800 placeholder-gray-400"
                      placeholder="Search conversions..."
                      value={conversionSearch}
                      onChange={e => setConversionSearch(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setConversionModal(true)}
                    className="bg-[#00c795] hover:bg-[#00b084] text-white text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1 shadow-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus size={12} /> New Conversion
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <th className="py-2.5 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">SL.NO</th>
                      <th className="py-2.5 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">FROM UNIT</th>
                      <th className="py-2.5 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">TO UNIT</th>
                      <th className="py-2.5 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">RATE ↑↓</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitConversions.filter(c =>
                      !conversionSearch ||
                      c.from_unit_name?.toLowerCase().includes(conversionSearch.toLowerCase()) ||
                      c.to_unit_name?.toLowerCase().includes(conversionSearch.toLowerCase())
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-20 text-xs text-gray-400 font-semibold">
                          {unitConversions.length === 0 ? 'No conversions yet. Click + New Conversion to add.' : 'No results found.'}
                        </td>
                      </tr>
                    ) : unitConversions.filter(c =>
                      !conversionSearch ||
                      c.from_unit_name?.toLowerCase().includes(conversionSearch.toLowerCase()) ||
                      c.to_unit_name?.toLowerCase().includes(conversionSearch.toLowerCase())
                    ).map((conv, idx) => (
                      <tr key={conv.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-3 text-xs text-gray-400 font-semibold">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-700 rounded">{conv.from_unit_short}</span>
                          <span className="ml-1.5 text-xs font-bold text-gray-800 uppercase">{conv.from_unit_name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-700 rounded">{conv.to_unit_short}</span>
                          <span className="ml-1.5 text-xs font-bold text-gray-800 uppercase">{conv.to_unit_name}</span>
                        </td>
                        <td className="py-3 px-3 text-xs font-black text-gray-800">{conv.rate}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={async () => { if (confirm('Delete this conversion?')) { await deleteUnitConversion(conv.id); load(); } }}
                            className="p-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Item Modal */}
      {modal && (
        <ItemModal
          item={modal === 'new' ? null : modal}
          categories={categories}
          subCategories={subCategories}
          brands={brands}
          units={units}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {/* Category Modal */}
      {categoryModal && (
        <CategoryModal
          onClose={() => setCategoryModal(false)}
          onSave={() => { setCategoryModal(false); load(); }}
        />
      )}

      {/* Sub-category Modal */}
      {subCategoryModal && (
        <AddSubCategoryModal
          categories={categories}
          defaultCategoryId={subCategoryModal?.category_id}
          onClose={() => setSubCategoryModal(null)}
          onSave={() => { setSubCategoryModal(null); load(); }}
        />
      )}

      {/* Brand Modal */}
      {brandModal && (
        <AddBrandModal
          onClose={() => setBrandModal(false)}
          onSave={() => { setBrandModal(false); load(); }}
        />
      )}

      {/* Add Unit Modal */}
      {unitModal && (
        <AddUnitModal
          onClose={() => setUnitModal(false)}
          onSave={() => { setUnitModal(false); load(); }}
        />
      )}

      {/* Add Conversion Modal */}
      {conversionModal && (
        <AddConversionModal
          units={units}
          onClose={() => setConversionModal(false)}
          onSave={() => { setConversionModal(false); load(); }}
        />
      )}

      {/* Import CSV Modal */}
      {importModal && (
        <ImportModal
          categories={categories}
          units={units}
          onClose={() => setImportModal(false)}
          onSave={() => { setImportModal(false); load(); }}
        />
      )}

    </div>
  );
}
