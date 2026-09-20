import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, MessageCircle, Copy, Check,
  ChevronDown, ChevronUp, RefreshCw, Printer,
  ScanLine, HardDrive, Wifi, Shield, FileText,
  Github, Layers, CheckCircle2
} from 'lucide-react';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';
import { getConnectedPrinter, printTestReceipt } from '../utils/bluetoothPrinter.js';

export const APP_VERSION = 'v1.1.0';
export const BUILD_NUMBER = '2026.09.20-rel';
export const RELEASE_DATE = '20 September 2026';

const CHANGELOG = [
  {
    version: 'v1.1.0',
    title: 'Enterprise Multi-User & Mobile Workflows',
    date: '20 September 2026',
    tag: 'Latest',
    tagColor: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    features: [
      {
        category: 'New Features',
        items: [
          'Native mobile camera capture with automatic client-side WebP compression (<200KB) directly inside the Add Item modal.',
          'Staff roles and permissions system (Admin, Manager, Cashier) with tokenized email and link invitations.',
          'Cloudflare Turnstile CAPTCHA protection on merchant registration and authentication endpoints.',
          'Automated email verification workflow with 6-digit OTP codes and SMTP TLS delivery.',
          'Referral partner rewards program with custom QR codes and automated ledger credit tracking.'
        ]
      },
      {
        category: 'Improvements & Fixes',
        items: [
          'Redesigned Add Item modal into a fullscreen, touch-optimized experience on mobile viewports.',
          'Standardized 6-column invoice table layout (Sl, Description, HSN/SAC, Unit/MRP, Qty, Total) for A4 and thermal printing.',
          'Cleaned up print templates to eliminate link underlines and unnecessary page margins.',
          'Optimized Monthly Performance chart legends with clean responsive chip wrapping on small screens.',
          'Added mobile sliding cart bottom sheet to keep product cards clear and readable on phones.'
        ]
      }
    ]
  },
  {
    version: 'v1.0.0',
    title: 'Initial Production Launch',
    date: '18 September 2026',
    tag: 'Stable',
    tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    features: [
      {
        category: 'Core Capabilities',
        items: [
          'Instant POS counter billing with barcode scanner support, custom GST tax rates, and split payment modes.',
          'Physical warehouse coordinate mapping (Aisle, Rack, Shelf/Bin) displayed on item cards.',
          'Customer and supplier khata ledgers with real-time debit/credit balances and WhatsApp receipt sharing.',
          'Dual print engines: standard desktop A4 tax invoices and 58mm/80mm ESC/POS Bluetooth thermal receipts.',
          'Serverless architecture on Cloudflare Pages, Workers, D1 SQLite database, and R2 object storage.'
        ]
      }
    ]
  }
];

export default function AboutProject() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState('');
  const [expandedVersions, setExpandedVersions] = useState({
    'v1.1.0': true,
    'v1.0.0': false
  });

  const connectedPrinter = getConnectedPrinter();

  const toggleVersion = (ver) => {
    setExpandedVersions(prev => ({
      ...prev,
      [ver]: !prev[ver]
    }));
  };

  const handleCopyDetails = () => {
    const details = `HisabKhata POS ${APP_VERSION} (Build ${BUILD_NUMBER})\nRelease: ${RELEASE_DATE}\nPlatform: Cloudflare Edge (Pages + Workers + D1 + R2)\nCrafted by SumanOnline`;
    navigator.clipboard?.writeText?.(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    setPrintStatus('');
    try {
      await printTestReceipt('HisabKhata POS');
      setPrintStatus('Receipt sent to printer');
      setTimeout(() => setPrintStatus(''), 3000);
    } catch (err) {
      setPrintStatus(err.message || 'Print error');
      setTimeout(() => setPrintStatus(''), 4000);
    } finally {
      setTestPrinting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-800 dark:text-slate-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Top Header Navigation */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/SumanCH8514/HisabKhata_POS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors shadow-2xs"
            >
              <Github size={13} />
              <span className="hidden sm:inline">GitHub Repository</span>
              <span className="sm:hidden">GitHub</span>
            </a>

            <a
              href="https://wa.me/918918153949?text=HisabKhata%20POS%20Help"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <MessageCircle size={13} />
              <span>Support</span>
            </a>
          </div>
        </div>

        {/* Product Identity Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={theme === 'light' ? logoLight : logoDark}
                  alt="HisabKhata POS"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    HisabKhata POS
                  </h1>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Point of Sale, GST Billing & Inventory Management for Retail & Wholesale
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyDetails}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check size={13} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy build details'}</span>
            </button>
          </div>

          {/* Software & Environment Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Installed Version</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{APP_VERSION}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Build Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">{RELEASE_DATE}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Edge Infrastructure</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">Cloudflare Network</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tax Compliance</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">Indian GST (CGST/SGST)</span>
            </div>
          </div>
        </div>

        {/* Hardware & Terminal Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              POS Terminal Hardware
            </h2>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Manage in Settings
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Thermal Printer */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  connectedPrinter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  <Printer size={15} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Thermal Printer</p>
                  <p className="text-[10.5px] text-slate-400">
                    {connectedPrinter ? (connectedPrinter.name || 'Connected') : 'Disconnected'}
                  </p>
                </div>
              </div>

              {connectedPrinter && (
                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={testPrinting}
                  className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-white dark:bg-slate-900 border border-emerald-200 rounded-md shadow-2xs hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                >
                  {testPrinting ? 'Testing...' : 'Test'}
                </button>
              )}
            </div>

            {/* Barcode Scanner */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ScanLine size={15} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Barcode Scanner</p>
                <p className="text-[10.5px] text-slate-400">USB Wedge / Camera Active</p>
              </div>
            </div>

            {/* Offline Database */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <HardDrive size={15} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Offline Khata</p>
                <p className="text-[10.5px] text-slate-400">Local Browser Cache Ready</p>
              </div>
            </div>
          </div>

          {printStatus && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pl-1">
              {printStatus}
            </p>
          )}
        </div>

        {/* Release History & Changelog */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Release Notes & Changelog
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Current: <strong className="text-slate-700 dark:text-slate-300 font-bold">{APP_VERSION}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {CHANGELOG.map((rel) => {
              const isExpanded = !!expandedVersions[rel.version];
              return (
                <div
                  key={rel.version}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => toggleVersion(rel.version)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${rel.tagColor}`}>
                        {rel.version}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {rel.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {rel.date} &bull; {rel.tag}
                        </p>
                      </div>
                    </div>

                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3.5 sm:p-4 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-3 text-xs">
                      {rel.features.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                            {group.category}
                          </p>
                          <ul className="space-y-1 text-slate-600 dark:text-slate-400 pl-4 list-disc marker:text-emerald-500 leading-relaxed">
                            {group.items.map((it, idx) => (
                              <li key={idx}>{it}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Understated Professional Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 pb-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200/60 dark:border-slate-800">
          <p>
            &copy; 2026 HisabKhata POS &bull; Crafted by <a href="https://sumanonline.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 dark:text-slate-300 hover:underline">SumanOnline</a>
          </p>
          <div className="flex items-center gap-3">
            <a href="https://github.com/SumanCH8514/HisabKhata_POS/releases" target="_blank" rel="noopener noreferrer" className="hover:underline">
              All Releases
            </a>
            <span>&bull;</span>
            <a href="https://github.com/SumanCH8514/HisabKhata_POS/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:underline">
              MIT License
            </a>
            <span>&bull;</span>
            <a href="https://wa.me/918918153949" target="_blank" rel="noopener noreferrer" className="hover:underline">
              WhatsApp Helpdesk
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
