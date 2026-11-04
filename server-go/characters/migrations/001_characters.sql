-- Opt-in schema only. Does not change the existing Terrania rooms or deploy.
-- Apply to a database owned by Terrania, NEVER the panel's shared admin tables.
BEGIN;
CREATE TABLE IF NOT EXISTS terrania_accounts (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS terrania_characters (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE REFERENCES terrania_accounts(id) ON DELETE CASCADE,
  display_name VARCHAR(128) NOT NULL CHECK (length(display_name) BETWEEN 1 AND 128),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience BETWEEN 0 AND 36750),
  kills INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
  slime_kills INTEGER NOT NULL DEFAULT 0 CHECK (slime_kills >= 0 AND slime_kills <= kills),
  hp INTEGER NOT NULL DEFAULT 100 CHECK (hp BETWEEN 0 AND 590),
  revision BIGINT NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS terrania_character_sessions (
  token_hash BYTEA PRIMARY KEY CHECK (octet_length(token_hash) = 32),
  account_id UUID NOT NULL REFERENCES terrania_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS terrania_character_sessions_account_idx
  ON terrania_character_sessions (account_id);
CREATE INDEX IF NOT EXISTS terrania_character_sessions_expiry_idx
  ON terrania_character_sessions (expires_at);
COMMIT;
