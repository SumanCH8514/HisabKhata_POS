import React, { useEffect, useState, useRef } from 'react';
import {
  User, Mail, Phone, Camera, Save, Check,
  Shield, Key, Calendar, Building2, AlertCircle,
  RefreshCw, Upload, Lock, Sparkles, ChevronDown, X
} from 'lucide-react';
import { getUserProfile, updateUserProfile, uploadUserPhoto } from '../api/client.js';

const COUNTRY_CODES = [
  { code: '+91', iso: 'in', name: 'India' },
  { code: '+1', iso: 'us', name: 'USA / Canada' },
  { code: '+44', iso: 'gb', name: 'UK' },
  { code: '+971', iso: 'ae', name: 'UAE' },
  { code: '+880', iso: 'bd', name: 'Bangladesh' },
  { code: '+977', iso: 'np', name: 'Nepal' },
  { code: '+94', iso: 'lk', name: 'Sri Lanka' },
  { code: '+65', iso: 'sg', name: 'Singapore' },
  { code: '+60', iso: 'my', name: 'Malaysia' },
  { code: '+61', iso: 'au', name: 'Australia' },
  { code: '+49', iso: 'de', name: 'Germany' },
  { code: '+33', iso: 'fr', name: 'France' },
  { code: '+966', iso: 'sa', name: 'Saudi Arabia' },
  { code: '+974', iso: 'qa', name: 'Qatar' },
  { code: '+968', iso: 'om', name: 'Oman' },
  { code: '+965', iso: 'kw', name: 'Kuwait' },
  { code: '+973', iso: 'bh', name: 'Bahrain' },
  { code: '+27', iso: 'za', name: 'South Africa' },
  { code: '+86', iso: 'cn', name: 'China' },
  { code: '+81', iso: 'jp', name: 'Japan' }
];

async function compressAndResizeImage(file, maxDimension = 1000, maxSizeBytes = 1048576) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const tryCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Canvas toBlob failed'));
              if (blob.size <= maxSizeBytes || q <= 0.2) {
                const compressedFile = new File([blob], file.name || 'avatar.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                tryCompress(q - 0.15);
              }
            },
            'image/jpeg',
            q
          );
        };
        tryCompress(quality);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

