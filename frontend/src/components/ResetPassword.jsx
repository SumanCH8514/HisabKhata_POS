import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, ArrowLeft, KeyRound, Sun, Moon, Laptop
} from 'lucide-react';
import { verifyResetToken, resetPassword } from '../api/client.js';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const [verifyingToken, setVerifyingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('Password reset token is missing. Please use the link provided in your email.');
      setVerifyingToken(false);
      return;
    }

    verifyResetToken({ token })
      .then((res) => {
        if (res?.valid) {
          setTokenValid(true);
          setUserEmail(res.email || '');
        } else {
          setTokenError(res?.error || 'Password reset link is invalid or has expired.');
        }
      })
      .catch((err) => {
        setTokenError(err.message || 'Password reset link is invalid or has expired.');
      })
      .finally(() => {
        setVerifyingToken(false);
      });
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await resetPassword({ token, password });
      setSuccess(true);
      setSuccessMessage(res?.message || 'Your password has been reset successfully.');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
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
            
            {verifyingToken ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-[#db631a] animate-pulse">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <h2 className="text-xl font-bold">Validating Reset Link...</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Please hold on while we verify your security credentials.
                </p>
              </div>
            ) : tokenError ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertCircle size={36} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid or Expired Link</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {tokenError}
                </p>
                <div className="pt-2">
                  <Link
                    to="/login?mode=forgot"
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#db631a] hover:bg-[#c25414] text-white py-3 rounded-full font-bold text-xs shadow-md shadow-orange-600/20 transition-all"
                  >
                    <span>Request New Reset Link</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : success ? (
              <div className="text-center py-6 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Password Updated!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {successMessage || 'Your password has been changed successfully. You can now sign in with your new password.'}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span>Sign In to POS Workspace</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-[#db631a] mb-3">
                    <KeyRound size={26} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Create New Password</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {userEmail ? `Resetting password for ${userEmail}` : 'Enter your new account password below.'}
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                        <Lock size={16} />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-[#4c3cce] dark:focus:border-purple-500 text-slate-900 dark:text-white transition-all"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#db631a] hover:bg-[#c25414] text-white py-3.5 rounded-full font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-orange-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Save &amp; Update Password</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

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
