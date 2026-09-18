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
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Company-ID'],
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
    )`
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

// Helper to scope queries to the active company
const companyScopeMiddleware = async (c, next) => {
  const companyId = c.req.header('X-Company-ID');
  if (!companyId) {
    return c.json({ error: 'Bad Request: Missing X-Company-ID header' }, 400);
  }

  const userId = c.get('userId');
  try {
    const company = await c.env.DB.prepare(
      `SELECT id FROM companies WHERE id = ? AND user_id = ?`
    ).bind(companyId, userId).first();

    if (!company) {
      return c.json({ error: 'Forbidden: Company not found or access denied' }, 403);
    }

    c.set('companyId', company.id);
    await next();
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
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
      service: 'HisabKhata POS Worker Engine',
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
app.post('/api/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, businessName, referralCode, is_admin } = body;
    if (!email || !password || !businessName) {
      return c.json({ error: 'Email, password, and business name are required' }, 400);
    }

    const db = c.env.DB;
    const existingUser = await db.prepare(`SELECT id FROM users WHERE email = ?`).bind(email.toLowerCase().trim()).first();
    if (existingUser) {
      return c.json({ error: 'User with this email already exists' }, 400);
    }

    const hashedPassword = await hashPassword(password);
    const isAdmin = is_admin ? 1 : 0;

    const userResult = await db.prepare(
      `INSERT INTO users (email, password, is_admin) VALUES (?, ?, ?)`
    ).bind(email.toLowerCase().trim(), hashedPassword, isAdmin).run();
    const userId = userResult.meta.last_row_id;

    const companyResult = await db.prepare(
      `INSERT INTO companies (user_id, name, email) VALUES (?, ?, ?)`
    ).bind(userId, businessName, email.toLowerCase().trim()).run();
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
            `).bind(referrerUserId, cleanCode, email.toLowerCase().trim(), userId, businessName.trim()).run();
          }
        }
      }
    }

    const token = await sign({ userId, isAdmin: isAdmin === 1 }, c.env.JWT_SECRET || JWT_SECRET, 'HS256');

    return c.json({
      token,
      user: { id: userId, email: email.toLowerCase().trim(), name: '', mobile: '', photo_url: '', is_admin: isAdmin === 1, role: 'owner' },
      company: { id: companyId, name: businessName }
    }, 201);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const db = c.env.DB;
    const user = await db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email.toLowerCase().trim()).first();
    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isAdmin = user.is_admin === 1;

    const { results: companies } = await db.prepare(`SELECT * FROM companies WHERE user_id = ?`).bind(user.id).all();

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
        httpMetadata: { contentType: file.type || 'image/jpeg' }
      });
    }

    const photoUrl = `https://api.pos.hisabkhata.sumanonline.com/api/storage/${key}`;
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
    const { results } = await c.env.DB.prepare(`SELECT * FROM companies WHERE user_id = ?`).bind(userId).all();
    return c.json(results);
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
    return c.json({ id: companyId, name, phone, address, gst_number, email, website }, 201);
  } catch (err) {
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
    query += ` ORDER BY i.name ASC`;

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
    return c.json({ id: parseInt(id), ...body, rack_location: resolvedLocation });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.delete('/api/items/:id', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`DELETE FROM items WHERE id=? AND company_id=?`).bind(id, companyId).run();
    if (result.meta.changes === 0) return c.json({ error: 'Item not found' }, 404);
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
      SELECT i.*, p.name as party_name, p.gst_number as party_gst, p.phone as party_phone
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

    return c.json({
      ...invoiceRow,
      items: items || [],
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
               p.gst_number as party_gst, p.address as party_address
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
    return c.json({ ...invoice.results[0], items: items.results });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

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

    const subtotal = body.subtotal !== undefined ? Number(body.subtotal) : items.reduce((s, it) => s + (it.quantity * it.rate), 0);
    const tax_amount = body.tax_amount !== undefined ? Number(body.tax_amount) : items.reduce((s, it) => s + (it.quantity * it.rate * (it.tax_rate || 0) / 100), 0);
    const total_amount = body.total_amount !== undefined ? Number(body.total_amount) : (subtotal + tax_amount);
    const balance_due = Math.max(0, total_amount - Number(amount_paid));

    const stmts = [];

    stmts.push(
      db.prepare(`
        INSERT INTO invoices (company_id, type, invoice_number, date, party_id, subtotal, tax_amount, total_amount, amount_paid, payment_mode, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(companyId, type.toUpperCase(), invoice_number, date || new Date().toISOString().slice(0, 10),
        party_id || null, subtotal, tax_amount, total_amount, Number(amount_paid), payment_mode || 'CASH', notes || null)
    );

    // 2️⃣ Insert line items (after getting invoice id via last_insert_rowid trick)
    const lastIdResult = await db.prepare(`SELECT MAX(id) as maxId FROM invoices`).first();
    const expectedInvoiceId = (lastIdResult?.maxId ?? 0) + 1;

    for (const item of items) {
      stmts.push(
        db.prepare(`
          INSERT INTO invoice_items (invoice_id, item_id, item_name, unit, quantity, rate, tax_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(expectedInvoiceId, item.item_id || null, item.item_name,
          item.unit || 'Pcs', item.quantity, item.rate, item.tax_rate || 0)
      );
    }

    // 3️⃣ Update stock (skip for QUOTATION)
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

    // 4️⃣ Update party balance
    if (party_id && balance_due !== 0 && type.toUpperCase() !== 'QUOTATION') {
      const balanceDelta = type.toUpperCase() === 'SALES' ? balance_due : -balance_due;
      stmts.push(
        db.prepare(`
          UPDATE parties SET current_balance = current_balance + ?, updated_at=datetime('now')
          WHERE id = ? AND company_id = ?
        `).bind(balanceDelta, party_id, companyId)
      );
    }

    // Execute all as a batch
    await db.batch(stmts);

    return c.json({
      success: true,
      invoice_id: expectedInvoiceId,
      invoice_number,
      total_amount,
      balance_due,
    }, 201);
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

    if (invoice.party_id && (invoice.balance_due || 0) !== 0 && invoice.type !== 'QUOTATION') {
      const revertBalanceDelta = invoice.type === 'SALES' ? -(invoice.balance_due || 0) : (invoice.balance_due || 0);
      stmts.push(
        db.prepare(`
          UPDATE parties SET current_balance = current_balance + ?, updated_at=datetime('now')
          WHERE id = ? AND company_id = ?
        `).bind(revertBalanceDelta, invoice.party_id, companyId)
      );
    }

    const relatedTxns = await db.prepare(`SELECT id, amount, type, party_id FROM transactions WHERE invoice_id = ? AND company_id = ?`).bind(id, companyId).all();
    for (const txn of (relatedTxns?.results || [])) {
      if (txn.party_id) {
        const revertTxnDelta = txn.type === 'PAYMENT_IN' ? Number(txn.amount) : -Number(txn.amount);
        stmts.push(
          db.prepare(`
            UPDATE parties SET current_balance = current_balance + ?, updated_at=datetime('now')
            WHERE id = ? AND company_id = ?
          `).bind(revertTxnDelta, txn.party_id, companyId)
        );
      }
      stmts.push(
        db.prepare(`DELETE FROM transactions WHERE id = ? AND company_id = ?`).bind(txn.id, companyId)
      );
    }

    stmts.push(
      db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).bind(id)
    );
    stmts.push(
      db.prepare(`DELETE FROM invoices WHERE id = ? AND company_id = ?`).bind(id, companyId)
    );

    await db.batch(stmts);

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

    const revertPartyDelta = txn.type.toUpperCase() === 'PAYMENT_IN' ? Number(txn.amount) : -Number(txn.amount);
    stmts.push(
      db.prepare(`
        UPDATE parties SET current_balance = current_balance + ?, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).bind(revertPartyDelta, txn.party_id, companyId)
    );

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
    const { category, amount, date, notes } = body;

    if (!category || amount === undefined) {
      return c.json({ error: 'category and amount are required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO expenses (company_id, category, amount, date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).bind(companyId, category, amount, date || new Date().toISOString().slice(0, 10), notes || null).run();

    return c.json({ id: result.meta.last_row_id, ...body }, 201);
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
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `https://cdn.r2.sumanonline.com/${key}`;
    if (field === 'logo' || field === 'signature') {
      const urlField = field === 'signature' ? 'signature_url' : 'logo_url';
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
    const { results } = await c.env.DB.prepare(`SELECT * FROM fund_accounts WHERE company_id = ? ORDER BY created_at ASC`).bind(companyId).all();
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

app.get('/api/fund/transactions', authMiddleware, companyScopeMiddleware, async (c) => {
  try {
    const companyId = c.get('companyId');
    const { results } = await c.env.DB.prepare(`
      SELECT t.*, a.name as account_name, a.type as account_type
      FROM fund_transactions t JOIN fund_accounts a ON t.account_id = a.id
      WHERE t.company_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT 100
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
    const { results } = await c.env.DB.prepare(`
      SELECT i.invoice_number, i.date, i.subtotal, i.tax_amount, i.total_amount,
             p.name as customer_name, p.gst_number as customer_gstin, p.state as customer_state
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

    const selectedModel = aiModel || c.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

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
        max_completion_tokens: 2048,
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
