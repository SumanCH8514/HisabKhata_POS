DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS backups;
DROP TABLE IF EXISTS fund_transactions;
DROP TABLE IF EXISTS fund_accounts;
DROP TABLE IF EXISTS stock_ledger;
DROP TABLE IF EXISTS item_batches;
DROP TABLE IF EXISTS party_ledger;
DROP TABLE IF EXISTS unit_conversions;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS parties;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  email                       TEXT    NOT NULL UNIQUE,
  password                    TEXT    NOT NULL,
  is_admin                    INTEGER NOT NULL DEFAULT 0,
  role                        TEXT    NOT NULL DEFAULT 'owner' CHECK(role IN ('owner','manager','cashier')),
  name                        TEXT,
  mobile                      TEXT,
  photo_url                   TEXT,
  email_verified              INTEGER NOT NULL DEFAULT 0,
  verification_token          TEXT,
  verification_token_expires  TEXT,
  verification_code           TEXT,
  reset_password_token        TEXT,
  reset_password_expires      TEXT,
  created_at                  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE companies (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT    NOT NULL DEFAULT 'Your Business Name',
  phone             TEXT,
  address           TEXT,
  state             TEXT,
  gst_number        TEXT,
  email             TEXT,
  logo_url          TEXT,
  signature_url     TEXT,
  bank_name         TEXT,
  account_number    TEXT,
  ifsc_code         TEXT,
  upi_id            TEXT,
  terms_conditions  TEXT,
  created_at        TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  parent_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(company_id, name)
);

CREATE TABLE units (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  short_name      TEXT    NOT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(company_id, short_name)
);

CREATE TABLE unit_conversions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_unit_id    INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  to_unit_id      INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  rate            REAL    NOT NULL DEFAULT 1,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE items (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name                TEXT    NOT NULL,
  unit                TEXT    NOT NULL DEFAULT 'Pcs',
  barcode             TEXT,
  sku                 TEXT,
  hsn_code            TEXT,
  sale_price          REAL    NOT NULL DEFAULT 0,
  wholesale_price     REAL    NOT NULL DEFAULT 0,
  purchase_price      REAL    NOT NULL DEFAULT 0,
  mrp                 REAL    NOT NULL DEFAULT 0,
  tax_rate            REAL    NOT NULL DEFAULT 0,
  opening_stock       REAL    NOT NULL DEFAULT 0,
  current_stock       REAL    NOT NULL DEFAULT 0,
  low_stock_alert     REAL    NOT NULL DEFAULT 5,
  image_url           TEXT,
  description         TEXT,
  batch_number        TEXT,
  expiry_date         TEXT,
  aisle               TEXT,
  rack                TEXT,
  shelf               TEXT,
  rack_location       TEXT,
  created_at          TEXT    DEFAULT (datetime('now')),
  updated_at          TEXT    DEFAULT (datetime('now')),
  UNIQUE(company_id, barcode)
);

CREATE TABLE item_batches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_no        TEXT    NOT NULL,
  mfg_date        TEXT,
  expiry_date     TEXT    NOT NULL,
  quantity        REAL    NOT NULL DEFAULT 0,
  purchase_price  REAL    NOT NULL DEFAULT 0,
  sale_price      REAL    NOT NULL DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(company_id, item_id, batch_no)
);

