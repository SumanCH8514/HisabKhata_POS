import React, { useState, useEffect } from 'react';
import {
  Mail, Server, Zap, ShieldCheck, CheckCircle2, AlertCircle,
  RefreshCw, Save, Send, Eye, EyeOff, Key, Sparkles, Check,
  ExternalLink, Globe, ArrowRight, HelpCircle
} from 'lucide-react';
import { getSmtpSettings, saveSmtpSettings, testSmtpConnection } from '../api/client.js';

export default function SmtpConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [serviceType, setServiceType] = useState('inbuilt');
  const [inbuiltData, setInbuiltData] = useState({
    configured: false,
    host: 'smtp.gmail.com',
    port: 465,
    fromEmail: 'pos.hisabkhata@sumanonline.com',
    fromName: 'HisabKhata POS',
    user: ''
  });

  const [formData, setFormData] = useState({
    host: 'smtp.gmail.com',
    port: 465,
    encryption: 'ssl_tls',
    username: '',
    password: '',
    has_password: false,
    from_email: '',
    from_name: '',
    reply_to: ''
  });

  const presets = [
    {
      id: 'gmail',
      name: 'Google / Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      encryption: 'ssl_tls',
      note: 'Use a 16-character Google App Password with 2-Step Verification.'
    },
    {
      id: 'zoho',
      name: 'Zoho Mail',
      host: 'smtp.zoho.com',
      port: 465,
      encryption: 'ssl_tls',
      note: 'Zoho accounts with 2FA require an Application-Specific Password.'
    },
    {
      id: 'hostinger',
      name: 'Hostinger',
      host: 'smtp.hostinger.com',
      port: 465,
      encryption: 'ssl_tls',
      note: 'Use your domain email address and standard email account password.'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      host: 'smtp.sendgrid.net',
      port: 465,
      encryption: 'ssl_tls',
      note: 'Username is strictly "apikey", and password is your SendGrid API key.'
    },
    {
      id: 'brevo',
      name: 'Brevo (Sendinblue)',
      host: 'smtp-relay.brevo.com',
      port: 465,
      encryption: 'ssl_tls',
      note: 'Found in your Brevo account under SMTP & API settings.'
    }
  ];

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSmtpSettings();
      if (res) {
        setServiceType(res.service_type || 'inbuilt');
        if (res.inbuilt) {
          setInbuiltData(res.inbuilt);
        }
        if (res.custom) {
          setFormData({
            host: res.custom.host || 'smtp.gmail.com',
            port: res.custom.port || 465,
            encryption: res.custom.encryption || 'ssl_tls',
            username: res.custom.username || '',
            password: '',
            has_password: Boolean(res.custom.has_password),
            from_email: res.custom.from_email || '',
            from_name: res.custom.from_name || '',
            reply_to: res.custom.reply_to || ''
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load SMTP settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      host: preset.host,
      port: preset.port,
      encryption: preset.encryption
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const payload = {
        service_type: serviceType,
        host: formData.host,
        port: formData.port,
        encryption: formData.encryption,
        username: formData.username,
        password: formData.password,
        from_email: formData.from_email,
        from_name: formData.from_name,
        reply_to: formData.reply_to
      };

      const res = await saveSmtpSettings(payload);
      if (res?.success) {
        setSuccessMsg(res.message || 'SMTP settings updated successfully');
        setTimeout(() => setSuccessMsg(''), 4000);
        await loadSettings();
      } else {
        throw new Error(res?.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err.message || 'Error saving SMTP configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestDispatch = async (e) => {
    e.preventDefault();
    if (!testRecipient || !testRecipient.includes('@')) {
      setTestResult({ success: false, error: 'Please enter a valid recipient email' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    const target = testRecipient.trim().toLowerCase();
    const sender = serviceType === 'custom'
      ? (formData.from_email || formData.username || 'Custom SMTP')
      : (inbuiltData.fromEmail || 'pos.hisabkhata@sumanonline.com');

    try {
      const payload = {
        to: target,
        service_type: serviceType,
        testCustom: serviceType === 'custom',
        host: formData.host,
        port: formData.port,
        encryption: formData.encryption,
        username: formData.username,
        password: formData.password,
        from_email: formData.from_email,
        from_name: formData.from_name,
        reply_to: formData.reply_to
      };

      const res = await testSmtpConnection(payload);
      if (res?.success) {
        console.log(
          `%c 🚀 HisabKhata POS %c ✅ SUCCESS %c\n` +
          `✉️ Mail sent to : ${target}\n` +
          `📤 Sent from    : ${sender}\n` +
          `⚙️ Gateway      : ${res.serviceType === 'custom' ? 'Custom SMTP' : 'HisabKhata Inbuilt'}\n` +
          `🎉 Delivery     : Success`,
          'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 3px 8px; border-radius: 4px 0 0 4px; font-size: 11px;',
          'background: #064e3b; color: #6ee7b7; font-weight: bold; padding: 3px 8px; border-radius: 0 4px 4px 0; font-size: 11px;',
          'color: inherit; font-size: 12px; line-height: 1.6;'
        );
        setTestResult({
          success: true,
          message: res.message || `Test verification email dispatched successfully to ${target}`
        });
      } else {
        console.error(
          `%c 🚀 HisabKhata POS %c ❌ FAIL %c\n` +
          `✉️ Mail sent to : ${target}\n` +
          `⚠️ Delivery     : Fail (${res?.error || 'Unknown dispatch error'})`,
          'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 3px 8px; border-radius: 4px 0 0 4px; font-size: 11px;',
          'background: #7f1d1d; color: #fca5a5; font-weight: bold; padding: 3px 8px; border-radius: 0 4px 4px 0; font-size: 11px;',
          'color: inherit; font-size: 12px; line-height: 1.6;'
        );
        setTestResult({
          success: false,
          error: res?.error || 'Failed to dispatch test verification email'
        });
      }
    } catch (err) {
      console.error(
        `%c 🚀 HisabKhata POS %c ❌ FAIL %c\n` +
        `✉️ Mail sent to : ${target}\n` +
        `⚠️ Delivery     : Fail (${err.message || 'Network connection failed'})`,
        'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 3px 8px; border-radius: 4px 0 0 4px; font-size: 11px;',
        'background: #7f1d1d; color: #fca5a5; font-weight: bold; padding: 3px 8px; border-radius: 0 4px 4px 0; font-size: 11px;',
        'color: inherit; font-size: 12px; line-height: 1.6;'
      );
      setTestResult({
        success: false,
        error: err.message || 'Network error while contacting SMTP server'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw size={24} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail size={18} className="text-emerald-600 dark:text-emerald-400" />
            SMTP Configurations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure how your business dispatches customer receipts, GST invoices, and staff invitations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTestResult(null);
              setTestRecipient('');
              setTestEmailOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <Send size={13} />
            <span>Test Connection</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Select Outgoing Mail Service
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setServiceType('inbuilt')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              serviceType === 'inbuilt'
                ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold">
                    <Zap size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      HisabKhata Inbuilt SMTP Service
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Managed Platform Gateway
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  serviceType === 'inbuilt' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700'
                }`}>
                  {serviceType === 'inbuilt' && <Check size={12} />}
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Fast, automated, zero-configuration email dispatch. Outgoing messages are delivered via the HisabKhata system gateway without requiring your own SMTP credentials.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Default Sender</span>
              <code className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {inbuiltData.fromEmail || 'pos.hisabkhata@sumanonline.com'}
              </code>
            </div>
          </div>

          <div
            onClick={() => setServiceType('custom')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              serviceType === 'custom'
                ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                    <Server size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Use Custom SMTP Service
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Independent Custom Mailer
                    </span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  serviceType === 'custom' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                }`}>
                  {serviceType === 'custom' && <Check size={12} />}
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Connect your business's proprietary email server (Gmail, Google Workspace, Zoho, Hostinger, SendGrid) to send emails with full brand authenticity.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Custom Domain</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {formData.host || 'Custom SMTP Host'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {serviceType === 'custom' && (
        <form onSubmit={handleSave} className="space-y-5 p-5 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs animate-scale-up">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Popular Provider Presets
              </label>
              <span className="text-[11px] text-slate-400">Click to autofill recommended host & port</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {presets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.host === p.host
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/50 ring-1 ring-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="text-xs">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{p.host}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                SMTP Host
              </label>
              <input
                type="text"
                required
                placeholder="e.g. smtp.gmail.com"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Port Number
              </label>
              <input
                type="number"
                required
                placeholder="465"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 465 })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Security / Encryption
              </label>
              <select
                value={formData.encryption}
                onChange={(e) => setFormData({ ...formData, encryption: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              >
                <option value="ssl_tls">SSL / TLS (Port 465 - Recommended)</option>
                <option value="starttls">STARTTLS (Port 587)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Username / Auth Email
              </label>
              <input
                type="text"
                required
                placeholder="billing@yourstore.com"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password / App Key
                </label>
                {formData.has_password && !formData.password && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Saved on server
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={formData.has_password ? 'Leave empty to keep saved password' : 'Enter SMTP password or App Key'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-3.5 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sender Email (From Address)
              </label>
              <input
                type="email"
                placeholder="billing@yourstore.com"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Sender Name (From Name)
              </label>
              <input
                type="text"
                placeholder="e.g. MC Electronics Billing"
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Reply-To Email Address
              </label>
              <input
                type="email"
                placeholder="support@yourstore.com"
                value={formData.reply_to}
                onChange={(e) => setFormData({ ...formData, reply_to: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
            <HelpCircle size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Gmail &amp; Google Workspace tip:</strong> If using Gmail, make sure 2-Step Verification is active on your Google account and generate an <strong>App Password</strong> under Security &gt; 2-Step Verification &gt; App Passwords.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={loadSettings}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{saving ? 'Saving...' : 'Save Custom SMTP'}</span>
            </button>
          </div>
        </form>
      )}

      {testEmailOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Send size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Test SMTP Connection
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Dispatch a live verification message to confirm gateway delivery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestEmailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleTestDispatch} className="p-6 space-y-4">
              {testResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                }`}>
                  {testResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                  <span>{testResult.message || testResult.error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dev.suman.ch@gmail.com"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300">Active Test Dispatcher</div>
                <div className="flex items-center justify-between">
                  <span>Selected Service:</span>
                  <strong className="text-slate-900 dark:text-white capitalize">{serviceType === 'custom' ? 'Custom SMTP Server' : 'HisabKhata Inbuilt Gateway'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Target Server:</span>
                  <code className="text-indigo-600 dark:text-indigo-400">{serviceType === 'custom' ? `${formData.host}:${formData.port}` : `${inbuiltData.host}:${inbuiltData.port}`}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dispatched As:</span>
                  <code className="text-slate-700 dark:text-slate-300">{serviceType === 'custom' ? (formData.from_email || formData.username || 'Custom Sender') : (inbuiltData.fromEmail || 'pos.hisabkhata@sumanonline.com')}</code>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestEmailOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {testing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Send Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
