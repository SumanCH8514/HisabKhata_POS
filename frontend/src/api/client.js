// =============================================================================
// API Client — thin fetch wrapper for the Hono backend
// Developer - Suman Chakrabortty (sumanonline.com)
// =============================================================================

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const headers = { 'Content-Type': 'application/json', ...options.headers };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const companyId = localStorage.getItem('companyId');
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('token');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('companyId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      window.location.href = '/login';
    }
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

export const login = (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const signup = (body) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });
export const getMe = () => request('/api/auth/me');
export const verifyEmail = (body) => request('/api/auth/verify-email', { method: 'POST', body: JSON.stringify(body) });
export const resendVerificationEmail = (body) => request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify(body) });
export const forgotPassword = (body) => request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) });
export const verifyResetToken = (body) => request('/api/auth/verify-reset-token', { method: 'POST', body: JSON.stringify(body) });
export const resetPassword = (body) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) });

// ─── Companies ────────────────────────────────────────────────────────────────
export const getCompanies = () => request('/api/companies');
export const createCompany = (body) => request('/api/companies', { method: 'POST', body: JSON.stringify(body) });

// ─── Categories ───────────────────────────────────────────────────────────────
export const getCategories = () => request('/api/categories');
export const createCategory = (body) => request('/api/categories', { method: 'POST', body: JSON.stringify(body) });
export const getSubCategories = (categoryId) => request(categoryId ? `/api/sub-categories?category_id=${categoryId}` : '/api/sub-categories');
export const createSubCategory = (body) => request('/api/sub-categories', { method: 'POST', body: JSON.stringify(body) });
export const deleteSubCategory = (id) => request(`/api/sub-categories/${id}`, { method: 'DELETE' });

// ─── Brands ───────────────────────────────────────────────────────────────────
export const getBrands = () => request('/api/brands');
export const createBrand = (body) => request('/api/brands', { method: 'POST', body: JSON.stringify(body) });
export const deleteBrand = (id) => request(`/api/brands/${id}`, { method: 'DELETE' });

// ─── Units ────────────────────────────────────────────────────────────────────
export const getUnits = () => request('/api/units');
export const createUnit = (body) => request('/api/units', { method: 'POST', body: JSON.stringify(body) });
export const deleteUnit = (id) => request(`/api/units/${id}`, { method: 'DELETE' });
export const getUnitConversions = () => request('/api/unit-conversions');
export const createUnitConversion = (body) => request('/api/unit-conversions', { method: 'POST', body: JSON.stringify(body) });
export const deleteUnitConversion = (id) => request(`/api/unit-conversions/${id}`, { method: 'DELETE' });

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => request('/api/dashboard');

function buildQuery(params = {}) {
  const clean = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined');
  if (!clean.length) return '';
  return '?' + new URLSearchParams(Object.fromEntries(clean)).toString();
}

export const getItems = (params = {}) => {
  return request(`/api/items${buildQuery(params)}`);
};
export const createItem = (body) => request('/api/items', { method: 'POST', body: JSON.stringify(body) });
export const updateItem = (id, body) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteItem = (id) => request(`/api/items/${id}`, { method: 'DELETE' });

