import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, Shield, UserCheck, CheckCircle2, AlertCircle,
  RefreshCw, LogIn, UserPlus, ArrowRight, Check, X,
  Mail, Lock, User, Sparkles
} from 'lucide-react';
import {
  verifyInvitationToken, respondToInvitation, signupWithInvite, login
} from '../api/client.js';
import logoDark from '../assets/logo_dark_mode.png';
import logoLight from '../assets/logo_light_mode.png';
import { useTheme } from '../utils/theme.js';

export default function JoinInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('invite') || '';
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const [activeTab, setActiveTab] = useState('signup');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated') === 'true';
    setIsLoggedIn(auth);
    setUserEmail(localStorage.getItem('userEmail') || '');

    if (!token) {
      setError('No invitation token provided. Please use the complete invitation link.');
      setLoading(false);
      return;
    }

    verifyInvitationToken(token)
      .then((res) => {
        if (res?.valid && res.invitation) {
          setInvitation(res.invitation);
          setForm(prev => ({
            ...prev,
            email: res.invitation.email || ''
          }));
          setLoginForm(prev => ({
            ...prev,
            email: res.invitation.email || ''
          }));
        } else {
          setError(res?.error || 'Invitation link is invalid or has expired');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to verify invitation link');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAcceptLoggedIn = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await respondToInvitation({ token, action: 'accept' });
      if (res?.success) {
        setActionSuccess('Invitation accepted! Redirecting to your workspace...');
        if (res.companyId) {
          localStorage.setItem('companyId', String(res.companyId));
          localStorage.setItem('userName', res.companyName || '');
          localStorage.removeItem('cached_company');
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        throw new Error(res?.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setActionError(err.message || 'Error accepting invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineLoggedIn = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await respondToInvitation({ token, action: 'reject' });
      if (res?.success) {
        setActionSuccess('Invitation declined');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        throw new Error(res?.error || 'Failed to decline invitation');
      }
    } catch (err) {
      setActionError(err.message || 'Error declining invitation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setActionError('Please enter your full name');
      return;
    }
    if (!form.email.trim()) {
      setActionError('Please enter your email address');
      return;
    }
    if (form.password.length < 6) {
      setActionError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setActionError('Passwords do not match');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await signupWithInvite({
        token,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password
      });

      if (res?.token) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', res.token);
        localStorage.setItem('userEmail', res.user?.email || form.email);
        localStorage.setItem('userName', res.user?.name || form.name);
        if (res.company?.id) {
          localStorage.setItem('companyId', String(res.company.id));
        }
        setActionSuccess('Account created and joined successfully! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1200);
      } else {
        throw new Error(res?.error || 'Failed to create staff account');
      }
    } catch (err) {
      setActionError(err.message || 'Signup error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setActionError('Email and password are required');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const loginRes = await login({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password
      });

      if (!loginRes?.token) {
        throw new Error(loginRes?.error || 'Invalid email or password');
      }

      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('token', loginRes.token);
      localStorage.setItem('userEmail', loginRes.user?.email || loginForm.email);
      localStorage.setItem('userName', loginRes.user?.name || '');

      const acceptRes = await respondToInvitation({ token, action: 'accept' });
      if (acceptRes?.success && acceptRes.companyId) {
        localStorage.setItem('companyId', String(acceptRes.companyId));
        localStorage.setItem('userName', acceptRes.companyName || '');
      }

      setActionSuccess('Logged in and accepted invitation! Redirecting...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      setActionError(err.message || 'Login error');
    } finally {
      setActionLoading(false);
    }
  };

  const isCashier = invitation?.role === 'cashier';
  const roleLabel = isCashier ? 'Cashier / Counter Staff' : 'Store Manager';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-[#080d1a] dark:to-[#0f172a] flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <img
              src={theme === 'dark' ? logoDark : logoLight}
              alt="HisabKhata POS"
              className="h-9 w-auto object-contain"
            />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Shield size={13} />
            <span>Team Invitation</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0e1628] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Verifying your invitation details...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Invitation Not Valid
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {error}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-6 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-b border-slate-100 dark:border-slate-800 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Building2 size={24} />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {invitation.company_name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {invitation.inviter_name || invitation.inviter_email} has invited you to join the business team as:
                </p>
                <div className="inline-block pt-1">
                  <span className={`px-3 py-1 text-xs font-black rounded-lg border uppercase tracking-wider ${
                    isCashier
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  }`}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {actionSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {actionError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                {isLoggedIn ? (
                  <div className="space-y-4 text-center">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                        Current Logged In Account
                      </span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {userEmail}
                      </span>
                      {invitation.email && userEmail.toLowerCase() !== invitation.email.toLowerCase() && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          Notice: This invitation was sent to <strong>{invitation.email}</strong>. Accepting will link this business to your current account.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      <button
                        onClick={handleAcceptLoggedIn}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                        <span>Accept & Join Business</span>
                      </button>

                      <button
                        onClick={handleDeclineLoggedIn}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X size={16} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('signup');
                          setActionError('');
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          activeTab === 'signup'
                            ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Create Staff Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('login');
                          setActionError('');
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                          activeTab === 'login'
                            ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Log In to Existing
                      </button>
                    </div>

                    {activeTab === 'signup' ? (
                      <form onSubmit={handleSignupSubmit} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            Your Full Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Lock size={13} className="text-slate-400" />
                              Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={form.password}
                              onChange={(e) => setForm({ ...form, password: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Lock size={13} className="text-slate-400" />
                              Confirm Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••"
                              value={form.confirmPassword}
                              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          <span>Join {invitation.company_name}</span>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleLoginSubmit} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" />
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Lock size={13} className="text-slate-400" />
                            Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
                          <span>Log In & Accept Invite</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
