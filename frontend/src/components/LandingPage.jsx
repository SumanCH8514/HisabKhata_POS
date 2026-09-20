import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, ArrowRight, ShieldCheck,
  Receipt, Package, Users, BarChart3,
  Monitor, Play, Sparkles,
  ShoppingBag, Pill, UtensilsCrossed, Building2,
  DollarSign, Check, Sun, Moon, Laptop, Menu, X,
  Layers, Database, ArrowUpRight, Zap, Star,
  Phone, Printer, Smartphone, FileText, TrendingUp, Award,
  HelpCircle, ChevronDown, ChevronUp, Download, Truck,
  CreditCard, Headphones, Share2, Calculator, Mail,
  LogIn, LayoutDashboard
} from 'lucide-react';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';
import { toast } from '../utils/toast.js';

function useScrollReveal() {
  const [revealed, setRevealed] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -30px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return [ref, revealed];
}

export default function LandingPage() {
  const navigate = useNavigate();

  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    try {
      return localStorage.getItem('hide_announcement_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const dismissBanner = (e) => {
    e.stopPropagation();
    setShowBanner(false);
    try {
      localStorage.setItem('hide_announcement_banner', 'true');
    } catch {}
  };

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isAuthenticated') === 'true');
  }, []);

  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  const [activeGstTab, setActiveGstTab] = useState(0);
  const [activeIndustryTab, setActiveIndustryTab] = useState('retail');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [emailInput, setEmailInput] = useState('');

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    navigate(isLoggedIn ? '/dashboard' : '/login');
  };

  const [billItems, setBillItems] = useState([
    { name: 'Paracetamol 650mg', qty: 2, price: 15, gst: 18 },
    { name: 'Amoxicillin 500mg', qty: 1, price: 85, gst: 12 }
  ]);
  const [discount, setDiscount] = useState(10);

  const handleLaunchApp = () => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phoneNumberInput.length >= 10) {
      handleLaunchApp();
    } else {
      toast.warning('Please enter a valid 10-digit mobile number to start.');
    }
  };

  const addSimulatorItem = (name, price, gst) => {
    const existing = billItems.find(item => item.name === name);
    if (existing) {
      setBillItems(billItems.map(item =>
        item.name === name ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setBillItems([...billItems, { name, qty: 1, price, gst }]);
    }
  };

  const removeSimulatorItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => billItems.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const calculateTax = () => billItems.reduce((acc, curr) => acc + (curr.qty * curr.price * (curr.gst / 100)), 0);
  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const tax = calculateTax();
    return (sub + tax) - discount;
  };

  const featureTabs = [
    {
      num: '01',
      tag: 'GST INVOICING',
      tagColor: 'text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
      title: 'Create GST & Non-GST Invoices in 8 Seconds',
      description: 'Bill faster with automatic tax slabs (0%, 5%, 12%, 18%, 28%), HSN/SAC lookups, custom thermal roll formats, sales quotations, and barcode POS billing.',
      highlight: '0.2s instant checkout speed',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="font-bold text-slate-900 dark:text-white text-sm">TAX INVOICE #HK-2026-089</span>
              <div className="text-[10px] text-slate-400">GSTIN: 19AAACH7409R1ZZ • 100% Offline</div>
            </div>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2.5 py-1 rounded text-[10px]">GST COMPLIANT</span>
          </div>
          <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Paracetamol 650mg (HSN: 3004)</span>
              <span className="font-bold">2 x ₹15.00 = ₹30.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Amoxicillin 500mg (HSN: 3004)</span>
              <span className="font-bold">1 x ₹85.00 = ₹85.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Dettol Antiseptic 100ml (HSN: 3402)</span>
              <span className="font-bold">1 x ₹65.00 = ₹65.00</span>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹180.00</span></div>
            <div className="flex justify-between text-slate-500"><span>CGST + SGST (18%)</span><span>₹28.80</span></div>
            <div className="flex justify-between text-slate-500"><span>Instant Cash Discount</span><span>-₹10.00</span></div>
            <div className="flex justify-between text-slate-900 dark:text-white font-extrabold text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>Grand Total</span>
              <span className="text-purple-600 dark:text-purple-400">₹198.80</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '02',
      tag: 'INVENTORY & BATCHES',
      tagColor: 'text-blue-800 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300',
      title: 'Track Stock & Expiry in Real Time',
      description: 'Get automated low-stock notifications, batch number tracking, manufacturer logs, expiry warnings (30/60/90 days), and live multi-unit valuations.',
      highlight: '2.8x faster stock rotation',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-900 dark:text-white text-sm">LIVE INVENTORY BATCHES</span>
            <span className="bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold px-2 py-0.5 rounded text-[10px]">EXPIRY ALERT</span>
          </div>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Azithromycin 500mg</div>
                <div className="text-[10px] text-slate-500">Batch: AZI-88 • Stock: 45 Strips</div>
              </div>
              <span className="text-red-600 dark:text-red-400 font-bold text-[11px]">Exp: Aug 2026</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Pantocid 40mg Tablet</div>
                <div className="text-[10px] text-slate-500">Batch: PAN-10 • Stock: 180 Strips</div>
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">Exp: Dec 2027</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '03',
      tag: 'PAYMENTS & KHATA',
      tagColor: 'text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300',
      title: 'Speed Up Payment Collection with Khata',
      description: 'Maintain clean customer and supplier credit ledgers. Send WhatsApp payment reminders with dynamic UPI QR codes, track aging dues, and record split payments.',
      highlight: '97% payments collected on time',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-900 dark:text-white text-sm">CUSTOMER KHATA LEDGER</span>
            <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">DUE: ₹45,200</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="font-bold">M/S Laxmi Enterprises</span>
              <span className="text-red-500 font-bold">12 Days Overdue</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full w-3/4"></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Paid: ₹1,20,000</span>
              <span>Total: ₹1,65,200</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '04',
      tag: 'DAILY BOOKKEEPING',
      tagColor: 'text-purple-800 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300',
      title: 'Automate Daily Profit & Loss Reports',
      description: 'Zero manual calculation mistakes. Get automated daily sales balance, cash-in-drawer tally, direct and indirect store expenses, and net profit margins.',
      highlight: '100% accurate daily tally',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-900 dark:text-white text-sm">DAILY P&L STATEMENT</span>
            <span className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold px-2 py-0.5 rounded text-[10px]">TODAY</span>
          </div>
          <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between py-1"><span>Total Gross Sales (112 Bills)</span><span className="font-bold text-emerald-600">₹48,920.00</span></div>
            <div className="flex justify-between py-1"><span>Cost of Goods Sold (COGS)</span><span className="font-bold text-slate-500">-₹33,150.00</span></div>
            <div className="flex justify-between py-1 border-t border-slate-200 dark:border-slate-800 pt-2 font-bold text-slate-900 dark:text-white text-sm">
              <span>Net Gross Profit</span>
              <span className="text-purple-600 dark:text-purple-400">₹14,570.00 (29.8%)</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '05',
      tag: 'BARCODE & POS PRINTING',
      tagColor: 'text-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-300',
      title: 'Fast ESC/POS Thermal & Barcode Hardware',
      description: 'Connect any 2-inch or 3-inch thermal printer via Bluetooth or USB. Generate custom SKU barcode label stickers and scan items in continuous laser mode.',
      highlight: 'Bluetooth & USB direct connect',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-900 dark:text-white text-sm">HARDWARE TERMINAL</span>
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">CONNECTED</span>
          </div>
          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <span>🖨️ Thermal Printer (80mm ESC/POS)</span>
              <span className="text-emerald-600 font-bold text-[10px]">USB Port #1</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <span>📱 Wireless Bluetooth Receipt Printer</span>
              <span className="text-emerald-600 font-bold text-[10px]">GATT Paired</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '06',
      tag: 'GSTR & TALLY EXPORT',
      tagColor: 'text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300',
      title: 'Tax-Ready GSTR-1, GSTR-3B & Excel Reports',
      description: 'One-click tax report generation for your Chartered Accountant (CA). Export B2B, B2C, HSN summaries, and Tally-compatible XML/Excel files without manual data entry.',
      highlight: 'CA approved GSTR format',
      screen: (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl font-mono text-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="font-bold text-slate-900 dark:text-white text-sm">GSTR FILING SUMMARY</span>
            <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold px-2 py-0.5 rounded text-[10px]">AUG 2026</span>
          </div>
          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>GSTR-1 Outward Supplies</span>
              <span className="text-purple-600 font-bold">Export Excel/CSV</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>GSTR-3B Summary Return</span>
              <span className="text-purple-600 font-bold">Ready</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const gstTabs = [
    {
      title: 'GST Reports',
      desc: 'Generate GSTR-1, GSTR-2, and GSTR-3B reports automatically and share them easily with your CA for faster filing and reconciliation.',
      metric: 'Auto-populated B2B & B2C tax breakdown'
    },
    {
      title: 'Input Tax Credit (ITC)',
      desc: 'Track and verify Input Tax Credit on your supplier purchases and vendor invoices to claim maximum eligible tax returns.',
      metric: 'Prevent lost tax deductions'
    },
    {
      title: 'e-Invoicing',
      desc: 'Generate compliant B2B electronic invoices with QR codes and IRN (Invoice Reference Numbers) directly from the POS interface.',
      metric: 'Govt. portal ready JSON & PDF'
    },
    {
      title: 'e-Way Billing',
      desc: 'Create e-Way bills for goods transportation exceeding threshold limits in single clicks without navigating complex government portals.',
      metric: 'Instant vehicle number updates'
    }
  ];

  const industries = {
    retail: {
      name: 'Retail & Supermarkets',
      title: 'Fast-Paced Retail & Grocery Stores',
      description: 'Speed up customer lines with continuous barcode scanning, instant catalog search, item discounts, and direct ESC/POS thermal printing.',
      features: ['Continuous barcode scanner mode', 'Thermal roll printing (2-inch & 3-inch)', 'Customizable discounts at checkout', 'Low stock & automatic reorder alerts']
    },
    pharmacy: {
      name: 'Pharmacy & Chemist',
      title: 'Compliant Medical Stores & Pharmacies',
      description: 'Track medicine batches, drug license IDs, manufacturer references, Schedule H1 registers, and proactive expiration alerts.',
      features: ['Expiry date alerts (30, 60, 90 days)', 'Batch-wise inventory tracking', 'Generic chemical salt lookup', 'Detailed schedule drug sale registers']
    },
    restaurant: {
      name: 'Restaurants & Cafes',
      title: 'Restaurants, Food Outlets & Cafes',
      description: 'Streamline dining tables, manage Kitchen Order Tickets (KOT), print thermal receipts with custom kitchen notes, and handle split bills.',
      features: ['Kitchen Order Ticket (KOT) support', 'Table layout configuration', 'Split billing & quick payment tags', 'Touch-friendly counter layout']
    },
    wholesale: {
      name: 'Wholesale & Traders',
      title: 'Wholesale Traders & Distributors',
      description: 'Manage party credit ledgers, multi-unit bulk packaging, payment terms, sales quotations, and dispatch delivery invoices.',
      features: ['Customer & supplier balance ledgers', 'Multi-unit packaging (Boxes, Cartons, Pcs)', 'Automatic invoice payment reminders', 'Sales quotation to invoice conversion']
    }
  };

  const testimonials = [
    {
      name: 'Mohit Jain',
      business: 'Arihanth Electronics & Retail',
      result: 'Increased Turnover by 40%',
      quote: 'HisabKhata POS handles our high SKU volume effortlessly. Live inventory is accurate, and expiry alerts prevent stockouts and waste completely.'
    },
    {
      name: 'Akhil Sharma',
      business: 'Shuban Garments & Textiles',
      result: 'Reduced Overdues by 80%',
      quote: 'The customer khata ledger and WhatsApp payment reminders helped us recover pending party balances in days instead of months.'
    },
    {
      name: 'Vishwaradhya K.',
      business: 'Sri Siddalingeshwara FMCG Distributors',
      result: 'From 50K to 35 Lacs Growth',
      quote: 'Switching from manual ledgers to HisabKhata saved us hours every day. Barcode scanning and GST reports work 100% offline with zero lag.'
    }
  ];

  const faqs = [
    {
      q: 'What is HisabKhata POS billing software?',
      a: 'HisabKhata POS is an offline-first GST billing, inventory, and accounting platform designed specifically for Indian retailers, chemist shops, restaurants, and wholesale traders. It works completely on your local computer with zero monthly subscription fees.'
    },
    {
      q: 'How does offline GST billing work without internet?',
      a: 'All product catalogs, customer party ledgers, tax invoices, and sales histories are stored in a fast local SQLite database on your device. You can create invoices, scan barcodes, and print receipts even during complete internet outages.'
    },
    {
      q: 'Can I connect thermal receipt printers and barcode scanners?',
      a: 'Yes! HisabKhata supports all standard 2-inch and 3-inch ESC/POS thermal printers via USB and Web Bluetooth GATT. It also supports all 1D/2D laser barcode scanners in HID mode with no external drivers required.'
    },
    {
      q: 'Can I export reports for my Chartered Accountant (CA)?',
      a: 'Yes. You can export GSTR-1, GSTR-3B, B2B/B2C tax summaries, stock valuation ledgers, and P&L statements directly to Excel, CSV, and Tally-compatible XML formats in one click.'
    },
    {
      q: 'Is my business data safe and private?',
      a: '100% yes. Because HisabKhata is offline-first, your financial records and customer phone numbers stay on your machine and are never uploaded to third-party cloud servers or tracked remotely.'
    }
  ];

  const activeIndustryData = industries[activeIndustryTab];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#060911] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#4c3cce] selection:text-white overflow-x-clip max-w-full relative transition-colors duration-300">

      {showBanner && (
        <div className="relative w-full bg-gradient-to-r from-purple-100 via-orange-50 to-yellow-100 dark:from-purple-950 dark:via-slate-900 dark:to-slate-950 border-b border-purple-200/60 dark:border-purple-900/40 py-2 pl-4 pr-10 sm:px-8 text-center text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 transition-all">
          <span>⚡ 100% Offline-First GST Billing Software for Small Businesses in India</span>
          <span className="hidden sm:inline">•</span>
          <button onClick={() => navigate(isLoggedIn ? '/pos' : '/login')} className="text-[#4c3cce] dark:text-purple-400 font-bold underline underline-offset-2 hover:opacity-80 cursor-pointer">
            {isLoggedIn ? 'Open POS →' : 'Launch POS Free →'}
          </button>
          <button
            onClick={dismissBanner}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <nav className="sticky top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#060911]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
            <div className="flex items-center group cursor-pointer shrink-0 min-w-0" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src={logoLight} alt="HisabKhata POS" className="h-7 sm:h-9 max-w-[150px] w-auto dark:hidden block object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
              <img src={logoDark} alt="HisabKhata POS" className="h-7 sm:h-9 max-w-[150px] w-auto dark:block hidden object-contain mix-blend-screen group-hover:scale-105 transition-transform duration-300" />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <a href="#features" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Features</a>
              <a href="#compliance" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">GST Compliance</a>
              <a href="#solutions" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Solutions</a>
              <a href="#testimonials" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Testimonials</a>
              <a href="#faq" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">FAQs</a>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all focus:outline-none cursor-pointer"
                  aria-label="Toggle Theme"
                >
                  {theme === 'light' && <Sun size={15} className="text-amber-500" />}
                  {theme === 'dark' && <Moon size={15} className="text-blue-400" />}
                  {theme === 'system' && <Laptop size={15} className="text-slate-400" />}
                </button>

                {showThemeDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowThemeDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-20 flex flex-col gap-0.5 animate-fade-in">
                      <button
                        onClick={() => { setTheme('light'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'light' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Sun size={14} className="text-amber-500" /> Light
                      </button>
                      <button
                        onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'dark' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Moon size={14} className="text-blue-400" /> Dark
                      </button>
                      <button
                        onClick={() => { setTheme('system'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'system' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Laptop size={14} /> System
                      </button>
                    </div>
                  </>
                )}
              </div>

              {isLoggedIn ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex bg-[#db631a] hover:bg-[#c25414] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all duration-200 cursor-pointer shrink-0"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex bg-[#db631a] hover:bg-[#c25414] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all duration-200 cursor-pointer shrink-0"
                >
                  Get started for free
                </button>
              )}

              <button
                onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex sm:hidden items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all focus:outline-none cursor-pointer shrink-0"
                aria-label={isLoggedIn ? "Dashboard" : "Login"}
                title={isLoggedIn ? "Dashboard" : "Login"}
              >
                {isLoggedIn ? <LayoutDashboard size={15} /> : <LogIn size={15} />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex lg:hidden items-center justify-center transition-all focus:outline-none shrink-0"
                aria-label="Toggle Navigation Drawer"
              >
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 top-16 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-16 left-0 right-0 bg-white dark:bg-[#060911] border-b border-slate-200 dark:border-slate-800 z-50 lg:hidden p-5 flex flex-col gap-4 shadow-2xl animate-fade-in">
              <div className="flex flex-col gap-2 pt-1 font-semibold text-sm">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Features</a>
                <a href="#compliance" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">GST Compliance</a>
                <a href="#solutions" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Solutions</a>
                <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Testimonials</a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">FAQs</a>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <button
                onClick={() => { setMobileMenuOpen(false); navigate(isLoggedIn ? '/dashboard' : '/login'); }}
                className="w-full text-center bg-[#db631a] text-white py-3 rounded-full font-bold text-sm shadow-md"
              >
                {isLoggedIn ? 'Dashboard' : 'Get started for free'}
              </button>
            </div>
          </>
        )}
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#4c3cce] via-[#3d2eb8] to-[#2b1f96] text-white py-12 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            <div className="lg:col-span-7 space-y-6 sm:space-y-7">
              <h1 className="text-2xl sm:text-4xl lg:text-[44px] font-bold tracking-tight leading-[1.2] font-sans">
                Best GST Billing & POS Software for Small Businesses in India
              </h1>

              <ul className="space-y-3 sm:space-y-4 text-sm sm:text-lg">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <span>Create GST & Non-GST bill in <strong>8 seconds</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <span>Increase stock rotation by <strong>2.8x faster</strong></span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <span>Collect <strong>97% payments</strong> on time with Khata Ledgers</span>
                </li>
              </ul>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button
                  onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
                  className="w-full sm:w-auto bg-[#db631a] hover:bg-[#c25414] hover:scale-[1.03] active:scale-[0.98] text-white px-8 py-4 rounded-full text-base font-bold shadow-lg shadow-orange-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  {isLoggedIn ? 'Dashboard' : 'Get started for free'} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                <a
                  href="#simulator"
                  className="w-full sm:w-auto border border-white hover:bg-white/10 hover:scale-[1.03] active:scale-[0.98] text-white px-7 py-4 rounded-full text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={15} fill="currentColor" /> Test Live POS
                </a>
              </div>

              <div className="pt-6 border-t border-white/15">
                <div className="text-sm font-semibold text-white/90 mb-3">Trusted by 1 Crore+ Indian Businesses</div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/80 font-medium">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">⭐ 4.8 Rating (1.4L+ Reviews)</span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">🛡️ 100% Offline SQLite Privacy</span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">🏆 Best Tech Brand 2026</span>
                </div>
              </div>
            </div>

            <div id="simulator" className="lg:col-span-5">
              <div className="rounded-3xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-800 p-4 sm:p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-sm text-white">Live Counter Terminal</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded">100% OFFLINE</span>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Quick Add Items:</div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <button onClick={() => addSimulatorItem('Paracetamol 650', 15, 18)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left cursor-pointer">
                      <div className="font-bold text-white">💊 Paracetamol</div>
                      <div className="text-[10px] text-slate-400 flex justify-between mt-1"><span>₹15.00</span><span>18% GST</span></div>
                    </button>
                    <button onClick={() => addSimulatorItem('Crocin Relief', 40, 18)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left cursor-pointer">
                      <div className="font-bold text-white">💊 Crocin</div>
                      <div className="text-[10px] text-slate-400 flex justify-between mt-1"><span>₹40.00</span><span>18% GST</span></div>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-xs space-y-2">
                  <div className="flex justify-between text-slate-400 text-[10px] uppercase pb-1 border-b border-slate-800">
                    <span>Active Cart ({billItems.length})</span>
                    <span>Amount</span>
                  </div>
                  <div className="divide-y divide-slate-800/60 max-h-[120px] overflow-y-auto">
                    {billItems.map((item, idx) => (
                      <div key={idx} className="py-1 flex items-center justify-between">
                        <span className="truncate">{item.name} x{item.qty}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400">₹{(item.qty * item.price).toFixed(2)}</span>
                          <button onClick={() => removeSimulatorItem(idx)} className="text-red-400 text-xs">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400"><span>Subtotal + GST</span><span>₹{(calculateSubtotal() + calculateTax()).toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Discount</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDiscount(Math.max(0, discount - 5))} className="w-4 h-4 bg-slate-800 rounded font-bold">-</button>
                        <span className="text-white px-1">₹{discount}</span>
                        <button onClick={() => setDiscount(discount + 5)} className="w-4 h-4 bg-slate-800 rounded font-bold">+</button>
                      </div>
                    </div>
                    <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-white text-xs">
                      <span>Grand Total:</span>
                      <span className="text-emerald-400 text-sm">₹{Math.max(0, calculateTotal()).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => toast.success(`Simulated Receipt Printed! Total: ₹${Math.max(0, calculateTotal()).toFixed(2)}`)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  Print Thermal Bill & Save
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-5xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#4c3cce] dark:text-purple-400 text-xs font-bold font-mono">
            CORE CAPABILITIES
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight lg:whitespace-nowrap">
            All-in-One Billing, Inventory & Accounting Software
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Everything your store needs to operate at maximum speed, manage stock, collect payments, and stay GST compliant.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-3">
            {featureTabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveFeatureTab(idx)}
                className={`w-full text-left p-5 rounded-2xl transition-all border cursor-pointer ${activeFeatureTab === idx
                  ? 'bg-white dark:bg-slate-900 border-[#4c3cce] dark:border-purple-500 shadow-lg'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <span className="font-bold text-xl text-slate-400 font-mono">{tab.num}</span>
                  <div className="space-y-1.5 flex-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono ${tab.tagColor}`}>
                      {tab.tag}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {tab.title}
                    </h3>
                    {activeFeatureTab === idx && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1 animate-fade-in">
                        {tab.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-6 sticky top-28">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
              {featureTabs[activeFeatureTab].screen}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>⭐ Key Metric: {featureTabs[activeFeatureTab].highlight}</span>
                <button onClick={handleLaunchApp} className="text-[#4c3cce] dark:text-purple-400 font-bold hover:underline">
                  Try Feature Free →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="compliance" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto mb-12 space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
              STAY 100% GST COMPLIANT
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight lg:whitespace-nowrap">
              Tax-Ready Invoices & Reports Without Extra Manual Work
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Generate tax reports, claim accurate Input Tax Credit, and export directly to Tally Prime.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl">
            <div className="lg:col-span-5 space-y-2">
              {gstTabs.map((tab, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGstTab(idx)}
                  className={`w-full text-left p-4 rounded-xl transition-all border cursor-pointer ${activeGstTab === idx
                    ? 'bg-[#4c3cce] text-white border-[#4c3cce] shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <div className="font-bold text-sm">{tab.title}</div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7 space-y-4 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-6 lg:pt-0">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {gstTabs[activeGstTab].title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                {gstTabs[activeGstTab].desc}
              </p>
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-[#4c3cce] dark:text-purple-300">
                ✓ {gstTabs[activeGstTab].metric}
              </div>
              <button
                onClick={handleLaunchApp}
                className="bg-[#4c3cce] hover:bg-[#3d2eb8] text-white px-6 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Start GST Billing Free
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" className="py-16 sm:py-24 bg-white dark:bg-[#080c14] border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto mb-10 space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/60 text-[#db631a] dark:text-orange-400 text-xs font-bold font-mono">
              INDUSTRY SOLUTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight lg:whitespace-nowrap">
              Built for Every Industry. Used Across Sectors in India
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
            {Object.keys(industries).map((key) => (
              <button
                key={key}
                onClick={() => setActiveIndustryTab(key)}
                className={`px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeIndustryTab === key
                  ? 'bg-[#4c3cce] text-white shadow-md shadow-purple-600/25'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {industries[key].name}
              </button>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {activeIndustryData.title}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeIndustryData.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeIndustryData.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <button
                  onClick={handleLaunchApp}
                  className="bg-[#db631a] hover:bg-[#c25414] text-white px-6 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  Start Billing for {industries[activeIndustryTab].name}
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2 font-bold text-slate-900 dark:text-white">
                <span>{activeIndustryTab.toUpperCase()} SPECIALIZED WORKFLOW</span>
                <span className="text-purple-600 dark:text-purple-400">READY</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                ✓ Auto HSN Code tax mapping (5%, 12%, 18%)<br />
                ✓ Direct ESC/POS Bluetooth & USB printing<br />
                ✓ Customer Khata ledger with WhatsApp reminders<br />
                ✓ 100% Offline SQLite database with zero downtime
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#4c3cce] dark:text-purple-400 text-xs font-bold font-mono">
            SUCCESS STORIES
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Trusted by Small Businesses Across India
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            See how Indian store owners are increasing sales and eliminating stockout errors with HisabKhata.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t.result}</div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                  "{t.quote}"
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</div>
                <div className="text-xs text-slate-500">{t.business}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-950 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Start using HisabKhata POS today
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Enter your email to start billing for free on desktop or mobile.
          </p>

          <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl sm:rounded-full p-2 sm:p-1.5 shadow-lg gap-2 sm:gap-0">
            <div className="w-full flex items-center pl-3 sm:pl-4 pr-2 flex-1">
              <Mail size={16} className="text-slate-400 shrink-0 mr-2" />
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-transparent py-2.5 sm:py-2 text-sm text-slate-900 dark:text-white focus:outline-none font-semibold placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-[#4c3cce] hover:bg-[#3d2eb8] text-white px-6 py-3 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0"
            >
              {isLoggedIn ? 'Dashboard' : 'Get started for free'}
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-500 pt-2 font-medium">
            <span>✓ No credit card needed</span>
            <span>✓ 100% Offline SQLite database</span>
            <span>✓ Instant setup in 60s</span>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-gradient-to-r from-[#3d2eb8] to-[#25187e] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              100% Free Complete Account Setup & Onboarding Support
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
              <li className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <span>Invoice & Thermal Customisation</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <span>Bulk Excel Product & Party Upload</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <span>1-on-1 Detailed POS Demo</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                <span>Staff & Cashier Training</span>
              </li>
            </ul>
            <div className="pt-2">
              <button onClick={handleLaunchApp} className="bg-white text-[#4c3cce] hover:bg-slate-100 px-8 py-3.5 rounded-full text-sm font-bold shadow-lg cursor-pointer">
                Book Free Onboarding Demo
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/15 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <Headphones size={18} />
              <span>DEDICATED SUPPORT DESK</span>
            </div>
            <div className="text-slate-200 leading-relaxed">
              📞 Direct Call & WhatsApp: +91 8918153949<br />
              ✉️ Email: pos.hisabkhata@sumanonline.com<br />
              ⏰ Hours: Mon - Sat, 9:00 AM - 8:00 PM IST
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#4c3cce] dark:text-purple-400 text-xs font-bold font-mono">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Common Questions About HisabKhata POS
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  className="w-full p-5 text-left flex justify-between items-center font-bold text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} className="text-[#4c3cce]" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="py-16 sm:py-24 bg-slate-100 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
            Start Billing for Free Today
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join thousands of smart retailers, chemist shops, cafes, and wholesale distributors managing their business on HisabKhata POS.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
              className="bg-[#db631a] hover:bg-[#c25414] text-white px-8 py-4 rounded-full text-base font-bold shadow-lg shadow-orange-600/25 transition-all cursor-pointer"
            >
              {isLoggedIn ? 'Dashboard' : 'Get started for free'}
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 pt-10 pb-6 sm:pt-12 sm:pb-8 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 pb-6 border-b border-slate-800/80">
            <img src={logoDark} alt="HisabKhata POS" className="h-8 w-auto object-contain mb-2" />
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              HisabKhata POS #1 GST Billing, POS and Inventory Software for small businesses in India.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 pb-8 mb-6 border-b border-slate-800">
            <div>
              <h4 className="text-white font-bold mb-3 text-xs sm:text-sm uppercase tracking-wider">Features</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">GST Invoicing</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Inventory Tracking</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Customer Khata</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Thermal Printing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-xs sm:text-sm uppercase tracking-wider">Industries</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#solutions" className="hover:text-white transition-colors">Retail & Supermarket</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Pharmacy & Chemist</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Restaurants & Cafes</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Wholesale Traders</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-xs sm:text-sm uppercase tracking-wider">Contact & Support</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><span className="text-slate-500 block">Email:</span><a href="mailto:pos.hisabkhata@sumanonline.com" className="text-slate-300 hover:text-white font-mono break-all text-[11px] sm:text-xs">pos.hisabkhata@sumanonline.com</a></li>
                <li><span className="text-slate-500 block">Phone:</span><a href="tel:+918918153949" className="text-slate-300 hover:text-white font-medium">+91 8918153949</a></li>
                <li><span className="text-slate-500 block">Location:</span><span className="text-slate-300 font-medium">Kolkata, WB, India</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-3 text-xs sm:text-sm uppercase tracking-wider">Social Media</h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="https://wa.me/918918153949" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">💬 WhatsApp Support</a></li>
                <li><a href="https://github.com/sumanonline" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">🌐 Developer Portal</a></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">💼 LinkedIn Page</a></li>
                <li><a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-sky-400 transition-colors">🐦 Twitter / X</a></li>
              </ul>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pb-2">
            <p className="leading-relaxed">
              © 2026 HisabKhata POS. <br />A SumanOnline Project. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