export default function UserProfile() {
  const [profile, setProfile] = useState({
    name: '',
    mobile: '',
    email: '',
    photo_url: '',
    role: 'owner',
    is_admin: false,
    created_at: ''
  });

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [savedToast, setSavedToast] = useState(false);

  const fileInputRef = useRef(null);
  const countryDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parseMobileNumber = (rawMobile) => {
    if (!rawMobile) {
      setCountryCode('+91');
      setPhoneDigits('');
      return;
    }
    const matched = COUNTRY_CODES.find(c => rawMobile.startsWith(c.code));
    if (matched) {
      setCountryCode(matched.code);
      setPhoneDigits(rawMobile.slice(matched.code.length).trim());
    } else {
      setCountryCode('+91');
      setPhoneDigits(rawMobile.replace(/^\+91\s*/, '').trim());
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getUserProfile();
      if (res) {
        setProfile({
          name: res.name || localStorage.getItem('userName') || '',
          mobile: res.mobile || '',
          email: res.email || localStorage.getItem('userEmail') || '',
          photo_url: res.photo_url || '',
          role: res.role || 'owner',
          is_admin: res.is_admin || false,
          created_at: res.created_at || ''
        });
        parseMobileNumber(res.mobile || '');
        if (res.photo_url) {
          localStorage.setItem('userPhoto', res.photo_url);
        } else {
          localStorage.removeItem('userPhoto');
        }
      }
    } catch (err) {
      setProfile(prev => ({
        ...prev,
        email: localStorage.getItem('userEmail') || 'user@example.com',
        name: localStorage.getItem('userName') || 'Merchant',
        photo_url: localStorage.getItem('userPhoto') || ''
      }));
      parseMobileNumber('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressAndResizeImage(file, 1000, 1048576);
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      const previewUrl = URL.createObjectURL(compressed);
      setPendingAvatarFile(compressed);
      setAvatarPreviewUrl(previewUrl);
    } catch (err) {
      setError(err.message || 'Error processing photo');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    setPendingAvatarFile(null);
    setAvatarPreviewUrl(null);
    setProfile(p => ({ ...p, photo_url: '' }));
  };

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!profile.email.trim()) return setError('Email address is required');
    setSaving(true);
    setError(null);

    try {
      let finalPhotoUrl = profile.photo_url;
      if (pendingAvatarFile) {
        setUploading(true);
        const res = await uploadUserPhoto(pendingAvatarFile);
        setUploading(false);
        if (res?.url) {
          finalPhotoUrl = res.url;
        } else {
          throw new Error(res?.error || 'Failed to upload profile photo');
        }
      }

      await updateUserProfile({
        name: profile.name.trim(),
        mobile: profile.mobile.trim(),
        email: profile.email.trim(),
        photo_url: finalPhotoUrl
      });

      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
      setPendingAvatarFile(null);
      setAvatarPreviewUrl(null);
      setProfile(p => ({ ...p, photo_url: finalPhotoUrl }));

      localStorage.setItem('userName', profile.name.trim());
      localStorage.setItem('userEmail', profile.email.trim());
      if (finalPhotoUrl) localStorage.setItem('userPhoto', finalPhotoUrl);
      else localStorage.removeItem('userPhoto');
      window.dispatchEvent(new Event('user_profile_updated'));

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const userInitial = (profile.name || profile.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <User size={18} className="text-emerald-600" />
            User Account & Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage personal merchant profile, contact info, and profile avatar</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving || uploading || compressing}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            {saving || uploading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} strokeWidth={2.5} />
            )}
            <span>{uploading ? 'Uploading Photo…' : (saving ? 'Saving…' : 'Save Profile')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-4">
            
            <div className="relative w-28 h-28 mx-auto">
              <div className="w-full h-full rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-xs">
                {(avatarPreviewUrl || profile.photo_url) ? (
                  <img src={avatarPreviewUrl || profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-slate-400">{userInitial}</span>
                )}
              </div>

              {(avatarPreviewUrl || profile.photo_url) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer z-10"
                  title="Remove Photo"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || compressing || saving}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="Choose Profile Photo"
              >
                {compressing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{profile.name || 'Merchant Account'}</h3>
              <p className="text-xs text-slate-400 font-medium">{profile.email}</p>
              
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Shield size={11} />
                  <span>{profile.is_admin ? 'Store Administrator' : 'Account Owner'}</span>
                </span>
              </div>
            </div>

            {compressing && (
              <p className="text-[11px] text-emerald-600 font-bold animate-pulse">
                Optimizing & compressing avatar under 1MB…
              </p>
            )}

            {uploading && (
              <p className="text-[11px] text-blue-600 font-bold animate-pulse">
                Uploading to secure storage…
              </p>
            )}

            <div className="pt-3 border-t border-slate-100 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Account Role:</span>
                <span className="font-bold text-slate-800 uppercase">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Status:</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>

          </div>
        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          
          <form onSubmit={handleSave} className="space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-900">Personal Information</h2>
              <p className="text-xs text-slate-400 mt-0.5">Update your display name, official mobile number, and contact email</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Chandra"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Mobile Phone Number</label>
                <div className="flex border border-slate-200 rounded-lg overflow-visible focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all bg-white relative">
                  <div className="relative shrink-0" ref={countryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setCountryDropdownOpen(v => !v)}
                      className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 pl-2.5 pr-2 py-2 h-full rounded-l-lg cursor-pointer select-none transition-colors"
                      title="Select Country Code"
                    >
                      <img
                        src={`https://flagcdn.com/w40/${(COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0]).iso}.png`}
                        alt=""
                        className="w-4.5 h-3 object-cover rounded-xs shadow-2xs shrink-0"
                      />
                      <span className="text-xs font-bold text-slate-800">{countryCode}</span>
                      <ChevronDown size={11} className={`text-slate-400 transition-transform ${countryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {countryDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-56 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 divide-y divide-slate-50">
                        {COUNTRY_CODES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountryCode(c.code);
                              setCountryDropdownOpen(false);
                              setProfile(p => ({
                                ...p,
                                mobile: phoneDigits.trim() ? `${c.code} ${phoneDigits.trim()}` : ''
                              }));
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer ${c.code === countryCode ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 font-medium'}`}
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://flagcdn.com/w40/${c.iso}.png`}
                                alt={c.name}
                                className="w-4.5 h-3 object-cover rounded-xs shadow-2xs shrink-0"
                              />
                              <span className="truncate">{c.name}</span>
                            </div>
                            <span className="text-[11px] font-bold opacity-70 shrink-0">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    placeholder="8641850073"
                    value={phoneDigits}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9\s-]/g, '');
                      setPhoneDigits(val);
                      setProfile(p => ({
                        ...p,
                        mobile: val.trim() ? `${countryCode} ${val.trim()}` : ''
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs outline-none font-bold text-slate-900 bg-transparent rounded-r-lg"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Account Email Address *</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Used for signing in and invoice notification dispatches</span>
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || uploading || compressing}
                  className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {saving || uploading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} strokeWidth={2.5} />
                  )}
                  <span>{uploading ? 'Uploading Photo…' : (saving ? 'Saving Changes…' : 'Save Changes')}</span>
                </button>
              </div>
            </div>
          </form>

        </div>

      </div>

      {savedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700/80 animate-fade-in transition-all max-w-[calc(100vw-2rem)] sm:max-w-md whitespace-nowrap sm:whitespace-normal">
          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight">Profile Updated</p>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">Your personal details and profile avatar have been saved.</p>
          </div>
        </div>
      )}

    </div>
  );
}
