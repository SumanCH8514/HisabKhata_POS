import React, { useEffect, useState } from 'react';
import { UserPlus, Share2, Copy, Check, Gift, Sparkles, MessageCircle } from 'lucide-react';
import { getReferrals } from '../api/client.js';

export default function Referral() {
  const [data, setData] = useState({ referralCode: '', referralLink: '', referrals: [] });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReferrals()
      .then(res => setData(res || { referralCode: '', referralLink: '', referrals: [] }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!data.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Try HisabKhata POS — the fast billing, inventory, and GST accounting web app. Sign up with my link: ${data.referralLink}`;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-600" />
            Referral Program & Rewards
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Invite fellow business owners and earn premium POS perks</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full text-[11px] font-bold">
            <Sparkles size={12} className="text-amber-300" />
            <span>Refer & Earn Program</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Share HisabKhata POS with friends</h2>
          <p className="text-xs text-emerald-100 leading-relaxed">
            Give other merchants the power of instant billing, thermal printing, and automated ledger bookkeeping.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-xs font-mono truncate">
              {data.referralLink || 'https://pos.hisabkhata.sumanonline.com/signup?ref=HK-POS'}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <MessageCircle size={14} />
              <span>Share WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Referral History</h3>
          <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{data.referrals?.length || 0} referred</span>
        </div>

        {data.referrals && data.referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="pb-2">Referred User</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Reward</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.referrals.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-bold text-slate-800">{r.referred_email || 'New Merchant'}</td>
                    <td className="py-2.5">
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-600 font-medium">{r.reward_status}</td>
                    <td className="py-2.5 text-slate-400">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            <Gift size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No referrals yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Share your link to invite merchants to HisabKhata POS.</p>
          </div>
        )}
      </div>

    </div>
  );
}
