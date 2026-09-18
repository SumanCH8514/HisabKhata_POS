import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight,
  RefreshCw, ShieldCheck, Sun, Moon, Laptop, ArrowLeft
} from 'lucide-react';
import { verifyEmail, resendVerificationEmail } from '../api/client.js';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const [loading, setLoading] = useState(!!tokenFromUrl);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [emailInput, setEmailInput] = useState(emailFromUrl);
  const [codeInput, setCodeInput] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  const saveAuthAndRedirect = (data) => {
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('isAdmin', data.user?.is_admin ? 'true' : 'false');
      localStorage.setItem('userEmail', data.user?.email || '');
      if (data.user?.name) {
        localStorage.setItem('userName', data.user.name);
      }
      if (data.companies && data.companies.length > 0) {
        localStorage.setItem('companyId', data.companies[0].id);
      }
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      setLoading(true);
      setError('');
      verifyEmail({ token: tokenFromUrl })
        .then((res) => {
          setSuccess(true);
          setSuccessMessage(res?.message || 'Your email has been verified successfully!');
          saveAuthAndRedirect(res);
        })
        .catch((err) => {
          setError(err.message || 'Verification link is invalid or has expired.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!codeInput || !emailInput) {
      setError('Please provide both your email address and 6-digit code.');
      return;
    }

    setManualLoading(true);
    setError('');
    setResendMessage('');

    try {
      const res = await verifyEmail({ email: emailInput.trim(), code: codeInput.trim() });
      setSuccess(true);
      setSuccessMessage(res?.message || 'Your email has been verified successfully!');
      saveAuthAndRedirect(res);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setManualLoading(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = emailInput || emailFromUrl;
    if (!targetEmail) {
      setError('Please enter your email address to resend the verification email.');
      return;
    }

    setResendLoading(true);
    setError('');
    setResendMessage('');

    try {
      const res = await resendVerificationEmail({ email: targetEmail.trim() });
      setResendMessage(res?.message || 'Verification email dispatched. Please check your inbox.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans flex flex-col justify-between transition-colors duration-300">
      
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logoLight} alt="HisabKhata POS" className="h-8 w-auto dark:hidden block" />
            <img src={logoDark} alt="HisabKhata POS" className="h-8 w-auto dark:block hidden" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Toggle theme"
              >
                {theme === 'light' && <Sun size={15} className="text-amber-500" />}
                {theme === 'dark' && <Moon size={15} className="text-blue-400" />}
                {theme === 'system' && <Laptop size={15} className="text-slate-400" />}
              </button>

              {showThemeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowThemeDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-20 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => { setTheme('light'); setShowThemeDropdown(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left cursor-pointer ${theme === 'light' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      <Sun size={14} className="text-amber-500" /> Light
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left cursor-pointer ${theme === 'dark' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      <Moon size={14} className="text-blue-400" /> Dark
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheme('system'); setShowThemeDropdown(false); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left cursor-pointer ${theme === 'system' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      <Laptop size={14} /> System
                    </button>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/login"
              className="text-xs font-bold px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-12">
        <div className="w-full max-w-md">
          
          <div className="bg-white dark:bg-[#0c1220] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl p-6 sm:p-8">
            
            {loading ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-[#4c3cce] dark:text-indigo-400 animate-pulse">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <h2 className="text-xl font-bold">Verifying Your Email...</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Please hold on a moment while we validate your activation token.
                </p>
              </div>
            ) : success ? (
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Email Verified!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {successMessage || 'Your account is now activated. Preparing your POS workspace...'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Launch POS Dashboard</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center text-[#4c3cce] dark:text-indigo-400 mb-3">
                    <ShieldCheck size={26} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Confirm Email Address</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter your email and the 6-digit verification code sent to your inbox.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{error}</div>
                  </div>
                )}

                {resendMessage && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{resendMessage}</div>
                  </div>
                )}

                <form onSubmit={handleManualVerify} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Account Email
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all placeholder-slate-400 dark:placeholder-slate-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-4 py-3 text-center text-lg font-mono tracking-widest bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {manualLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Activate & Verify Account</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Did not receive the code or link expired?
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading || resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c3cce] dark:text-purple-400 hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={13} className={resendLoading ? 'animate-spin' : ''} />
                    <span>
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend Verification Email'}
                    </span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowLeft size={13} />
                    <span>Back to Sign In</span>
                  </Link>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      <footer className="w-full text-center py-4 text-[11px] text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50">
        &copy; 2026 HisabKhata POS &bull; SumanOnline
      </footer>

    </div>
  );
}
