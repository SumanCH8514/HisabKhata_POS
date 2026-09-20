import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Trash2, Search, Printer,
  User, Package, Check, RefreshCw, X, ArrowRight,
  CreditCard, Smartphone, Banknote, Clock, Bookmark,
  ChevronRight, ChevronUp, ChevronDown, Minus, AlertCircle, Sparkles, Bluetooth, Zap,
  Maximize2, Minimize2, ScanLine, Camera, UserPlus, Phone, Wallet, MapPin, Mail, Send
} from 'lucide-react';
import { getItems, getParties, createParty, createInvoice, sendInvoiceReceipt, fmtCurrency, fmt, getPosSettings, isBusinessGstRegistered } from '../api/client.js';
import { getConnectedPrinter, printEscPosInvoice } from '../utils/bluetoothPrinter.js';

const playScannerBeep = () => {
  try {
    const posCfg = getPosSettings();
    if (posCfg.scannerBeep === false) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1800;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch { }
};

export default function POSBilling() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem('hk_pos_cached_items');
      if (cached) return JSON.parse(cached);
    } catch { }
    return [];
  });
  const [parties, setParties] = useState(() => {
    try {
      const cached = localStorage.getItem('hk_pos_cached_parties');
      if (cached) return JSON.parse(cached);
    } catch { }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('hk_pos_cached_items');
      return !cached;
    } catch { }
    return true;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hk_pos_cart') || '[]'); } catch { return []; }
  });
  const [selectedParty, setSelectedParty] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hk_pos_party') || 'null'); } catch { return null; }
  });
  const [partySearch, setPartySearch] = useState('');
  const [showPartySelect, setShowPartySelect] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '', gst_number: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSendStatus, setEmailSendStatus] = useState(null);
  const [isRegistered, setIsRegistered] = useState(() => isBusinessGstRegistered());
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [selectedUpiOption, setSelectedUpiOption] = useState('BharatPe');
  const [customReceivedAmount, setCustomReceivedAmount] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [heldBills, setHeldBills] = useState([]);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mobileDetailItem, setMobileDetailItem] = useState(null);
  const [mobileCartState, setMobileCartState] = useState(() => (cart && cart.length > 0 ? 'half' : 'collapsed'));
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef(null);

  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleItemTouchStart = (item, e) => {
    isLongPress.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      try {
        if (navigator.vibrate) navigator.vibrate(40);
      } catch {}
      setMobileDetailItem(item);
    }, 450);
  };

  const handleItemTouchMove = (e) => {
    const moveX = Math.abs(e.touches[0].clientX - touchStartPos.current.x);
    const moveY = Math.abs(e.touches[0].clientY - touchStartPos.current.y);
    if (moveX > 8 || moveY > 8) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleItemTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const prevCartLenRef = useRef(cart.length);
  useEffect(() => {
    if (prevCartLenRef.current === 0 && cart.length > 0) {
      setMobileCartState('half');
    } else if (cart.length === 0) {
      setMobileCartState('collapsed');
    }
    prevCartLenRef.current = cart.length;
  }, [cart.length]);

  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchCurrentY.current;
    if (diff > 140) {
      setMobileCartState('full');
    } else if (diff > 35) {
      setMobileCartState(prev => prev === 'collapsed' ? 'half' : 'full');
    } else if (diff < -120) {
      setMobileCartState('collapsed');
    } else if (diff < -35) {
      setMobileCartState(prev => prev === 'full' ? 'half' : 'collapsed');
    }
  };

  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleProfileUpdate = () => {
      setIsRegistered(isBusinessGstRegistered());
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('company_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('company_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => { });
      } else {
        document.documentElement.requestFullscreen().catch(() => { });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    }
  };

  const handleBarcodeScannedInPos = (code) => {
    if (!code) return { success: false };
    const clean = code.trim().toLowerCase();
    const matched = items.find(it =>
      (it.barcode && it.barcode.toLowerCase() === clean) ||
      (it.sku && it.sku.toLowerCase() === clean) ||
      it.name.toLowerCase() === clean
    );
    if (matched) {
      handleAddToCart(matched);
      return { success: true, item: matched };
    } else {
      setSearchQuery(code);
      return { success: false, notFound: true, code };
    }
  };

  const loadData = () => {
    if (items.length === 0) setLoading(true);
    Promise.all([
      getItems(),
      getParties({ type: 'CUSTOMER' })
    ])
      .then(([itemList, partyList]) => {
        const freshItems = itemList || [];
        const freshParties = partyList || [];
        setItems(freshItems);
        setParties(freshParties);
        try {
          localStorage.setItem('hk_pos_cached_items', JSON.stringify(freshItems));
          localStorage.setItem('hk_pos_cached_parties', JSON.stringify(freshParties));
        } catch { }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const savedHeld = localStorage.getItem('hk_held_bills');
    if (savedHeld) {
      try { setHeldBills(JSON.parse(savedHeld)); } catch { }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('hk_pos_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('hk_pos_party', JSON.stringify(selectedParty));
  }, [selectedParty]);

  const handleFastAddCustomer = async (searchVal) => {
    const val = (searchVal || partySearch || '').trim();
    if (!val) return;
    const hasDigits = /\d/.test(val);
    const phoneVal = hasDigits ? val : '';
    setSavingCustomer(true);
    setCustomerError('');
    try {
      const res = await createParty({
        name: val,
        phone: phoneVal,
        address: '',
        gst_number: '',
        type: 'CUSTOMER'
      });
      const created = {
        id: res?.id || Date.now(),
        name: val,
        phone: phoneVal,
        address: '',
        type: 'CUSTOMER'
      };
      setParties(prev => [created, ...prev]);
      setSelectedParty(created);
      setShowPartySelect(false);
      setPartySearch('');
      try {
        const cached = JSON.parse(localStorage.getItem('hk_pos_cached_parties') || '[]');
        localStorage.setItem('hk_pos_cached_parties', JSON.stringify([created, ...cached]));
      } catch { }
    } catch (err) {
      alert(err.message || 'Failed to quickly add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleOpenAddDetails = (searchVal) => {
    const val = (searchVal || partySearch || '').trim();
    const hasDigits = /\d/.test(val);
    const hasAt = val.includes('@');
    const phoneVal = (hasDigits && !hasAt) ? val : '';
    const emailVal = hasAt ? val : '';
    setNewCustomerForm({
      name: hasAt ? '' : val,
      phone: phoneVal,
      email: emailVal,
      address: '',
      gst_number: ''
    });
    setCustomerError('');
    setShowAddCustomerModal(true);
    setShowPartySelect(false);
  };

  const handleQuickCreateCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustomerForm.name.trim()) {
      setCustomerError('Customer name is required');
      return;
    }
    setSavingCustomer(true);
    setCustomerError('');
    try {
      const res = await createParty({
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email?.trim() || '',
        address: newCustomerForm.address.trim(),
        gst_number: newCustomerForm.gst_number.trim(),
        type: 'CUSTOMER'
      });
      const created = {
        id: res?.id || Date.now(),
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email?.trim() || '',
        address: newCustomerForm.address.trim(),
        type: 'CUSTOMER'
      };
      setParties(prev => [created, ...prev]);
      setSelectedParty(created);
      setShowPartySelect(false);
      setShowAddCustomerModal(false);
      setNewCustomerForm({ name: '', phone: '', email: '', address: '', gst_number: '' });
      try {
        const cached = JSON.parse(localStorage.getItem('hk_pos_cached_parties') || '[]');
        localStorage.setItem('hk_pos_cached_parties', JSON.stringify([created, ...cached]));
      } catch { }
    } catch (err) {
      setCustomerError(err.message || 'Failed to create customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(items.map(i => i.category_name).filter(Boolean)))];

  const handleAddToCart = (item, qty = 1) => {
    playScannerBeep();
    setCart(prev => {
      const existing = prev.find(line => line.id === item.id);
      if (existing) {
        return prev.map(line => line.id === item.id ? { ...line, quantity: line.quantity + qty } : line);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        unit: item.unit || 'Pcs',
        rate: item.sale_price || 0,
        tax_rate: isRegistered ? (item.tax_rate || 0) : 0,
        mrp: (item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0) ? Number(item.mrp) : (item.sale_price || 0),
        quantity: qty,
        discount: 0
      }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(line => {
      if (line.id === id) {
        const newQty = line.quantity + delta;
        if (newQty <= 0) return null;
        return { ...line, quantity: newQty };
      }
      return line;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(line => line.id !== id));
  };

  const taxMode = (() => {
    try {
      const saved = localStorage.getItem('hk_tax_calculation_mode');
      if (saved) return saved;
      const pos = JSON.parse(localStorage.getItem('hk_pos_settings') || '{}');
      return pos.taxCalculationMode || pos.taxMode || 'EXCLUSIVE';
    } catch { return 'EXCLUSIVE'; }
  })();
  const isInclusive = taxMode === 'Incl' || taxMode === 'INCLUSIVE';

  const subtotal = cart.reduce((sum, line) => {
    const lineAmt = line.quantity * line.rate - (line.discount || 0);
    if (isInclusive && isRegistered && (line.tax_rate || 0) > 0) {
      return sum + lineAmt / (1 + line.tax_rate / 100);
    }
    return sum + lineAmt;
  }, 0);

  const taxTotal = isRegistered ? cart.reduce((sum, line) => {
    const lineAmt = line.quantity * line.rate - (line.discount || 0);
    if (isInclusive) {
      const base = lineAmt / (1 + (line.tax_rate || 0) / 100);
      return sum + (lineAmt - base);
    }
    return sum + (lineAmt * (line.tax_rate || 0) / 100);
  }, 0) : 0;

  const grandTotal = (isInclusive && isRegistered) ? cart.reduce((s, l) => s + (l.quantity * l.rate - (l.discount || 0)), 0) : subtotal + taxTotal;

  const paidAmount = paymentMode === 'CUSTOM'
    ? (customReceivedAmount === '' ? grandTotal : Math.max(0, Number(customReceivedAmount)))
    : grandTotal;
  const dueAmount = Math.max(0, grandTotal - paidAmount);

  const blendedTaxRate = cart.length > 0
    ? Math.round(cart.reduce((s, l) => s + l.tax_rate, 0) / cart.length)
    : 0;

  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHeld = [...heldBills, {
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cart,
      party: selectedParty,
      total: grandTotal
    }];
    setHeldBills(newHeld);
    localStorage.setItem('hk_held_bills', JSON.stringify(newHeld));
    setCart([]);
    setSelectedParty(null);
  };

  const handleResumeBill = (heldItem) => {
    setCart(heldItem.cart);
    setSelectedParty(heldItem.party);
    const updatedHeld = heldBills.filter(b => b.id !== heldItem.id);
    setHeldBills(updatedHeld);
    localStorage.setItem('hk_held_bills', JSON.stringify(updatedHeld));
  };

  const handleSendReceiptEmail = async (targetEmail) => {
    const mailTo = (targetEmail || emailInput || '').trim();
    if (!mailTo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailTo)) {
      setEmailSendStatus({ success: false, message: 'Please enter a valid email address' });
      return;
    }
    if (!checkoutSuccess?.invoice_id) return;
    setSendingEmail(true);
    setEmailSendStatus(null);
    try {
      const res = await sendInvoiceReceipt(checkoutSuccess.invoice_id, { email: mailTo });
      setEmailSendStatus({ success: true, message: `Receipt sent to ${mailTo}` });
      setCheckoutSuccess(prev => ({
        ...prev,
        recipient_email: mailTo,
        email_sent: true,
        email_error: null
      }));
    } catch (err) {
      setEmailSendStatus({ success: false, message: err.message || 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const posCfg = getPosSettings();
    const prefix = posCfg.invoicePrefix || 'POS-';
    const invNo = `${prefix}${Date.now().toString().slice(-6)}`;
    const paid = paidAmount;
    const due = dueAmount;

    if (due > 0 && !selectedParty) {
      setShowPartySelect(true);
      alert('Please select a customer to record the remaining due balance in Khata.');
      setSubmitting(false);
      return;
    }

    const actualPaymentMode = paymentMode === 'UPI'
      ? `UPI (${selectedUpiOption})`
      : paymentMode === 'CUSTOM'
        ? (due > 0 ? `Custom (Paid: ${fmtCurrency(paid)}, Due: ${fmtCurrency(due)})` : 'Custom Received')
        : paymentMode;

    try {
      const res = await createInvoice({
        type: 'SALES',
        invoice_number: invNo,
        date: new Date().toISOString().slice(0, 10),
        party_id: selectedParty?.id || null,
        customer_email: selectedParty?.email || null,
        customer_name: selectedParty?.name || null,
        customer_phone: selectedParty?.phone || null,
        subtotal,
        tax_amount: isRegistered ? taxTotal : 0,
        total_amount: grandTotal,
        amount_paid: paid,
        payment_mode: actualPaymentMode,
        items: cart.map(c => ({
          item_id: c.id,
          item_name: c.name,
          unit: c.unit,
          quantity: c.quantity,
          rate: (isInclusive && isRegistered && (c.tax_rate || 0) > 0) ? (c.rate / (1 + (c.tax_rate || 0) / 100)) : c.rate,
          tax_rate: isRegistered ? (c.tax_rate || 0) : 0,
          mrp: (c.mrp !== undefined && c.mrp !== null && Number(c.mrp) > 0) ? Number(c.mrp) : (c.rate || 0)
        }))
      });

      setCheckoutSuccess({
        invoice_id: res.invoice_id,
        invoice_number: invNo,
        date: new Date().toISOString().slice(0, 10),
        party_name: selectedParty?.name || '',
        recipient_email: res.recipient_email || selectedParty?.email || '',
        email_sent: res.email_sent,
        email_error: res.email_error,
        subtotal,
        tax_amount: isRegistered ? taxTotal : 0,
        total_amount: grandTotal,
        paid,
        due,
        payment_mode: actualPaymentMode,
        items: cart
      });
      setEmailInput(selectedParty?.email || '');
      setEmailSendStatus(null);

      if (posCfg.autoPrintReceipt) {
        const printUrl = posCfg.preferredPrinter === 'LASER_A4'
          ? `/invoice/${res.invoice_id}/print`
          : `/invoice/${res.invoice_id}/print-thermal`;
        window.open(printUrl, '_blank');
      }

      setCart([]);
      setSelectedParty(null);
      setCustomReceivedAmount('');
      setAmountPaid('');
      loadData();
    } catch (err) {
      alert(err.message || 'Error processing checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBluetoothPrint = async () => {
    if (!checkoutSuccess) return;
    try {
      await printEscPosInvoice(
        checkoutSuccess,
        localStorage.getItem('userName') || 'HisabKhata POS',
        localStorage.getItem('app_currency') === 'USD' ? '$' : '₹'
      );
    } catch (err) {
      alert(err.message || 'Error printing via Bluetooth');
    }
  };

  const filteredItems = items.filter(it => {
    if (selectedCategory !== 'ALL' && it.category_name !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return it.name.toLowerCase().includes(q) ||
        (it.barcode || '').toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        (it.rack || '').toLowerCase().includes(q) ||
        (it.shelf || '').toLowerCase().includes(q) ||
        (it.aisle || '').toLowerCase().includes(q) ||
        (it.rack_location || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      ref={containerRef}
      className={`h-full flex flex-col gap-2 max-w-[1600px] mx-auto min-w-0 max-lg:mx-1 ${isFullscreen ? 'p-3 sm:p-4 bg-[#f6f8fa] w-full h-full overflow-hidden' : 'overflow-hidden'
        }`}
    >

      {heldBills.length > 0 && (
        <div className="sm:hidden flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-bold text-amber-800 overflow-x-auto shrink-0">
          <Clock size={12} className="shrink-0" />
          <span className="shrink-0 text-[11px]">{heldBills.length} Parked:</span>
          {heldBills.map(b => (
            <button
              key={b.id}
              onClick={() => handleResumeBill(b)}
              className="px-1.5 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-[10px] whitespace-nowrap transition-colors"
            >
              Resume ({fmtCurrency(b.total)})
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 shadow-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <ShoppingCart size={14} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-extrabold text-slate-900 tracking-tight leading-tight truncate">POS Terminal</h1>
            <p className="text-[10px] text-slate-400 leading-none hidden sm:block">Fast barcode counter billing & instant tax receipts</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {heldBills.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-800">
              <Clock size={12} />
              <span>{heldBills.length} Parked</span>
              {heldBills.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleResumeBill(b)}
                  className="px-1.5 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-[9px] ml-1 transition-colors cursor-pointer"
                >
                  Resume ({fmtCurrency(b.total)})
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            title="Scan Product Barcode with Camera"
            className="px-2 py-1.5 sm:px-2.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ScanLine size={14} className="text-emerald-600 shrink-0" />
            <span className="text-[11px]">Scan <span className="hidden sm:inline">Barcode</span></span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Full Screen" : "Full Screen View"}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${isFullscreen
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
              }`}
          >
            {isFullscreen ? <Minimize2 size={14} className="shrink-0" /> : <Maximize2 size={14} className="shrink-0" />}
            <span className="hidden sm:inline text-[11px]">{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            title="Refresh Catalog"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-hidden">

        <div className={`${isFullscreen ? 'lg:col-span-8 2xl:col-span-9' : 'lg:col-span-8'} ${mobileCartState === 'full' ? 'max-lg:hidden' : 'flex flex-col gap-2 flex-1 min-h-0 overflow-hidden'}`}>

          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs shrink-0 space-y-1.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan barcode or search product name / SKU…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-emerald-500 font-medium transition-all"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {categories.map(cat => {
                const count = cat === 'ALL' ? items.length : items.filter(i => i.category_name === cat).length;
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[9px] font-extrabold px-1 py-0.5 rounded ${isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto pr-1 grid ${isFullscreen ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'} gap-1.5 content-start auto-rows-max min-h-0 select-none`}>
            {loading && items.length === 0 ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-lg p-1.5 flex flex-col gap-2 animate-pulse">
                  <div className="w-full h-[72px] bg-slate-100 rounded-md" />
                  <div className="w-3/4 h-2 bg-slate-200 rounded" />
                  <div className="w-1/2 h-2.5 bg-slate-100 rounded" />
                </div>
              ))
            ) : filteredItems.map(item => (
              <button
                key={item.id}
                onContextMenu={(e) => { if (typeof window !== 'undefined' && window.innerWidth < 1024) e.preventDefault(); }}
                style={typeof window !== 'undefined' && window.innerWidth < 1024 ? { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
                onTouchStart={(e) => handleItemTouchStart(item, e)}
                onTouchMove={handleItemTouchMove}
                onTouchEnd={handleItemTouchEnd}
                onClick={() => {
                  if (isLongPress.current) {
                    isLongPress.current = false;
                    return;
                  }
                  clearTimeout(hoverTimer.current);
                  setHoveredItem(null);
                  handleAddToCart(item);
                }}
                onMouseEnter={(e) => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  hoverTimer.current = setTimeout(() => {
                    setHoverPos({ x: rect.right + 8, y: rect.top });
                    setHoveredItem(item);
                  }, 400);
                }}
                onMouseLeave={() => { clearTimeout(hoverTimer.current); setHoveredItem(null); }}
                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-lg text-left transition-all flex flex-col overflow-hidden group cursor-pointer relative max-lg:select-none max-lg:touch-manipulation min-h-[118px] shrink-0"
              >
                <div className="relative w-full h-[72px] bg-white overflow-hidden shrink-0 border-b border-slate-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      draggable={false}
                      onContextMenu={(e) => { if (typeof window !== 'undefined' && window.innerWidth < 1024) e.preventDefault(); }}
                      className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105 max-lg:pointer-events-none max-lg:select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-slate-300" />
                    </div>
                  )}
                  <div className="absolute bottom-0.5 left-0.5 flex items-center gap-1 max-w-[calc(100%-8px)]">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${item.current_stock <= 0
                      ? 'bg-red-100 text-red-600'
                      : item.current_stock < 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                      }`}>
                      {item.current_stock <= 0 ? 'Out' : `${item.current_stock}${item.unit ? ' ' + item.unit : ''}`}
                    </span>
                    {(item.rack_location || item.rack || item.shelf) && (
                      <span className="text-[7.5px] font-bold px-1 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-2xs truncate max-w-[65px]" title={item.rack_location || `Rack: ${item.rack || ''} Shelf: ${item.shelf || ''}`}>
                        📍 {item.rack ? `R:${item.rack}` : (item.rack_location || '')}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-emerald-600 shadow-sm flex items-center justify-center font-bold text-[10px] group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    +
                  </div>
                </div>

                <div className="px-1.5 py-1 flex flex-col gap-0.5 shrink-0 min-h-[46px] justify-between">
                  <span className="text-[10px] font-semibold text-slate-800 line-clamp-1 leading-tight group-hover:text-emerald-700 transition-colors">
                    {item.name}
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-extrabold text-slate-900 number-cell">
                      {fmtCurrency(item.sale_price)}
                    </span>
                    {item.brand && (
                      <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200/80 truncate max-w-[50%]">
                        {item.brand}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hoveredItem && (
            <ItemHoverPopup item={hoveredItem} pos={hoverPos} fmtCurrency={fmtCurrency} />
          )}

        </div>

        {mobileCartState !== 'collapsed' && (
          <div
            className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-2xs z-40 animate-fade-in cursor-pointer"
            onClick={() => setMobileCartState('collapsed')}
          />
        )}

        {mobileCartState !== 'collapsed' && (
          <div className="lg:hidden h-[180px] shrink-0 pointer-events-none" />
        )}

        <div className={`${isFullscreen ? 'lg:col-span-4 2xl:col-span-3' : 'lg:col-span-4'} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col ${
          mobileCartState !== 'collapsed'
            ? 'max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:z-50 max-lg:rounded-t-2xl max-lg:shadow-2xl max-lg:border-t max-lg:border-slate-300 dark:max-lg:border-slate-700 max-lg:max-h-[82vh] max-lg:overflow-y-auto'
            : 'max-lg:mt-auto max-lg:h-auto max-lg:shrink-0'
        } min-h-0 overflow-hidden`}>

          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="lg:hidden flex items-center justify-center -mt-1 mb-1.5 py-0.5 select-none touch-pan-y cursor-pointer group"
            onClick={() => {
              if (mobileCartState === 'collapsed') setMobileCartState('half');
              else if (mobileCartState === 'half') setMobileCartState('collapsed');
              else setMobileCartState('half');
            }}
          >
            <div className="flex items-center justify-center w-10 h-3.5 rounded-full bg-slate-100 group-hover:bg-emerald-50 dark:bg-slate-800 dark:group-hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs transition-all">
              {mobileCartState === 'collapsed' ? (
                <ChevronUp size={12} strokeWidth={3} />
              ) : (
                <ChevronDown size={12} strokeWidth={3} />
              )}
            </div>
          </div>

          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 gap-2 select-none touch-pan-y"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">Current Cart</span>
              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/40 whitespace-nowrap shrink-0">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="relative shrink-0">
              <button
                onClick={() => setShowPartySelect(!showPartySelect)}
                className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-2xs ${selectedParty
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                <User size={12} className={selectedParty ? 'text-emerald-600 dark:text-emerald-400 shrink-0' : 'text-slate-500 dark:text-slate-400 shrink-0'} />
                <span className="truncate max-w-[95px] sm:max-w-[140px] text-[11px] sm:text-xs">{selectedParty ? selectedParty.name : 'Walk-in Customer'}</span>
                {selectedParty ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedParty(null);
                    }}
                    title="Change to Walk-in Customer"
                    className="ml-0.5 p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-full text-emerald-700 dark:text-emerald-300 font-bold shrink-0"
                  >
                    <X size={10} />
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-400 dark:text-slate-400 shrink-0">▾</span>
                )}
              </button>

              {showPartySelect && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 animate-fade-in text-slate-800">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[11px] font-extrabold text-slate-900">Select Customer</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddDetails(partySearch)}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={12} />
                      <span>+ Add New</span>
                    </button>
                  </div>

                  <div className="relative mb-2">
                    <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or phone…"
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const matched = parties.filter(p => (p.name || '').toLowerCase().includes(partySearch.toLowerCase()) || (p.phone || '').includes(partySearch));
                          if (matched.length === 1) {
                            setSelectedParty(matched[0]);
                            setShowPartySelect(false);
                          } else if (matched.length === 0 && partySearch.trim()) {
                            handleFastAddCustomer(partySearch);
                          }
                        }
                      }}
                      autoFocus
                      className="w-full pl-7 pr-7 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 bg-slate-50 focus:bg-white transition-all"
                    />
                    {partySearch && (
                      <button
                        onClick={() => setPartySearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                    <button
                      onClick={() => { setSelectedParty(null); setShowPartySelect(false); }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between transition-colors cursor-pointer ${!selectedParty ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        <span>Walk-in Customer</span>
                      </span>
                      {!selectedParty && <Check size={12} className="text-emerald-600" />}
                    </button>

                    {parties
                      .filter(p => {
                        if (!partySearch.trim()) return true;
                        const q = partySearch.toLowerCase().trim();
                        return (p.name || '').toLowerCase().includes(q) || (p.phone || '').includes(q);
                      })
                      .map(p => {
                        const isSel = selectedParty?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { setSelectedParty(p); setShowPartySelect(false); }}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg flex justify-between items-center transition-colors cursor-pointer ${isSel ? 'bg-emerald-50 text-emerald-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                {p.phone && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Phone size={9} />{p.phone}</span>}
                                {p.email && <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[130px]"><Mail size={9} />{p.email}</span>}
                              </div>
                            </div>
                            {isSel && <Check size={12} className="text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}

                    {partySearch.trim() && parties.filter(p => (p.name || '').toLowerCase().includes(partySearch.toLowerCase()) || (p.phone || '').includes(partySearch)).length === 0 && (
                      <div className="p-2.5 text-center space-y-2 bg-slate-50 rounded-xl mt-1 border border-slate-100">
                        <p className="text-[11px] text-slate-500 font-medium">No customer found for "{partySearch}"</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={savingCustomer}
                            onClick={() => handleFastAddCustomer(partySearch)}
                            className="flex-1 py-1.5 px-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shadow-xs disabled:opacity-50"
                          >
                            <Zap size={12} className="text-amber-300 fill-amber-300" />
                            <span>{savingCustomer ? 'Adding…' : 'Add Fast'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenAddDetails(partySearch)}
                            className="flex-1 py-1.5 px-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 active:scale-[0.98] rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                          >
                            <UserPlus size={12} />
                            <span>Add Details</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">Add Fast saves directly without popup</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${mobileCartState === 'collapsed' ? 'max-lg:hidden' : mobileCartState === 'half' ? 'max-lg:block max-lg:max-h-[220px] max-lg:overflow-y-auto' : 'max-lg:block max-lg:flex-1 max-lg:overflow-y-auto'} flex-1 overflow-y-auto pr-0.5 space-y-1 my-1.5 min-h-0`}>
            {cart.map((line, idx) => {
              const lineTotal = isInclusive
                ? line.quantity * line.rate
                : (line.quantity * line.rate) + ((line.quantity * line.rate) * line.tax_rate / 100);
              return (
                <div
                  key={line.id}
                  className="group rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div className="w-5 flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shrink-0">
                      <span className="text-[9px] font-extrabold text-slate-400">{idx + 1}</span>
                    </div>

                    <div className="flex-1 px-2 py-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-tight line-clamp-1 flex-1">
                          {line.name}
                        </span>
                        <button
                          onClick={() => removeFromCart(line.id)}
                          className="text-slate-300 hover:text-rose-500 shrink-0 transition-colors cursor-pointer mt-0.5"
                        >
                          <X size={11} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <div className="flex items-center">
                          <button
                            onClick={() => updateQuantity(line.id, -1)}
                            className="w-5 h-5 rounded-l-md bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-600 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            <Minus size={9} />
                          </button>
                          <span className="w-7 h-5 border-t border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-extrabold text-slate-900 dark:text-white flex items-center justify-center">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(line.id, 1)}
                            className="w-5 h-5 rounded-r-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-700 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer transition-colors border border-slate-200 dark:border-slate-700"
                          >
                            <Plus size={9} />
                          </button>
                          <span className="text-[9px] text-slate-400 font-medium ml-1.5">
                            × {fmtCurrency(line.rate)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRegistered && line.tax_rate > 0 && (
                            <span className="text-[8px] font-bold text-blue-500 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded">
                              {line.tax_rate}%
                            </span>
                          )}
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 number-cell">
                            {fmtCurrency(lineTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {cart.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                <ShoppingCart size={22} className="mx-auto text-slate-300 dark:text-slate-700 mb-1" />
                <span>Cart is empty. Click items on the left to add.</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal{(isInclusive && isRegistered) ? ' (excl. tax)' : ''}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 number-cell">{fmtCurrency(subtotal)}</span>
              </div>
              {isRegistered && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    GST Tax
                    {blendedTaxRate > 0 && (
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1 py-0.5 rounded">{blendedTaxRate}%</span>
                    )}
                    {isInclusive && <span className="text-[9px] text-slate-400">(incl.)</span>}
                    :
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 number-cell">{fmtCurrency(taxTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="text-sm text-emerald-600 dark:text-emerald-400 number-cell font-black">{fmtCurrency(grandTotal)}</span>
              </div>
            </div>

            {paymentMode !== 'UPI' ? (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'CASH', label: 'Cash', icon: Banknote },
                  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
                  { id: 'CUSTOM', label: 'Custom Pay', icon: Wallet }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id);
                      if (m.id === 'CUSTOM') {
                        if (customReceivedAmount === '') {
                          setCustomReceivedAmount(grandTotal ? String(grandTotal) : '');
                        }
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setMobileCartState('full');
                        }
                      }
                    }}
                    className={`py-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${paymentMode === m.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                  >
                    <m.icon size={12} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setPaymentMode('CASH')}
                  className="py-1 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 bg-slate-900 text-white border-slate-900 shadow-xs shrink-0 cursor-pointer"
                  title="Cancel UPI"
                >
                  <Smartphone size={12} />
                  <span>UPI/QR</span>
                  <X size={11} className="ml-0.5 opacity-80" />
                </button>
                {['BharatPe', 'PhonePe', 'UPI No'].map((upi) => (
                  <button
                    key={upi}
                    type="button"
                    onClick={() => setSelectedUpiOption(upi)}
                    className={`flex-1 min-w-[70px] py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center whitespace-nowrap ${selectedUpiOption === upi
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                  >
                    {upi}
                  </button>
                ))}
              </div>
            )}

            {paymentMode === 'CUSTOM' && (
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                  <span>Custom Split / Due Mode</span>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Amount Received (₹):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter cash/bank received"
                    value={customReceivedAmount}
                    onFocus={(e) => {
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setMobileCartState('full');
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 250);
                      }
                    }}
                    onChange={(e) => setCustomReceivedAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none font-bold number-cell bg-white focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                {dueAmount > 0 && (
                  <div className="flex justify-between text-[11px] font-bold text-amber-700 pt-1 border-t border-slate-200">
                    <span>Remaining Balance Due:</span>
                    <span className="number-cell font-black text-amber-800">{fmtCurrency(dueAmount)}</span>
                  </div>
                )}
                {dueAmount > 0 && !selectedParty && (
                  <p className="text-[9px] text-rose-600 font-bold">
                    ⚠️ Select a customer to attach due balance to their Khata ledger!
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-all cursor-pointer"
              >
                Park / Hold
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl shadow-xs shadow-emerald-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer truncate px-1"
              >
                {submitting ? 'Processing…' : (
                  <span>
                    Pay {fmtCurrency(paidAmount)}
                    {dueAmount > 0 && <span className="text-[10px] opacity-90 ml-1">({fmtCurrency(dueAmount)} Due)</span>}
                  </span>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>

      {checkoutSuccess && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 text-center space-y-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-base font-black text-slate-900">Sale Complete!</h3>
            <p className="text-xs text-slate-500">
              Invoice <strong>{checkoutSuccess.invoice_number}</strong> created for <strong>{fmtCurrency(checkoutSuccess.total_amount || checkoutSuccess.total)}</strong>.
            </p>

            {checkoutSuccess.due > 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-semibold">Amount Received:</span>
                  <span className="font-extrabold text-emerald-700">{fmtCurrency(checkoutSuccess.paid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-800 font-semibold">Balance Due:</span>
                  <span className="font-extrabold text-amber-700">{fmtCurrency(checkoutSuccess.due)}</span>
                </div>
                {checkoutSuccess.party_name && (
                  <p className="text-[10px] text-amber-800 font-medium pt-1 border-t border-amber-200">
                    Due balance added to <strong>{checkoutSuccess.party_name}</strong>'s Khata.
                  </p>
                )}
              </div>
            )}

            {checkoutSuccess.recipient_email && checkoutSuccess.email_sent && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span className="truncate text-[11px]">Receipt emailed to <strong>{checkoutSuccess.recipient_email}</strong></span>
                </div>
                <button
                  type="button"
                  disabled={sendingEmail}
                  onClick={() => handleSendReceiptEmail(checkoutSuccess.recipient_email)}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-bold shrink-0 cursor-pointer"
                >
                  {sendingEmail ? 'Sending…' : 'Resend'}
                </button>
              </div>
            )}

            {checkoutSuccess.recipient_email && !checkoutSuccess.email_sent && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold space-y-1 text-left">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle size={13} className="text-amber-600 shrink-0" />
                    Email not delivered ({checkoutSuccess.email_error || 'SMTP issue'})
                  </span>
                  <button
                    type="button"
                    disabled={sendingEmail}
                    onClick={() => handleSendReceiptEmail(checkoutSuccess.recipient_email)}
                    className="text-[10px] text-amber-900 hover:underline font-extrabold cursor-pointer"
                  >
                    {sendingEmail ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
                <p className="text-[10px] text-amber-700">Target: {checkoutSuccess.recipient_email}</p>
              </div>
            )}

            {!checkoutSuccess.recipient_email && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Email Digital Receipt</span>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Mail size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Enter customer email…"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendReceiptEmail();
                        }
                      }}
                      className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={sendingEmail || !emailInput.trim()}
                    onClick={() => handleSendReceiptEmail()}
                    className="py-1.5 px-3 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <Send size={11} />
                    <span>{sendingEmail ? 'Sending…' : 'Send'}</span>
                  </button>
                </div>
                {emailSendStatus && (
                  <p className={`text-[10px] font-bold ${emailSendStatus.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {emailSendStatus.message}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 pt-1">
              {getConnectedPrinter() && (
                <button
                  type="button"
                  onClick={handleBluetoothPrint}
                  className="w-full py-2.5 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Zap size={14} />
                  <span>1-Click Bluetooth Print ({getConnectedPrinter().name})</span>
                </button>
              )}

              {(() => {
                const posCfg = getPosSettings();
                const isA4Preferred = posCfg.preferredPrinter === 'LASER_A4';
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => window.open(`/invoice/${checkoutSuccess.invoice_id}/print`, '_blank')}
                      className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${isA4Preferred
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                        }`}
                    >
                      <Printer size={13} />
                      <span>A4 Tax Bill</span>
                    </button>
                    <button
                      onClick={() => window.open(`/invoice/${checkoutSuccess.invoice_id}/print-thermal`, '_blank')}
                      className={`py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors ${!isA4Preferred
                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                        : 'text-slate-800 bg-slate-100 hover:bg-slate-200'
                        }`}
                    >
                      <Printer size={13} />
                      <span>Thermal (58mm)</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => setCheckoutSuccess(null)}
              className="w-full py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            >
              Start Next Sale
            </button>
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 border border-slate-200 animate-fade-in text-slate-800 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Add New Customer</h3>
                  <p className="text-[10px] text-slate-400">Save and select for this sale</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {customerError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" />
                <span>{customerError}</span>
              </div>
            )}

            <form onSubmit={handleQuickCreateCustomer} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  autoFocus
                  required
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-medium font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">City / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 4, Main Market, Mumbai"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={newCustomerForm.gst_number}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, gst_number: e.target.value.toUpperCase() })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {savingCustomer ? 'Saving…' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <BarcodeScanModal
          onClose={() => setShowBarcodeScanner(false)}
          onDetected={handleBarcodeScannedInPos}
          cartLength={cart.length}
        />
      )}

      {mobileDetailItem && (
        <MobileProductDetailModal
          item={mobileDetailItem}
          onClose={() => setMobileDetailItem(null)}
          onAddToCart={handleAddToCart}
          fmtCurrency={fmtCurrency}
        />
      )}

    </div>
  );
}

function BarcodeScanModal({ onClose, onDetected, cartLength = 0 }) {
  const videoRef = React.useRef(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const streamRef = React.useRef(null);
  const intervalRef = React.useRef(null);
  const lastScannedTimeRef = React.useRef({});

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
          videoRef.current.play().catch(() => { });
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
                      const now = Date.now();
                      const lastTime = lastScannedTimeRef.current[raw] || 0;
                      if (now - lastTime > 1500) {
                        lastScannedTimeRef.current[raw] = now;
                        const res = onDetected(raw);
                        setLastScanResult(res);
                        setTimeout(() => setLastScanResult(null), 2500);
                      }
                    }
                  }
                } catch { }
              }
            }, 250);
          } catch { }
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
      const res = onDetected(manualCode.trim());
      setLastScanResult(res);
      setManualCode('');
      setTimeout(() => setLastScanResult(null), 2500);
    }
  };

  return (
    <div className="modal-overlay p-2 sm:p-4 fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs" onClick={e => e.target === e.currentTarget && onClose()}>
      
      {lastScanResult && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-60 animate-fade-in pointer-events-none">
          {lastScanResult.success ? (
            <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between text-xs font-black border border-emerald-400/80 backdrop-blur-md">
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check size={13} strokeWidth={3} className="text-white" />
                </div>
                <span className="truncate">Added: {lastScanResult.item?.name}</span>
              </div>
              <span className="shrink-0 bg-white/25 px-2 py-0.5 rounded-full text-[10px] font-bold ml-2">
                +1 in Cart
              </span>
            </div>
          ) : (
            <div className="bg-rose-600 text-white px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black border border-rose-400/80 backdrop-blur-md">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <AlertCircle size={13} strokeWidth={3} className="text-white" />
              </div>
              <span className="truncate">No product found for "{lastScanResult.code}"</span>
            </div>
          )}
        </div>
      )}

      <div className="modal-panel max-w-md w-full bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-5 sm:py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <ScanLine size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight truncate">Continuous Barcode Scanner</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">Keep scanning products — items add to cart instantly</p>
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
              Add
            </button>
          </form>
        </div>

        <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[11px] sm:text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShoppingCart size={13} className="text-emerald-600" />
            <span className="font-bold text-slate-800">
              Cart: {cartLength} {cartLength === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-xs"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemHoverPopup({ item, pos, fmtCurrency }) {
  const popupRef = React.useRef(null);
  const [adjustedPos, setAdjustedPos] = React.useState(pos);

  React.useEffect(() => {
    if (!popupRef.current) return;
    const popup = popupRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = pos.x;
    let y = pos.y;
    if (x + popup.width > vw - 12) x = pos.x - popup.width - 16 - 8;
    if (y + popup.height > vh - 12) y = vh - popup.height - 12;
    if (y < 8) y = 8;
    setAdjustedPos({ x, y });
  }, [pos]);

  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      style={{ position: 'fixed', left: adjustedPos.x, top: adjustedPos.y, zIndex: 9999, pointerEvents: 'none' }}
      className="w-56 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in"
    >
      {item.image_url ? (
        <div className="w-full h-36 bg-white border-b border-slate-100 flex items-center justify-center p-2">
          <img src={item.image_url} alt={item.name} className="max-w-full max-h-full object-contain" />
        </div>
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center border-b border-slate-100">
          <Package size={36} className="text-slate-300" />
        </div>
      )}

      <div className="p-3 space-y-2">
        <div>
          <p className="text-xs font-extrabold text-slate-900 leading-tight">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.brand && (
              <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-200">
                {item.brand}
              </span>
            )}
            {item.category_name && (
              <span className="text-[10px] text-slate-400 font-medium">{item.category_name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-emerald-600">{fmtCurrency(item.sale_price)}</span>
          {item.mrp && item.mrp !== item.sale_price && (
            <span className="text-[10px] text-slate-400 line-through">{fmtCurrency(item.mrp)}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-50 rounded-lg px-2 py-1.5">
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Stock</p>
            <p className={`text-xs font-bold ${item.current_stock <= 0 ? 'text-red-600' : item.current_stock < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {item.current_stock <= 0 ? 'Out' : `${item.current_stock} ${item.unit || ''}`}
            </p>
          </div>
          {item.barcode && (
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Barcode</p>
              <p className="text-[10px] font-bold text-slate-700 truncate">{item.barcode}</p>
            </div>
          )}
          {item.sku && (
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">SKU</p>
              <p className="text-[10px] font-bold text-slate-700 truncate">{item.sku}</p>
            </div>
          )}
          {item.purchase_price && (
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Cost</p>
              <p className="text-[10px] font-bold text-slate-700">{fmtCurrency(item.purchase_price)}</p>
            </div>
          )}
        </div>

        {(item.rack_location || item.rack || item.shelf || item.aisle) && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg px-2 py-1 flex items-center gap-1.5 text-emerald-800">
            <MapPin size={11} className="shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <span className="text-[8.5px] font-bold uppercase tracking-wider block text-emerald-700">Storage Location</span>
              <span className="text-[10px] font-extrabold truncate block">
                {item.rack_location || [item.aisle ? `Aisle: ${item.aisle}` : null, item.rack ? `Rack: ${item.rack}` : null, item.shelf ? `Shelf: ${item.shelf}` : null].filter(Boolean).join(' • ')}
              </span>
            </div>
          </div>
        )}

        {item.description && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3">{item.description}</p>
        )}

        <div className="pt-1 border-t border-slate-100 flex items-center gap-1 text-[9px] text-slate-400 font-semibold">
          <Plus size={9} />
          <span>Click to add to cart</span>
        </div>
      </div>
    </div>
  );
}

function MobileProductDetailModal({ item, onClose, onAddToCart, fmtCurrency }) {
  const [qty, setQty] = useState(1);
  if (!item) return null;

  const handleAdd = () => {
    onAddToCart(item, qty);
    onClose();
  };

  const discountPercent = item.mrp && item.mrp > item.sale_price 
    ? Math.round(((item.mrp - item.sale_price) / item.mrp) * 100) 
    : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in select-none"
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh] animate-slide-up select-none">
        
        <div className="flex items-center justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.category_name && (
              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/40 truncate">
                {item.category_name}
              </span>
            )}
            {item.brand && (
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 truncate">
                {item.brand}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3.5 overflow-y-auto min-h-0">
          <div 
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-44 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3 relative overflow-hidden select-none"
          >
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.name} 
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-w-full max-h-full object-contain drop-shadow-sm pointer-events-none select-none" 
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 gap-1">
                <Package size={44} />
                <span className="text-[10px] text-slate-400 font-medium">No Image</span>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs ${
                item.current_stock <= 0
                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                  : item.current_stock < 5
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {item.current_stock <= 0 ? 'Out of Stock' : `${item.current_stock} ${item.unit || 'Pcs'} Available`}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">{item.name}</h3>
            
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {fmtCurrency(item.sale_price)}
              </span>
              {item.mrp && item.mrp > item.sale_price && (
                <span className="text-xs text-slate-400 line-through">
                  {fmtCurrency(item.mrp)}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-[10px] font-extrabold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100">
                  {discountPercent}% OFF
                </span>
              )}
              {isRegistered && item.tax_rate > 0 && (
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 ml-auto">
                  GST {item.tax_rate}%
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {item.barcode && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Barcode</p>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{item.barcode}</p>
              </div>
            )}
            {item.sku && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">SKU</p>
                <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{item.sku}</p>
              </div>
            )}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unit</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.unit || 'Pcs'}</p>
            </div>
            {item.purchase_price > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cost Price</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fmtCurrency(item.purchase_price)}</p>
              </div>
            )}
          </div>

          {(item.rack_location || item.rack || item.shelf || item.aisle) && (
            <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <p className="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={11} className="text-emerald-600 dark:text-emerald-400" />
                <span>Storage & Warehouse Location</span>
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
                {item.aisle && (
                  <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-800 dark:text-slate-200 border border-emerald-100">
                    Aisle: {item.aisle}
                  </span>
                )}
                {item.rack && (
                  <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-800 dark:text-slate-200 border border-emerald-100">
                    Rack: {item.rack}
                  </span>
                )}
                {item.shelf && (
                  <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-800 dark:text-slate-200 border border-emerald-100">
                    Shelf: {item.shelf}
                  </span>
                )}
                {!item.aisle && !item.rack && !item.shelf && item.rack_location && (
                  <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-800 dark:text-slate-200 border border-emerald-100">
                    {item.rack_location}
                  </span>
                )}
              </div>
            </div>
          )}

          {item.description && (
            <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shrink-0">
          <div className="flex items-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-2xs">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              <Minus size={13} />
            </button>
            <span className="w-9 text-center font-black text-sm text-slate-900 dark:text-white">
              {qty}
            </span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-sm hover:bg-slate-200 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ShoppingCart size={15} />
            <span>Add to Cart ({fmtCurrency(item.sale_price * qty)})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
