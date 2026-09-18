import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Briefcase, Eye, EyeOff,
  ArrowRight, Sun, Moon, ArrowLeft, Laptop, Menu, X,
  LogIn, LayoutDashboard
} from 'lucide-react';
import { login, signup } from '../api/client.js';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    try {
      return localStorage.getItem('hide_announcement_banner') !== 'true';
    } catch {
      return true;
    }
  });
  const { theme, setTheme } = useTheme();

  const dismissBanner = (e) => {
    e.stopPropagation();
    setShowBanner(false);
    try {
      localStorage.setItem('hide_announcement_banner', 'true');
    } catch {}
  };

  useEffect(() => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isLogin && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (!isLogin) {
        const res = await signup({
          email: form.email,
          password: form.password,
          businessName: form.businessName || 'Your Company Name'
        });

        localStorage.setItem('token', res.token);
        localStorage.setItem('companyId', res.company.id);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAdmin', res.user?.is_admin ? 'true' : 'false');
        localStorage.setItem('userEmail', res.user.email);
        localStorage.setItem('userName', form.name || res.user.email);
        localStorage.removeItem('userPhoto');
      } else {
        const res = await login({
          email: form.email,
          password: form.password
        });

        localStorage.setItem('token', res.token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAdmin', res.user?.is_admin ? 'true' : 'false');
        localStorage.setItem('userEmail', res.user.email);
        if (res.user?.photo_url) {
          localStorage.setItem('userPhoto', res.user.photo_url);
        } else {
          localStorage.removeItem('userPhoto');
        }
        if (res.user?.name) {
          localStorage.setItem('userName', res.user.name);
        } else if (res.companies && res.companies.length > 0) {
          localStorage.setItem('userName', res.companies[0].name);
        }
        if (res.companies && res.companies.length > 0) {
          localStorage.setItem('companyId', res.companies[0].id);
        }
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Error processing request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#060911] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#4c3cce] selection:text-white overflow-x-clip max-w-full relative transition-colors duration-300 flex flex-col justify-between">

      {showBanner && (
        <div className="relative w-full bg-gradient-to-r from-purple-100 via-orange-50 to-yellow-100 dark:from-purple-950 dark:via-slate-900 dark:to-slate-950 border-b border-purple-200/60 dark:border-purple-900/40 py-2 pl-4 pr-10 sm:px-8 text-center text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 transition-all">
          <span>⚡ 100% Offline-First GST Billing Software for Small Businesses in India</span>
          <span className="hidden sm:inline">•</span>
          <button onClick={() => navigate('/')} className="text-[#4c3cce] dark:text-purple-400 font-bold underline underline-offset-2 hover:opacity-80 cursor-pointer">
            Launch POS Free →
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
            <div className="flex items-center group cursor-pointer shrink-0 min-w-0" onClick={() => navigate('/')}>
              <img src={logoLight} alt="HisabKhata POS" className="h-7 sm:h-9 max-w-[150px] w-auto dark:hidden block object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" />
              <img src={logoDark} alt="HisabKhata POS" className="h-7 sm:h-9 max-w-[150px] w-auto dark:block hidden object-contain mix-blend-screen group-hover:scale-105 transition-transform duration-300" />
            </div>

            <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <a href="/#features" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Features</a>
              <a href="/#compliance" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">GST Compliance</a>
              <a href="/#solutions" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Solutions</a>
              <a href="/#testimonials" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">Testimonials</a>
              <a href="/#faq" className="hover:text-[#4c3cce] dark:hover:text-purple-400 transition-colors">FAQs</a>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="relative">
                <button
                  type="button"
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
                        type="button"
                        onClick={() => { setTheme('light'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'light' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Sun size={14} className="text-amber-500" /> Light
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'dark' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Moon size={14} className="text-blue-400" /> Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTheme('system'); setShowThemeDropdown(false); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors cursor-pointer ${theme === 'system' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                      >
                        <Laptop size={14} /> System
                      </button>
                    </div>
                  </>
                )}
              </div>

              {localStorage.getItem('isAuthenticated') === 'true' ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:inline-flex bg-[#db631a] hover:bg-[#c25414] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all duration-200 cursor-pointer shrink-0"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className="hidden sm:inline-flex bg-[#db631a] hover:bg-[#c25414] text-white px-5 sm:px-7 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all duration-200 cursor-pointer shrink-0"
                >
                  Get started for free
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (localStorage.getItem('isAuthenticated') === 'true') {
                    navigate('/dashboard');
                  } else {
                    setIsLogin(true);
                    setError('');
                  }
                }}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex sm:hidden items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all focus:outline-none cursor-pointer shrink-0"
                aria-label={localStorage.getItem('isAuthenticated') === 'true' ? "Dashboard" : "Login"}
                title={localStorage.getItem('isAuthenticated') === 'true' ? "Dashboard" : "Login"}
              >
                {localStorage.getItem('isAuthenticated') === 'true' ? <LayoutDashboard size={15} /> : <LogIn size={15} />}
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex lg:hidden items-center justify-center transition-all focus:outline-none shrink-0 cursor-pointer"
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
                <a href="/#features" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Features</a>
                <a href="/#compliance" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">GST Compliance</a>
                <a href="/#solutions" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Solutions</a>
                <a href="/#testimonials" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">Testimonials</a>
                <a href="/#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">FAQs</a>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (localStorage.getItem('isAuthenticated') === 'true') {
                    navigate('/dashboard');
                  } else {
                    setIsLogin(false);
                    setError('');
                  }
                }}
                className="w-full text-center bg-[#db631a] text-white py-3 rounded-full font-bold text-sm shadow-md cursor-pointer"
              >
                {localStorage.getItem('isAuthenticated') === 'true' ? 'Dashboard' : 'Get started for free'}
              </button>
            </div>
          </>
        )}
      </nav>

      <main className="w-full max-w-md mx-auto my-auto py-10 px-4 sm:px-0 animate-fade-in-up">
        <div className="text-center mb-6 flex flex-col items-center">
          <div onClick={() => navigate('/')} className="cursor-pointer mb-2 hover:scale-105 transition-transform duration-300">
            <img src={logoLight} alt="HisabKhata POS" className="h-10 sm:h-12 w-auto max-w-[200px] dark:hidden block object-contain mix-blend-multiply" />
            <img src={logoDark} alt="HisabKhata POS" className="h-10 sm:h-12 w-auto max-w-[200px] dark:block hidden object-contain mix-blend-screen" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Fast, Offline-First GST Billing & POS System
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300">

          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${isLogin
                ? 'bg-white dark:bg-slate-900 text-[#4c3cce] dark:text-purple-400 shadow-sm scale-[1.02]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${!isLogin
                ? 'bg-white dark:bg-slate-900 text-[#4c3cce] dark:text-purple-400 shadow-sm scale-[1.02]'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">

            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Owner / Manager Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Suman Online"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Store / Business Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                      <Briefcase size={16} />
                    </span>
                    <input
                      type="text"
                      name="businessName"
                      value={form.businessName}
                      onChange={handleChange}
                      placeholder="e.g. SumanOnline Store"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="mail_id@sumanonline.com"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {loading ? (
                <span>Loading Session...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to POS Workspace' : 'Create Free Store Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>
      </main>

      <footer className="w-full text-center py-3 text-[11px] text-slate-400">
        © 2026 HisabKhata POS • SumanOnline
      </footer>

    </div>
  );
}
