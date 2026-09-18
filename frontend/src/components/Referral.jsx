import React, { useEffect, useState } from 'react';
import {
  UserPlus, Users, Share2, Copy, Check, Gift, Sparkles, MessageCircle,
  Award, ShieldCheck, Zap, ExternalLink, Store, Clock, CheckCircle2,
  ArrowRight, RefreshCw, Send
} from 'lucide-react';
import { getReferrals } from '../api/client.js';

export default function Referral() {
  const [data, setData] = useState({ referralCode: '', referralLink: '', referrals: [] });
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    getReferrals()
      .then(res => setData(res || { referralCode: '', referralLink: '', referrals: [] }))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const referralCode = data.referralCode || 'HK-POS';
  const referralUrl = data.referralLink || `https://pos.hisabkhata.sumanonline.com/signup?ref=${referralCode}`;
  const shareText = `Try HisabKhata POS — the fast billing, inventory, and GST accounting web app. Sign up with my link to claim 1 Month Free Pro: ${referralUrl}`;

  const handleCopyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'HisabKhata POS Invitation',
          text: shareText,
          url: referralUrl
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const referralsList = data.referrals || [];
  const totalReferred = referralsList.length;
  const activeReferrals = referralsList.filter(r => r.status === 'joined' || r.status === 'active').length;
  const proMonthsEarned = totalReferred;

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 mb-1.5">
            <Sparkles size={12} />
            <span>Merchant Growth Program</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Refer & Earn Free Pro
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Invite fellow business owners. You and your referee both get 1 Month Free Pro access.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Refresh Referrals"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center bg-slate-100 dark:bg-[#030712] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Your Code:</span>
            <span className="text-xs font-mono font-black text-[#4c3cce] dark:text-purple-400">{referralCode}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Copy Code"
            >
              {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Referred</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{totalReferred}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Merchants signed up via your link</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Stores</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Store size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activeReferrals}</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Stores onboarded & verified</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Free Pro Earned</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Gift size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {proMonthsEarned} <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-sans">Month{proMonthsEarned === 1 ? '' : 's'}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">₹{proMonthsEarned * 999} total value unlocked</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Partner Tier</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#4c3cce] dark:text-purple-400 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">VIP Partner</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Instant monthly reward credits
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#0c1322] via-[#0e172a] to-[#0a1b24] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#4c3cce]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">
              <Zap size={14} className="text-amber-300" />
              <span>Give 1 Month Free Pro • Get 1 Month Free Pro</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Share HisabKhata POS with other store owners
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Equip fellow merchants with lightning-fast POS billing, thermal barcode printing, GST invoicing, and automatic ledger records.
            </p>

            <div className="pt-2 space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your Personal Referral Link
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 min-w-0 bg-[#040812]/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs font-mono text-emerald-300 truncate select-all">
                  {referralUrl}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none px-4 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer bg-white text-slate-900 hover:bg-slate-100"
                  >
                    {copiedLink ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={handleNativeShare}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    title="Share via device"
                  >
                    <Share2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-700/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Gift size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">Merchant VIP Pass</div>
                    <div className="text-[10px] text-slate-400">1 Month Free Pro Voucher</div>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Valid
                </span>
              </div>

              <div className="py-4 text-center space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Voucher Referral Code</div>
                <div className="text-2xl font-mono font-black text-emerald-400 tracking-widest">{referralCode}</div>
                <div className="text-[11px] text-slate-300 pt-1">Shows your business name on their signup page</div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Auto applied on link visit</span>
                <button
                  onClick={handleCopyCode}
                  className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">How Referral Rewards Work</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Simple 3-step automatic reward allocation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-slate-50 dark:bg-[#030712] border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Send Your Unique Link</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Share via WhatsApp, SMS, or QR code. The signup page greets them with your business name.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#030712] border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">They Register Their Store</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              When they create an account, they immediately receive 1 Month Free Pro access to all features.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-[#030712] border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">You Get Rewarded Automatically</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Your account is automatically credited with 1 Month Free Pro for every referred store that joins.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0d1322] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Referral History & Ledgers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track merchants registered through your invitation</p>
          </div>
          <span className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-300">
            {totalReferred} Joined
          </span>
        </div>

        {referralsList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-3 pl-2">Store / Merchant</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Reward Status</th>
                  <th className="pb-3 pr-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {referralsList.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pl-2">
                      {r.referred_business_name ? (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{r.referred_business_name}</div>
                          <div className="text-[11px] text-slate-400">{r.referred_email}</div>
                        </div>
                      ) : (
                        <div className="font-bold text-slate-900 dark:text-white">{r.referred_email || 'New Merchant Store'}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-emerald-200/60 dark:border-emerald-800/50">
                        {r.status || 'joined'}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        {r.reward_status || '1 Month Free Pro'}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-slate-400 font-mono text-[11px]">{r.created_at || 'Recently'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center text-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <Gift size={24} />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No referral signups recorded yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Share your unique invitation link with other merchants or on social groups to start unlocking free months.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4c3cce] hover:bg-[#3f31b3] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Copy size={13} />
                <span>Copy Referral Link</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