export const getParties = (params = {}) => {
  return request(`/api/parties${buildQuery(params)}`);
};
export const createParty = (body) => request('/api/parties', { method: 'POST', body: JSON.stringify(body) });
export const updateParty = (id, body) => request(`/api/parties/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteParty = (id) => request(`/api/parties/${id}`, { method: 'DELETE' });

export const getInvoices = (params = {}) => {
  return request(`/api/invoices${buildQuery(params)}`);
};
export const getInvoice = (id) => request(`/api/invoices/${id}`);
export const getPublicInvoice = (id) => request(`/api/public/invoices/${id}`);
export const createInvoice = (body) => request('/api/invoices', { method: 'POST', body: JSON.stringify(body) });
export const deleteInvoice = (id) => request(`/api/invoices/${id}`, { method: 'DELETE' });
export const sendInvoiceReceipt = (id, body = {}) => request(`/api/invoices/${id}/send-receipt`, { method: 'POST', body: JSON.stringify(body) });

export const getTransactions = (params = {}) => {
  return request(`/api/transactions${buildQuery(params)}`);
};
export const createTransaction = (body) => request('/api/transactions', { method: 'POST', body: JSON.stringify(body) });
export const deleteTransaction = (id) => request(`/api/transactions/${id}`, { method: 'DELETE' });

// ─── Company Profile ──────────────────────────────────────────────────────────
export const getCompany = () => request('/api/company');
export const updateCompany = (body) => request('/api/company', { method: 'PUT', body: JSON.stringify(body) });

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const getExpenses = () => request('/api/expenses');
export const createExpense = (body) => request('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
export const updateExpense = (id, body) => request(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteExpense = (id) => request(`/api/expenses/${id}`, { method: 'DELETE' });

export const compressImageClient = (file, maxDimension = 1200, maxSizeBytes = 200 * 1024) => {
  if (!file || !file.type || !file.type.startsWith('image/')) return Promise.resolve(file);
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return Promise.resolve(file);
  if (file.size <= maxSizeBytes && file.type === 'image/webp') return Promise.resolve(file);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let origWidth = img.naturalWidth || img.width;
        let origHeight = img.naturalHeight || img.height;

        const attemptCompression = (targetDim, q) => {
          let w = origWidth;
          let h = origHeight;
          if (w > targetDim || h > targetDim) {
            if (w > h) {
              h = Math.round((h * targetDim) / w);
              w = targetDim;
            } else {
              w = Math.round((w * targetDim) / h);
              h = targetDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const mimeType = 'image/webp';
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              if (blob.size <= maxSizeBytes || (q <= 0.35 && targetDim <= 400)) {
                const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                const compressedFile = new File([blob], cleanName, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else if (q > 0.4) {
                attemptCompression(targetDim, Number((q - 0.15).toFixed(2)));
              } else {
                const nextDim = Math.max(300, Math.round(targetDim * 0.75));
                attemptCompression(nextDim, 0.75);
              }
            },
            mimeType,
            q
          );
        };

        attemptCompression(maxDimension, 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const uploadFile = async (file, field) => {
  let fileToUpload = file;
  try {
    if (file && file.type && file.type.startsWith('image/')) {
      const maxDim = (field === 'logo' || field === 'signature' || field === 'avatar') ? 800 : 1200;
      fileToUpload = await compressImageClient(file, maxDim, 200 * 1024);
    }
  } catch (err) {
    console.warn('Image compression fallback:', err);
  }

  const form = new FormData();
  form.append('file', fileToUpload);
  form.append('field', field);

  const headers = {};
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const companyId = localStorage.getItem('companyId');
  if (companyId) headers['X-Company-ID'] = companyId;

  return fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: form,
    headers
  }).then(r => r.json());
};

export const getBatches = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/batches${qs ? `?${qs}` : ''}`);
};
export const createBatch = (body) => request('/api/batches', { method: 'POST', body: JSON.stringify(body) });
export const adjustStock = (body) => request('/api/items/stock-adjustment', { method: 'POST', body: JSON.stringify(body) });

export const getFundAccounts = () => request('/api/fund/accounts');
export const createFundAccount = (body) => request('/api/fund/accounts', { method: 'POST', body: JSON.stringify(body) });
export const updateFundAccount = (id, body) => request(`/api/fund/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const deleteFundAccount = (id) => request(`/api/fund/accounts/${id}`, { method: 'DELETE' });
export const getFundTransactions = () => request('/api/fund/transactions');
export const createFundTransaction = (body) => request('/api/fund/transactions', { method: 'POST', body: JSON.stringify(body) });
export const transferFund = (body) => request('/api/fund/transfer', { method: 'POST', body: JSON.stringify(body) });
export const deleteFundTransaction = (id) => request(`/api/fund/transactions/${id}`, { method: 'DELETE' });

export const getSalesReport = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/reports/sales${qs ? `?${qs}` : ''}`);
};
export const getGstReport = () => request('/api/reports/gst');
export const getDayBook = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/reports/daybook${qs ? `?${qs}` : ''}`);
};

export const getBackups = () => request('/api/backups');
export const exportBackup = () => request('/api/backups/export', { method: 'POST' });
export const getReferrals = () => request('/api/referrals');
export const validateReferralCode = (code) => request(`/api/referrals/validate?code=${encodeURIComponent(code)}`);

export const getUserProfile = async () => {
  try {
    return await request('/api/user/profile');
  } catch {
    return {
      name: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
      mobile: localStorage.getItem('userMobile') || '',
      photo_url: localStorage.getItem('userPhoto') || '',
      role: 'owner',
      is_admin: localStorage.getItem('isAdmin') === 'true'
    };
  }
};

export const updateUserProfile = async (body) => {
  try {
    return await request('/api/user/profile', { method: 'PUT', body: JSON.stringify(body) });
  } catch {
    if (body.name) localStorage.setItem('userName', body.name);
    if (body.email) localStorage.setItem('userEmail', body.email);
    if (body.mobile) localStorage.setItem('userMobile', body.mobile);
    if (body.photo_url) localStorage.setItem('userPhoto', body.photo_url);
    return body;
  }
};

export const uploadUserPhoto = async (file) => {
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('photo', file);
  try {
    const res = await fetch(`${BASE_URL}/api/user/upload-photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  } catch {
    const localUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    localStorage.setItem('userPhoto', localUrl);
    return { url: localUrl };
  }
};

