-- HardToCrack · reserva de referencias piloto. Ejecutar una sola vez sobre D1
-- DESPUÉS de workers/orders/schema.sql. No modifica tiendas existentes.
-- Ninguna referencia reservada puede registrar pedidos hasta su activación.
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS partner_profiles (
 ref TEXT PRIMARY KEY REFERENCES stores(ref),
 commercial_status TEXT NOT NULL DEFAULT 'sin_asignar'
   CHECK (commercial_status IN ('sin_asignar','pendiente','asignado','operativo','suspendido','baja')),
 legal_name TEXT NOT NULL DEFAULT '',
 tax_id TEXT NOT NULL DEFAULT '',
 address TEXT NOT NULL DEFAULT '',
 city TEXT NOT NULL DEFAULT '',
 postal_code TEXT NOT NULL DEFAULT '',
 province TEXT NOT NULL DEFAULT '',
 territory TEXT NOT NULL DEFAULT '',
 contact_person TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 agreement_signed_at INTEGER,
 activated_at INTEGER,
 notes TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS partner_audit (
 id TEXT PRIMARY KEY,
 ref TEXT NOT NULL REFERENCES stores(ref),
 action TEXT NOT NULL,
 actor TEXT NOT NULL DEFAULT 'HTC',
 details TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS partner_audit_ref_created ON partner_audit(ref,created_at DESC);
INSERT OR IGNORE INTO stores(ref,name,email,receipt_email,code_hash,active,updated_at) VALUES
 ('HTC-MAD-001','Sin asignar','','','',0,unixepoch()),
 ('HTC-MAD-002','Sin asignar','','','',0,unixepoch()),
 ('HTC-MAD-003','Sin asignar','','','',0,unixepoch()),
 ('HTC-MAD-004','Sin asignar','','','',0,unixepoch()),
 ('HTC-MAD-005','Sin asignar','','','',0,unixepoch()),
 ('HTC-MAD-006','Sin asignar','','','',0,unixepoch());
INSERT OR IGNORE INTO partner_profiles(ref,commercial_status,territory) VALUES
 ('HTC-MAD-001','sin_asignar','Madrid'),
 ('HTC-MAD-002','sin_asignar','Madrid'),
 ('HTC-MAD-003','sin_asignar','Madrid'),
 ('HTC-MAD-004','sin_asignar','Madrid'),
 ('HTC-MAD-005','sin_asignar','Madrid'),
 ('HTC-MAD-006','sin_asignar','Madrid');
COMMIT;