CREATE TABLE stock_ledger (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_id         INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  change_qty      REAL    NOT NULL,
  reason          TEXT    NOT NULL,
  ref_type        TEXT,
  ref_id          INTEGER,
  balance_after   REAL    NOT NULL DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE parties (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id       INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type             TEXT    NOT NULL CHECK(type IN ('CUSTOMER','VENDOR')),
  name             TEXT    NOT NULL,
  phone            TEXT,
  gst_number       TEXT,
  address          TEXT,
  state            TEXT,
  email            TEXT,
  opening_balance  REAL    NOT NULL DEFAULT 0,
  current_balance  REAL    NOT NULL DEFAULT 0,
  credit_limit     REAL    NOT NULL DEFAULT 0,
  created_at       TEXT    DEFAULT (datetime('now')),
  updated_at       TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE party_ledger (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  party_id        INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  amount          REAL    NOT NULL DEFAULT 0,
  type            TEXT    NOT NULL CHECK(type IN ('DEBIT','CREDIT')),
  ref_type        TEXT    NOT NULL,
  ref_id          INTEGER,
  balance_after   REAL    NOT NULL DEFAULT 0,
  date            TEXT    NOT NULL DEFAULT (date('now')),
  notes           TEXT,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE invoices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL CHECK(type IN ('SALES','PURCHASE','QUOTATION','DELIVERY_CHALLAN','SALES_RETURN','PURCHASE_RETURN')),
  invoice_number  TEXT    NOT NULL,
  date            TEXT    NOT NULL DEFAULT (date('now')),
  due_date        TEXT,
  party_id        INTEGER REFERENCES parties(id),
  subtotal        REAL    NOT NULL DEFAULT 0,
  discount_amount REAL    NOT NULL DEFAULT 0,
  tax_amount      REAL    NOT NULL DEFAULT 0,
  total_amount    REAL    NOT NULL DEFAULT 0,
  amount_paid     REAL    NOT NULL DEFAULT 0,
  balance_due     REAL    GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_mode    TEXT    DEFAULT 'CASH',
  status          TEXT    DEFAULT 'PAID',
  notes           TEXT,
  terms           TEXT,
  created_at      TEXT    DEFAULT (datetime('now')),
  UNIQUE(company_id, invoice_number)
);

CREATE TABLE invoice_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_id     INTEGER REFERENCES items(id),
  batch_id    INTEGER REFERENCES item_batches(id),
  item_name   TEXT    NOT NULL,
  unit        TEXT,
  quantity    REAL    NOT NULL DEFAULT 1,
  mrp         REAL    NOT NULL DEFAULT 0,
  rate        REAL    NOT NULL DEFAULT 0,
  discount    REAL    NOT NULL DEFAULT 0,
  tax_rate    REAL    NOT NULL DEFAULT 0,
  tax_amount  REAL    GENERATED ALWAYS AS ((quantity * (rate - discount)) * tax_rate / 100) STORED,
  total       REAL    GENERATED ALWAYS AS ((quantity * (rate - discount)) + ((quantity * (rate - discount)) * tax_rate / 100)) STORED
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK(type IN ('PAYMENT_IN','PAYMENT_OUT')),
  party_id    INTEGER REFERENCES parties(id),
  invoice_id  INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  amount      REAL    NOT NULL DEFAULT 0,
  payment_mode TEXT   DEFAULT 'CASH',
  date        TEXT    NOT NULL DEFAULT (date('now')),
  reference   TEXT,
  notes       TEXT,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE fund_accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL CHECK(type IN ('CASH','BANK','UPI')),
  account_number  TEXT,
  ifsc_code       TEXT,
  opening_balance REAL    NOT NULL DEFAULT 0,
  current_balance REAL    NOT NULL DEFAULT 0,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE fund_transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_id      INTEGER NOT NULL REFERENCES fund_accounts(id) ON DELETE CASCADE,
  amount          REAL    NOT NULL DEFAULT 0,
  direction       TEXT    NOT NULL CHECK(direction IN ('IN','OUT')),
  ref_type        TEXT,
  ref_id          INTEGER,
  date            TEXT    NOT NULL DEFAULT (date('now')),
  description     TEXT,
  created_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE expenses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category      TEXT    NOT NULL,
  amount        REAL    NOT NULL DEFAULT 0,
  payment_mode  TEXT    DEFAULT 'CASH',
  date          TEXT    NOT NULL DEFAULT (date('now')),
  receipt_url   TEXT,
  is_recurring  INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE backups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  r2_key      TEXT    NOT NULL,
  filename    TEXT    NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE referrals (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code           TEXT    NOT NULL,
  referred_email          TEXT,
  referred_user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  referred_business_name  TEXT,
  status                  TEXT    NOT NULL DEFAULT 'pending',
  reward_status           TEXT    NOT NULL DEFAULT 'unclaimed',
  created_at              TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE user_settings (
  user_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings_json     TEXT    NOT NULL,
  updated_at        TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX idx_invoices_party       ON invoices(party_id);
CREATE INDEX idx_invoices_type        ON invoices(type);
CREATE INDEX idx_invoices_date        ON invoices(date);
CREATE INDEX idx_invoice_items_inv    ON invoice_items(invoice_id);
CREATE INDEX idx_transactions_party   ON transactions(party_id);
CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_party_ledger_party   ON party_ledger(party_id);
CREATE INDEX idx_stock_ledger_item    ON stock_ledger(item_id);
CREATE INDEX idx_item_batches_item    ON item_batches(item_id);
CREATE INDEX idx_items_company        ON items(company_id);
CREATE INDEX idx_parties_company      ON parties(company_id);
CREATE INDEX idx_invoices_company     ON invoices(company_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_expenses_company     ON expenses(company_id);
CREATE INDEX idx_fund_accounts_co     ON fund_accounts(company_id);

CREATE TABLE IF NOT EXISTS company_members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('owner','manager','cashier','staff')),
  status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id, user_id)
);

CREATE TABLE IF NOT EXISTS company_invitations (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('manager','cashier','staff')),
  token               TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled','expired')),
  created_at          TEXT DEFAULT (datetime('now')),
  expires_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_members_user ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_co ON company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_co ON company_invitations(company_id);

CREATE TABLE IF NOT EXISTS company_smtp_settings (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id          INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type        TEXT NOT NULL DEFAULT 'inbuilt' CHECK(service_type IN ('inbuilt', 'custom')),
  host                TEXT,
  port                INTEGER DEFAULT 465,
  encryption          TEXT DEFAULT 'ssl_tls' CHECK(encryption IN ('ssl_tls', 'starttls')),
  username            TEXT,
  password            TEXT,
  from_email          TEXT,
  from_name           TEXT,
  reply_to            TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_smtp_settings_co ON company_smtp_settings(company_id);
