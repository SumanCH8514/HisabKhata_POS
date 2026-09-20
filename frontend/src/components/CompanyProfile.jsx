import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Phone, Mail, Globe, MapPin, FileText,
  Camera, Save, RefreshCw, AlertCircle, CheckCircle,
  ShieldCheck, Award, Upload, Image as ImageIcon, ChevronDown,
  Trash2, Plus, X, Sparkles, Check, Navigation, QrCode
} from 'lucide-react';
import { getCompany, updateCompany, uploadFile } from '../api/client.js';
import { toast } from '../utils/toast.js';

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

const GST_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

export default function CompanyProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: 'YOUR COMPANY NAME',
    phone: '',
    email: '',
    website: '',
    gst_number: '',
    building: '',
    street: '',
    city: '',
    pincode: '',
    state_code: '',
    country: 'India',
    logo_url: '',
    signature_url: '',
    letterhead_url: '',
    upi_id: ''
  });

  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState(null);
  const [gstVerified, setGstVerified] = useState(false);
  const [pendingFiles, setPendingFiles] = useState({ logo: null, signature: null, letterhead: null });
  const [previewUrls, setPreviewUrls] = useState({ logo: null, signature: null, letterhead: null });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const letterheadInputRef = useRef(null);
  const countryDropdownRef = useRef(null);

  const handleFetchDeviceLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser or device');
      return;
    }

    setLocating(true);
    setError(null);
    setLocationSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          if (!res.ok) throw new Error('Failed to resolve address from GPS');
          const data = await res.json();
          const addr = data.address || {};

          const street = [
            addr.suburb || addr.neighbourhood || '',
            addr.road || addr.residential || ''
          ].filter(Boolean).join(', ');

          const city = addr.city || addr.town || addr.village || addr.city_district || addr.county || '';
          const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);
          const stateName = addr.state || '';
          const matchedState = GST_STATES.find(s =>
            s.name.toLowerCase() === stateName.toLowerCase() ||
            stateName.toLowerCase().includes(s.name.toLowerCase())
          );

          const building = addr.building || addr.house_number || addr.amenity || '';

          setForm(f => ({
            ...f,
            building: building || f.building,
            street: street || f.street,
            city: city || f.city,
            pincode: pincode || f.pincode,
            state_code: matchedState ? matchedState.code : f.state_code
          }));

          setLocationSuccess(true);
          setTimeout(() => setLocationSuccess(false), 3000);
        } catch (err) {
          setError(err.message || 'Error fetching address details from GPS');
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        let msg = 'Could not get device location';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser settings.';
        else if (err.code === 2) msg = 'Location unavailable. Please verify your device GPS.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsePhone = (rawPhone) => {
    if (!rawPhone) {
      setCountryCode('+91');
      setPhoneDigits('');
      return;
    }
    const matched = COUNTRY_CODES.find(c => rawPhone.startsWith(c.code));
    if (matched) {
      setCountryCode(matched.code);
      setPhoneDigits(rawPhone.slice(matched.code.length).trim());
    } else {
      setCountryCode('+91');
      setPhoneDigits(rawPhone.replace(/^\+91\s*/, '').trim());
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompany();
      if (data?.name) {
        const parts = (data.address || '').split(',').map(s => s.trim());
        let building = '';
        let street = '';
        let city = '';
        let pincode = '';
        if (parts.length === 4) {
          [building, street, city, pincode] = parts;
        } else if (parts.length === 3) {
          [street, city, pincode] = parts;
        } else if (parts.length === 2) {
          [city, pincode] = parts;
        } else if (parts.length === 1) {
          city = parts[0] || '';
        }

        const gst = data.gst_number || '';
        let detectedState = data.state_code || data.state || '';
        if (!detectedState && gst && gst.length >= 2) {
          const prefix = gst.substring(0, 2);
          if (GST_STATES.some(s => s.code === prefix)) {
            detectedState = prefix;
          }
        }

        setForm({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          gst_number: gst,
          building,
          street,
          city,
          pincode,
          state_code: detectedState || '19',
          country: 'India',
          logo_url: data.logo_url || '',
          signature_url: data.signature_url || '',
          letterhead_url: data.letterhead_url || '',
          upi_id: data.upi_id || ''
        });

        parsePhone(data.phone || '');
        if (gst) setGstVerified(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGstChange = (val) => {
    const cleanGst = val.toUpperCase().trim();
    setForm(f => {
      let stateCode = f.state_code;
      if (cleanGst.length >= 2) {
        const prefix = cleanGst.substring(0, 2);
        if (GST_STATES.some(s => s.code === prefix)) {
          stateCode = prefix;
        }
      }
      return { ...f, gst_number: cleanGst, state_code: stateCode };
    });
    setGstVerified(cleanGst.length === 15);
  };

  const handleStateChange = (newCode) => {
    setForm(f => {
      let updatedGst = f.gst_number;
      if (updatedGst && updatedGst.length === 15 && /^\d{2}/.test(updatedGst) && newCode) {
        updatedGst = newCode + updatedGst.substring(2);
      }
      return { ...f, state_code: newCode, gst_number: updatedGst };
    });
  };

  const handleSelectFile = (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (previewUrls[field] && previewUrls[field].startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[field]);
    }
    const blobUrl = URL.createObjectURL(file);
    setPendingFiles(prev => ({ ...prev, [field]: file }));
    setPreviewUrls(prev => ({ ...prev, [field]: blobUrl }));
    e.target.value = '';
  };

  const handleRemoveFile = (field) => {
    if (previewUrls[field] && previewUrls[field].startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[field]);
    }
    setPendingFiles(prev => ({ ...prev, [field]: null }));
    setPreviewUrls(prev => ({ ...prev, [field]: null }));
    setForm(f => ({ ...f, [`${field}_url`]: '' }));
  };

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!form.name.trim()) return setError('Business name is required');

    setSaving(true);
    setError(null);
    try {
      let finalLogoUrl = form.logo_url;
      let finalSignatureUrl = form.signature_url;
      let finalLetterheadUrl = form.letterhead_url;

      const fieldsToUpload = Object.keys(pendingFiles).filter(k => pendingFiles[k]);
      if (fieldsToUpload.length > 0) {
        setUploadingFiles(true);
        for (const field of fieldsToUpload) {
          const file = pendingFiles[field];
          const res = await uploadFile(file, field);
          if (res?.url) {
            if (field === 'logo') finalLogoUrl = res.url;
            else if (field === 'signature') finalSignatureUrl = res.url;
            else if (field === 'letterhead') finalLetterheadUrl = res.url;
          } else {
            throw new Error(res?.error || `Failed to upload ${field}`);
          }
        }
        setUploadingFiles(false);
      }

      const fullAddress = [form.building, form.street, form.city, form.pincode].filter(Boolean).join(', ');
      const finalPhone = phoneDigits.trim() ? `${countryCode} ${phoneDigits.trim()}` : '';

      const payload = {
        name: form.name.trim(),
        phone: finalPhone,
        email: form.email.trim(),
        website: form.website.trim(),
        gst_number: form.gst_number.trim(),
        state: form.state_code,
        state_code: form.state_code,
        address: fullAddress,
        logo_url: finalLogoUrl || null,
        signature_url: finalSignatureUrl || null,
        letterhead_url: finalLetterheadUrl || null,
        upi_id: form.upi_id.trim() || null
      };

      await updateCompany(payload);

      Object.values(previewUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      setPendingFiles({ logo: null, signature: null, letterhead: null });
      setPreviewUrls({ logo: null, signature: null, letterhead: null });
      setForm(f => ({
        ...f,
        logo_url: finalLogoUrl || '',
        signature_url: finalSignatureUrl || '',
        letterhead_url: finalLetterheadUrl || ''
      }));

      try {
        const cached = JSON.parse(localStorage.getItem('cached_company') || '{}');
        localStorage.setItem('cached_company', JSON.stringify({ ...cached, ...payload }));
      } catch {}

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);
      toast.success('Company profile updated successfully');
      window.dispatchEvent(new Event('company_profile_updated'));
    } catch (err) {
      setError(err.message || 'Failed to update company profile');
      toast.error(err.message || 'Failed to update company profile');
    } finally {
      setUploadingFiles(false);
      setSaving(false);
    }
  };

  const companyInitials = form.name ? form.name.substring(0, 2).toUpperCase() : 'CO';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-10">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div>
          <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 size={18} className="text-emerald-600" />
            Company & Store Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage official business identity, GSTIN, signature, address, and invoice branding</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Reload Profile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700/80 animate-fade-in transition-all max-w-[calc(100vw-2rem)] sm:max-w-md whitespace-nowrap sm:whitespace-normal">
          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight">Company Profile Updated</p>
            <p className="text-[10px] text-slate-400 truncate hidden sm:block">Store profile, tax details & letterhead have been saved.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        <div className="lg:col-span-4 space-y-4">

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-4">
            <div className="relative w-28 h-28 mx-auto">
              <div className="w-full h-full rounded-2xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center shadow-xs">
                {(previewUrls.logo || form.logo_url) ? (
                  <img src={previewUrls.logo || form.logo_url} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-slate-400">{companyInitials}</span>
                )}
              </div>

              {(previewUrls.logo || form.logo_url) && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile('logo')}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer z-10"
                  title="Remove Logo"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}

              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={saving || uploadingFiles}
                className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-50"
                title="Upload Company Logo"
              >
                <Camera size={16} />
              </button>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleSelectFile(e, 'logo')}
                className="hidden"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">{form.name || 'Store Name'}</h3>
              <p className="text-xs text-slate-400 font-medium">{form.email || form.phone || 'store@business.com'}</p>

              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck size={11} />
                  <span>{form.gst_number ? (form.gst_number.length === 15 ? 'GST Registered' : 'Licence Registered') : 'Active Store'}</span>
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">GSTIN / Licence:</span>
                <span className={`font-bold ${form.gst_number ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {form.gst_number ? 'Verified' : 'Unregistered'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Billing State:</span>
                <span className="font-bold text-slate-800">
                  {GST_STATES.find(s => s.code === form.state_code)?.name || 'Default State'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Authorized Signature</span>
              {(previewUrls.signature || form.signature_url) && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile('signature')}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            <div
              onClick={() => signatureInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl overflow-hidden cursor-pointer transition-colors bg-slate-50 flex items-center justify-center relative p-2"
            >
              {(previewUrls.signature || form.signature_url) ? (
                <img src={previewUrls.signature || form.signature_url} alt="Signature" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-center">
                  <Upload size={18} className="text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] font-bold text-slate-600">Click to Upload Signature</span>
                </div>
              )}
            </div>
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={e => handleSelectFile(e, 'signature')}
              className="hidden"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Letterhead / Header</span>
              {(previewUrls.letterhead || form.letterhead_url) && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile('letterhead')}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            <div
              onClick={() => letterheadInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl overflow-hidden cursor-pointer transition-colors bg-slate-50 flex items-center justify-center relative p-2"
            >
              {(previewUrls.letterhead || form.letterhead_url) ? (
                <img src={previewUrls.letterhead || form.letterhead_url} alt="Letterhead" className="max-h-full max-w-full object-cover rounded-lg" />
              ) : (
                <div className="text-center">
                  <ImageIcon size={20} className="text-slate-400 mx-auto mb-1" />
                  <span className="text-[11px] font-bold text-slate-600 block">Upload Letterhead Banner</span>
                  <span className="text-[10px] text-slate-400">Max 2000×300px</span>
                </div>
              )}
            </div>
            <input
              ref={letterheadInputRef}
              type="file"
              accept="image/*"
              onChange={e => handleSelectFile(e, 'letterhead')}
              className="hidden"
            />
          </div>

        </div>

        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">

          <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">

            <div>
              <div className="pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-600 shrink-0" />
                  Primary Business Details
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Legal business trade name, official phone, contact email, and storefront link</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Business Name *</label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. SumanOnline Store"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Store Mobile Number</label>
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
                      placeholder="89xxxxxxxx"
                      value={phoneDigits}
                      onChange={e => setPhoneDigits(e.target.value.replace(/[^0-9\s-]/g, ''))}
                      className="w-full px-3 py-2 text-xs outline-none font-bold text-slate-900 bg-transparent rounded-r-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Official Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="store@sumanonline.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Website / Web App URL</label>
                  <div className="relative">
                    <Globe size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. sumanonline.com"
                      value={form.website}
                      onChange={e => setForm({ ...form, website: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <QrCode size={13} className="text-emerald-600 shrink-0" />
                      <span>UPI ID (for Payment QR Code)</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80 self-start sm:self-auto">
                      GPay • PhonePe • Paytm • BHIM
                    </span>
                  </div>
                  <div className="relative">
                    <QrCode size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank, 9876543210@paytm, merchant@ybl"
                      value={form.upi_id}
                      onChange={e => setForm({ ...form, upi_id: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">Used to automatically generate instant Scan & Pay UPI QR codes on digital bills and invoices</p>
                </div>

              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="pb-3 border-b border-slate-100 mb-4">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  Tax & GST Compliance
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">GSTIN registration, automatic State mapping, and tax filing details</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">GSTIN Number (15-digit) / Trade Licence</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={30}
                      placeholder="e.g. 19ABCDE1234F1Z5 or Trade Licence No."
                      value={form.gst_number}
                      onChange={e => handleGstChange(e.target.value)}
                      className="w-full min-w-0 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-mono font-bold focus:border-emerald-500 transition-all text-slate-900 uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setGstVerified(Boolean(form.gst_number.trim()))}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${gstVerified ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {gstVerified ? '✓ Valid' : 'Verify'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">GST State Code</label>
                  <div className="relative">
                    <select
                      value={form.state_code}
                      onChange={e => handleStateChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 appearance-none bg-white text-slate-900 cursor-pointer pr-8"
                    >
                      <option value="">Select GST State</option>
                      {GST_STATES.map(s => (
                        <option key={s.code} value={s.code}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400" />
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="pb-3 border-b border-slate-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin size={16} className="text-emerald-600 shrink-0" />
                    Registered Business Address
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Physical store and invoice billing address printed on receipts</p>
                </div>

                <button
                  type="button"
                  onClick={handleFetchDeviceLocation}
                  disabled={locating}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer w-full sm:w-auto border ${locationSuccess
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-700'
                    }`}
                  title="Use Device GPS to fill address"
                >
                  {locating ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : locationSuccess ? (
                    <Check size={13} className="text-emerald-600" />
                  ) : (
                    <Navigation size={13} className="text-emerald-600" />
                  )}
                  <span>{locating ? 'Locating GPS…' : locationSuccess ? 'Address Filled!' : 'Use Device Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Building / Flat / Floor No.</label>
                  <input
                    type="text"
                    placeholder="e.g. xxxx Building"
                    value={form.building}
                    onChange={e => setForm({ ...form, building: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Road / Street / Locality</label>
                  <input
                    type="text"
                    placeholder="e.g. xxxxx Main Road"
                    value={form.street}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">City / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. xxxxxxxx"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-bold focus:border-emerald-500 transition-all text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">PIN Code (6-digit)</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. xxxxxx"
                    value={form.pincode}
                    onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none font-mono font-bold focus:border-emerald-500 transition-all text-slate-900"
                  />
                </div>

              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => toast.info('Company deletion is disabled for data integrity safety.')}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Delete Company Data
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingFiles}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-6 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {saving || uploadingFiles ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} strokeWidth={2.5} />
                  )}
                  <span>{uploadingFiles ? 'Uploading Media…' : saving ? 'Updating Details…' : 'Save Details'}</span>
                </button>
              </div>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
