// =============================================================================
// HisabKhata POS — Cloudflare Worker Backend
// Runtime: Hono.js v4 on Cloudflare Workers
// Bindings: DB (D1), MY_POS_BUCKET (R2)
// Devoloper: Suman Chakrabortty (sumanonline.com)
// =============================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { sign, verify } from 'hono/jwt';
import { createSmtpClient, resolveSmtpClient, SmtpClient } from './smtp.js';
import {
  buildStaffInvitationEmail,
  buildTestVerificationEmail,
  buildInvoiceReceiptEmail,
  buildWelcomeEmail,
  buildEmailVerificationEmail,
  buildPasswordResetEmail
} from './mail_templates/index.js';

const app = new Hono();
const JWT_SECRET = 'hisabkhata-pos-super-secret-key';

app.use('*', logger());
app.use('/api/*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.pages.dev') ||
      origin.includes('sumanonline.com')
    ) {
      return origin;
    }
    return origin;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Company-ID', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
}));

let migrationsApplied = false;
async function runAutoMigrations(db) {
  if (migrationsApplied || !db) return;
  const migrations = [
    `CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS sub_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, category_id, name)
    )`,
    `CREATE TABLE IF NOT EXISTS item_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      batch_no TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      purchase_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE items ADD COLUMN image_url TEXT`,
    `ALTER TABLE items ADD COLUMN wholesale_price REAL DEFAULT 0`,
    `ALTER TABLE items ADD COLUMN dealer_price REAL DEFAULT 0`,
    `ALTER TABLE items ADD COLUMN min_sale_price REAL DEFAULT 0`,
    `ALTER TABLE items ADD COLUMN mrp REAL DEFAULT 0`,
    `ALTER TABLE items ADD COLUMN hsn_code TEXT`,
    `ALTER TABLE items ADD COLUMN sku TEXT`,
    `ALTER TABLE items ADD COLUMN brand TEXT`,
    `ALTER TABLE items ADD COLUMN model TEXT`,
    `ALTER TABLE items ADD COLUMN rack_location TEXT`,
    `ALTER TABLE items ADD COLUMN aisle TEXT`,
    `ALTER TABLE items ADD COLUMN rack TEXT`,
    `ALTER TABLE items ADD COLUMN shelf TEXT`,
    `ALTER TABLE items ADD COLUMN size_color TEXT`,
    `ALTER TABLE items ADD COLUMN batch_number TEXT`,
    `ALTER TABLE items ADD COLUMN expiry_date TEXT`,
    `ALTER TABLE items ADD COLUMN sub_category_id INTEGER`,
    `ALTER TABLE items ADD COLUMN sub_category TEXT`,
    `ALTER TABLE invoices ADD COLUMN payment_mode TEXT DEFAULT 'CASH'`,
    `ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'PAID'`,
    `ALTER TABLE invoices ADD COLUMN due_date TEXT`,
    `ALTER TABLE invoices ADD COLUMN terms TEXT`,
    `ALTER TABLE invoices ADD COLUMN discount_amount REAL DEFAULT 0`,
    `ALTER TABLE invoice_items ADD COLUMN mrp REAL DEFAULT 0`,
    `ALTER TABLE companies ADD COLUMN website TEXT`,
    `ALTER TABLE companies ADD COLUMN upi_id TEXT`,
    `ALTER TABLE companies ADD COLUMN letterhead_url TEXT`,
    `ALTER TABLE companies ADD COLUMN state TEXT`,
    `ALTER TABLE transactions ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_id)`,
    `ALTER TABLE referrals ADD COLUMN referred_user_id INTEGER`,
    `ALTER TABLE referrals ADD COLUMN referred_business_name TEXT`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS company_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('owner','manager','cashier','staff')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS company_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      invited_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('manager','cashier','staff')),
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled','expired')),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_company_members_co ON company_members(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email)`,
    `CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token)`,
    `CREATE INDEX IF NOT EXISTS idx_company_invitations_co ON company_invitations(company_id)`,
    `CREATE TABLE IF NOT EXISTS company_smtp_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      service_type TEXT NOT NULL DEFAULT 'inbuilt' CHECK(service_type IN ('inbuilt', 'custom')),
      host TEXT,
      port INTEGER DEFAULT 465,
      encryption TEXT DEFAULT 'ssl_tls' CHECK(encryption IN ('ssl_tls', 'starttls')),
      username TEXT,
      password TEXT,
      from_email TEXT,
      from_name TEXT,
      reply_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(company_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_company_smtp_settings_co ON company_smtp_settings(company_id)`
  ];
  for (const sql of migrations) {
    try {
      await db.prepare(sql).run();
    } catch { }
  }

  try {
    const unlinkedTxns = await db.prepare(`
      SELECT id, company_id, party_id, amount, reference, notes, type
      FROM transactions
      WHERE invoice_id IS NULL AND type = 'PAYMENT_IN'
    `).all();

    for (const txn of (unlinkedTxns?.results || [])) {
      const match = (txn.reference || txn.notes || '').match(/(INV-[A-Za-z0-9-]+|POS-[A-Za-z0-9-]+)/i);
      let targetInv = null;
      if (match) {
        targetInv = await db.prepare(`
          SELECT id, total_amount, amount_paid, payment_mode
          FROM invoices
          WHERE invoice_number = ? AND company_id = ?
        `).bind(match[1].toUpperCase(), txn.company_id).first();
      }
      if (!targetInv && txn.party_id) {
        targetInv = await db.prepare(`
          SELECT id, total_amount, amount_paid, payment_mode
          FROM invoices
          WHERE party_id = ? AND company_id = ? AND type = 'SALES' AND (total_amount - amount_paid) > 0.001
          ORDER BY date ASC, id ASC
        `).bind(txn.party_id, txn.company_id).first();
      }

      if (targetInv) {
        const currentPaid = Number(targetInv.amount_paid) || 0;
        const due = Math.max(0, Number(targetInv.total_amount) - currentPaid);
        const toApply = Math.min(Number(txn.amount) || 0, due);
        const newPaid = currentPaid + toApply;
        const isSettled = (Number(targetInv.total_amount) - newPaid) <= 0.001;
        const newStatus = isSettled ? 'PAID' : 'PARTIALLY_PAID';

        let newPaymentMode = targetInv.payment_mode;
        if (isSettled && typeof newPaymentMode === 'string' && newPaymentMode.includes('Due:')) {
          newPaymentMode = 'Settled (Paid in Full)';
        }

        await db.prepare(`
          UPDATE invoices
          SET amount_paid = ?, status = ?, payment_mode = ?, updated_at = datetime('now')
          WHERE id = ? AND company_id = ?
        `).bind(newPaid, newStatus, newPaymentMode, targetInv.id, txn.company_id).run();

        await db.prepare(`
          UPDATE transactions
          SET invoice_id = ?
          WHERE id = ? AND company_id = ?
        `).bind(targetInv.id, txn.id, txn.company_id).run();
      }
    }

    await db.prepare(`
      UPDATE invoices
      SET status = 'PAID'
      WHERE (total_amount - amount_paid) <= 0.001 AND status != 'PAID'
    `).run();
  } catch { }

  migrationsApplied = true;
}

async function reconcilePartyBalance(db, companyId, partyId) {
  if (!partyId) return;
  const party = await db.prepare(
    `SELECT id, opening_balance FROM parties WHERE id = ? AND company_id = ?`
  ).bind(partyId, companyId).first();
  if (!party) return;

  const invSum = await db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN type IN ('SALES','PURCHASE_RETURN') THEN (total_amount - amount_paid)
           ELSE -(total_amount - amount_paid) END
    ), 0) as net
    FROM invoices
    WHERE party_id = ? AND company_id = ? AND type != 'QUOTATION'
  `).bind(partyId, companyId).first();

  const txnSum = await db.prepare(`
    SELECT COALESCE(SUM(
      CASE WHEN type = 'PAYMENT_IN' THEN -amount ELSE amount END
    ), 0) as net
    FROM transactions
    WHERE party_id = ? AND company_id = ?
      AND (invoice_id IS NULL OR invoice_id NOT IN (
        SELECT id FROM invoices WHERE company_id = ?
      ))
  `).bind(partyId, companyId, companyId).first();

  const reconciledBalance = (Number(party.opening_balance) || 0)
    + (Number(invSum?.net) || 0)
    + (Number(txnSum?.net) || 0);

  await db.prepare(`
    UPDATE parties SET current_balance = ?, updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `).bind(reconciledBalance, partyId, companyId).run();
}

const extractR2Key = (url) => {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(pos_items\/[^\s?#]+|user_profile\/[^\s?#]+|company_profile\/[^\s?#]+)/);
  return match ? match[1] : null;
};

const deleteR2Object = async (bucket, url) => {
  try {
    if (!bucket || !url) return;
    const key = extractR2Key(url);
    if (key) {
      await bucket.delete(key);
    }
  } catch {}
};


app.use('/api/*', async (c, next) => {
  if (c.env?.DB && !migrationsApplied) {
    await runAutoMigrations(c.env.DB);
  }
  await next();
});

// Helper to authenticate user via JWT
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET || JWT_SECRET, 'HS256');
    c.set('userId', payload.userId);
    c.set('isAdmin', !!payload.isAdmin);
    await next();
  } catch (err) {
    console.error('JWT Verify Error:', err);
    return c.json({ error: `Unauthorized: Invalid token (${err.message})` }, 401);
  }
};

// Helper to check if the authenticated user is an admin
const adminOnlyMiddleware = async (c, next) => {
  const isAdmin = c.get('isAdmin');
  if (!isAdmin) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
};

const companyScopeMiddleware = async (c, next) => {
  const companyId = c.req.header('X-Company-ID');
  if (!companyId) {
    return c.json({ error: 'Bad Request: Missing X-Company-ID header' }, 400);
  }

  const userId = c.get('userId');
  try {
    const company = await c.env.DB.prepare(
      `SELECT id, user_id FROM companies WHERE id = ?`
    ).bind(companyId).first();

    if (!company) {
      return c.json({ error: 'Forbidden: Company not found or access denied' }, 403);
    }

    let role = null;
    if (company.user_id === userId) {
      role = 'owner';
    } else {
      const member = await c.env.DB.prepare(
        `SELECT role, status FROM company_members WHERE company_id = ? AND user_id = ?`
      ).bind(companyId, userId).first();
      if (member && member.status === 'active') {
        role = member.role;
      }
    }

    if (!role) {
      return c.json({ error: 'Forbidden: Company not found or access denied' }, 403);
    }

    c.set('companyId', company.id);
    c.set('companyRole', role);
    await next();
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
};

const ownerOnlyMiddleware = async (c, next) => {
  const role = c.get('companyRole');
  if (role !== 'owner') {
    return c.json({ error: 'Forbidden: Business owner permission required' }, 403);
  }
  await next();
};

// ─── Password Hashing Helpers (Web Crypto PBKDF2) ──────────────────────────────
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const hashHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  // Backward-compatibility fallback for unhashed legacy/demo records
  if (!storedHash.includes(':')) {
    return password === storedHash;
  }
  const [saltHex, originalHash] = storedHash.split(':');
  if (!saltHex || !originalHash) return false;

  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const hashHex = Array.from(new Uint8Array(exportedKey)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === originalHash;
}

app.get('/', (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json') && !accept.includes('text/html')) {
    return c.json({
      status: 'ok',
      service: 'HisabKhata POS Backend',
      version: 'v2.4.0',
      database: 'D1 Connected',
      storage: 'R2 Active',
      timestamp: new Date().toISOString()
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HisabKhata POS — API Gateway &amp; Service Dashboard</title>
  <link rel="icon" type="image/svg+xml" href="https://pos.hisabkhata.sumanonline.com/favicon.svg" />
  <link rel="apple-touch-icon" href="https://pos.hisabkhata.sumanonline.com/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #07090e;
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      position: relative;
      overflow-x: hidden;
    }
    .bg-grid {
      position: fixed;
      inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      pointer-events: none;
    }
    .glow {
      position: fixed;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
    }
    .card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 820px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      border-radius: 24px;
      padding: 36px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 20px;
      color: #ffffff;
      box-shadow: 0 8px 16px -4px rgba(16, 185, 129, 0.4);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .brand-sub {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .4; transform: scale(0.85); }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    .stat-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      padding: 16px;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
    }
    .routes-section {
      background: #090e17;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .routes-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .route-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .route-row:last-child { border-bottom: none; }
    .method-get { color: #38bdf8; font-weight: 700; }
    .method-post { color: #34d399; font-weight: 700; }
    .method-put { color: #fbbf24; font-weight: 700; }
    .route-path { color: #cbd5e1; font-weight: 500; margin-left: 10px; }
    .route-desc { color: #64748b; font-size: 11px; font-family: 'Inter', sans-serif; }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .btn-primary {
      flex: 1;
      min-width: 200px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 10px 20px -6px rgba(16, 185, 129, 0.4);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 24px -6px rgba(16, 185, 129, 0.6);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 14px 20px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      text-align: center;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #64748b;
      position: relative;
      z-index: 1;
    }
    .footer a { color: #94a3b8; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow"></div>

  <div class="card">
    <div class="header">
      <div class="brand">
        <div class="brand-icon">HK</div>
        <div>
          <h1 class="brand-title">HisabKhata POS</h1>
          <p class="brand-sub">SumanOnline Cloud Gateway</p>
        </div>
      </div>
      <div class="status-badge">
        <div class="pulse-dot"></div>
        <span>Operational &bull; 100% Uptime</span>
      </div>
    </div>

    <div class="grid">
      <div class="stat-box">
        <div class="stat-label">Edge Runtime</div>
        <div class="stat-value">SumanOnline Cloud Engine</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Database Engine</div>
        <div class="stat-value">SumanOnline D1 Database</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Object Storage</div>
        <div class="stat-value">SumanOnline R2 Storage</div>
      </div>
    </div>

    <div class="routes-section">
      <div class="routes-title">
        <span>Core API Gateway Endpoints</span>
        <span style="font-size: 10px; color: #10b981; font-weight: 700;">REST / JSON</span>
      </div>
      <div class="route-row">
        <div><span class="method-post">POST</span><span class="route-path">/api/auth/login</span></div>
        <span class="route-desc">JWT Merchant Authentication</span>
      </div>
      <div class="route-row">
        <div><span class="method-get">GET</span><span class="route-path">/api/items</span></div>
        <span class="route-desc">Catalog &amp; Stock Inventory</span>
      </div>
      <div class="route-row">
        <div><span class="method-post">POST</span><span class="route-path">/api/invoices</span></div>
        <span class="route-desc">GST Sales &amp; POS Billing</span>
      </div>
      <div class="route-row">
        <div><span class="method-get">GET</span><span class="route-path">/api/parties</span></div>
        <span class="route-desc">Customer &amp; Supplier Ledger</span>
      </div>
      <div class="route-row">
        <div><span class="method-put">PUT</span><span class="route-path">/api/user/profile</span></div>
        <span class="route-desc">User Profile &amp; Avatar R2 Sync</span>
      </div>
    </div>

    <div class="actions">
      <a href="https://pos.hisabkhata.sumanonline.com" class="btn-primary">
        <span>Launch Web POS App</span>
        <span>&rarr;</span>
      </a>
      <a href="https://wa.me/918918153949?text=HisabKhata%20POS%20API%20Inquiry" target="_blank" rel="noopener noreferrer" class="btn-secondary">
        Developer Support
      </a>
    </div>
  </div>

  <div class="footer">
    Powered by <strong>HisabKhata POS</strong> &bull; Crafted by <a href="https://sumanonline.com" target="_blank">SumanOnline</a>
  </div>
</body>
</html>`;

  return c.html(html);
});

