import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import {
  Mail, Lock, User, Briefcase, Eye, EyeOff,
  ArrowRight, Sun, Moon, ArrowLeft, Laptop, Menu, X,
  LogIn, LayoutDashboard, Gift, CheckCircle2, AlertCircle, Loader2, Tag,
  KeyRound, ShieldCheck, RefreshCw
} from 'lucide-react';
import {
  login,
  signup,
  validateReferralCode,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword
} from '../api/client.js';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';
import TurnstileWidget from './TurnstileWidget.jsx';

export default function Auth({ defaultIsLogin = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const refCodeFromQuery = (searchParams.get('ref') || '').trim().toUpperCase();
  const modeFromQuery = (searchParams.get('mode') || '').trim().toLowerCase();
  const isSignupRoute = location.pathname.toLowerCase().startsWith('/signup') || !!refCodeFromQuery;

  const initialMode = modeFromQuery === 'forgot'
    ? 'forgot'
    : (isSignupRoute ? 'signup' : (defaultIsLogin ? 'login' : 'signup'));

  const [authMode, setAuthMode] = useState(initialMode);
  const [referralCode, setReferralCode] = useState(refCodeFromQuery);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referrerError, setReferrerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
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

  const [turnstileToken, setTurnstileToken] = useState('');
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const dismissBanner = (e) => {
    e.stopPropagation();
    setShowBanner(false);
    try {
      localStorage.setItem('hide_announcement_banner', 'true');
    } catch {}
  };

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const codeToValidate = refCodeFromQuery || referralCode;
    if (codeToValidate) {
      if (refCodeFromQuery) {
        setAuthMode('signup');
        setReferralCode(refCodeFromQuery);
      }
      setReferrerLoading(true);
      setReferrerError('');
      validateReferralCode(codeToValidate)
        .then((res) => {
          if (res?.valid) {
            setReferrerInfo(res);
            setReferrerError('');
          } else {
            setReferrerInfo(null);
            setReferrerError(res?.error || 'Referral invitation not found');
          }
        })
        .catch((err) => {
          setReferrerInfo(null);
          setReferrerError(err.message || 'Invalid or expired referral code');
        })
        .finally(() => {
          setReferrerLoading(false);
        });
    }
  }, [refCodeFromQuery]);

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

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyCode || !verifyEmailAddress) {
      setError('Please provide the 6-digit verification code.');
      return;
    }

    setVerifyLoading(true);
    setError('');

    try {
      const res = await verifyEmail({ email: verifyEmailAddress, code: verifyCode });
      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isAdmin', res.user?.is_admin ? 'true' : 'false');
        localStorage.setItem('userEmail', res.user?.email || verifyEmailAddress);
        if (res.user?.name) {
          localStorage.setItem('userName', res.user.name);
        }
        if (res.companies && res.companies.length > 0) {
          localStorage.setItem('companyId', res.companies[0].id);
        }
        navigate('/dashboard');
      } else {
        setSuccessInfo(res?.message || 'Email verified! You can now sign in.');
        setAuthMode('login');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verifyEmailAddress) return;
    setLoading(true);
    setError('');
    setSuccessInfo('');

    try {
      const res = await resendVerificationEmail({ email: verifyEmailAddress });
      setSuccessInfo(res?.message || 'Verification email dispatched. Please check your inbox.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await forgotPassword({ email: forgotEmail.trim() });
      setForgotSubmitted(true);
      setSuccessInfo(res?.message || 'If an account exists with this email, a reset link has been dispatched.');
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (authMode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessInfo('');

    try {
      if (authMode === 'signup') {
        const res = await signup({
          email: form.email,
          password: form.password,
          businessName: form.businessName || 'Your Company Name',
          referralCode: (referralCode || refCodeFromQuery || '').trim() || undefined
        });

        if (res?.needs_verification) {
          setVerifyEmailAddress(form.email.toLowerCase().trim());
          setSuccessInfo('Account created! Please check your email to verify your address before logging in.');
          setAuthMode('verify');
          setResendCooldown(60);
          return;
        }

        if (res?.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('companyId', res.company?.id || '');
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('isAdmin', res.user?.is_admin ? 'true' : 'false');
          localStorage.setItem('userEmail', res.user?.email || form.email);
          localStorage.setItem('userName', form.name || res.user?.email || '');
          navigate('/dashboard');
        }
      } else {
        const res = await login({
          email: form.email,
          password: form.password,
          turnstileToken
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
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.data?.needs_verification) {
        setVerifyEmailAddress(err.data.email || form.email.toLowerCase().trim());
        setAuthMode('verify');
        setError('Please verify your email address before logging in.');
        return;
      }
      setError(err.message || 'Error processing request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#4c3cce] selection:text-white overflow-x-clip max-w-full relative transition-colors duration-300 flex flex-col justify-between">

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

      <nav className="sticky top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-all duration-300">
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
                  onClick={() => { setAuthMode('signup'); setError(''); setSuccessInfo(''); }}
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
                    setAuthMode('login');
                    setError('');
                    setSuccessInfo('');
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
            <div className="fixed top-16 left-0 right-0 bg-white dark:bg-[#070b14] border-b border-slate-200 dark:border-slate-800 z-50 lg:hidden p-5 flex flex-col gap-4 shadow-2xl animate-fade-in">
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
                    setAuthMode('signup');
                    setError('');
                    setSuccessInfo('');
                  }
                }}
                className="w-full bg-[#db631a] text-white py-3 rounded-xl font-bold text-center text-sm shadow-md"
              >
                {localStorage.getItem('isAuthenticated') === 'true' ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
            </div>
          </>
        )}
      </nav>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-8 sm:py-12">
        <div className="w-full max-w-md">

          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {authMode === 'forgot'
                ? 'Reset Your Password'
                : authMode === 'verify'
                ? 'Verify Your Email'
                : (authMode === 'login' ? 'Welcome Back to Store' : 'Start Your Free Store')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              {authMode === 'forgot'
                ? 'We will send you a secure link to reset your account password'
                : authMode === 'verify'
                ? 'Enter the 6-digit verification code or follow link sent to your inbox'
                : 'Fast, Offline-First GST Billing & POS System'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0d1322] border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-5 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-black/60 transition-all duration-300">

            {authMode !== 'forgot' && authMode !== 'verify' && (
              <div className="flex bg-slate-100 dark:bg-[#030712] p-1 rounded-2xl mb-6 border border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(''); setSuccessInfo(''); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${authMode === 'login'
                    ? 'bg-white dark:bg-[#131b2e] text-[#4c3cce] dark:text-purple-300 shadow-sm scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setError(''); setSuccessInfo(''); }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${authMode === 'signup'
                    ? 'bg-white dark:bg-[#131b2e] text-[#4c3cce] dark:text-purple-300 shadow-sm scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {referrerLoading && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-xs font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin text-emerald-600 dark:text-emerald-400" />
                <span>Checking referral invitation ({referralCode})...</span>
              </div>
            )}

            {referrerInfo && authMode === 'signup' && (
              <div className="mb-5 p-4 sm:p-4.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 dark:border-emerald-500/20 text-slate-800 dark:text-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                    <Gift size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                        VIP Referral Invitation
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        {referrerInfo.code}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      Invited by <span className="text-emerald-600 dark:text-emerald-400 font-black">{referrerInfo.refereeName || referrerInfo.businessName}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-normal">
                      Sign up to activate your store and unlock 1 Month Free Pro perks courtesy of {referrerInfo.refereeName || referrerInfo.businessName}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {referrerError && authMode === 'signup' && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{referrerError}</span>
              </div>
            )}

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-xs font-semibold flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {successInfo && (
              <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div className="flex-1">{successInfo}</div>
              </div>
            )}

            {authMode === 'verify' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <Mail size={16} className="text-[#4c3cce] dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    Verification email sent to <strong className="text-slate-900 dark:text-white">{verifyEmailAddress}</strong>. Enter the 6-digit code below or click the activation link in your email.
                  </div>
                </div>

                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-4 py-3 text-center text-xl font-mono tracking-widest bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading}
                    className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {verifyLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Verify &amp; Enter POS</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c3cce] dark:text-purple-400 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    <span>
                      {resendCooldown > 0
                        ? `Resend email in ${resendCooldown}s`
                        : 'Resend Verification Email'}
                    </span>
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setError(''); setSuccessInfo(''); }}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : authMode === 'forgot' ? (
              <div className="space-y-4">
                {forgotSubmitted ? (
                  <div className="space-y-4 text-center py-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={26} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      We have sent instructions to <strong>{forgotEmail}</strong>. If an account is associated with this email, you will receive a reset link shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setForgotSubmitted(false); setError(''); setSuccessInfo(''); }}
                      className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3 rounded-full font-bold text-xs shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                          <Mail size={16} />
                        </span>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <span>Send Password Reset Link</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => { setAuthMode('login'); setError(''); setSuccessInfo(''); }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Back to Sign In</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {authMode === 'signup' && (
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
                          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
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
                          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
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
                      className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(form.email);
                          setAuthMode('forgot');
                          setError('');
                          setSuccessInfo('');
                        }}
                        className="text-[11px] font-bold text-[#4c3cce] dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
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
                      className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
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

                {authMode === 'signup' && (
                  <>
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
                          className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
                          required={authMode === 'signup'}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Referral Code (Optional)</label>
                        {referrerInfo && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={12} /> {referrerInfo.refereeName}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                          <Tag size={16} />
                        </span>
                        <input
                          type="text"
                          name="referralCode"
                          value={referralCode}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setReferralCode(val);
                            if (!val) {
                              setReferrerInfo(null);
                              setReferrerError('');
                            }
                          }}
                          onBlur={() => {
                            if (referralCode && !referrerInfo) {
                              setReferrerLoading(true);
                              validateReferralCode(referralCode)
                                .then((res) => {
                                  if (res?.valid) {
                                    setReferrerInfo(res);
                                    setReferrerError('');
                                  } else {
                                    setReferrerInfo(null);
                                    setReferrerError(res?.error || 'Invalid referral code');
                                  }
                                })
                                .catch((err) => {
                                  setReferrerInfo(null);
                                  setReferrerError(err.message || 'Invalid referral code');
                                })
                                .finally(() => setReferrerLoading(false));
                            }
                          }}
                          placeholder="e.g. HK-4-POS"
                          className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800/80 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
                        />
                      </div>
                    </div>
                  </>
                )}

                {authMode === 'login' && (
                  <TurnstileWidget
                    theme={theme}
                    onVerify={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken('')}
                    onExpire={() => setTurnstileToken('')}
                  />
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
                      <span>{authMode === 'login' ? 'Sign In to POS Workspace' : 'Create Free Store Account'}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      </main>

      <footer className="w-full text-center py-3 text-[11px] text-slate-400">
        © 2026 HisabKhata POS • SumanOnline
      </footer>

    </div>
  );
}
