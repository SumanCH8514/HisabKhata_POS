import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info, Sparkles, CheckCircle2, ShieldCheck, Smartphone, Printer,
  Database, Cloud, Cpu, Layers, GitCommit, ExternalLink, ArrowLeft,
  Calendar, Zap, Award, Check, Copy, RefreshCw, Terminal, Users,
  ShoppingBag, ShoppingCart, FileText, Lock, Globe, MessageCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';

export const APP_VERSION = 'v1.1.0';
export const RELEASE_DATE = '2026-09-20';
export const RELEASE_CHANNEL = 'Stable (Production Edge)';

const CHANGELOG = [
  {
    version: 'v1.1.0',
    title: 'Enterprise Multi-User, Security & Mobile Workflows',
    date: 'September 20, 2026',
    status: 'Latest Production Release',
    current: true,
    highlights: [
      {
        tag: 'Mobile Experience',
        tagColor: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        title: 'Native Camera Item Capture & Fullscreen Modal',
        description: 'Integrated mobile camera capture with client-side WebP compression (<200KB), fullscreen Add Item workflow, and redesigned product hero cards with quick-action bars.'
      },
      {
        tag: 'Security & Auth',
        tagColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        title: 'Cloudflare Turnstile & Email Verification',
        description: 'Added anti-bot Turnstile verification on signup/login, automated 6-digit OTP verification via SMTP, and secure cryptographic password reset flows.'
      },
      {
        tag: 'Multi-User Collaboration',
        tagColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        title: 'Staff Roles & Permission Hierarchy',
        description: 'Role-based access controls for Admin, Manager, and Cashier roles with secure tokenized invite links and custom dashboard visibility.'
      },
      {
        tag: 'POS & Invoicing',
        tagColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        title: '6-Column Invoices & Mobile POS Cart Drawer',
        description: 'Standardized 6-column invoice tables (Sl, Item Description, HSN/SAC, Unit/MRP, Qty, Total), clean A4/thermal printing without link underlines, and mobile sliding cart bottom sheets.'
      },
      {
        tag: 'Growth & Analytics',
        tagColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        title: 'Referral Rewards & Responsive Dashboard Legends',
        description: 'End-to-end partner referral engine with reward tracking, and responsive performance chart legends with smart mobile keyboard shortcut management.'
      }
    ]
  },
  {
    version: 'v1.0.0',
    title: 'Official Production Release — GST POS & Inventory Engine',
    date: 'September 18, 2026',
    status: 'Foundation Release',
    current: false,
    highlights: [
      {
        tag: 'Core POS',
        tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        title: 'High-Speed Counter Billing & Laser Scanning',
        description: 'Instant SKU/barcode product lookup, line-item and bill-level discounts, split payments (Cash, UPI QR, Customer Credit Khata), and fast keyboard shortcuts (F2/F3).'
      },
      {
        tag: 'GST Compliance',
        tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        title: 'Indian GST Split & Dual Print Engines',
        description: 'Automated CGST, SGST, IGST calculations, HSN/SAC management, A4 GST invoices, and 58mm/80mm ESC/POS Bluetooth & USB thermal printing.'
      },
      {
        tag: 'Inventory & Storage',
        tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        title: 'Warehouse Aisle, Rack & Shelf Mapping',
        description: 'Organize items by physical warehouse coordinates with dynamic shelf coordinates on POS cards and bulk CSV import/export.'
      },
      {
        tag: 'Khata Ledgers',
        tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        title: 'Customer & Vendor Credit Books',
        description: 'Real-time debit/credit balances, synchronized transaction accounting, and one-click WhatsApp digital receipt dispatch.'
      }
    ]
  }
];

