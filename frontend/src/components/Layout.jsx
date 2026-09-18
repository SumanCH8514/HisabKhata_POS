import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Users, User,
  FileText, Settings, Menu, X, ChevronDown, Check,
  Briefcase, Activity, CreditCard, PieChart, Book,
  Wrench, Save, UserPlus, Headphones, MessageCircle, ChevronRight, Plus, LogOut, Building2, ExternalLink, ShieldCheck,
  Bluetooth, Printer, Zap, RefreshCw, AlertCircle, ScanLine, Radio, CheckCircle2,
  Sun, Moon, Laptop
} from 'lucide-react';
import { getCompanies, createCompany, getUserProfile, syncUserSettingsFromCloud, getMyPendingInvitations, respondToInvitation } from '../api/client.js';
import { useTheme } from '../utils/theme.js';
import {
  isBluetoothSupported,
  connectBluetoothPrinter,
  getConnectedPrinter,
  autoReconnectBluetoothPrinter,
  disconnectBluetoothPrinter,
  printTestReceipt
} from '../utils/bluetoothPrinter.js';

import logoDark from '../assets/logo_dark_mode.png';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Items', rightIcon: Plus },
  { to: '/parties', icon: Users, label: 'Customers & Vendors', rightIcon: Plus },
  { to: '/sales', icon: FileText, label: 'Sales', rightIcon: ChevronRight },
  { to: '/pos', icon: ShoppingCart, label: 'POS' },
  { to: '/purchase', icon: ShoppingBag, label: 'Purchase', rightIcon: ChevronRight },
  { to: '/expenses', icon: CreditCard, label: 'Expenses', rightIcon: Plus },
  { to: '/fundflow', icon: Activity, label: 'Fund Flow', rightIcon: ChevronRight },
  { to: '/reports', icon: PieChart, label: 'Reports & Analysis' },
  { to: '/account', icon: Book, label: 'Account Book', rightIcon: ChevronRight },
  { to: '/tools', icon: Wrench, label: 'Extra Tools', rightIcon: ChevronRight },
  { to: '/backup', icon: Save, label: 'Backup' },
  { to: '/referral', icon: UserPlus, label: 'Referral' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [company, setCompany] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_company');
      if (cached) return JSON.parse(cached);
    } catch {}
    return { name: localStorage.getItem('userName') || '' };
  });
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [addCompanyError, setAddCompanyError] = useState('');
  const [userPhoto, setUserPhoto] = useState(() => localStorage.getItem('userPhoto') || '');
  const [pendingInvites, setPendingInvites] = useState([]);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState(() => getConnectedPrinter());
  const [connectingBt, setConnectingBt] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [deviceSuccessMsg, setDeviceSuccessMsg] = useState('');

  useEffect(() => {
    const onConnected = (e) => {
      setConnectedPrinter(getConnectedPrinter() || { name: e?.detail?.name || 'Bluetooth Printer' });
    };
    const onDisconnected = () => {
      setConnectedPrinter(null);
    };
    window.addEventListener('hk_bluetooth_printer_connected', onConnected);
    window.addEventListener('hk_bluetooth_printer_disconnected', onDisconnected);

    autoReconnectBluetoothPrinter()
      .then(res => {
        if (res) setConnectedPrinter(res);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('hk_bluetooth_printer_connected', onConnected);
      window.removeEventListener('hk_bluetooth_printer_disconnected', onDisconnected);
    };
  }, []);

  const handleConnectBt = async () => {
    setConnectingBt(true);
    setDeviceError('');
    setDeviceSuccessMsg('');
    try {
      const res = await connectBluetoothPrinter();
      setConnectedPrinter(res);
      setDeviceSuccessMsg(`Connected to ${res.name || 'Bluetooth Printer'}`);
    } catch (err) {
      setDeviceError(err.message || 'Failed to connect Bluetooth device');
    } finally {
      setConnectingBt(false);
    }
  };

  const handleDisconnectBt = () => {
    disconnectBluetoothPrinter();
    setConnectedPrinter(null);
    setDeviceSuccessMsg('Device disconnected successfully');
  };

  const handleTestPrint = async () => {
    setTestPrinting(true);
    setDeviceError('');
    setDeviceSuccessMsg('');
    try {
      await printTestReceipt(company?.name || 'HisabKhata POS');
      setDeviceSuccessMsg('Test receipt sent to printer!');
    } catch (err) {
      setDeviceError(err.message || 'Error executing test print');
    } finally {
      setTestPrinting(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth !== 'true') {
      navigate('/login');
      return;
    }

    getCompanies()
      .then(list => {
        setCompanies(list);

        let activeId = localStorage.getItem('companyId');
        if (!activeId && list.length > 0) {
          activeId = list[0].id;
          localStorage.setItem('companyId', activeId);
        }

        if (activeId) {
          const activeCompany = list.find(c => String(c.id) === String(activeId));
          if (activeCompany) {
            setCompany(activeCompany);
            localStorage.setItem('userName', activeCompany.name);
            localStorage.setItem('userCompanyRole', activeCompany.role || 'owner');
            localStorage.setItem('cached_company', JSON.stringify(activeCompany));
          } else if (list.length > 0) {
            setCompany(list[0]);
            localStorage.setItem('companyId', list[0].id);
            localStorage.setItem('userName', list[0].name);
            localStorage.setItem('userCompanyRole', list[0].role || 'owner');
            localStorage.setItem('cached_company', JSON.stringify(list[0]));
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setCompany({ name: 'Error loading profile' });
      });

    getMyPendingInvitations()
      .then(invs => {
        if (Array.isArray(invs)) setPendingInvites(invs);
      })
      .catch(() => {});

    const refreshProfile = () => {
      getUserProfile()
        .then(u => {
          if (u?.photo_url) {
            setUserPhoto(u.photo_url);
            localStorage.setItem('userPhoto', u.photo_url);
          } else {
            setUserPhoto('');
            localStorage.removeItem('userPhoto');
          }
          if (u?.name) localStorage.setItem('userName', u.name);
          if (u?.email) localStorage.setItem('userEmail', u.email);
          if (u?.mobile) localStorage.setItem('userMobile', u.mobile);
        })
        .catch(() => {
          setUserPhoto(localStorage.getItem('userPhoto') || '');
        });
    };

    refreshProfile();
    syncUserSettingsFromCloud();
    window.addEventListener('user_profile_updated', refreshProfile);
    return () => window.removeEventListener('user_profile_updated', refreshProfile);
  }, [navigate]);

  const handleAcceptInviteBanner = async (token) => {
    try {
      const res = await respondToInvitation({ token, action: 'accept' });
      if (res?.success) {
        if (res.companyId) {
          localStorage.setItem('companyId', String(res.companyId));
          localStorage.setItem('userName', res.companyName || '');
          localStorage.removeItem('cached_company');
        }
        window.location.reload();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept invitation');
    }
  };

  const handleDeclineInviteBanner = async (token) => {
    try {
      await respondToInvitation({ token, action: 'reject' });
      setPendingInvites(prev => prev.filter(inv => inv.token !== token));
    } catch (err) {
      alert(err.message || 'Failed to decline invitation');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('companyId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userMobile');
    localStorage.removeItem('userPhoto');
    setUserPhoto('');
    navigate('/login');
    setDropdownOpen(false);
    setProfileDropdownOpen(false);
  };

  const userEmail = localStorage.getItem('userEmail') || company.email || '';
  const userName = localStorage.getItem('userName') || company.name || (userEmail ? userEmail.split('@')[0] : 'User');
  const isAdmin = localStorage.getItem('isAdmin') === 'true' || userEmail === 'dev.suman.ch@gmail.com';
  const userInitial = (userName.charAt(0) || 'U').toUpperCase();
  const userCompanyRole = company?.role || localStorage.getItem('userCompanyRole') || 'owner';
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (userCompanyRole === 'cashier') {
      return ['/dashboard', '/pos', '/inventory', '/parties', '/sales'].includes(item.to);
    }
    return true;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8fa] dark:bg-[#070b14] text-slate-800 dark:text-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden print:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out
          bg-sidebar border-r border-[#151927] z-50 print:hidden
          fixed inset-y-0 left-0 lg:static lg:z-10
          ${sidebarOpen ? 'w-64 translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        `}
      >
        <div className="flex items-center justify-between lg:justify-center px-3 py-3 border-b border-white/5 min-h-[64px] overflow-hidden">
          <img
            src={logoDark}
            alt="HisabKhata POS"
            className={`transition-all duration-300 mix-blend-screen ${sidebarOpen ? 'h-9 w-auto max-w-[190px] object-contain' : 'h-8 w-8 object-cover object-left rounded-lg'}`}
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto flex flex-col gap-1 overflow-x-hidden">
          {filteredNavItems.map(({ to, icon: Icon, label, rightIcon: RightIcon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={16} strokeWidth={1.5} className="flex-shrink-0 opacity-80" />
              {sidebarOpen && <span className="flex-1 text-sm font-medium truncate">{label}</span>}
              {sidebarOpen && RightIcon && <RightIcon size={12} className="opacity-40" />}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden w-full min-w-0 print:overflow-visible print:static">

        <header className="flex items-center px-4 py-2 bg-white border-b border-slate-200 min-h-[64px] shadow-xs sticky top-0 z-20 print:hidden">

          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-2 mr-2 sm:mr-3 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <Menu size={19} />
          </button>

          {/* Company Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500/50 hover:bg-slate-50/80 transition-all shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center bg-black border border-black text-white text-xs font-bold shadow-2xs shrink-0">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain p-0.5" />
                ) : (
                  company.name ? company.name.charAt(0).toUpperCase() : 'B'
                )}
              </div>
              <div className="text-left hidden sm:block max-w-[130px] md:max-w-[160px]">
                <p className="text-xs font-bold text-slate-800 tracking-tight leading-tight truncate">
                  {company.name}
                </p>
                <p className="text-[10px] font-semibold text-emerald-600 leading-none mt-0.5">Active Store</p>
              </div>
              <ChevronDown size={13} className="text-slate-400 ml-0.5 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs sm:bg-transparent" onClick={() => setDropdownOpen(false)} />
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:top-[calc(100%+12px)] sm:left-0 w-auto sm:w-72 max-w-sm mx-auto sm:mx-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 animate-fade-in">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Business</p>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{companies.length}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto mb-2 space-y-1 scrollbar-thin">
                    {companies.map((comp) => {
                      const isActive = String(comp.id) === String(localStorage.getItem('companyId'));
                      return (
                        <div
                          key={comp.id}
                          onClick={() => {
                            if (!isActive) {
                              localStorage.setItem('companyId', comp.id);
                              localStorage.setItem('userName', comp.name);
                              localStorage.setItem('userCompanyRole', comp.role || 'owner');
                              window.location.reload();
                            }
                            setDropdownOpen(false);
                          }}
                          className={`p-2.5 rounded-xl flex items-center justify-between border cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 font-bold shadow-sm shadow-emerald-500/10'
                              : 'bg-white dark:bg-slate-800/40 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-xs font-bold shadow-2xs shrink-0 ${isActive ? 'bg-black border border-emerald-500 text-white' : 'bg-black border border-slate-800 text-white'}`}>
                              {comp.logo_url ? (
                                <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                comp.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs uppercase truncate max-w-[140px] font-bold ${isActive ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>{comp.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {isActive && <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Active</span>}
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  comp.role === 'manager'
                                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                                    : comp.role === 'cashier'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                                }`}>
                                  {comp.role || 'owner'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isActive && <Check size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => { setShowAddCompanyModal(true); setDropdownOpen(false); }}
                    className="w-full mb-2.5 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>+</span> Add New Business
                  </button>

                  <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <button
                      onClick={() => { navigate('/company-profile'); setDropdownOpen(false); }}
                      className="flex-1 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="flex-1 py-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/40 transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative ml-2 sm:ml-2.5">
            <button
              type="button"
              onClick={() => {
                setDeviceModalOpen(!deviceModalOpen);
                setDeviceError('');
                setDeviceSuccessMsg('');
              }}
              title={connectedPrinter ? `Connected: ${connectedPrinter.name || 'Bluetooth Printer'}` : 'Hardware & Bluetooth Peripherals'}
              className={`flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3 rounded-xl border transition-all shadow-2xs hover:shadow-xs active:scale-97 cursor-pointer ${
                connectedPrinter
                  ? 'border-emerald-200/90 bg-white hover:bg-emerald-50/40 text-slate-800 shadow-emerald-500/5'
                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors relative ${
                connectedPrinter ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              }`}>
                <Bluetooth size={14} className={connectedPrinter ? 'text-emerald-600' : 'text-slate-500'} />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white ${
                  connectedPrinter ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`} />
              </div>

              <span className="text-xs font-bold text-slate-700 tracking-tight hidden md:inline truncate max-w-[110px]">
                {connectedPrinter ? (connectedPrinter.name || 'Printer') : 'Hardware'}
              </span>

              {connectedPrinter ? (
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-200/60 hidden sm:inline leading-none">
                  Ready
                </span>
              ) : (
                <span className="text-[9.5px] font-semibold text-slate-400 hidden sm:inline leading-none">
                  Off
                </span>
              )}
            </button>

            {deviceModalOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-2xs"
                  onClick={() => setDeviceModalOpen(false)}
                />
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:top-[calc(100%+12px)] sm:left-0 w-auto sm:w-96 max-w-sm mx-auto sm:mx-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in text-slate-800 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Bluetooth size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 leading-tight">Hardware & Peripherals</h4>
                        <p className="text-[10px] text-slate-400">Bluetooth printers & POS devices</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeviceModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {deviceError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <AlertCircle size={14} className="shrink-0" />
                      <span className="leading-tight">{deviceError}</span>
                    </div>
                  )}

                  {deviceSuccessMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                      <span className="leading-tight">{deviceSuccessMsg}</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <div className={`p-3 rounded-xl border transition-all ${
                      connectedPrinter
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            connectedPrinter ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                          }`}>
                            <Printer size={15} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-slate-900 truncate">
                              {connectedPrinter ? connectedPrinter.name : 'Bluetooth Thermal Printer'}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${connectedPrinter ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              <span>{connectedPrinter ? 'Connected & Ready (ESC/POS)' : 'No device paired'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex gap-2">
                        {connectedPrinter ? (
                          <>
                            <button
                              type="button"
                              onClick={handleTestPrint}
                              disabled={testPrinting}
                              className="flex-1 py-1.5 px-2.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Zap size={12} className={testPrinting ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                              <span>{testPrinting ? 'Printing...' : 'Test Print'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDisconnectBt}
                              className="py-1.5 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectBt}
                            disabled={connectingBt}
                            className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Bluetooth size={13} className={connectingBt ? 'animate-spin' : ''} />
                            <span>{connectingBt ? 'Searching Devices...' : 'Connect Bluetooth Printer'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-200/80 text-slate-600 flex items-center justify-center">
                          <ScanLine size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Barcode Scanner</p>
                          <p className="text-[10px] text-slate-400">USB / Camera Wedge</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/settings?tab=HARDWARE');
                        setDeviceModalOpen(false);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      Hardware Preferences →
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">Web Bluetooth API</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <a
              href={`https://wa.me/918918153949?text=${encodeURIComponent("I need Help regarding Hisabkhata POS")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none group shadow-xs"
              title="WhatsApp Customer Support"
            >
              <MessageCircle size={14} className="text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Help: <strong className="font-bold text-slate-900 group-hover:text-emerald-950">+91 89181 53949</strong></span>
            </a>

            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>

            {/* Quick Action Buttons */}
            <button
              onClick={() => navigate('/pos?type=SALES')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/25 border border-emerald-400/30 transition-all cursor-pointer group shrink-0"
              title="Quick New Sale (POS / F2)"
            >
              <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-200 shrink-0">
                <Plus size={13} strokeWidth={3} />
              </div>
              <span className="hidden sm:inline tracking-tight">New Sale</span>
              <span className="sm:hidden font-bold">Sale</span>
              <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] font-mono font-bold bg-black/20 text-emerald-100 rounded border border-white/10 ml-0.5">F2</kbd>
            </button>

            <button
              onClick={() => navigate('/purchase')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="New Purchase (F3)"
            >
              <ShoppingBag size={13} strokeWidth={2.2} className="text-slate-500 dark:text-slate-400" />
              <span>Purchase</span>
              <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600 ml-0.5">F3</kbd>
            </button>



            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-full bg-[#00c795] hover:bg-[#00b084] flex items-center justify-center text-xs font-bold text-white shadow-sm ml-1 cursor-pointer border border-emerald-300 transition-all select-none hover:scale-105 overflow-hidden"
                title={userName}
              >
                {userPhoto ? (
                  <img src={userPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userInitial
                )}
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute top-[calc(100%+14px)] right-0 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 animate-fade-in text-slate-800">
                    
                    <div className="flex items-center gap-3 px-1 py-1.5 pb-3 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-xs flex-shrink-0 overflow-hidden">
                        {userPhoto ? (
                          <img src={userPhoto} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          userInitial
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 truncate" title={userName}>
                            {userName}
                          </p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            isAdmin ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isAdmin ? 'Admin' : 'Staff'}
                          </span>
                        </div>
                        {userEmail && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5" title={userEmail}>
                            {userEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="py-2 space-y-0.5">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <User size={14} className="text-slate-400" />
                          <span>My Account Profile</span>
                        </div>
                        <ChevronRight size={13} className="text-slate-300" />
                      </button>

                      <button
                        onClick={() => {
                          navigate('/company-profile');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Building2 size={14} className="text-slate-400" />
                          <span>Business Profile</span>
                        </div>
                        <ChevronRight size={13} className="text-slate-300" />
                      </button>

                      <button
                        onClick={() => {
                          navigate('/parties');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users size={14} className="text-slate-400" />
                          <span>Customer & Supplier Khata</span>
                        </div>
                        <ChevronRight size={13} className="text-slate-300" />
                      </button>

                      <button
                        onClick={() => {
                          navigate('/settings');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Settings size={14} className="text-slate-400" />
                          <span>Invoice & Tax Settings</span>
                        </div>
                        <ChevronRight size={13} className="text-slate-300" />
                      </button>

                      <a
                        href={`https://wa.me/918918153949?text=${encodeURIComponent("Support for HisabKhata POS")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageCircle size={14} className="text-emerald-500" />
                          <span>WhatsApp Helpdesk</span>
                        </div>
                        <ExternalLink size={12} className="text-slate-300" />
                      </a>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="px-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Theme Mode</p>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setTheme('light')}
                            className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Sun size={12} className="text-amber-500" />
                            <span>Light</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              theme === 'dark' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Moon size={12} className="text-blue-400" />
                            <span>Dark</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('system')}
                            className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              theme === 'system' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <Laptop size={12} className="text-slate-400" />
                            <span>Auto</span>
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <LogOut size={14} />
                          <span>Sign Out</span>
                        </div>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {pendingInvites.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-indigo-700/50 print:hidden">
            <div className="flex items-center gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/30 flex items-center justify-center shrink-0">
                <UserPlus size={15} className="text-indigo-200" />
              </div>
              <div>
                <span className="font-extrabold text-white">
                  Team Invitation Received:
                </span>{' '}
                <span className="text-indigo-100">
                  <strong>{pendingInvites[0].company_name}</strong> invited you to join their team as{' '}
                  <strong className="uppercase">{pendingInvites[0].role}</strong>.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAcceptInviteBanner(pendingInvites[0].token)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Accept & Join
              </button>
              <button
                onClick={() => handleDeclineInviteBanner(pendingInvites[0].token)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        <main className={`flex-1 ${location.pathname.startsWith('/pos') ? 'p-2 sm:p-2.5 overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto p-4 sm:p-6'} bg-[#f6f8fa] dark:bg-[#070b14] print:bg-white print:p-0 print:m-0 print:overflow-visible`}>
          <Outlet />
        </main>
      </div>

      {/* Add Company Modal */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-100">
            <h3 className="text-base font-bold text-[#1d2235] mb-2">Create New Business</h3>
            <p className="text-xs text-gray-500 mb-4">Add a new business profile. You can switch between profiles anytime.</p>
            {addCompanyError && <p className="text-xs text-red-500 font-semibold mb-3">{addCompanyError}</p>}
            <input
              type="text"
              placeholder="e.g. Acme Retailers"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-gray-800 mb-4 font-sans"
              value={newCompanyName}
              onChange={e => { setNewCompanyName(e.target.value); setAddCompanyError(''); }}
            />
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => { setShowAddCompanyModal(false); setNewCompanyName(''); setAddCompanyError(''); }}
                className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newCompanyName.trim()) {
                    setAddCompanyError('Business name is required.');
                    return;
                  }
                  try {
                    const newComp = await createCompany({ name: newCompanyName.trim() });
                    localStorage.setItem('companyId', newComp.id);
                    localStorage.setItem('userName', newComp.name);
                    setShowAddCompanyModal(false);
                    setNewCompanyName('');
                    window.location.reload();
                  } catch (err) {
                    setAddCompanyError(err.message || 'Failed to create business.');
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#00c795] hover:bg-[#00b084] rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
