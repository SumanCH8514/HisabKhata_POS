CREATE TABLE IF NOT EXISTS fund_accounts (
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

CREATE TABLE IF NOT EXISTS fund_transactions (
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

CREATE TABLE IF NOT EXISTS item_batches (
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

CREATE TABLE IF NOT EXISTS stock_ledger (
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

CREATE TABLE IF NOT EXISTS party_ledger (
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

CREATE TABLE IF NOT EXISTS backups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  r2_key      TEXT    NOT NULL,
  filename    TEXT    NOT NULL,
  size_bytes  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS referrals (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code     TEXT    NOT NULL,
  referred_email    TEXT,
  status            TEXT    NOT NULL DEFAULT 'pending',
  reward_status     TEXT    NOT NULL DEFAULT 'unclaimed',
  created_at        TEXT    DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fund_accounts_co ON fund_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_fund_transactions_acc ON fund_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_item ON item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_party_ledger_party ON party_ledger(party_id);