export const generateAIDescription = async (params) => {
  const apiKey = localStorage.getItem('groq_api_key') || '';
  const aiModel = localStorage.getItem('groq_model') || 'qwen/qwen3.6-27b';
  const res = await request('/api/ai/generate-description', {
    method: 'POST',
    body: JSON.stringify({ ...params, apiKey, aiModel })
  });
  if (res?.description) {
    let clean = res.description;
    if (clean.includes('</think>')) {
      clean = clean.split('</think>').pop().trim();
    } else {
      clean = clean.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }
    res.description = clean;
  }
  return res;
};

export const getUserSettings = () => request('/api/user-settings');
export const saveUserSettings = (settings) => request('/api/user-settings', {
  method: 'POST',
  body: JSON.stringify({ settings })
});

export const syncUserSettingsFromCloud = async () => {
  try {
    const res = await getUserSettings();
    if (res && res.settings) {
      localStorage.setItem('hk_pos_settings', JSON.stringify(res.settings));
      if (res.settings.currency) localStorage.setItem('app_currency', res.settings.currency);
      if (res.settings.defaultTaxRate !== undefined) localStorage.setItem('default_tax_rate', res.settings.defaultTaxRate);
      if (res.settings.enabledTaxSlabs) localStorage.setItem('hk_active_tax_rates', JSON.stringify(res.settings.enabledTaxSlabs));
      if (res.settings.taxCalculationMode) localStorage.setItem('hk_tax_calculation_mode', res.settings.taxCalculationMode);
      if (res.settings.groqApiKey) localStorage.setItem('groq_api_key', res.settings.groqApiKey);
      if (res.settings.groqModel) localStorage.setItem('groq_model', res.settings.groqModel);
      window.dispatchEvent(new Event('hk_settings_updated'));
      return res.settings;
    }
  } catch { }
  return null;
};

export const getPosSettings = (format = null) => {
  try {
    const raw = JSON.parse(localStorage.getItem('hk_pos_settings') || '{}');
    if (format === 'thermal' && raw.thermal && typeof raw.thermal === 'object') {
      return { ...raw, ...raw.thermal };
    }
    if (format === 'a4' && raw.a4 && typeof raw.a4 === 'object') {
      return { ...raw, ...raw.a4 };
    }
    return raw;
  } catch {
    return {};
  }
};

export const isBusinessGstRegistered = (comp = null) => {
  try {
    const c = comp || JSON.parse(localStorage.getItem('cached_company') || '{}');
    const gst = c?.gst_number || c?.gstin || '';
    return Boolean(gst && String(gst).trim().length > 0);
  } catch {
    return false;
  }
};

export const getActiveTaxRates = (comp = null) => {
  if (!isBusinessGstRegistered(comp)) {
    return [0];
  }
  try {
    const posCfg = getPosSettings();
    if (Array.isArray(posCfg.enabledTaxSlabs) && posCfg.enabledTaxSlabs.length > 0) {
      return posCfg.enabledTaxSlabs.map(Number).sort((a, b) => a - b);
    }
    const raw = localStorage.getItem('hk_active_tax_rates');
    if (raw) return JSON.parse(raw).map(Number).sort((a, b) => a - b);
  } catch {}
  return [0, 5, 12, 18, 28];
};

