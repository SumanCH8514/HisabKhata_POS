import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, UserCheck, Clock,
  Copy, Check, Trash2, Mail, ExternalLink, RefreshCw,
  AlertCircle, ChevronDown, CheckCircle2, UserX, Share2, Sparkles, X
} from 'lucide-react';
import {
  getTeamMembers, inviteTeamMember, getTeamInvitations,
  revokeTeamInvitation, updateTeamMember, removeTeamMember
} from '../api/client.js';

export default function StaffManagement() {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState('owner');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('cashier');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const [roleChangeMember, setRoleChangeMember] = useState(null);
  const [newRoleVal, setNewRoleVal] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const [teamRes, invRes] = await Promise.all([
        getTeamMembers().catch(() => ({ members: [], currentUserRole: 'owner' })),
        getTeamInvitations().catch(() => [])
      ]);

      setMembers(teamRes?.members || []);
      setCurrentUserRole(teamRes?.currentUserRole || 'owner');
      setInvitations(Array.isArray(invRes) ? invRes : []);
    } catch (err) {
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteRole('cashier');
    setInviteError('');
    setCreatedInvite(null);
    setCopiedLink(false);
    setInviteModalOpen(true);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setInviting(true);
    setInviteError('');
    try {
      const res = await inviteTeamMember({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole
      });

      if (res?.success && res.invitation) {
        setCreatedInvite(res.invitation);
        loadData(false);
      } else {
        throw new Error(res?.error || 'Failed to generate invitation');
      }
    } catch (err) {
      setInviteError(err.message || 'Error creating invitation');
    } finally {
      setInviting(false);
    }
  };

  const getInviteUrl = (token) => {
    return `${window.location.origin}/join?invite=${encodeURIComponent(token)}`;
  };

  const handleCopyLink = (token) => {
    const url = getInviteUrl(token);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  };

  const handleWhatsAppShare = (invite) => {
    const url = getInviteUrl(invite.token);
    const roleLabel = invite.role === 'manager' ? 'Store Manager' : 'Cashier / Billing Staff';
    const text = encodeURIComponent(
      `Hello! You have been invited to join our business team on HisabKhata POS as ${roleLabel}.\n\nClick the link below to accept the invitation and get started:\n${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleRevokeInvite = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await revokeTeamInvitation(id);
      setSuccessMsg('Invitation revoked successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation');
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeMember || !newRoleVal) return;
    setUpdatingRole(true);
    try {
      await updateTeamMember(roleChangeMember.member_id, { role: newRoleVal });
      setRoleChangeMember(null);
      setSuccessMsg('Member role updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to update member role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!deleteConfirmMember) return;
    setDeletingMember(true);
    try {
      await removeTeamMember(deleteConfirmMember.member_id);
      setDeleteConfirmMember(null);
      setSuccessMsg('Staff member removed from business');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData(false);
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setDeletingMember(false);
    }
  };

  const isOwner = currentUserRole === 'owner';

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-semibold">
          <AlertCircle size={16} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <CheckCircle2 size={16} className="shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Members</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{members.length}</span>
            <span className="text-[11px] text-slate-400">active accounts</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Staff</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {members.filter(m => !m.is_primary_owner).length}
            </span>
            <span className="text-[11px] text-slate-400">cashiers & managers</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Invites</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{invitations.length}</span>
            <span className="text-[11px] text-slate-400">awaiting response</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Access Level</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
              isOwner
                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                : currentUserRole === 'manager'
                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
            }`}>
              {currentUserRole}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
              Active Team Members
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              People who have access to this business and their designated roles
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Refresh Team List"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {isOwner && (
              <button
                onClick={handleOpenInviteModal}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserPlus size={15} />
                <span>Invite Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <span className="text-xs font-medium">Loading team members...</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No team members found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {members.map((member) => {
              const isPrimary = !!member.is_primary_owner;
              const roleColor = isPrimary
                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                : member.role === 'manager'
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';

              const initials = (member.name || member.email || 'U')
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div key={member.member_id || member.user_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {member.name || 'Team Member'}
                        </span>
                        {isPrimary && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md">
                            Primary Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{member.email}</span>
                        {member.mobile && <span>• {member.mobile}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg border uppercase tracking-wider ${roleColor}`}>
                      {member.role || 'Staff'}
                    </span>

                    {isOwner && !isPrimary && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setRoleChangeMember(member);
                            setNewRoleVal(member.role === 'manager' ? 'cashier' : 'manager');
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          Change Role
                        </button>
                        <button
                          onClick={() => setDeleteConfirmMember(member)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Remove from Team"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Pending Invitations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Invitations sent to staff members waiting for acceptance or rejection
            </p>
          </div>

          {invitations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No pending invitations. Click "Invite Staff Member" above to add your team.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {invitations.map((inv) => {
                const expiresDate = new Date(inv.expires_at);
                const daysLeft = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                return (
                  <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{inv.email}</span>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {inv.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Invited on {new Date(inv.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleCopyLink(inv.token)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>Copy Link</span>
                      </button>

                      <button
                        onClick={() => handleWhatsAppShare(inv)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        title="Share on WhatsApp"
                      >
                        <Share2 size={15} />
                      </button>

                      <button
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Revoke Invitation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {inviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Invite Team Member</h3>
                  <p className="text-[11px] text-slate-400">Give staff members secure access to this business</p>
                </div>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createdInvite ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                      <CheckCircle2 size={22} />
                    </div>
                    <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                      Invitation Link Created!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      An invitation has been generated for <strong>{createdInvite.email}</strong> as <strong>{createdInvite.role}</strong>.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Shareable Invitation Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={getInviteUrl(createdInvite.token)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 select-all"
                      />
                      <button
                        onClick={() => handleCopyLink(createdInvite.token)}
                        className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleWhatsAppShare(createdInvite)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <Share2 size={14} />
                      <span>Share on WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        setCreatedInvite(null);
                        setInviteEmail('');
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0 transition-all cursor-pointer"
                    >
                      Invite Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendInvite} className="space-y-4">
                  {inviteError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{inviteError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-400" />
                      Staff Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. staff@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <p className="text-[11px] text-slate-400">
                      If the user already has an account, they can accept this invite directly inside their dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Shield size={14} className="text-slate-400" />
                      Select Staff Role
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div
                        onClick={() => setInviteRole('cashier')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          inviteRole === 'cashier'
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">Cashier / Billing</span>
                          {inviteRole === 'cashier' && <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Fast POS billing, invoicing, and receipt printing. Sensitive margins and purchase costs are restricted.
                        </p>
                      </div>

                      <div
                        onClick={() => setInviteRole('manager')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          inviteRole === 'manager'
                            ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">Store Manager</span>
                          {inviteRole === 'manager' && <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Full management of inventory, sales, purchases, customer ledger, expenses, and analytics reports.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setInviteModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {inviting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                      <span>{inviting ? 'Generating...' : 'Create Invitation Link'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {roleChangeMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scale-up">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Change Staff Role
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update permissions for <strong>{roleChangeMember.name || roleChangeMember.email}</strong>.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Role</label>
              <select
                value={newRoleVal}
                onChange={(e) => setNewRoleVal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100"
              >
                <option value="cashier">Cashier / Billing Staff</option>
                <option value="manager">Store Manager</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRoleChangeMember(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={updatingRole}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                {updatingRole ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <UserX size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Remove Staff Member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong>{deleteConfirmMember.name || deleteConfirmMember.email}</strong> from this business? They will immediately lose access.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmMember(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveMember}
                disabled={deletingMember}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                {deletingMember ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
