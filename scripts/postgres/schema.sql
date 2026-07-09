-- Schéma PostgreSQL Karamo Sebaly (phase Scale)
-- Usage: psql "$DATABASE_URL" -f scripts/postgres/schema.sql

CREATE TABLE IF NOT EXISTS app_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_data_updated_at ON app_data (updated_at DESC);

-- Sessions QR web (persistantes — ne disparaissent plus au redémarrage PM2)
CREATE TABLE IF NOT EXISTS web_sessions (
  token TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'expired')),
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  auth_token TEXT,
  device_id TEXT,
  license_card_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_web_sessions_expires_at ON web_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_web_sessions_status ON web_sessions (status);
