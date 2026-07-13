-- Schema Postgres per The Secret Garden — Presenze Cantieri.
-- NOTA: l'app crea automaticamente queste tabelle all'avvio (idempotente),
-- quindi eseguire questo file è FACOLTATIVO. È qui per trasparenza o se preferisci
-- crearle a mano dal SQL Editor di Supabase.

CREATE TABLE IF NOT EXISTS admins (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id            BIGSERIAL PRIMARY KEY,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  name_key      TEXT NOT NULL UNIQUE,   -- lower(nome)|lower(cognome)
  password_hash TEXT NOT NULL,          -- bcrypt
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  radius_m   INTEGER NOT NULL DEFAULT 120,
  status     TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'closed'
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  site_id     BIGINT NOT NULL REFERENCES sites(id),
  entry_at    TEXT NOT NULL,   -- UTC ISO, al secondo
  exit_at     TEXT,            -- UTC ISO, NULL finché il turno è aperto
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_att_emp   ON attendances(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_entry ON attendances(entry_at);
CREATE INDEX IF NOT EXISTS idx_att_open  ON attendances(employee_id, exit_at);