export const getDefaultTaxRate = (comp = null) => {
  if (!isBusinessGstRegistered(comp)) {
    return 0;
  }
  try {
    const direct = localStorage.getItem('default_tax_rate');
    if (direct !== null && direct !== undefined && direct !== '') return Number(direct);
    const posCfg = getPosSettings();
    if (posCfg.defaultTaxRate !== undefined && posCfg.defaultTaxRate !== '') return Number(posCfg.defaultTaxRate);
  } catch {}
  return 18;
};

export const formatAppDate = (dStr) => {
  if (!dStr) return '';
  const cfg = getPosSettings();
  const fmtStr = cfg.dateFormat || localStorage.getItem('app_date_format') || 'DD/MM/YYYY';
  try {
    let day, month, year;
    if (typeof dStr === 'string' && dStr.includes('-')) {
      const parts = dStr.split('T')[0].split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else {
          day = parts[0];
          month = parts[1];
          year = parts[2];
        }
      }
    }
    if (!day || !month || !year) {
      const d = new Date(dStr);
      if (!isNaN(d)) {
        day = String(d.getDate()).padStart(2, '0');
        month = String(d.getMonth() + 1).padStart(2, '0');
        year = String(d.getFullYear());
      }
    }
    if (day && month && year) {
      if (fmtStr === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
      if (fmtStr === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
      return `${day}/${month}/${year}`;
    }
  } catch { }
  return String(dStr);
};

export const fmt = (n, decimals = 2) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n ?? 0);

export const getCurrencySymbol = () => {
  const cfg = getPosSettings();
  const code = cfg.currency || localStorage.getItem('app_currency') || 'INR';
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', BDT: '৳', NPR: 'रू' };
  return symbols[code] || code;
};

export const fmtCurrency = (n, customDecimals) => {
  const cfg = getPosSettings();
  const curr = cfg.currency || localStorage.getItem('app_currency') || 'INR';
  const decimals = customDecimals !== undefined ? customDecimals : (cfg.decimalPlaces !== undefined ? Number(cfg.decimalPlaces) : 2);
  const localeMap = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    AED: 'ar-AE',
    BDT: 'bn-BD',
    NPR: 'ne-NP'
  };
  const locale = localeMap[curr] || 'en-IN';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: curr, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n ?? 0);
  } catch {
    const sym = getCurrencySymbol();
    return `${sym}${Number(n || 0).toFixed(decimals)}`;
  }
};

export async function getImageBase64(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
    try {
      const proxyUrl = `${BASE_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    } catch { }
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch { }

  return url;
}

export const getTeamMembers = () => request('/api/team/members');
export const inviteTeamMember = (body) => request('/api/team/invite', { method: 'POST', body: JSON.stringify(body) });
export const getTeamInvitations = () => request('/api/team/invitations');
export const revokeTeamInvitation = (id) => request(`/api/team/invitations/${id}`, { method: 'DELETE' });
export const updateTeamMember = (id, body) => request(`/api/team/members/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const removeTeamMember = (id) => request(`/api/team/members/${id}`, { method: 'DELETE' });
export const getMyPendingInvitations = () => request('/api/team/pending-invitations');
export const verifyInvitationToken = (token) => request(`/api/invitations/verify/${encodeURIComponent(token)}`);
export const respondToInvitation = (body) => request('/api/invitations/respond', { method: 'POST', body: JSON.stringify(body) });
export const signupWithInvite = (body) => request('/api/auth/signup-with-invite', { method: 'POST', body: JSON.stringify(body) });
export const getMailStatus = () => request('/api/mail/status');
export const sendMail = (body) => request('/api/mail/send', { method: 'POST', body: JSON.stringify(body) });
export const sendTestMail = (body) => request('/api/mail/test', { method: 'POST', body: JSON.stringify(body || {}) });
export const getSmtpSettings = () => request('/api/smtp-settings');
export const saveSmtpSettings = (body) => request('/api/smtp-settings', { method: 'PUT', body: JSON.stringify(body) });
export const testSmtpConnection = (body) => request('/api/smtp-settings/test', { method: 'POST', body: JSON.stringify(body || {}) });
