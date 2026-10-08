PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS stores (
 ref TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
 receipt_email TEXT NOT NULL, code_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, request_hash TEXT NOT NULL,
 source TEXT NOT NULL, store_ref TEXT REFERENCES stores(ref), customer_email TEXT NOT NULL,
 payload TEXT NOT NULL, receipt_email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','accepted','shipped','rejected')),
 tracking_url TEXT NOT NULL DEFAULT '', carrier TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, transition_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS orders_created ON orders(created_at DESC);
CREATE TABLE IF NOT EXISTS events (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS mail_outbox (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','review')),
 attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL,
 lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT NOT NULL DEFAULT '',
 first_attempt INTEGER NOT NULL DEFAULT 0, provider_id TEXT NOT NULL DEFAULT '', last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS outbox_pending ON mail_outbox(status,available_at);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