// =============================================================================
// AUTHENTICATION
// =============================================================================
function generateSecureHexToken(bytesCount = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesCount));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateNumericOtp(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

app.post('/api/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, businessName, referralCode, is_admin } = body;
    if (!email || !password || !businessName) {
      return c.json({ error: 'Email, password, and business name are required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = c.env.DB;
    const existingUser = await db.prepare(`SELECT id, email_verified FROM users WHERE email = ?`).bind(cleanEmail).first();
    if (existingUser) {
      if (existingUser.email_verified === 0) {
        return c.json({
          error: 'An account with this email already exists but is not verified.',
          needs_verification: true,
          email: cleanEmail
        }, 400);
      }
      return c.json({ error: 'User with this email already exists' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const isAdmin = is_admin ? 1 : 0;
    const vToken = generateSecureHexToken(32);
    const vCode = generateNumericOtp(6);

    const userResult = await db.prepare(
      `INSERT INTO users (email, password, is_admin, email_verified, verification_token, verification_token_expires, verification_code) 
       VALUES (?, ?, ?, 0, ?, datetime('now', '+1 day'), ?)`
    ).bind(cleanEmail, hashedPassword, isAdmin, vToken, vCode).run();
    const userId = userResult.meta.last_row_id;

    const companyResult = await db.prepare(
      `INSERT INTO companies (user_id, name, email) VALUES (?, ?, ?)`
    ).bind(userId, businessName.trim(), cleanEmail).run();
    const companyId = companyResult.meta.last_row_id;

    if (referralCode && typeof referralCode === 'string') {
      const cleanCode = referralCode.trim().toUpperCase();
      const match = cleanCode.match(/^HK-([0-9A-Z]+)-POS$/i);
      if (match) {
        const referrerUserId = parseInt(match[1], 36);
        if (!isNaN(referrerUserId) && referrerUserId > 0 && referrerUserId !== userId) {
          const referrerUser = await db.prepare('SELECT id FROM users WHERE id = ?').bind(referrerUserId).first();
          if (referrerUser) {
            await db.prepare(`
              INSERT INTO referrals (referrer_user_id, referral_code, referred_email, referred_user_id, referred_business_name, status, reward_status)
              VALUES (?, ?, ?, ?, ?, 'joined', '1 Month Free Pro')
            `).bind(referrerUserId, cleanCode, cleanEmail, userId, businessName.trim()).run();
          }
        }
      }
    }

    const verifyUrl = `https://pos.hisabkhata.sumanonline.com/verify-email?token=${vToken}`;
    try {
      const smtpClient = createSmtpClient(c.env);
      if (smtpClient.isConfigured()) {
        const mailContent = buildEmailVerificationEmail({
          userName: businessName.trim() || cleanEmail.split('@')[0],
          userEmail: cleanEmail,
          verifyUrl,
          code: vCode
        });
        await smtpClient.sendMail({
          to: cleanEmail,
          subject: mailContent.subject,
          text: mailContent.text,
          html: mailContent.html
        });
      }
    } catch (mailErr) { }

    return c.json({
      success: true,
      needs_verification: true,
      email: cleanEmail,
      message: 'Account created! Please check your email to verify your address before logging in.'
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/resend-verification', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = c.env.DB;
    const user = await db.prepare(`SELECT id, email, name, email_verified FROM users WHERE email = ?`).bind(cleanEmail).first();
    if (!user) {
      return c.json({ success: true, message: 'If an account exists with this email, a verification email has been sent.' });
    }

    if (user.email_verified === 1) {
      return c.json({ success: true, already_verified: true, message: 'Your email address is already verified. You can log in.' });
    }

    const vToken = generateSecureHexToken(32);
    const vCode = generateNumericOtp(6);

    await db.prepare(`
      UPDATE users 
      SET verification_token = ?, verification_token_expires = datetime('now', '+1 day'), verification_code = ? 
      WHERE id = ?
    `).bind(vToken, vCode, user.id).run();

    const verifyUrl = `https://pos.hisabkhata.sumanonline.com/verify-email?token=${vToken}`;
    try {
      const smtpClient = createSmtpClient(c.env);
      if (smtpClient.isConfigured()) {
        const mailContent = buildEmailVerificationEmail({
          userName: user.name || cleanEmail.split('@')[0],
          userEmail: cleanEmail,
          verifyUrl,
          code: vCode
        });
        await smtpClient.sendMail({
          to: cleanEmail,
          subject: mailContent.subject,
          text: mailContent.text,
          html: mailContent.html
        });
      }
    } catch (mailErr) { }

    return c.json({ success: true, message: 'A fresh verification link and code have been sent to your email.' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/verify-email', async (c) => {
  try {
    const body = await c.req.json();
    const { token, code, email } = body;

    if (!token && (!code || !email)) {
      return c.json({ error: 'Verification token or email with code is required' }, 400);
    }

    const db = c.env.DB;
    let user = null;

    if (token) {
      user = await db.prepare(`
        SELECT * FROM users 
        WHERE verification_token = ? AND verification_token_expires > datetime('now')
      `).bind(token.trim()).first();
    } else if (code && email) {
      user = await db.prepare(`
        SELECT * FROM users 
        WHERE email = ? AND verification_code = ? AND verification_token_expires > datetime('now')
      `).bind(email.toLowerCase().trim(), code.trim()).first();
    }

    if (!user) {
      const existing = await db.prepare(`
        SELECT id, email_verified FROM users 
        WHERE verification_token = ? OR (email = ? AND verification_code = ?)
      `).bind(token ? token.trim() : '', email ? email.toLowerCase().trim() : '', code ? code.trim() : '').first();

      if (existing && existing.email_verified === 1) {
        return c.json({ success: true, already_verified: true, message: 'Your email address is already verified. You can log in.' });
      }

      return c.json({ error: 'Invalid or expired verification link/code. Please request a new verification email.' }, 400);
    }

    await db.prepare(`
      UPDATE users 
      SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL, verification_code = NULL 
      WHERE id = ?
    `).bind(user.id).run();

    const isAdmin = user.is_admin === 1;

    const { results: ownedCompanies } = await db.prepare(`
      SELECT c.*, 'owner' as role, 'owner' as membership_type 
      FROM companies c 
      WHERE c.user_id = ?
    `).bind(user.id).all();

    const { results: memberCompanies } = await db.prepare(`
      SELECT c.*, cm.role as role, 'member' as membership_type 
      FROM companies c 
      JOIN company_members cm ON c.id = cm.company_id 
      WHERE cm.user_id = ? AND cm.status = 'active'
    `).bind(user.id).all();

    const companies = [...(ownedCompanies || []), ...(memberCompanies || [])];
    const jwtToken = await sign({ userId: user.id, isAdmin }, c.env.JWT_SECRET || JWT_SECRET, 'HS256');

    return c.json({
      success: true,
      message: 'Email verified successfully!',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        mobile: user.mobile || '',
        photo_url: user.photo_url || '',
        is_admin: isAdmin,
        role: user.role || 'owner'
      },
      companies
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, turnstileToken } = body;
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const secretKey = c.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
    if (turnstileToken || (c.env.TURNSTILE_SECRET_KEY && c.env.TURNSTILE_SECRET_KEY !== '1x0000000000000000000000000000000AA')) {
      try {
        const formData = new FormData();
        formData.append('secret', secretKey);
        formData.append('response', turnstileToken || '');
        const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
        if (ip) formData.append('remoteip', ip);

        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData
        });
        const verifyResult = await verifyRes.json();
        if (!verifyResult.success) {
          return c.json({ error: 'Security verification failed. Please complete the captcha.' }, 400);
        }
      } catch (tsErr) { }
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = c.env.DB;
    const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(cleanEmail).first();
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    if (user.email_verified === 0) {
      return c.json({
        error: 'Please verify your email address before logging in.',
        needs_verification: true,
        email: user.email
      }, 403);
    }

    const isAdmin = user.is_admin === 1;

    const { results: ownedCompanies } = await db.prepare(`
      SELECT c.*, 'owner' as role, 'owner' as membership_type 
      FROM companies c 
      WHERE c.user_id = ?
    `).bind(user.id).all();

    const { results: memberCompanies } = await db.prepare(`
      SELECT c.*, cm.role as role, 'member' as membership_type 
      FROM companies c 
      JOIN company_members cm ON c.id = cm.company_id 
      WHERE cm.user_id = ? AND cm.status = 'active'
    `).bind(user.id).all();

    const companies = [...(ownedCompanies || []), ...(memberCompanies || [])];
    const token = await sign({ userId: user.id, isAdmin }, c.env.JWT_SECRET || JWT_SECRET, 'HS256');

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        mobile: user.mobile || '',
        photo_url: user.photo_url || '',
        is_admin: isAdmin,
        role: user.role || 'owner'
      },
      companies
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/forgot-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ error: 'Email address is required' }, 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = c.env.DB;
    const user = await db.prepare(`SELECT id, email, name FROM users WHERE email = ?`).bind(cleanEmail).first();

    if (user) {
      const rToken = generateSecureHexToken(32);
      await db.prepare(`
        UPDATE users 
        SET reset_password_token = ?, reset_password_expires = datetime('now', '+1 hour') 
        WHERE id = ?
      `).bind(rToken, user.id).run();

      const resetUrl = `https://pos.hisabkhata.sumanonline.com/reset-password?token=${rToken}`;
      try {
        const smtpClient = createSmtpClient(c.env);
        if (smtpClient.isConfigured()) {
          const mailContent = buildPasswordResetEmail({
            userName: user.name || cleanEmail.split('@')[0],
            userEmail: cleanEmail,
            resetUrl
          });
          await smtpClient.sendMail({
            to: cleanEmail,
            subject: mailContent.subject,
            text: mailContent.text,
            html: mailContent.html
          });
        }
      } catch (mailErr) { }
    }

    return c.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/verify-reset-token', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;
    if (!token) {
      return c.json({ valid: false, error: 'Reset token is required' }, 400);
    }

    const db = c.env.DB;
    const user = await db.prepare(`
      SELECT id, email FROM users 
      WHERE reset_password_token = ? AND reset_password_expires > datetime('now')
    `).bind(token.trim()).first();

    if (!user) {
      return c.json({ valid: false, error: 'Password reset link is invalid or has expired.' }, 400);
    }

    return c.json({ valid: true, email: user.email });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { token, password } = body;
    if (!token || !password) {
      return c.json({ error: 'Token and new password are required' }, 400);
    }

    if (typeof password !== 'string' || password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    const db = c.env.DB;
    const user = await db.prepare(`
      SELECT id, email FROM users 
      WHERE reset_password_token = ? AND reset_password_expires > datetime('now')
    `).bind(token.trim()).first();

    if (!user) {
      return c.json({ error: 'Password reset link is invalid or has expired.' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    await db.prepare(`
      UPDATE users 
      SET password = ?, reset_password_token = NULL, reset_password_expires = NULL 
      WHERE id = ?
    `).bind(hashedPassword, user.id).run();

    return c.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await c.env.DB.prepare(`SELECT id, email, is_admin, name, mobile, photo_url, role, created_at FROM users WHERE id = ?`).bind(userId).first();
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({
      id: user.id,
      email: user.email,
      name: user.name || '',
      mobile: user.mobile || '',
      photo_url: user.photo_url || '',
      role: user.role || 'owner',
      is_admin: user.is_admin === 1,
      created_at: user.created_at
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/user/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await c.env.DB.prepare(`SELECT id, email, is_admin, name, mobile, photo_url, role, created_at FROM users WHERE id = ?`).bind(userId).first();
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json({
      id: user.id,
      email: user.email,
      name: user.name || '',
      mobile: user.mobile || '',
      photo_url: user.photo_url || '',
      role: user.role || 'owner',
      is_admin: user.is_admin === 1,
      created_at: user.created_at
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/user/profile', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, mobile, email, photo_url } = body;

    if (email) {
      const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ? AND id != ?`).bind(email.toLowerCase().trim(), userId).first();
      if (existing) return c.json({ error: 'Email already in use by another account' }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        email = COALESCE(?, email),
        photo_url = COALESCE(?, photo_url)
      WHERE id = ?`
    ).bind(
      name !== undefined ? name : null,
      mobile !== undefined ? mobile : null,
      email ? email.toLowerCase().trim() : null,
      photo_url !== undefined ? photo_url : null,
      userId
    ).run();

    const updated = await c.env.DB.prepare(`SELECT id, email, is_admin, name, mobile, photo_url, role, created_at FROM users WHERE id = ?`).bind(userId).first();
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/user/upload-photo', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const formData = await c.req.parseBody();
    const file = formData['photo'] || formData['file'];
    if (!file) return c.json({ error: 'No photo provided' }, 400);

    const ext = file.name ? file.name.split('.').pop() : 'jpg';
    const key = `user_profile/${userId}_${Date.now()}.${ext}`;

    const buffer = await file.arrayBuffer();
    if (c.env.MY_POS_BUCKET) {
      await c.env.MY_POS_BUCKET.put(key, buffer, {
        httpMetadata: { 
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable'
        }
      });
    }

    const photoUrl = `https://api.pos.hisabkhata.sumanonline.com/api/storage/${key}`;
    const prevUser = await c.env.DB.prepare(`SELECT photo_url FROM users WHERE id = ?`).bind(userId).first();
    if (prevUser?.photo_url && c.env.MY_POS_BUCKET) {
      await deleteR2Object(c.env.MY_POS_BUCKET, prevUser.photo_url);
    }
    await c.env.DB.prepare(`UPDATE users SET photo_url = ? WHERE id = ?`).bind(photoUrl, userId).run();

    return c.json({ url: photoUrl, key });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/user-settings', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const row = await c.env.DB.prepare(
      `SELECT settings_json FROM user_settings WHERE user_id = ?`
    ).bind(userId).first();

    if (!row || !row.settings_json) {
      return c.json({ success: true, settings: null });
    }
    let parsed = null;
    try {
      parsed = JSON.parse(row.settings_json);
    } catch { }
    return c.json({ success: true, settings: parsed });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/user-settings', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const settingsObj = body.settings !== undefined ? body.settings : body;
    const settingsJson = JSON.stringify(settingsObj);

    await c.env.DB.prepare(
      `INSERT INTO user_settings (user_id, settings_json, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         settings_json = excluded.settings_json,
         updated_at = excluded.updated_at`
    ).bind(userId, settingsJson).run();

    return c.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/storage/*', async (c) => {
  try {
    const key = c.req.path.replace('/api/storage/', '');
    if (!c.env.MY_POS_BUCKET) return c.json({ error: 'Storage bucket not available' }, 500);
    const object = await c.env.MY_POS_BUCKET.get(key);
    if (!object) return c.json({ error: 'File not found' }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Cache-Control', 'public, max-age=31536000');
    return new Response(object.body, { headers });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/proxy-image', async (c) => {
  try {
    const url = c.req.query('url');
    if (!url) return c.json({ error: 'url required' }, 400);
    const resp = await fetch(url);
    const contentType = resp.headers.get('content-type') || 'image/png';
    const buffer = await resp.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// COMPANIES MANAGEMENT
// =============================================================================
app.get('/api/companies', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const { results: owned } = await c.env.DB.prepare(
      `SELECT c.*, 'owner' as role, 'owner' as membership_type FROM companies c WHERE c.user_id = ?`
    ).bind(userId).all();

    const { results: memberCompanies } = await c.env.DB.prepare(`
      SELECT c.*, cm.role as role, 'member' as membership_type
      FROM companies c
      JOIN company_members cm ON c.id = cm.company_id
      WHERE cm.user_id = ? AND cm.status = 'active'
    `).bind(userId).all();

    const allCompanies = [...(owned || []), ...(memberCompanies || [])];
    return c.json(allCompanies);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/companies', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { name, phone, address, gst_number, email, website } = body;
    if (!name) return c.json({ error: 'Business name is required' }, 400);

    const result = await c.env.DB.prepare(`
      INSERT INTO companies (user_id, name, phone, address, gst_number, email, website)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(userId, name, phone || null, address || null, gst_number || null, email || null, website || null).run();

    const companyId = result.meta.last_row_id;
    return c.json({ id: companyId, name, phone, address, gst_number, email, website, role: 'owner', membership_type: 'owner' }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/team/members', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const currentUserRole = c.get('companyRole');

    const owner = await c.env.DB.prepare(`
      SELECT 
        c.user_id as user_id,
        u.email as email,
        u.name as name,
        u.mobile as mobile,
        u.photo_url as photo_url,
        'owner' as role,
        'active' as status,
        c.created_at as joined_at,
        1 as is_primary_owner
      FROM companies c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).bind(companyId).first();

    const { results: members } = await c.env.DB.prepare(`
      SELECT 
        cm.id as member_id,
        cm.user_id as user_id,
        u.email as email,
        u.name as name,
        u.mobile as mobile,
        u.photo_url as photo_url,
        cm.role as role,
        cm.status as status,
        cm.created_at as joined_at,
        0 as is_primary_owner
      FROM company_members cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.company_id = ?
      ORDER BY cm.created_at DESC
    `).bind(companyId).all();

    const list = owner ? [owner, ...(members || [])] : (members || []);
    return c.json({
      members: list,
      currentUserRole
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/team/invite', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const userId = c.get('userId');
    const body = await c.req.json();
    const email = (body.email || '').trim().toLowerCase();
    const role = (body.role || 'cashier').trim().toLowerCase();

    if (!email || !email.includes('@') || !email.includes('.')) {
      return c.json({ error: 'A valid email address is required' }, 400);
    }

    if (!['manager', 'cashier', 'staff'].includes(role)) {
      return c.json({ error: 'Role must be either manager or cashier' }, 400);
    }

    const company = await c.env.DB.prepare(`SELECT id, name, user_id FROM companies WHERE id = ?`).bind(companyId).first();
    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }

    const existingOwner = await c.env.DB.prepare(`
      SELECT u.id FROM companies c JOIN users u ON c.user_id = u.id WHERE c.id = ? AND LOWER(u.email) = ?
    `).bind(companyId, email).first();
    if (existingOwner) {
      return c.json({ error: 'This user is already the owner of this business' }, 400);
    }

    const existingMember = await c.env.DB.prepare(`
      SELECT cm.id FROM company_members cm JOIN users u ON cm.user_id = u.id WHERE cm.company_id = ? AND LOWER(u.email) = ? AND cm.status = 'active'
    `).bind(companyId, email).first();
    if (existingMember) {
      return c.json({ error: 'User is already an active member of this business' }, 400);
    }

    const tokenBytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const existingInvite = await c.env.DB.prepare(`
      SELECT id FROM company_invitations WHERE company_id = ? AND LOWER(email) = ? AND status = 'pending'
    `).bind(companyId, email).first();

    let invitationId;
    if (existingInvite) {
      await c.env.DB.prepare(`
        UPDATE company_invitations 
        SET role = ?, token = ?, expires_at = ?, created_at = datetime('now')
        WHERE id = ?
      `).bind(role, token, expiresAt, existingInvite.id).run();
      invitationId = existingInvite.id;
    } else {
      const res = await c.env.DB.prepare(`
        INSERT INTO company_invitations (company_id, invited_by_user_id, email, role, token, status, expires_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).bind(companyId, userId, email, role, token, expiresAt).run();
      invitationId = res.meta.last_row_id;
    }

    const mailer = await resolveSmtpClient(c.env, c.env.DB, companyId);
    let emailSent = false;
    let emailError = null;
    if (mailer.isConfigured()) {
      try {
        const origin = c.req.header('origin') || 'https://pos.hisabkhata.sumanonline.com';
        const inviteUrl = `${origin}/join?invite=${encodeURIComponent(token)}`;
        const inviter = await c.env.DB.prepare(`SELECT name, email FROM users WHERE id = ?`).bind(userId).first();
        const { subject, html, text } = buildStaffInvitationEmail({
          companyName: company.name,
          inviterName: inviter?.name || inviter?.email || 'The business owner',
          role,
          inviteUrl
        });
        await mailer.sendMail({
          to: email,
          subject,
          html,
          text,
          from: mailer.fromEmail
        });
        emailSent = true;
      } catch (mailErr) {
        emailError = mailErr.message;
      }
    }

    return c.json({
      success: true,
      invitation: {
        id: invitationId,
        company_id: companyId,
        company_name: company.name,
        email,
        role,
        token,
        expires_at: expiresAt
      },
      emailSent,
      emailError
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/team/invitations', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { results } = await c.env.DB.prepare(`
      SELECT id, email, role, token, status, created_at, expires_at 
      FROM company_invitations 
      WHERE company_id = ? AND status = 'pending' AND expires_at > datetime('now')
      ORDER BY created_at DESC
    `).bind(companyId).all();

    return c.json(results || []);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/team/invitations/:id', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const inviteId = c.req.param('id');
    await c.env.DB.prepare(`
      DELETE FROM company_invitations WHERE id = ? AND company_id = ?
    `).bind(inviteId, companyId).run();

    return c.json({ success: true, message: 'Invitation revoked' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

const updateMemberHandler = async (c) => {
  try {
    const companyId = c.get('companyId');
    const memberId = c.req.param('id');
    const body = await c.req.json();
    const { role, status } = body;

    if (role && !['manager', 'cashier', 'staff'].includes(role)) {
      return c.json({ error: 'Invalid role specified' }, 400);
    }
    if (status && !['active', 'suspended'].includes(status)) {
      return c.json({ error: 'Invalid status specified' }, 400);
    }

    await c.env.DB.prepare(`
      UPDATE company_members 
      SET role = COALESCE(?, role), status = COALESCE(?, status), updated_at = datetime('now')
      WHERE id = ? AND company_id = ?
    `).bind(role || null, status || null, memberId, companyId).run();

    return c.json({ success: true, message: 'Member updated successfully' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
};

app.patch('/api/team/members/:id', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, updateMemberHandler);
app.put('/api/team/members/:id', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, updateMemberHandler);

app.delete('/api/team/members/:id', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const memberId = c.req.param('id');

    await c.env.DB.prepare(`
      DELETE FROM company_members WHERE id = ? AND company_id = ?
    `).bind(memberId, companyId).run();

    return c.json({ success: true, message: 'Member removed from team' });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/team/pending-invitations', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const user = await c.env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(userId).first();
    if (!user || !user.email) {
      return c.json([]);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT 
        ci.id,
        ci.token,
        ci.role,
        ci.status,
        ci.created_at,
        ci.expires_at,
        c.id as company_id,
        c.name as company_name,
        inviter.name as inviter_name,
        inviter.email as inviter_email
      FROM company_invitations ci
      JOIN companies c ON ci.company_id = c.id
      JOIN users inviter ON ci.invited_by_user_id = inviter.id
      WHERE LOWER(ci.email) = LOWER(?) AND ci.status = 'pending' AND ci.expires_at > datetime('now')
      ORDER BY ci.created_at DESC
    `).bind(user.email).all();

    return c.json(results || []);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/invitations/verify/:token', async (c) => {
  try {
    const token = c.req.param('token');
    if (!token) {
      return c.json({ valid: false, error: 'Missing invitation token' }, 400);
    }

    const invite = await c.env.DB.prepare(`
      SELECT 
        ci.id,
        ci.token,
        ci.email,
        ci.role,
        ci.status,
        ci.expires_at,
        c.id as company_id,
        c.name as company_name,
        c.logo_url as company_logo_url,
        inviter.name as inviter_name,
        inviter.email as inviter_email
      FROM company_invitations ci
      JOIN companies c ON ci.company_id = c.id
      JOIN users inviter ON ci.invited_by_user_id = inviter.id
      WHERE ci.token = ?
    `).bind(token).first();

    if (!invite) {
      return c.json({ valid: false, error: 'Invitation link does not exist or has expired' }, 404);
    }

    if (invite.status !== 'pending') {
      return c.json({ valid: false, error: `This invitation has already been ${invite.status}` }, 400);
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return c.json({ valid: false, error: 'This invitation has expired' }, 400);
    }

    return c.json({
      valid: true,
      invitation: invite
    });
  } catch (err) {
    return c.json({ valid: false, error: err.message }, 500);
  }
});

app.post('/api/invitations/respond', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const { token, action } = body;

    if (!token || !['accept', 'reject'].includes(action)) {
      return c.json({ error: 'Token and valid action (accept or reject) are required' }, 400);
    }

    const invite = await c.env.DB.prepare(`
      SELECT * FROM company_invitations WHERE token = ? AND status = 'pending' AND expires_at > datetime('now')
    `).bind(token).first();

    if (!invite) {
      return c.json({ error: 'Invitation not found or has expired' }, 404);
    }

    if (action === 'accept') {
      await c.env.DB.prepare(`
        INSERT INTO company_members (company_id, user_id, role, status)
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(company_id, user_id) DO UPDATE SET
          role = excluded.role,
          status = 'active',
          updated_at = datetime('now')
      `).bind(invite.company_id, userId, invite.role).run();

      await c.env.DB.prepare(`
        UPDATE company_invitations SET status = 'accepted' WHERE id = ?
      `).bind(invite.id).run();

      const company = await c.env.DB.prepare(`SELECT id, name FROM companies WHERE id = ?`).bind(invite.company_id).first();

      return c.json({
        success: true,
        message: 'Invitation accepted successfully',
        companyId: invite.company_id,
        companyName: company?.name || '',
        role: invite.role
      });
    } else {
      await c.env.DB.prepare(`
        UPDATE company_invitations SET status = 'rejected' WHERE id = ?
      `).bind(invite.id).run();

      return c.json({
        success: true,
        message: 'Invitation rejected'
      });
    }
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/signup-with-invite', async (c) => {
  try {
    const body = await c.req.json();
    const { token, name, email, password } = body;

    if (!token || !email || !password) {
      return c.json({ error: 'Token, email, and password are required' }, 400);
    }

    const invite = await c.env.DB.prepare(`
      SELECT * FROM company_invitations WHERE token = ? AND status = 'pending' AND expires_at > datetime('now')
    `).bind(token).first();

    if (!invite) {
      return c.json({ error: 'Invitation is invalid or has expired' }, 404);
    }

    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email.toLowerCase().trim()).first();
    if (existing) {
      return c.json({ error: 'An account with this email already exists. Please log in to accept the invitation.' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const userRes = await c.env.DB.prepare(`
      INSERT INTO users (email, password, is_admin, name, role, email_verified)
      VALUES (?, ?, 0, ?, 'staff', 1)
    `).bind(email.toLowerCase().trim(), hashedPassword, name || '').run();
    const userId = userRes.meta.last_row_id;

    await c.env.DB.prepare(`
      INSERT INTO company_members (company_id, user_id, role, status)
      VALUES (?, ?, ?, 'active')
    `).bind(invite.company_id, userId, invite.role).run();

    await c.env.DB.prepare(`
      UPDATE company_invitations SET status = 'accepted' WHERE id = ?
    `).bind(invite.id).run();

    const company = await c.env.DB.prepare(`SELECT id, name FROM companies WHERE id = ?`).bind(invite.company_id).first();

    const jwtToken = await sign({ userId, isAdmin: false }, c.env.JWT_SECRET || JWT_SECRET, 'HS256');

    return c.json({
      token: jwtToken,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name || '',
        mobile: '',
        photo_url: '',
        is_admin: false,
        role: invite.role
      },
      company: {
        id: company?.id || invite.company_id,
        name: company?.name || '',
        role: invite.role
      },
      companies: [
        {
          id: company?.id || invite.company_id,
          name: company?.name || '',
          role: invite.role,
          membership_type: 'member'
        }
      ]
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/mail/status', authMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId') || c.req.header('X-Company-ID');
    const mailer = await resolveSmtpClient(c.env, c.env.DB, companyId);
    const configured = mailer.isConfigured();
    let maskedUser = '';
    if (configured && mailer.user) {
      const parts = mailer.user.split('@');
      if (parts.length === 2) {
        const namePart = parts[0];
        const maskedName = namePart.length > 2 ? `${namePart.slice(0, 2)}***` : `${namePart}***`;
        maskedUser = `${maskedName}@${parts[1]}`;
      } else {
        maskedUser = 'Configured';
      }
    }
    const senders = [];
    if (mailer.fromEmail) senders.push(mailer.fromEmail);
    if (mailer.user && !senders.includes(mailer.user)) senders.push(mailer.user);

    return c.json({
      configured,
      serviceType: mailer.serviceType,
      host: mailer.host,
      port: mailer.port,
      user: maskedUser,
      fromEmail: mailer.fromEmail || mailer.user || '',
      fromName: mailer.fromName,
      availableSenders: senders
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/smtp-settings', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');

    const customRow = await db.prepare(
      `SELECT * FROM company_smtp_settings WHERE company_id = ?`
    ).bind(companyId).first();

    const inbuiltMailer = createSmtpClient(c.env);
    let maskedInbuiltUser = '';
    if (inbuiltMailer.isConfigured() && inbuiltMailer.user) {
      const parts = inbuiltMailer.user.split('@');
      if (parts.length === 2) {
        const namePart = parts[0];
        const maskedName = namePart.length > 2 ? `${namePart.slice(0, 2)}***` : `${namePart}***`;
        maskedInbuiltUser = `${maskedName}@${parts[1]}`;
      } else {
        maskedInbuiltUser = 'Configured';
      }
    }

    const activeMailer = await resolveSmtpClient(c.env, db, companyId);

    return c.json({
      service_type: customRow?.service_type || 'inbuilt',
      custom: {
        host: customRow?.host || '',
        port: customRow?.port || 465,
        encryption: customRow?.encryption || 'ssl_tls',
        username: customRow?.username || '',
        has_password: Boolean(customRow?.password),
        from_email: customRow?.from_email || '',
        from_name: customRow?.from_name || '',
        reply_to: customRow?.reply_to || ''
      },
      inbuilt: {
        configured: inbuiltMailer.isConfigured(),
        host: inbuiltMailer.host,
        port: inbuiltMailer.port,
        fromEmail: inbuiltMailer.fromEmail,
        fromName: inbuiltMailer.fromName,
        user: maskedInbuiltUser
      },
      active: {
        serviceType: activeMailer.serviceType,
        host: activeMailer.host,
        port: activeMailer.port,
        configured: activeMailer.isConfigured(),
        fromEmail: activeMailer.fromEmail,
        fromName: activeMailer.fromName
      }
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/smtp-settings', authMiddleware, companyScopeMiddleware, ownerOnlyMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();

    const serviceType = body.service_type === 'custom' ? 'custom' : 'inbuilt';
    const host = (body.host || '').trim();
    const port = parseInt(body.port, 10) || 465;
    const encryption = body.encryption === 'starttls' ? 'starttls' : 'ssl_tls';
    const username = (body.username || '').trim();
    const fromEmail = (body.from_email || username).trim();
    const fromName = (body.from_name || '').trim();
    const replyTo = (body.reply_to || fromEmail).trim();
    const newPassword = body.password ? String(body.password).trim() : null;

    const existing = await db.prepare(
      `SELECT * FROM company_smtp_settings WHERE company_id = ?`
    ).bind(companyId).first();

    const passwordToSave = newPassword !== null ? newPassword : (existing?.password || '');

    if (existing) {
      await db.prepare(`
        UPDATE company_smtp_settings
        SET service_type = ?, host = ?, port = ?, encryption = ?, username = ?, password = ?, from_email = ?, from_name = ?, reply_to = ?, updated_at = datetime('now')
        WHERE company_id = ?
      `).bind(serviceType, host, port, encryption, username, passwordToSave, fromEmail, fromName, replyTo, companyId).run();
    } else {
      await db.prepare(`
        INSERT INTO company_smtp_settings (company_id, service_type, host, port, encryption, username, password, from_email, from_name, reply_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(companyId, serviceType, host, port, encryption, username, passwordToSave, fromEmail, fromName, replyTo).run();
    }

    return c.json({
      success: true,
      message: serviceType === 'custom' ? 'Custom SMTP configuration saved successfully' : 'Switched to HisabKhata Inbuilt SMTP Service'
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/smtp-settings/test', authMiddleware, companyScopeMiddleware, async (c) => {
  let targetEmail = '';
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json().catch(() => ({}));

    targetEmail = body.to || body.email;
    if (!targetEmail) {
      const userId = c.get('userId');
      const user = await db.prepare(`SELECT email FROM users WHERE id = ?`).bind(userId).first();
      targetEmail = user?.email;
    }

    if (!targetEmail) {
      return c.json({ error: 'Recipient email address is required' }, 400);
    }

    let mailer;
    if (body.service_type === 'custom' || body.testCustom) {
      let pass = body.password ? String(body.password).trim() : '';
      if (!pass) {
        const saved = await db.prepare(`SELECT password FROM company_smtp_settings WHERE company_id = ?`).bind(companyId).first();
        pass = saved?.password || '';
      }
      mailer = new SmtpClient({
        host: body.host || 'smtp.gmail.com',
        port: parseInt(body.port, 10) || 465,
        user: (body.username || '').trim(),
        pass,
        fromEmail: (body.from_email || body.username || '').trim(),
        fromName: (body.from_name || 'HisabKhata POS').trim(),
        replyTo: (body.reply_to || body.from_email || body.username || '').trim(),
        encryption: body.encryption || 'ssl_tls',
        serviceType: 'custom'
      });
    } else if (body.service_type === 'inbuilt') {
      mailer = createSmtpClient(c.env);
    } else {
      mailer = await resolveSmtpClient(c.env, db, companyId);
    }

    if (!mailer.isConfigured()) {
      return c.json({ error: 'SMTP client is not configured with valid credentials' }, 400);
    }

    const fromAddress = (body.from_email || mailer.fromEmail || mailer.user || '').trim();
    const { subject, html, text } = buildTestVerificationEmail({
      host: `${mailer.host}:${mailer.port}`,
      sender: fromAddress
    });

    await mailer.sendMail({
      to: targetEmail,
      subject,
      html,
      text,
      from: fromAddress,
      fromName: mailer.fromName,
      replyTo: mailer.replyTo
    });

    console.log(`[HisabKhata POS] ✉️ Test mail sent to: ${targetEmail} | Status: Success | Gateway: ${mailer.serviceType}`);

    return c.json({
      success: true,
      serviceType: mailer.serviceType,
      message: `Test email dispatched successfully to ${targetEmail} via ${mailer.serviceType === 'custom' ? `Custom SMTP (${mailer.host})` : 'HisabKhata Inbuilt SMTP'}`
    });
  } catch (err) {
    console.error(`[HisabKhata POS] ✉️ Test mail sent to: ${targetEmail || 'unknown'} | Status: Fail (${err.message})`);
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/mail/send', authMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId') || c.req.header('X-Company-ID');
    const mailer = await resolveSmtpClient(c.env, c.env.DB, companyId);
    if (!mailer.isConfigured()) {
      return c.json({ error: 'SMTP is not configured. Please configure SMTP in Settings > SMTP Configurations.' }, 400);
    }

    const body = await c.req.json();
    let { to, subject, text, html, template, data, from, fromName, replyTo } = body;

    if (template === 'invoice' && data) {
      const rendered = buildInvoiceReceiptEmail(data);
      subject = subject || rendered.subject;
      html = html || rendered.html;
      text = text || rendered.text;
    } else if (template === 'welcome' && data) {
      const rendered = buildWelcomeEmail(data);
      subject = subject || rendered.subject;
      html = html || rendered.html;
      text = text || rendered.text;
    } else if (template === 'staff_invitation' && data) {
      const rendered = buildStaffInvitationEmail(data);
      subject = subject || rendered.subject;
      html = html || rendered.html;
      text = text || rendered.text;
    }

    if (!to || !subject) {
      return c.json({ error: 'Recipient (to) and subject are required' }, 400);
    }

    const res = await mailer.sendMail({ to, subject, text, html, from, fromName, replyTo });
    return c.json({ success: true, message: 'Email sent successfully', messageId: res.messageId });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/mail/test', authMiddleware, async (c) => {
  let targetEmail = '';
  try {
    const companyId = c.get('companyId') || c.req.header('X-Company-ID');
    const mailer = await resolveSmtpClient(c.env, c.env.DB, companyId);
    if (!mailer.isConfigured()) {
      return c.json({
        error: 'SMTP is not configured yet. Add credentials in Settings > SMTP Configurations.'
      }, 400);
    }

    const body = await c.req.json().catch(() => ({}));
    targetEmail = body.email || body.to;
    if (!targetEmail) {
      const userId = c.get('userId');
      const user = await c.env.DB.prepare(`SELECT email FROM users WHERE id = ?`).bind(userId).first();
      targetEmail = user?.email;
    }

    if (!targetEmail) {
      return c.json({ error: 'Recipient email address is required' }, 400);
    }

    const fromAddress = (body.from || body.fromEmail || mailer.fromEmail || mailer.user || '').trim();

    const { subject, html, text } = buildTestVerificationEmail({
      host: `${mailer.host}:${mailer.port}`,
      sender: fromAddress
    });

    await mailer.sendMail({
      to: targetEmail,
      subject,
      html,
      text,
      from: fromAddress
    });

    console.log(`[HisabKhata POS] ✉️ Mail sent to: ${targetEmail} | Status: Success`);

    return c.json({
      success: true,
      message: `Test email dispatched successfully to ${targetEmail} from ${fromAddress}`
    });
  } catch (err) {
    console.error(`[HisabKhata POS] ✉️ Mail sent to: ${targetEmail || 'unknown'} | Status: Fail (${err.message})`);
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// DASHBOARD
// =============================================================================
app.get('/api/dashboard', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');

    const [
      salesResult,
      purchaseResult,
      receivablesResult,
      payablesResult,
      inventoryResult,
      lowStockResult,
      expensesResult,
      expiringResult,
      recentInvoices,
      dailySalesResult,
      dailyPurchasesResult,
      dailyExpensesResult
    ] = await db.batch([
      db.prepare(`SELECT COALESCE(SUM(total_amount),0) as value FROM invoices WHERE type='SALES' AND company_id = ?`).bind(companyId),
      db.prepare(`SELECT COALESCE(SUM(total_amount),0) as value FROM invoices WHERE type='PURCHASE' AND company_id = ?`).bind(companyId),
      db.prepare(`SELECT COALESCE(SUM(current_balance),0) as value FROM parties WHERE type='CUSTOMER' AND current_balance > 0 AND company_id = ?`).bind(companyId),
      db.prepare(`SELECT COALESCE(SUM(ABS(current_balance)),0) as value FROM parties WHERE type='VENDOR' AND current_balance < 0 AND company_id = ?`).bind(companyId),
      db.prepare(`SELECT COALESCE(SUM(current_stock * purchase_price),0) as value FROM items WHERE company_id = ?`).bind(companyId),
      db.prepare(`SELECT COUNT(*) as count FROM items WHERE (current_stock <= low_stock_alert OR current_stock <= 0) AND company_id = ?`).bind(companyId),
      db.prepare(`SELECT COALESCE(SUM(amount),0) as value FROM expenses WHERE company_id = ?`).bind(companyId),
      db.prepare(`
        SELECT (
          (SELECT COUNT(*) FROM items WHERE expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date <= date('now', '+30 days') AND company_id = ?) +
          (SELECT COUNT(*) FROM item_batches WHERE expiry_date IS NOT NULL AND expiry_date != '' AND expiry_date <= date('now', '+30 days') AND quantity > 0 AND company_id = ?)
        ) as count
      `).bind(companyId, companyId),
      db.prepare(`
        SELECT i.id, i.type, i.invoice_number, i.date, i.total_amount, i.balance_due, p.name as party_name
        FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
        WHERE i.company_id = ?
        ORDER BY i.created_at DESC LIMIT 5
      `).bind(companyId),
      db.prepare(`
        SELECT CAST(strftime('%d', date) AS INTEGER) as day, COALESCE(SUM(total_amount), 0) as sales, COALESCE(SUM(amount_paid), 0) as received, COUNT(*) as count
        FROM invoices
        WHERE type='SALES' AND company_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY day
      `).bind(companyId),
      db.prepare(`
        SELECT CAST(strftime('%d', date) AS INTEGER) as day, COALESCE(SUM(total_amount), 0) as purchases, COALESCE(SUM(amount_paid), 0) as paid
        FROM invoices
        WHERE type='PURCHASE' AND company_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY day
      `).bind(companyId),
      db.prepare(`
        SELECT CAST(strftime('%d', date) AS INTEGER) as day, COALESCE(SUM(amount), 0) as expenses
        FROM expenses
        WHERE company_id = ? AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
        GROUP BY day
      `).bind(companyId),
    ]);

    return c.json({
      totalSales: salesResult.results[0].value,
      totalPurchases: purchaseResult.results[0].value,
      totalReceivables: receivablesResult.results[0].value,
      totalPayables: payablesResult.results[0].value,
      inventoryValue: inventoryResult.results[0].value,
      lowStockCount: lowStockResult.results[0].count,
      totalExpenses: expensesResult.results[0].value,
      expiringCount: expiringResult.results[0].count,
      recentInvoices: recentInvoices.results,
      dailySales: dailySalesResult.results || [],
      dailyPurchases: dailyPurchasesResult.results || [],
      dailyExpenses: dailyExpensesResult.results || []
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// ITEMS (Inventory CRUD)
// =============================================================================
app.get('/api/items', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const search = c.req.query('search') || '';
    const lowStock = c.req.query('lowStock') === 'true';

    let query = `
      SELECT i.*, c.name as category_name
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE i.company_id = ?
    `;
    const params = [companyId];

    if (search) {
      query += ` AND (i.name LIKE ? OR i.barcode LIKE ? OR i.rack LIKE ? OR i.shelf LIKE ? OR i.aisle LIKE ? OR i.rack_location LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (lowStock) {
      query += ` AND i.current_stock <= i.low_stock_alert`;
    }
    query += ` ORDER BY i.id DESC`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/items', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { name, category_id, sub_category_id, sub_category, unit = 'Pcs', barcode, sale_price, purchase_price, tax_rate = 18,
      opening_stock = 0, low_stock_alert = 5, description, batch_number, expiry_date, image_url,
      wholesale_price = 0, mrp = 0, hsn_code, brand, aisle, rack, shelf, rack_location } = body;

    if (!name) return c.json({ error: 'Item name is required' }, 400);

    const locParts = [aisle ? `Aisle ${aisle}` : null, rack ? `Rack ${rack}` : null, shelf ? `Shelf ${shelf}` : null].filter(Boolean);
    const resolvedLocation = rack_location || (locParts.length > 0 ? locParts.join(' • ') : null);

    const result = await c.env.DB.prepare(`
      INSERT INTO items (company_id, category_id, sub_category_id, sub_category, name, unit, barcode, sale_price, purchase_price, tax_rate,
                         opening_stock, current_stock, low_stock_alert, description, batch_number, expiry_date, image_url,
                         wholesale_price, mrp, hsn_code, brand, aisle, rack, shelf, rack_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(companyId, category_id || null, sub_category_id || null, sub_category || null, name, unit, barcode || null, sale_price || 0, purchase_price || 0,
      tax_rate, opening_stock, opening_stock, low_stock_alert, description || null, batch_number || null, expiry_date || null, image_url || null,
      wholesale_price || 0, mrp || 0, hsn_code || null, brand || null,
      aisle || null, rack || null, shelf || null, resolvedLocation || null)
      .run();

    return c.json({ id: result.meta.last_row_id, ...body, rack_location: resolvedLocation }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/items/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, category_id, sub_category_id, sub_category, unit, barcode, sale_price, purchase_price, tax_rate,
      current_stock, low_stock_alert, description, batch_number, expiry_date, image_url,
      wholesale_price = 0, mrp = 0, hsn_code, brand, aisle, rack, shelf, rack_location } = body;

    const existing = await c.env.DB.prepare(`SELECT image_url FROM items WHERE id=? AND company_id=?`).bind(id, companyId).first();

    const locParts = [aisle ? `Aisle ${aisle}` : null, rack ? `Rack ${rack}` : null, shelf ? `Shelf ${shelf}` : null].filter(Boolean);
    const resolvedLocation = rack_location !== undefined ? (rack_location || null) : (locParts.length > 0 ? locParts.join(' • ') : null);

    const result = await c.env.DB.prepare(`
      UPDATE items SET
        category_id=?, sub_category_id=?, sub_category=?, name=?, unit=?, barcode=?, sale_price=?, purchase_price=?,
        tax_rate=?, current_stock=?, low_stock_alert=?, description=?,
        batch_number=?, expiry_date=?, image_url=?, wholesale_price=?, mrp=?, hsn_code=?, brand=?,
        aisle=?, rack=?, shelf=?, rack_location=?, updated_at=datetime('now')
      WHERE id=? AND company_id=?
    `).bind(category_id || null, sub_category_id || null, sub_category || null, name, unit, barcode || null, sale_price, purchase_price,
      tax_rate, current_stock, low_stock_alert, description || null, batch_number || null, expiry_date || null, image_url || null,
      wholesale_price || 0, mrp || 0, hsn_code || null, brand || null,
      aisle !== undefined ? (aisle || null) : null,
      rack !== undefined ? (rack || null) : null,
      shelf !== undefined ? (shelf || null) : null,
      resolvedLocation,
      id, companyId)
      .run();

    if (result.meta.changes === 0) return c.json({ error: 'Item not found' }, 404);

    if (existing?.image_url && image_url !== undefined && existing.image_url !== (image_url || null) && c.env.MY_POS_BUCKET) {
      const inUse = await c.env.DB.prepare(`SELECT 1 FROM items WHERE image_url=? AND id!=? LIMIT 1`).bind(existing.image_url, id).first();
      if (!inUse) {
        await deleteR2Object(c.env.MY_POS_BUCKET, existing.image_url);
      }
    }

    return c.json({ id: parseInt(id), ...body, rack_location: resolvedLocation });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/items/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare(`SELECT image_url FROM items WHERE id=? AND company_id=?`).bind(id, companyId).first();
    const result = await c.env.DB.prepare(`DELETE FROM items WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Item not found' }, 404);

    if (existing?.image_url && c.env.MY_POS_BUCKET) {
      const inUse = await c.env.DB.prepare(`SELECT 1 FROM items WHERE image_url=? AND id!=? LIMIT 1`).bind(existing.image_url, id).first();
      if (!inUse) {
        await deleteR2Object(c.env.MY_POS_BUCKET, existing.image_url);
      }
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// CATEGORIES (CRUD)
// =============================================================================
app.get('/api/categories', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { results } = await db.prepare(`SELECT * FROM categories WHERE company_id = ? ORDER BY name ASC`).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/categories', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { name, description } = body;
    if (!name?.trim()) return c.json({ error: 'Category name is required' }, 400);

    const result = await db.prepare(
      `INSERT INTO categories (company_id, name, description) VALUES (?, ?, ?)`
    ).bind(companyId, name.trim(), description || '').run();

    const id = result.meta.last_row_id;
    return c.json({ id, name: name.trim(), description }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// BRANDS (CRUD)
// =============================================================================
app.get('/api/brands', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { results } = await db.prepare(`
      SELECT b.*, (SELECT COUNT(i.id) FROM items i WHERE (i.brand = b.name OR i.brand = CAST(b.id AS TEXT)) AND i.company_id = b.company_id) as item_count
      FROM brands b
      WHERE b.company_id = ?
      ORDER BY b.name ASC
    `).bind(companyId).all();
    return c.json(results || []);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/brands', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { name, description } = body;
    if (!name?.trim()) return c.json({ error: 'Brand name is required' }, 400);

    const result = await db.prepare(
      `INSERT INTO brands (company_id, name, description) VALUES (?, ?, ?)`
    ).bind(companyId, name.trim(), description || '').run();

    return c.json({ id: result.meta.last_row_id, name: name.trim(), description: description || '' }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/brands/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    await db.prepare(`DELETE FROM brands WHERE id = ? AND company_id = ?`).bind(id, companyId).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// SUB-CATEGORIES (CRUD)
// =============================================================================
app.get('/api/sub-categories', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const categoryId = c.req.query('category_id');
    let query = `
      SELECT sc.*, c.name as category_name,
        (SELECT COUNT(i.id) FROM items i WHERE (i.sub_category_id = sc.id OR (i.sub_category = sc.name AND i.category_id = sc.category_id)) AND i.company_id = sc.company_id) as item_count
      FROM sub_categories sc
      LEFT JOIN categories c ON sc.category_id = c.id
      WHERE sc.company_id = ?
    `;
    const params = [companyId];
    if (categoryId) {
      query += ` AND sc.category_id = ?`;
      params.push(categoryId);
    }
    query += ` ORDER BY sc.name ASC`;
    const { results } = await db.prepare(query).bind(...params).all();
    return c.json(results || []);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/sub-categories', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { category_id, name, description } = body;
    if (!category_id) return c.json({ error: 'Parent category is required' }, 400);
    if (!name?.trim()) return c.json({ error: 'Sub-category name is required' }, 400);

    const result = await db.prepare(
      `INSERT INTO sub_categories (company_id, category_id, name, description) VALUES (?, ?, ?, ?)`
    ).bind(companyId, Number(category_id), name.trim(), description || '').run();

    return c.json({ id: result.meta.last_row_id, category_id: Number(category_id), name: name.trim(), description: description || '' }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/sub-categories/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    await db.prepare(`DELETE FROM sub_categories WHERE id = ? AND company_id = ?`).bind(id, companyId).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// UNITS (CRUD)
// =============================================================================
app.get('/api/units', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    let { results } = await db.prepare(`SELECT * FROM units WHERE company_id = ? ORDER BY name ASC`).bind(companyId).all();

    if (!results || results.length === 0) {
      const defaultUnits = [
        { name: 'PIECES', short_name: 'PCS' },
        { name: 'BOX', short_name: 'BOX' },
        { name: 'PACKET', short_name: 'PKT' },
        { name: 'SET', short_name: 'SET' },
        { name: 'KILOGRAM', short_name: 'KG' },
        { name: 'GRAM', short_name: 'GM' },
        { name: 'METER', short_name: 'MTR' },
        { name: 'LITER', short_name: 'LTR' },
        { name: 'DOZEN', short_name: 'DOZ' },
        { name: 'ROLL', short_name: 'ROL' }
      ];
      for (const u of defaultUnits) {
        await db.prepare(`INSERT INTO units (company_id, name, short_name) VALUES (?, ?, ?)`).bind(companyId, u.name, u.short_name).run();
      }
      const refreshed = await db.prepare(`SELECT * FROM units WHERE company_id = ? ORDER BY name ASC`).bind(companyId).all();
      results = refreshed.results || [];
    }

    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/units', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { name, short_name } = body;
    if (!name?.trim()) return c.json({ error: 'Unit name is required' }, 400);
    if (!short_name?.trim()) return c.json({ error: 'Short name is required' }, 400);

    const result = await db.prepare(
      `INSERT INTO units (company_id, name, short_name) VALUES (?, ?, ?)`
    ).bind(companyId, name.trim().toUpperCase(), short_name.trim().toUpperCase()).run();

    const id = result.meta.last_row_id;
    return c.json({ id, name: name.trim().toUpperCase(), short_name: short_name.trim().toUpperCase() }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/units/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await db.prepare(`DELETE FROM units WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Unit not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// UNIT CONVERSIONS
app.get('/api/unit-conversions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { results } = await db.prepare(`
      SELECT uc.id, uc.rate,
             fu.name AS from_unit_name, fu.short_name AS from_unit_short,
             tu.name AS to_unit_name,   tu.short_name AS to_unit_short
      FROM unit_conversions uc
      JOIN units fu ON uc.from_unit_id = fu.id
      JOIN units tu ON uc.to_unit_id   = tu.id
      WHERE uc.company_id = ?
      ORDER BY uc.id DESC
    `).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/unit-conversions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { from_unit_id, to_unit_id, rate } = body;
    if (!from_unit_id || !to_unit_id || !rate) return c.json({ error: 'from_unit_id, to_unit_id and rate are required' }, 400);

    const result = await db.prepare(
      `INSERT INTO unit_conversions (company_id, from_unit_id, to_unit_id, rate) VALUES (?, ?, ?, ?)`
    ).bind(companyId, from_unit_id, to_unit_id, rate).run();

    const id = result.meta.last_row_id;
    return c.json({ id, from_unit_id, to_unit_id, rate }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/unit-conversions/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await db.prepare(`DELETE FROM unit_conversions WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Conversion not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ================================================================================================
// PARTIES (Customers & Vendors CRUD)
// =============================================================================
app.get('/api/parties', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const type = c.req.query('type');
    const search = (c.req.query('search') || '').trim();

    let query = `SELECT * FROM parties WHERE company_id = ?`;
    const params = [companyId];

    if (type && type !== 'undefined' && type !== 'ALL') {
      query += ` AND type=?`;
      params.push(type.toUpperCase());
    }
    if (search && search !== 'undefined') {
      query += ` AND (name LIKE ? OR phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY name ASC`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/parties', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { type, name, phone, gst_number, address, email, opening_balance = 0 } = body;

    if (!type || !name) return c.json({ error: 'Type and name are required' }, 400);
    if (!['CUSTOMER', 'VENDOR'].includes(type.toUpperCase()))
      return c.json({ error: 'Type must be CUSTOMER or VENDOR' }, 400);

    const result = await c.env.DB.prepare(`
      INSERT INTO parties (company_id, type, name, phone, gst_number, address, email, opening_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(companyId, type.toUpperCase(), name, phone || null, gst_number || null,
      address || null, email || null, opening_balance, opening_balance)
      .run();

    return c.json({ id: result.meta.last_row_id, ...body }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/parties/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, phone, gst_number, address, email, current_balance } = body;

    const result = await c.env.DB.prepare(`
      UPDATE parties SET
        name=?, phone=?, gst_number=?, address=?, email=?,
        current_balance=?, updated_at=datetime('now')
      WHERE id=? AND company_id=?
    `).bind(name, phone || null, gst_number || null, address || null,
      email || null, current_balance, id, companyId)
      .run();

    if (result.meta.changes === 0) return c.json({ error: 'Party not found' }, 404);
    return c.json({ id: parseInt(id), ...body });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/parties/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`DELETE FROM parties WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Party not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// INVOICES
// =============================================================================
app.get('/api/invoices', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const type = c.req.query('type');
    const partyId = c.req.query('party_id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, p.name as party_name, p.gst_number as party_gst, p.phone as party_phone, p.email as party_email
      FROM invoices i
      LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.company_id = ?
    `;
    const params = [companyId];
    if (type) {
      query += ` AND i.type = ?`;
      params.push(type.toUpperCase());
    }
    if (partyId) {
      query += ` AND i.party_id = ?`;
      params.push(partyId);
    }
    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/public/invoices/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');

    let invoiceRow = await c.env.DB.prepare(`
      SELECT i.*, p.name as party_name, p.phone as party_phone,
             p.gst_number as party_gst, p.address as party_address, p.email as party_email
      FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.invoice_number = ?
    `).bind(slug).first();

    if (!invoiceRow) {
      invoiceRow = await c.env.DB.prepare(`
        SELECT i.*, p.name as party_name, p.phone as party_phone,
               p.gst_number as party_gst, p.address as party_address, p.email as party_email
        FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
        WHERE i.id = ?
      `).bind(slug).first();
    }

    if (!invoiceRow) return c.json({ error: 'Invoice not found' }, 404);

    const { results: items } = await c.env.DB.prepare(`
      SELECT ii.*, it.name as item_name_ref, it.mrp as item_mrp
      FROM invoice_items ii
      LEFT JOIN items it ON ii.item_id = it.id
      WHERE ii.invoice_id = ?
    `).bind(invoiceRow.id).all();

    const company = await c.env.DB.prepare(`SELECT * FROM companies WHERE id = ?`).bind(invoiceRow.company_id).first();

    const isGstRegistered = Boolean(company?.gst_number && String(company.gst_number).trim().length > 0);
    let sanitizedInvoice = { ...invoiceRow };
    let sanitizedItems = (items || []).map(it => ({ ...it }));
    if (!isGstRegistered) {
      sanitizedInvoice.subtotal = sanitizedInvoice.total_amount;
      sanitizedInvoice.tax_amount = 0;
      sanitizedItems = sanitizedItems.map(it => {
        const correctedRate = it.quantity > 0 ? (Number(it.total) / Number(it.quantity)) : Number(it.rate);
        return { ...it, rate: correctedRate, tax_rate: 0 };
      });
    }

    return c.json({
      ...sanitizedInvoice,
      items: sanitizedItems,
      company: company || null
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/invoices/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const [invoice, items] = await c.env.DB.batch([
      c.env.DB.prepare(`
        SELECT i.*, p.name as party_name, p.phone as party_phone,
               p.gst_number as party_gst, p.address as party_address, p.email as party_email
        FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
        WHERE i.id = ? AND i.company_id = ?
      `).bind(id, companyId),
      c.env.DB.prepare(`
        SELECT ii.*, it.name as item_name_ref, it.mrp as item_mrp
        FROM invoice_items ii
        LEFT JOIN items it ON ii.item_id = it.id
        WHERE ii.invoice_id = ?
      `).bind(id),
    ]);

    if (!invoice.results.length) return c.json({ error: 'Invoice not found' }, 404);

    const invRow = invoice.results[0];
    const company = await c.env.DB.prepare(`SELECT gst_number FROM companies WHERE id = ?`).bind(invRow.company_id).first();
    const isGstRegistered = Boolean(company?.gst_number && String(company.gst_number).trim().length > 0);
    let sanitizedInvoice = { ...invRow };
    let sanitizedItems = (items.results || []).map(it => ({ ...it }));
    if (!isGstRegistered) {
      sanitizedInvoice.subtotal = sanitizedInvoice.total_amount;
      sanitizedInvoice.tax_amount = 0;
      sanitizedItems = sanitizedItems.map(it => {
        const correctedRate = it.quantity > 0 ? (Number(it.total) / Number(it.quantity)) : Number(it.rate);
        return { ...it, rate: correctedRate, tax_rate: 0 };
      });
    }
    return c.json({ ...sanitizedInvoice, items: sanitizedItems });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

async function ensureDefaultFundAccounts(db, companyId) {
  try {
    await db.prepare(`
      DELETE FROM fund_accounts
      WHERE company_id = ?
        AND opening_balance = 0
        AND current_balance = 0
        AND id NOT IN (
          SELECT MIN(id) FROM fund_accounts WHERE company_id = ? GROUP BY lower(trim(name))
        )
        AND id NOT IN (
          SELECT DISTINCT account_id FROM fund_transactions WHERE company_id = ?
        )
    `).bind(companyId, companyId, companyId).run();
  } catch (e) { }

  let { results } = await db.prepare(`SELECT * FROM fund_accounts WHERE company_id = ? ORDER BY created_at ASC`).bind(companyId).all();
  const list = results || [];
  const hasCash = list.some(a => a.type === 'CASH' || (a.name && a.name.toLowerCase().includes('cash')));
  const hasBank = list.some(a => a.type === 'BANK' || a.type === 'UPI' || (a.name && a.name.toLowerCase().includes('bank')));

  if (!hasCash || !hasBank) {
    const stmts = [];
    if (!hasCash) {
      stmts.push(
        db.prepare(`
          INSERT INTO fund_accounts (company_id, name, type, opening_balance, current_balance)
          SELECT ?, 'Cash in Hand', 'CASH', 0, 0
          WHERE NOT EXISTS (
            SELECT 1 FROM fund_accounts
            WHERE company_id = ? AND (type = 'CASH' OR lower(trim(name)) = 'cash in hand')
          )
        `).bind(companyId, companyId)
      );
    }
    if (!hasBank) {
      stmts.push(
        db.prepare(`
          INSERT INTO fund_accounts (company_id, name, type, opening_balance, current_balance)
          SELECT ?, 'Bank / UPI Account', 'BANK', 0, 0
          WHERE NOT EXISTS (
            SELECT 1 FROM fund_accounts
            WHERE company_id = ? AND (type = 'BANK' OR type = 'UPI' OR lower(trim(name)) = 'bank / upi account')
          )
        `).bind(companyId, companyId)
      );
    }
    if (stmts.length > 0) {
      await db.batch(stmts);
    }
    const refreshed = await db.prepare(`SELECT * FROM fund_accounts WHERE company_id = ? ORDER BY created_at ASC`).bind(companyId).all();
    results = refreshed.results || [];
  }
  return results || [];
}

async function syncUnlinkedInvoicesToFunds(db, companyId) {
  const defaultAccounts = await ensureDefaultFundAccounts(db, companyId);
  const cashAccount = defaultAccounts.find(a => a.type === 'CASH') || defaultAccounts[0];
  const bankAccount = defaultAccounts.find(a => a.type === 'BANK' || a.type === 'UPI') || cashAccount;
  if (!cashAccount) return;

  const unlinkedInvoices = await db.prepare(`
    SELECT i.*, p.name as party_name
    FROM invoices i
    LEFT JOIN parties p ON i.party_id = p.id
    WHERE i.company_id = ? 
      AND i.amount_paid > 0
      AND i.type != 'QUOTATION'
      AND i.id NOT IN (
        SELECT ref_id FROM fund_transactions 
        WHERE company_id = ? AND ref_type = 'INVOICE' AND ref_id IS NOT NULL
      )
    ORDER BY i.date ASC, i.created_at ASC
  `).bind(companyId, companyId).all();

  if (unlinkedInvoices.results && unlinkedInvoices.results.length > 0) {
    const stmts = [];
    let cashDelta = 0;
    let bankDelta = 0;

    for (const inv of unlinkedInvoices.results) {
      const isSales = inv.type === 'SALES';
      const isCash = (inv.payment_mode || 'CASH').toUpperCase() === 'CASH';
      const targetAcc = isCash ? cashAccount : bankAccount;
      const direction = isSales ? 'IN' : 'OUT';
      const amt = Number(inv.amount_paid);
      const partyLabel = inv.party_name ? ` (${inv.party_name})` : '';
      const desc = isSales
        ? `Sales Receipt: ${inv.invoice_number}${partyLabel}`
        : `Purchase Payment: ${inv.invoice_number}${partyLabel}`;

      stmts.push(
        db.prepare(`
          INSERT INTO fund_transactions (company_id, account_id, amount, direction, ref_type, ref_id, date, description)
          VALUES (?, ?, ?, ?, 'INVOICE', ?, ?, ?)
        `).bind(companyId, targetAcc.id, amt, direction, inv.id, inv.date || inv.created_at?.slice(0, 10), desc)
      );

      const balChange = direction === 'IN' ? amt : -amt;
      if (targetAcc.id === cashAccount.id) {
        cashDelta += balChange;
      } else {
        bankDelta += balChange;
      }
    }

    if (cashDelta !== 0) {
      stmts.push(
        db.prepare(`UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?`).bind(cashDelta, cashAccount.id, companyId)
      );
    }
    if (bankDelta !== 0 && bankAccount.id !== cashAccount.id) {
      stmts.push(
        db.prepare(`UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?`).bind(bankDelta, bankAccount.id, companyId)
      );
    }

    if (stmts.length > 0) {
      await db.batch(stmts);
    }
  }
}

app.post('/api/invoices', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const {
      type,
      invoice_number,
      date,
      party_id,
      items,
      amount_paid = 0,
      payment_mode = 'CASH',
      notes,
    } = body;

    if (!type || !invoice_number || !items?.length)
      return c.json({ error: 'type, invoice_number, and items[] are required' }, 400);

    const comp = await db.prepare(`SELECT gst_number FROM companies WHERE id = ?`).bind(companyId).first();
    const isGstRegistered = Boolean(comp?.gst_number && comp.gst_number.trim().length > 0);

    const tax_amount = isGstRegistered
      ? (body.tax_amount !== undefined ? Number(body.tax_amount) : items.reduce((s, it) => s + (it.quantity * it.rate * (it.tax_rate || 0) / 100), 0))
      : 0;
    const total_amount = isGstRegistered
      ? (body.total_amount !== undefined ? Number(body.total_amount) : (items.reduce((s, it) => s + (it.quantity * it.rate), 0) + tax_amount))
      : (body.total_amount !== undefined ? Number(body.total_amount) : (body.discount_amount !== undefined ? Math.max(0, items.reduce((s, it) => s + (it.quantity * it.rate), 0) - Number(body.discount_amount)) : items.reduce((s, it) => s + (it.quantity * it.rate), 0)));
    const subtotal = isGstRegistered
      ? (body.subtotal !== undefined ? Number(body.subtotal) : items.reduce((s, it) => s + (it.quantity * it.rate), 0))
      : total_amount;
    const balance_due = Math.max(0, total_amount - Number(amount_paid));

    const invRes = await db.prepare(`
      INSERT INTO invoices (company_id, type, invoice_number, date, party_id, subtotal, tax_amount, total_amount, amount_paid, payment_mode, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      companyId,
      type.toUpperCase(),
      invoice_number,
      date || new Date().toISOString().slice(0, 10),
      party_id || null,
      subtotal,
      tax_amount,
      total_amount,
      Number(amount_paid),
      payment_mode || 'CASH',
      notes || null
    ).run();

    const invoiceId = invRes.meta?.last_row_id;
    if (!invoiceId) {
      throw new Error('Failed to generate invoice ID from database');
    }

    const itemIds = items.map(it => it.item_id).filter(Boolean);
    const itemDbMap = {};
    if (itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      const dbItems = await db.prepare(`SELECT id, mrp, sale_price FROM items WHERE id IN (${placeholders}) AND company_id = ?`).bind(...itemIds, companyId).all();
      if (dbItems?.results) {
        for (const di of dbItems.results) {
          itemDbMap[di.id] = di;
        }
      }
    }

    const stmts = [];

    for (const item of items) {
      const dbInfo = item.item_id ? itemDbMap[item.item_id] : null;
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const taxRate = Number(item.tax_rate) || 0;
      const grossUnit = rate * (1 + taxRate / 100);
      const effectiveMrp = (item.mrp !== undefined && item.mrp !== null && Number(item.mrp) > 0)
        ? Number(item.mrp)
        : ((dbInfo && Number(dbInfo.mrp) > 0)
          ? Number(dbInfo.mrp)
          : ((dbInfo && Number(dbInfo.sale_price) > 0)
            ? Number(dbInfo.sale_price)
            : (grossUnit > 0 ? grossUnit : rate)));
      item.mrp = effectiveMrp;

      stmts.push(
        db.prepare(`
          INSERT INTO invoice_items (invoice_id, item_id, item_name, unit, quantity, rate, tax_rate, mrp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          invoiceId,
          item.item_id || null,
          item.item_name,
          item.unit || 'Pcs',
          item.quantity,
          item.rate,
          isGstRegistered ? (item.tax_rate || 0) : 0,
          effectiveMrp
        )
      );
    }

    if (type.toUpperCase() !== 'QUOTATION') {
      for (const item of items) {
        if (!item.item_id) continue;
        const stockDelta = type.toUpperCase() === 'PURCHASE' ? item.quantity : -item.quantity;
        stmts.push(
          db.prepare(`
            UPDATE items SET current_stock = current_stock + ?, updated_at=datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(stockDelta, item.item_id, companyId)
        );
      }
    }

    if (party_id && balance_due !== 0 && type.toUpperCase() !== 'QUOTATION') {
      const balanceDelta = type.toUpperCase() === 'SALES' ? balance_due : -balance_due;
      stmts.push(
        db.prepare(`
          UPDATE parties SET current_balance = current_balance + ?, updated_at=datetime('now')
          WHERE id = ? AND company_id = ?
        `).bind(balanceDelta, party_id, companyId)
      );
    }

    if (Number(amount_paid) > 0 && type.toUpperCase() !== 'QUOTATION') {
      const defaultAccounts = await ensureDefaultFundAccounts(db, companyId);
      const isCash = (payment_mode || 'CASH').toUpperCase() === 'CASH';
      const targetAcc = isCash
        ? (defaultAccounts.find(a => a.type === 'CASH') || defaultAccounts[0])
        : (defaultAccounts.find(a => a.type === 'BANK' || a.type === 'UPI') || defaultAccounts[0]);

      if (targetAcc) {
        const isSales = type.toUpperCase() === 'SALES';
        const direction = isSales ? 'IN' : 'OUT';
        const fundDelta = isSales ? Number(amount_paid) : -Number(amount_paid);
        const partyRow = party_id ? await db.prepare(`SELECT name FROM parties WHERE id = ? AND company_id = ?`).bind(party_id, companyId).first() : null;
        const partyLabel = partyRow?.name ? ` (${partyRow.name})` : '';
        const fundDesc = isSales ? `Sales Receipt: ${invoice_number}${partyLabel}` : `Purchase Payment: ${invoice_number}${partyLabel}`;

        stmts.push(
          db.prepare(`
            INSERT INTO fund_transactions (company_id, account_id, amount, direction, ref_type, ref_id, date, description)
            VALUES (?, ?, ?, ?, 'INVOICE', ?, ?, ?)
          `).bind(companyId, targetAcc.id, Number(amount_paid), direction, invoiceId, date || new Date().toISOString().slice(0, 10), fundDesc)
        );
        stmts.push(
          db.prepare(`
            UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?
          `).bind(fundDelta, targetAcc.id, companyId)
        );
      }
    }

    try {
      if (stmts.length > 0) {
        await db.batch(stmts);
      }
    } catch (batchErr) {
      await db.prepare(`DELETE FROM invoices WHERE id = ? AND company_id = ?`).bind(invoiceId, companyId).run().catch(() => { });
      throw batchErr;
    }

    let recipientEmail = (body.customer_email || body.email || '').trim();
    let customerName = (body.customer_name || '').trim();
    let customerPhone = (body.customer_phone || '').trim();

    if (party_id) {
      const party = await db.prepare(`SELECT name, email, phone FROM parties WHERE id = ? AND company_id = ?`).bind(party_id, companyId).first();
      if (party) {
        const isCustomer = party.type === 'CUSTOMER' || type.toUpperCase() !== 'PURCHASE' || Boolean(body.customer_email);
        if (isCustomer) {
          if (!recipientEmail && party.email) {
            recipientEmail = party.email.trim();
          }
          if (!customerName && party.name) {
            customerName = party.name.trim();
          }
          if (!customerPhone && party.phone) {
            customerPhone = party.phone.trim();
          }
          if (recipientEmail && (!party.email || !party.email.trim())) {
            await db.prepare(`UPDATE parties SET email = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`).bind(recipientEmail, party_id, companyId).run().catch(() => { });
          }
        }
      }
    }

    let emailSent = false;
    let emailError = null;

    if (recipientEmail && (type.toUpperCase() !== 'PURCHASE' || body.customer_email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      try {
        const mailer = await resolveSmtpClient(c.env, db, companyId);
        if (mailer.isConfigured()) {
          const company = await db.prepare(`SELECT name, email, phone FROM companies WHERE id = ?`).bind(companyId).first();
          const origin = c.req.header('origin') || 'https://pos.hisabkhata.sumanonline.com';
          const emailData = buildInvoiceReceiptEmail({
            companyName: company?.name || 'HisabKhata Store',
            companyEmail: company?.email || mailer.fromEmail || '',
            companyPhone: company?.phone || '',
            invoiceNumber: invoice_number,
            invoiceDate: date || new Date().toISOString().slice(0, 10),
            customerName: customerName || 'Valued Customer',
            customerPhone: customerPhone || '',
            customerEmail: recipientEmail,
            receiptUrl: `${origin}/receipt/${encodeURIComponent(invoice_number)}`,
            paymentMethod: payment_mode || 'CASH',
            items: items.map(it => {
              const qty = Number(it.quantity) || 1;
              const itemTotal = it.total !== undefined && it.total !== null ? Number(it.total) : (qty * Number(it.rate || 0));
              const effectiveRate = !isGstRegistered ? (itemTotal / qty) : Number(it.rate) || 0;
              const discount = Number(it.discount) || 0;
              const netRate = effectiveRate - discount;
              const amt = !isGstRegistered ? itemTotal.toFixed(2) : Number((qty * netRate).toFixed(2)).toFixed(2);
              const taxRate = isGstRegistered ? (Number(it.tax_rate) || 0) : 0;
              const taxAmt = !isGstRegistered ? 0 : (it.tax_amount !== undefined && it.tax_amount !== null
                ? Number(it.tax_amount)
                : Number((Number(amt) * taxRate / 100).toFixed(2)));
              const total = itemTotal.toFixed(2);
              const dbInfo = it.item_id ? itemDbMap[it.item_id] : null;
              const grossUnit = itemTotal / (qty || 1);
              const mrp = (it.mrp !== undefined && it.mrp !== null && Number(it.mrp) > 0)
                ? Number(it.mrp)
                : ((dbInfo && Number(dbInfo.mrp) > 0)
                  ? Number(dbInfo.mrp)
                  : ((dbInfo && Number(dbInfo.sale_price) > 0)
                    ? Number(dbInfo.sale_price)
                    : (grossUnit > 0 ? grossUnit : effectiveRate)));
              return {
                name: it.item_name,
                qty: qty,
                mrp: mrp.toFixed(2),
                rate: effectiveRate.toFixed(2),
                amt: amt,
                tax: taxAmt.toFixed(2),
                total: total
              };
            }),
            subtotal: isGstRegistered ? Number(subtotal).toFixed(2) : Number(total_amount).toFixed(2),
            taxTotal: isGstRegistered ? Number(tax_amount).toFixed(2) : '0.00',
            grandTotal: Number(total_amount).toFixed(2),
            paidAmount: Number(amount_paid).toFixed(2),
            balanceDue: Number(balance_due).toFixed(2),
            currency: '₹',
            isRegistered: isGstRegistered
          });

          await mailer.sendMail({
            to: recipientEmail,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            from: mailer.fromEmail,
            fromName: company?.name || mailer.fromName
          });
          emailSent = true;
        } else {
          emailError = 'SMTP is not configured';
        }
      } catch (mailErr) {
        emailError = mailErr.message || 'Failed to dispatch email';
      }
    }

    return c.json({
      success: true,
      invoice_id: invoiceId,
      invoice_number,
      total_amount,
      balance_due,
      email_sent: emailSent,
      email_error: emailError,
      recipient_email: recipientEmail || null
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/invoices/:id/send-receipt', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const invoiceId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));

    const invoice = await db.prepare(`
      SELECT i.*, p.name as party_name, p.email as party_email, p.phone as party_phone
      FROM invoices i
      LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.id = ? AND i.company_id = ?
    `).bind(invoiceId, companyId).first();

    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    const recipientEmail = (body.email || body.to || invoice.party_email || '').trim();
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return c.json({ error: 'A valid recipient email address is required' }, 400);
    }

    const mailer = await resolveSmtpClient(c.env, db, companyId);
    if (!mailer.isConfigured()) {
      return c.json({ error: 'SMTP is not configured. Please configure SMTP in Settings > SMTP Configurations.' }, 400);
    }

    const company = await db.prepare(`SELECT name, email, phone, gst_number FROM companies WHERE id = ?`).bind(companyId).first();
    const isGstReg = Boolean(company?.gst_number && String(company.gst_number).trim().length > 0);
    const itemsRes = await db.prepare(`
      SELECT ii.*, it.mrp as db_item_mrp, it.sale_price as db_sale_price
      FROM invoice_items ii
      LEFT JOIN items it ON ii.item_id = it.id
      WHERE ii.invoice_id = ?
    `).bind(invoiceId).all();
    const items = itemsRes.results || [];
    const origin = c.req.header('origin') || 'https://pos.hisabkhata.sumanonline.com';

    const emailData = buildInvoiceReceiptEmail({
      companyName: company?.name || 'HisabKhata Store',
      companyEmail: company?.email || mailer.fromEmail || '',
      companyPhone: company?.phone || '',
      invoiceNumber: invoice.invoice_number,
      invoiceDate: invoice.date,
      customerName: invoice.party_name || body.customer_name || 'Valued Customer',
      customerPhone: invoice.party_phone || '',
      customerEmail: recipientEmail,
      receiptUrl: `${origin}/receipt/${encodeURIComponent(invoice.invoice_number)}`,
      paymentMethod: invoice.payment_mode || 'CASH',
      items: items.map(it => {
        const qty = Number(it.quantity) || 1;
        const itemTotal = it.total !== undefined && it.total !== null ? Number(it.total) : (qty * Number(it.rate || 0));
        const effectiveRate = !isGstReg ? (itemTotal / qty) : Number(it.rate) || 0;
        const discount = Number(it.discount) || 0;
        const netRate = effectiveRate - discount;
        const amt = !isGstReg ? itemTotal.toFixed(2) : Number((qty * netRate).toFixed(2)).toFixed(2);
        const taxRate = isGstReg ? (Number(it.tax_rate) || 0) : 0;
        const taxAmt = !isGstReg ? 0 : (it.tax_amount !== undefined && it.tax_amount !== null
          ? Number(it.tax_amount)
          : Number((Number(amt) * taxRate / 100).toFixed(2)));
        const total = itemTotal.toFixed(2);
        const grossUnit = itemTotal / (qty || 1);
        const mrp = (it.mrp !== undefined && it.mrp !== null && Number(it.mrp) > 0)
          ? Number(it.mrp)
          : (Number(it.db_item_mrp) > 0
            ? Number(it.db_item_mrp)
            : (Number(it.db_sale_price) > 0
              ? Number(it.db_sale_price)
              : (grossUnit > 0 ? grossUnit : effectiveRate)));
        return {
          name: it.item_name,
          qty: qty,
          mrp: mrp.toFixed(2),
          rate: effectiveRate.toFixed(2),
          amt: amt,
          tax: taxAmt.toFixed(2),
          total: total
        };
      }),
      subtotal: isGstReg ? Number(invoice.subtotal).toFixed(2) : Number(invoice.total_amount).toFixed(2),
      taxTotal: isGstReg ? Number(invoice.tax_amount).toFixed(2) : '0.00',
      grandTotal: Number(invoice.total_amount).toFixed(2),
      paidAmount: Number(invoice.amount_paid || 0).toFixed(2),
      balanceDue: Number(invoice.total_amount - (invoice.amount_paid || 0)).toFixed(2),
      currency: '₹',
      isRegistered: isGstReg
    });

    await mailer.sendMail({
      to: recipientEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      from: mailer.fromEmail,
      fromName: company?.name || mailer.fromName
    });

    if (invoice.party_id && (!invoice.party_email || !invoice.party_email.trim())) {
      await db.prepare(`UPDATE parties SET email = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`).bind(recipientEmail, invoice.party_id, companyId).run().catch(() => { });
    }

    return c.json({
      success: true,
      message: `Receipt dispatched successfully to ${recipientEmail}`,
      recipient_email: recipientEmail
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/invoices/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    const invoice = await db.prepare(`
      SELECT * FROM invoices WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first();

    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);

    const items = await db.prepare(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `).bind(id).all();

    const stmts = [];

    if (invoice.type !== 'QUOTATION') {
      for (const item of (items?.results || [])) {
        if (!item.item_id) continue;
        const revertStockDelta = invoice.type === 'PURCHASE' ? -item.quantity : item.quantity;
        stmts.push(
          db.prepare(`
            UPDATE items SET current_stock = current_stock + ?, updated_at=datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(revertStockDelta, item.item_id, companyId)
        );
      }
    }

    const relatedTxns = await db.prepare(`SELECT id FROM transactions WHERE invoice_id = ? AND company_id = ?`).bind(id, companyId).all();
    for (const txn of (relatedTxns?.results || [])) {
      stmts.push(
        db.prepare(`DELETE FROM transactions WHERE id = ? AND company_id = ?`).bind(txn.id, companyId)
      );
    }

    const relatedFundTxns = await db.prepare(`SELECT * FROM fund_transactions WHERE ref_type = 'INVOICE' AND ref_id = ? AND company_id = ?`).bind(id, companyId).all();
    for (const fTx of (relatedFundTxns?.results || [])) {
      const rollbackDelta = fTx.direction === 'IN' ? -Number(fTx.amount) : Number(fTx.amount);
      stmts.push(
        db.prepare(`UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?`).bind(rollbackDelta, fTx.account_id, companyId)
      );
      stmts.push(
        db.prepare(`DELETE FROM fund_transactions WHERE id = ? AND company_id = ?`).bind(fTx.id, companyId)
      );
    }

    stmts.push(
      db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).bind(id)
    );
    stmts.push(
      db.prepare(`DELETE FROM invoices WHERE id = ? AND company_id = ?`).bind(id, companyId)
    );

    await db.batch(stmts);

    if (invoice.party_id && invoice.type !== 'QUOTATION') {
      await reconcilePartyBalance(db, companyId, invoice.party_id);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// TRANSACTIONS (Payments)
// =============================================================================
app.get('/api/transactions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const party_id = c.req.query('party_id');
    let query = `
      SELECT t.*, p.name as party_name
      FROM transactions t LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.company_id = ?
    `;
    const params = [companyId];
    if (party_id) {
      query += ` AND t.party_id = ?`;
      params.push(party_id);
    }
    query += ` ORDER BY t.created_at DESC LIMIT 50`;
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/transactions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { type, party_id, amount, date, reference, notes, payment_mode } = body;
    let invoice_id = body.invoice_id ? Number(body.invoice_id) : null;

    if (!type || !party_id || !amount) {
      return c.json({ error: 'type, party_id, and amount are required' }, 400);
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return c.json({ error: 'amount must be greater than 0' }, 400);
    }

    const upperType = type.toUpperCase();
    const txnDate = date || new Date().toISOString().slice(0, 10);
    const txnPaymentMode = payment_mode || 'CASH';

    if (!invoice_id && (reference || notes)) {
      const match = (reference || notes || '').match(/(INV-[A-Za-z0-9-]+|POS-[A-Za-z0-9-]+)/i);
      if (match) {
        const invRow = await db.prepare(`
          SELECT id FROM invoices WHERE invoice_number = ? AND company_id = ?
        `).bind(match[1].toUpperCase(), companyId).first();
        if (invRow) {
          invoice_id = invRow.id;
        }
      }
    }

    const stmts = [];

    stmts.push(
      db.prepare(`
        INSERT INTO transactions (company_id, type, party_id, invoice_id, amount, payment_mode, date, reference, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        companyId,
        upperType,
        party_id,
        invoice_id || null,
        numAmount,
        txnPaymentMode,
        txnDate,
        reference || null,
        notes || null
      )
    );

    const balanceDelta = upperType === 'PAYMENT_IN' ? -numAmount : numAmount;
    stmts.push(
      db.prepare(`
        UPDATE parties SET current_balance = current_balance + ?, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).bind(balanceDelta, party_id, companyId)
    );

    if (invoice_id) {
      const targetInvoice = await db.prepare(`
        SELECT id, total_amount, amount_paid, payment_mode FROM invoices WHERE id = ? AND company_id = ?
      `).bind(invoice_id, companyId).first();

      if (targetInvoice) {
        const currentPaid = Number(targetInvoice.amount_paid) || 0;
        const newPaid = Math.min(Number(targetInvoice.total_amount), currentPaid + numAmount);
        const isFullySettled = (Number(targetInvoice.total_amount) - newPaid) <= 0.001;
        const newStatus = isFullySettled ? 'PAID' : 'PARTIALLY_PAID';

        let newPaymentMode = targetInvoice.payment_mode || txnPaymentMode;
        if (isFullySettled && typeof newPaymentMode === 'string' && newPaymentMode.includes('Due:')) {
          newPaymentMode = 'Settled (Paid in Full)';
        }

        stmts.push(
          db.prepare(`
            UPDATE invoices
            SET amount_paid = ?, status = ?, payment_mode = ?, updated_at = datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(newPaid, newStatus, newPaymentMode, invoice_id, companyId)
        );
      }
    } else {
      const invType = upperType === 'PAYMENT_IN' ? 'SALES' : 'PURCHASE';
      const unpaidInvoices = await db.prepare(`
        SELECT id, total_amount, amount_paid, payment_mode
        FROM invoices
        WHERE party_id = ? AND company_id = ? AND type = ? AND (total_amount - amount_paid) > 0.001
        ORDER BY date ASC, id ASC
      `).bind(party_id, companyId, invType).all();

      let remainingToApply = numAmount;
      for (const inv of (unpaidInvoices?.results || [])) {
        if (remainingToApply <= 0.001) break;
        const due = Math.max(0, Number(inv.total_amount) - (Number(inv.amount_paid) || 0));
        const toApply = Math.min(remainingToApply, due);
        const newPaid = (Number(inv.amount_paid) || 0) + toApply;
        const isFullySettled = (Number(inv.total_amount) - newPaid) <= 0.001;
        const newStatus = isFullySettled ? 'PAID' : 'PARTIALLY_PAID';

        let newPaymentMode = inv.payment_mode || txnPaymentMode;
        if (isFullySettled && typeof newPaymentMode === 'string' && newPaymentMode.includes('Due:')) {
          newPaymentMode = 'Settled (Paid in Full)';
        }

        stmts.push(
          db.prepare(`
            UPDATE invoices
            SET amount_paid = ?, status = ?, payment_mode = ?, updated_at = datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(newPaid, newStatus, newPaymentMode, inv.id, companyId)
        );

        remainingToApply -= toApply;
      }
    }

    const defaultAccounts = await ensureDefaultFundAccounts(db, companyId);
    const isCash = txnPaymentMode.toUpperCase() === 'CASH';
    const targetAcc = isCash
      ? (defaultAccounts.find(a => a.type === 'CASH') || defaultAccounts[0])
      : (defaultAccounts.find(a => a.type === 'BANK' || a.type === 'UPI') || defaultAccounts[0]);

    if (targetAcc) {
      const direction = upperType === 'PAYMENT_IN' ? 'IN' : 'OUT';
      const fundDelta = direction === 'IN' ? numAmount : -numAmount;
      const party = await db.prepare(`SELECT name FROM parties WHERE id = ? AND company_id = ?`).bind(party_id, companyId).first();
      const partyName = party?.name || 'Party';
      const desc = upperType === 'PAYMENT_IN' ? `Payment Received: ${partyName}` : `Payment Made: ${partyName}`;

      stmts.push(
        db.prepare(`
          INSERT INTO fund_transactions (company_id, account_id, amount, direction, ref_type, ref_id, date, description)
          VALUES (?, ?, ?, ?, 'PAYMENT', ?, ?, ?)
        `).bind(companyId, targetAcc.id, numAmount, direction, null, txnDate, desc)
      );
      stmts.push(
        db.prepare(`
          UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?
        `).bind(fundDelta, targetAcc.id, companyId)
      );
    }

    await db.batch(stmts);
    return c.json({ success: true }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/transactions/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');

    const txn = await db.prepare(`
      SELECT * FROM transactions WHERE id = ? AND company_id = ?
    `).bind(id, companyId).first();

    if (!txn) return c.json({ error: 'Transaction not found' }, 404);

    const stmts = [];

    const partyIdForReconcile = txn.party_id;

    if (txn.invoice_id) {
      const inv = await db.prepare(`
        SELECT id, total_amount, amount_paid FROM invoices WHERE id = ? AND company_id = ?
      `).bind(txn.invoice_id, companyId).first();

      if (inv) {
        const revertedPaid = Math.max(0, (Number(inv.amount_paid) || 0) - Number(txn.amount));
        const newStatus = revertedPaid >= Number(inv.total_amount) ? 'PAID' : (revertedPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
        stmts.push(
          db.prepare(`
            UPDATE invoices SET amount_paid = ?, status = ?, updated_at = datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(revertedPaid, newStatus, txn.invoice_id, companyId)
        );
      }
    }

    stmts.push(
      db.prepare(`DELETE FROM transactions WHERE id = ? AND company_id = ?`).bind(id, companyId)
    );

    await db.batch(stmts);

    if (partyIdForReconcile) {
      await reconcilePartyBalance(db, companyId, partyIdForReconcile);
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// EXPENSES
// =============================================================================
app.get('/api/expenses', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM expenses WHERE company_id = ? ORDER BY date DESC, created_at DESC LIMIT 100
    `).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/expenses', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { category, amount, date, notes, payment_mode } = body;

    if (!category || amount === undefined) {
      return c.json({ error: 'category and amount are required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO expenses (company_id, category, amount, payment_mode, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(companyId, category, amount, payment_mode || 'CASH', date || new Date().toISOString().slice(0, 10), notes || null).run();

    return c.json({ id: result.meta.last_row_id, ...body }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/expenses/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const { category, amount, date, notes, payment_mode } = body;

    if (!category || amount === undefined) {
      return c.json({ error: 'category and amount are required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      UPDATE expenses
      SET category = ?, amount = ?, payment_mode = ?, date = ?, notes = ?
      WHERE id = ? AND company_id = ?
    `).bind(category, amount, payment_mode || 'CASH', date || new Date().toISOString().slice(0, 10), notes || null, id, companyId).run();

    if (result.meta.changes === 0) return c.json({ error: 'Expense not found' }, 404);
    return c.json({ id: Number(id), ...body });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/expenses/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`DELETE FROM expenses WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Expense not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// COMPANY PROFILE
// =============================================================================
app.get('/api/company', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const result = await c.env.DB.prepare(`SELECT * FROM companies WHERE id=?`).bind(companyId).first();
    return c.json(result || {});
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/company', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { name, phone, address, state, state_code, gst_number, email, website, logo_url, signature_url, letterhead_url, upi_id } = body;

    const prevComp = await c.env.DB.prepare(`SELECT logo_url, signature_url, letterhead_url FROM companies WHERE id=?`).bind(companyId).first();

    await c.env.DB.prepare(`
      UPDATE companies 
      SET name = COALESCE(?, name),
          phone = ?,
          address = ?,
          state = ?,
          gst_number = ?,
          email = ?,
          website = ?,
          logo_url = COALESCE(?, logo_url),
          signature_url = COALESCE(?, signature_url),
          letterhead_url = COALESCE(?, letterhead_url),
          upi_id = ?
      WHERE id = ?
    `).bind(
      name || null,
      phone || null,
      address || null,
      state_code || state || null,
      gst_number || null,
      email || null,
      website || null,
      logo_url !== undefined ? logo_url : null,
      signature_url !== undefined ? signature_url : null,
      letterhead_url !== undefined ? letterhead_url : null,
      upi_id !== undefined ? upi_id : null,
      companyId
    ).run();

    if (c.env.MY_POS_BUCKET) {
      if (prevComp?.logo_url && logo_url !== undefined && prevComp.logo_url !== logo_url) {
        await deleteR2Object(c.env.MY_POS_BUCKET, prevComp.logo_url);
      }
      if (prevComp?.signature_url && signature_url !== undefined && prevComp.signature_url !== signature_url) {
        await deleteR2Object(c.env.MY_POS_BUCKET, prevComp.signature_url);
      }
      if (prevComp?.letterhead_url && letterhead_url !== undefined && prevComp.letterhead_url !== letterhead_url) {
        await deleteR2Object(c.env.MY_POS_BUCKET, prevComp.letterhead_url);
      }
    }

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// =============================================================================
// R2 FILE UPLOAD
app.post('/api/upload', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const formData = await c.req.formData();
    const file = formData.get('file');
    const field = formData.get('field') || 'logo';

    if (!file || !(file instanceof File))
      return c.json({ error: 'No file provided' }, 400);

    const ext = file.name.split('.').pop() || 'jpg';

    let folder = 'company_profile';
    if (['item', 'pos_item', 'product', 'items', 'pos_items'].includes(field)) {
      folder = 'pos_items';
    } else if (['avatar', 'user', 'user_profile', 'profile'].includes(field)) {
      folder = 'user_profile';
    } else if (['logo', 'signature', 'company', 'company_profile'].includes(field)) {
      folder = 'company_profile';
    }

    const key = `${folder}/${field}-${Date.now()}.${ext}`;
    const buffer = await file.arrayBuffer();

    await c.env.MY_POS_BUCKET.put(key, buffer, {
      httpMetadata: { 
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable'
      },
    });

    const publicUrl = `https://cdn.r2.sumanonline.com/${key}`;
    if (field === 'logo' || field === 'signature') {
      const urlField = field === 'signature' ? 'signature_url' : 'logo_url';
      const prevComp = await c.env.DB.prepare(`SELECT ${urlField} as oldUrl FROM companies WHERE id=?`).bind(companyId).first();
      if (prevComp?.oldUrl && c.env.MY_POS_BUCKET) {
        await deleteR2Object(c.env.MY_POS_BUCKET, prevComp.oldUrl);
      }
      await c.env.DB.prepare(`UPDATE companies SET ${urlField}=? WHERE id=?`).bind(publicUrl, companyId).run();
    }

    return c.json({ success: true, key, url: publicUrl });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/batches', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const itemId = c.req.query('item_id');
    let query = `SELECT b.*, i.name as item_name FROM item_batches b JOIN items i ON b.item_id = i.id WHERE b.company_id = ?`;
    const params = [companyId];
    if (itemId) {
      query += ` AND b.item_id = ?`;
      params.push(itemId);
    }
    query += ` ORDER BY b.expiry_date ASC`;
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/batches', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const body = await c.req.json();
    const { item_id, batch_no, mfg_date, expiry_date, quantity, purchase_price, sale_price } = body;
    if (!item_id || !batch_no || !expiry_date) {
      return c.json({ error: 'item_id, batch_no, and expiry_date are required' }, 400);
    }
    await c.env.DB.prepare(`
      INSERT INTO item_batches (company_id, item_id, batch_no, mfg_date, expiry_date, quantity, purchase_price, sale_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(companyId, item_id, batch_no, mfg_date || null, expiry_date, quantity || 0, purchase_price || 0, sale_price || 0).run();
    return c.json({ success: true }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/items/stock-adjustment', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { item_id, change_qty, reason } = await c.req.json();
    if (!item_id || change_qty === undefined || !reason) {
      return c.json({ error: 'item_id, change_qty, and reason are required' }, 400);
    }
    const item = await db.prepare(`SELECT current_stock FROM items WHERE id = ? AND company_id = ?`).bind(item_id, companyId).first();
    if (!item) return c.json({ error: 'Item not found' }, 404);

    const newStock = (item.current_stock || 0) + Number(change_qty);
    await db.batch([
      db.prepare(`UPDATE items SET current_stock = ?, updated_at = datetime('now') WHERE id = ? AND company_id = ?`).bind(newStock, item_id, companyId),
      db.prepare(`INSERT INTO stock_ledger (company_id, item_id, change_qty, reason, balance_after) VALUES (?, ?, ?, ?, ?)`).bind(companyId, item_id, change_qty, reason, newStock)
    ]);
    return c.json({ success: true, current_stock: newStock });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/fund/accounts', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const db = c.env.DB;
    await syncUnlinkedInvoicesToFunds(db, companyId);
    const { results } = await db.prepare(`SELECT * FROM fund_accounts WHERE company_id = ? ORDER BY created_at ASC`).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/fund/accounts', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { name, type, account_number, ifsc_code, opening_balance } = await c.req.json();
    if (!name || !type) return c.json({ error: 'name and type are required' }, 400);
    const result = await c.env.DB.prepare(`
      INSERT INTO fund_accounts (company_id, name, type, account_number, ifsc_code, opening_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(companyId, name, type.toUpperCase(), account_number || null, ifsc_code || null, opening_balance || 0, opening_balance || 0).run();
    return c.json({ id: result.meta.last_row_id, name, type }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.put('/api/fund/accounts/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const { name, type, account_number, ifsc_code } = await c.req.json();
    if (!name || !type) return c.json({ error: 'name and type are required' }, 400);
    const result = await c.env.DB.prepare(`
      UPDATE fund_accounts
      SET name = ?, type = ?, account_number = ?, ifsc_code = ?
      WHERE id = ? AND company_id = ?
    `).bind(name, type.toUpperCase(), account_number || null, ifsc_code || null, id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Account not found' }, 404);
    return c.json({ id: Number(id), name, type, account_number, ifsc_code });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/fund/accounts/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`DELETE FROM fund_accounts WHERE id = ? AND company_id = ?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Account not found' }, 404);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/fund/transactions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const db = c.env.DB;
    await syncUnlinkedInvoicesToFunds(db, companyId);
    const { results } = await db.prepare(`
      SELECT t.*, a.name as account_name, a.type as account_type
      FROM fund_transactions t JOIN fund_accounts a ON t.account_id = a.id
      WHERE t.company_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT 200
    `).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/fund/transactions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { account_id, amount, direction, date, description } = await c.req.json();
    if (!account_id || !amount || !direction) {
      return c.json({ error: 'account_id, amount, and direction are required' }, 400);
    }
    const delta = direction.toUpperCase() === 'IN' ? Number(amount) : -Number(amount);
    await db.batch([
      db.prepare(`
        INSERT INTO fund_transactions (company_id, account_id, amount, direction, date, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(companyId, account_id, amount, direction.toUpperCase(), date || new Date().toISOString().slice(0, 10), description || null),
      db.prepare(`
        UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?
      `).bind(delta, account_id, companyId)
    ]);
    return c.json({ success: true }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/fund/transfer', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const { from_account_id, to_account_id, amount, date, description } = await c.req.json();
    if (!from_account_id || !to_account_id || !amount || Number(amount) <= 0) {
      return c.json({ error: 'from_account_id, to_account_id, and valid positive amount are required' }, 400);
    }
    if (String(from_account_id) === String(to_account_id)) {
      return c.json({ error: 'Source and destination accounts must be different' }, 400);
    }
    const numAmount = Number(amount);
    const txDate = date || new Date().toISOString().slice(0, 10);
    const desc = description ? description.trim() : 'Fund Transfer';

    await db.batch([
      db.prepare(`
        INSERT INTO fund_transactions (company_id, account_id, amount, direction, date, description)
        VALUES (?, ?, ?, 'OUT', ?, ?)
      `).bind(companyId, from_account_id, numAmount, txDate, `Transfer to A/C #${to_account_id}: ${desc}`),
      db.prepare(`
        UPDATE fund_accounts SET current_balance = current_balance - ? WHERE id = ? AND company_id = ?
      `).bind(numAmount, from_account_id, companyId),
      db.prepare(`
        INSERT INTO fund_transactions (company_id, account_id, amount, direction, date, description)
        VALUES (?, ?, ?, 'IN', ?, ?)
      `).bind(companyId, to_account_id, numAmount, txDate, `Transfer from A/C #${from_account_id}: ${desc}`),
      db.prepare(`
        UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?
      `).bind(numAmount, to_account_id, companyId)
    ]);

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/fund/transactions/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const tx = await db.prepare(`SELECT * FROM fund_transactions WHERE id = ? AND company_id = ?`).bind(id, companyId).first();
    if (!tx) return c.json({ error: 'Transaction not found' }, 404);
    const delta = tx.direction === 'IN' ? -Number(tx.amount) : Number(tx.amount);
    await db.batch([
      db.prepare(`UPDATE fund_accounts SET current_balance = current_balance + ? WHERE id = ? AND company_id = ?`).bind(delta, tx.account_id, companyId),
      db.prepare(`DELETE FROM fund_transactions WHERE id = ? AND company_id = ?`).bind(id, companyId)
    ]);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/reports/sales', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { from, to } = c.req.query();
    let query = `
      SELECT i.*, p.name as party_name, p.phone as party_phone
      FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.company_id = ? AND i.type = 'SALES'
    `;
    const params = [companyId];
    if (from) {
      query += ` AND i.date >= ?`;
      params.push(from);
    }
    if (to) {
      query += ` AND i.date <= ?`;
      params.push(to);
    }
    query += ` ORDER BY i.date DESC, i.created_at DESC`;
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/reports/gst', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const comp = await c.env.DB.prepare(`SELECT gst_number FROM companies WHERE id = ?`).bind(companyId).first();
    if (!comp?.gst_number || !comp.gst_number.trim()) {
      return c.json([]);
    }
    const { results } = await c.env.DB.prepare(`
      SELECT i.invoice_number, i.date, i.subtotal, i.tax_amount, i.total_amount,
             p.name as customer_name, p.gst_number as customer_gstin, COALESCE(p.state, '') as customer_state
      FROM invoices i LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.company_id = ? AND i.type = 'SALES'
      ORDER BY i.date DESC
    `).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/reports/daybook', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const date = c.req.query('date') || new Date().toISOString().slice(0, 10);
    const [invoices, payments, expenses] = await Promise.all([
      c.env.DB.prepare(`
        SELECT 'INVOICE' as entry_type, id, type, invoice_number as reference, total_amount as amount, date, created_at
        FROM invoices WHERE company_id = ? AND date = ?
      `).bind(companyId, date).all(),
      c.env.DB.prepare(`
        SELECT 'PAYMENT' as entry_type, id, type, reference, amount, date, created_at
        FROM transactions WHERE company_id = ? AND date = ?
      `).bind(companyId, date).all(),
      c.env.DB.prepare(`
        SELECT 'EXPENSE' as entry_type, id, category as type, notes as reference, amount, date, created_at
        FROM expenses WHERE company_id = ? AND date = ?
      `).bind(companyId, date).all(),
    ]);

    const combined = [
      ...(invoices.results || []),
      ...(payments.results || []),
      ...(expenses.results || [])
    ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    return c.json(combined);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/backups', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { results } = await c.env.DB.prepare(`SELECT * FROM backups WHERE company_id = ? ORDER BY created_at DESC`).bind(companyId).all();
    return c.json(results);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/backups/export', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const [company, items, parties, invoices, invoiceItems, expenses, fundAccounts] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM companies WHERE id = ?`).bind(companyId).first(),
      c.env.DB.prepare(`SELECT * FROM items WHERE company_id = ?`).bind(companyId).all(),
      c.env.DB.prepare(`SELECT * FROM parties WHERE company_id = ?`).bind(companyId).all(),
      c.env.DB.prepare(`SELECT * FROM invoices WHERE company_id = ?`).bind(companyId).all(),
      c.env.DB.prepare(`SELECT ii.* FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE i.company_id = ?`).bind(companyId).all(),
      c.env.DB.prepare(`SELECT * FROM expenses WHERE company_id = ?`).bind(companyId).all(),
      c.env.DB.prepare(`SELECT * FROM fund_accounts WHERE company_id = ?`).bind(companyId).all(),
    ]);

    const snapshot = {
      exportDate: new Date().toISOString(),
      company,
      items: items.results,
      parties: parties.results,
      invoices: invoices.results,
      invoiceItems: invoiceItems.results,
      expenses: expenses.results,
      fundAccounts: fundAccounts.results
    };

    const jsonStr = JSON.stringify(snapshot, null, 2);
    const filename = `backup-${companyId}-${Date.now()}.json`;
    const r2Key = `backups/${filename}`;

    await c.env.MY_POS_BUCKET.put(r2Key, jsonStr, {
      httpMetadata: { contentType: 'application/json' },
    });

    await c.env.DB.prepare(`
      INSERT INTO backups (company_id, r2_key, filename, size_bytes)
      VALUES (?, ?, ?, ?)
    `).bind(companyId, r2Key, filename, jsonStr.length).run();

    return c.json({ success: true, filename, url: `https://cdn.r2.sumanonline.com/${r2Key}` });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/referrals/validate', async (c) => {
  try {
    const rawCode = c.req.query('code') || '';
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return c.json({ valid: false, error: 'Referral code is required' }, 400);
    }
    const match = code.match(/^HK-([0-9A-Z]+)-POS$/i);
    if (!match) {
      return c.json({ valid: false, error: 'Invalid referral code format' }, 400);
    }
    const referrerUserId = parseInt(match[1], 36);
    if (isNaN(referrerUserId) || referrerUserId <= 0) {
      return c.json({ valid: false, error: 'Invalid referral code' }, 400);
    }
    const db = c.env.DB;
    const user = await db.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(referrerUserId).first();
    if (!user) {
      return c.json({ valid: false, error: 'Referrer not found' }, 404);
    }
    const company = await db.prepare('SELECT name FROM companies WHERE user_id = ? ORDER BY id ASC LIMIT 1').bind(referrerUserId).first();
    const refereeName = company?.name || user.name || user.email.split('@')[0] || 'Merchant Partner';
    return c.json({
      valid: true,
      code,
      referrerUserId: user.id,
      refereeName,
      ownerName: user.name || '',
      businessName: company?.name || refereeName
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/referrals', authMiddleware, async (c) => {
  try {
    const userId = c.get('userId');
    const referralCode = `HK-${userId.toString(36).toUpperCase()}-POS`;
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM referrals WHERE referrer_user_id = ? ORDER BY created_at DESC
    `).bind(userId).all();

    return c.json({
      referralCode,
      referralLink: `https://pos.hisabkhata.sumanonline.com/signup?ref=${referralCode}`,
      referrals: results || []
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/api/ai/config', authMiddleware, async (c) => {
  const clientKey = c.req.query('apiKey');
  const serverApiKey = c.env.GROQ_API_KEY || '';
  const apiKey = clientKey || serverApiKey;
  const serverModel = c.env.GROQ_MODEL || c.env.GROQ_AI_MODEL || c.env.AI_MODEL || 'llama-3.3-70b-versatile';

  const defaultModels = [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (Flagship - Recommended)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Ultra Fast)' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B (High Reasoning)' },
    { value: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B (Catalog & Vision Specialist)' },
    { value: 'openai/gpt-oss-120b', label: 'OpenAI GPT-OSS 120B' },
    { value: 'openai/gpt-oss-20b', label: 'OpenAI GPT-OSS 20B (Fast)' }
  ];

  let liveModels = null;
  if (apiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const textModels = data.data
            .filter(m => m.active !== false && !m.id.includes('whisper'))
            .map(m => ({ value: m.id, label: m.id }));
          if (textModels.length > 0) {
            liveModels = textModels;
          }
        }
      }
    } catch {}
  }

  return c.json({
    hasServerApiKey: !!serverApiKey,
    serverModel,
    models: liveModels || defaultModels
  });
});

app.post('/api/ai/test', authMiddleware, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { apiKey: clientApiKey, aiModel } = body;
    const groqApiKey = clientApiKey || c.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return c.json({
        success: false,
        error: 'Groq API Key not found. Please provide an API key or configure GROQ_API_KEY in Cloudflare environment.'
      }, 400);
    }

    const selectedModel = (aiModel && aiModel !== 'env_default')
      ? aiModel
      : (c.env.GROQ_MODEL || c.env.GROQ_AI_MODEL || c.env.AI_MODEL || 'llama-3.3-70b-versatile');

    const startTime = Date.now();
    const testPrompt = 'Respond with "Operational" and 3 words describing system readiness.';

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'You are an AI system tester. Output a single short sentence under 10 words.'
          },
          {
            role: 'user',
            content: testPrompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 60
      })
    });

    const latencyMs = Date.now() - startTime;
    const data = await groqRes.json();

    if (!groqRes.ok) {
      return c.json({
        success: false,
        error: data.error?.message || `Groq API responded with status ${groqRes.status}`,
        model: selectedModel,
        latencyMs
      }, 400);
    }

    let reply = data.choices?.[0]?.message?.content?.trim() || '';
    if (reply.includes('</think>')) {
      reply = reply.split('</think>').pop().trim();
    } else {
      reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }
    reply = reply.replace(/^["']|["']$/g, '').trim();

    return c.json({
      success: true,
      model: selectedModel,
      latencyMs,
      reply,
      keySource: clientApiKey ? 'Custom Key' : 'Cloudflare Environment',
      modelSource: (aiModel && aiModel !== 'env_default') ? 'Custom Selection' : (c.env.GROQ_MODEL || c.env.GROQ_AI_MODEL || c.env.AI_MODEL ? 'Cloudflare Environment' : 'System Default')
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

app.post('/api/ai/generate-description', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { name, category, unit, brand, model, type, customPrompt, apiKey: clientApiKey, aiModel } = body;
    if (!name && !category) {
      return c.json({ error: 'Name or category is required to generate description' }, 400);
    }

    const groqApiKey = clientApiKey || c.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return c.json({ error: 'Groq API Key not configured. Please add GROQ_API_KEY in Settings or Worker environment.' }, 400);
    }

    const selectedModel = (aiModel && aiModel !== 'env_default')
      ? aiModel
      : (c.env.GROQ_MODEL || c.env.GROQ_AI_MODEL || c.env.AI_MODEL || 'llama-3.3-70b-versatile');


    let prompt = '';
    if (type === 'category') {
      prompt = `Provide a strictly to-the-point, 1-sentence catalog definition (under 18 words) for product category "${name}". Direct facts only, no filler or quotes.`;
    } else {
      const details = [
        name ? `Item: ${name}` : '',
        category ? `Category: ${category}` : '',
        brand ? `Brand: ${brand}` : '',
        model ? `Model: ${model}` : '',
        unit ? `Unit: ${unit}` : ''
      ].filter(Boolean).join(', ');
      prompt = `Provide a strictly to-the-point product summary with core specifications and key utility based on: ${details}. Keep it under 25 words. Direct, factual, no marketing hype or quotes.`;
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: 'You are an exact, to-the-point inventory catalog writer. Output ONLY the direct final product or category summary. Do NOT include <think> reasoning tags, meta-explanations, or markdown headers.'
          },
          {
            role: 'user',
            content: customPrompt || prompt
          }
        ],
        temperature: 0.6,
        max_completion_tokens: 300,
        top_p: 0.95
      })
    });

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return c.json({ error: data.error?.message || 'Failed to generate AI description' }, groqRes.status);
    }

    let description = data.choices?.[0]?.message?.content?.trim() || '';
    if (description.includes('</think>')) {
      description = description.split('</think>').pop().trim();
    } else {
      description = description.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }
    description = description.replace(/^["']|["']$/g, '').trim();
    description = description.replace(/^Here('s| is).*:?\s*/gi, '').trim();

    return c.json({ description, model: selectedModel });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});


app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

export default app;