export default function AboutProject() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState({
    'v1.1.0': true,
    'v1.0.0': false
  });

  const toggleVersion = (ver) => {
    setExpandedVersions(prev => ({
      ...prev,
      [ver]: !prev[ver]
    }));
  };

  const allExpanded = CHANGELOG.every(rel => expandedVersions[rel.version]);

  const toggleAll = () => {
    const nextState = !allExpanded;
    const nextObj = {};
    CHANGELOG.forEach(rel => {
      nextObj[rel.version] = nextState;
    });
    setExpandedVersions(nextObj);
  };
  const [systemInfo, setSystemInfo] = useState({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    bluetooth: false,
    screen: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setSystemInfo(prev => ({ ...prev, bluetooth: true }));
    }
  }, []);

  const handleCopyVersion = () => {
    navigator.clipboard?.writeText?.(`HisabKhata POS ${APP_VERSION} (${RELEASE_CHANNEL})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 p-3.5 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/SumanCH8514/HisabKhata_POS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all shadow-2xs"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">GitHub Repository</span>
              <span className="sm:hidden">GitHub</span>
            </a>

            <a
              href="https://wa.me/918918153949?text=HisabKhata%20POS%20Inquiry"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <MessageCircle size={14} />
              <span>Contact Developer</span>
            </a>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white p-6 sm:p-8 lg:p-10 border border-slate-800 shadow-xl">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-2.5 flex items-center justify-center shadow-lg shrink-0">
                <img
                  src={theme === 'light' ? logoLight : logoDark}
                  alt="HisabKhata POS Logo"
                  className="w-full h-full object-contain mix-blend-screen"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    HisabKhata POS
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 max-w-xl">
                  Enterprise GST Billing, Multi-Unit Inventory & Point-of-Sale System engineered for modern retail, wholesale, and multi-user businesses.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyVersion}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition-all cursor-pointer shrink-0"
              title="Click to copy full version string"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Version Copied!' : `Copy ${APP_VERSION}`}</span>
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Release Version</p>
              <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">{APP_VERSION}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Build Channel</p>
              <p className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">Production Stable</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Release Date</p>
              <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">{RELEASE_DATE}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Uptime</p>
              <p className="text-sm sm:text-base font-extrabold text-teal-300 mt-0.5">100% Edge Powered</p>
            </div>
          </div>
        </div>

        {/* Architecture & Stack Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Cpu size={16} />
              <span>Frontend Architecture</span>
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-white">React 18 + Vite + Tailwind</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ultra-responsive Single Page Application, Web Bluetooth ESC/POS thermal printing, and camera WebP capture.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Cloud size={16} />
              <span>Edge API Gateway</span>
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-white">Cloudflare Worker + Hono.js</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Global serverless V8 execution running on SumanOnline Edge with sub-20ms API response latency across India.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
              <Database size={16} />
              <span>Database & Storage</span>
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-white">Cloudflare D1 & R2 Storage</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ACID-compliant serverless SQLite database with automatic backups and cloud object storage for invoice receipts and logos.
            </p>
          </div>
        </div>

        {/* Release Changelog Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GitCommit size={20} className="text-emerald-600 dark:text-emerald-400" />
                Release History & Official Changelog
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detailed version release notes, newly shipped features, and security enhancements
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={toggleAll}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer select-none"
              >
                {allExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    <span>Collapse All</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    <span>Expand All</span>
                  </>
                )}
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Current: <strong>{APP_VERSION}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {CHANGELOG.map((rel) => {
              const isExpanded = !!expandedVersions[rel.version];
              return (
                <div
                  key={rel.version}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    rel.current
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-300/80 dark:border-emerald-800/80 shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Clickable Card Header */}
                  <button
                    type="button"
                    onClick={() => toggleVersion(rel.version)}
                    className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 text-left transition-colors cursor-pointer select-none ${
                      isExpanded
                        ? 'border-b border-slate-200/60 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40'
                        : 'hover:bg-white/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-sm sm:text-base font-black px-2.5 py-0.5 rounded-lg border shrink-0 ${
                        rel.current
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                      }`}>
                        {rel.version}
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {rel.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs">
                          <Calendar size={13} />
                          {rel.date}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hidden sm:inline-block">
                          {rel.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/80 dark:border-slate-700">
                          {rel.highlights.length} updates
                        </span>
                      </div>

                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                        isExpanded
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expandable Content Area */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {rel.highlights.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.title}
                              </h4>
                              <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${item.tagColor}`}>
                                {item.tag}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Diagnostics & Client Environment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Terminal size={14} />
            Client Environment & Runtime Diagnostics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold">Network Connection</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {systemInfo.online ? 'Online' : 'Offline Mode'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold">Web Bluetooth API</span>
              <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                systemInfo.bluetooth ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
              }`}>
                {systemInfo.bluetooth ? 'Hardware Supported' : 'Standard Web Driver'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold">Screen Viewport</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5">
                {systemInfo.screen}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] font-bold">Production Domain</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">
                pos.hisabkhata.sumanonline.com
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 pb-6 text-xs text-slate-400 dark:text-slate-500 space-y-1">
          <p>
            <strong>HisabKhata POS</strong> &bull; Version {APP_VERSION} ({RELEASE_DATE})
          </p>
          <p>
            Crafted with precision by <a href="https://sumanonline.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">SumanOnline</a> &bull; Suman Chakrabortty
          </p>
        </div>

      </div>
    </div>
  );
}
