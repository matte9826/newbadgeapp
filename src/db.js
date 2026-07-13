import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool, types } = pg;

// Return BIGINT (int8, OID 20) as a JS number instead of a string, so ids keep
// behaving exactly like they did under SQLite (safe: our ids stay well below
// Number.MAX_SAFE_INTEGER).
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

// The app talks to Postgres (Supabase) when DATABASE_URL is set. Without it the
// app still boots and serves pages, but data endpoints return a clear
// "database non configurato" error instead of crashing.
export const DB_CONFIGURED = !!process.env.DATABASE_URL;

let pool = null;
function getPool() {
  if (!DB_CONFIGURED) return null;
  if (!pool) {
    // Supabase requires TLS; its pooler certificate isn't in Node's default CA
    // store, so we don't verify the chain. Set DATABASE_SSL=disable only for a
    // local Postgres without TLS (e.g. tests).
    const ssl =
      process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false };
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: 1, // serverless-friendly: one connection per warm instance
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (e) => console.error("[db] pool error:", e.message));
  }
  return pool;
}

class DbNotConfigured extends Error {
  constructor() {
    super("Database non configurato");
    this.code = "DB_NOT_CONFIGURED";
  }
}

/** Run a query, returning all rows. */
export async function q(text, params = []) {
  const p = getPool();
  if (!p) throw new DbNotConfigured();
  const res = await p.query(text, params);
  return res.rows;
}

/** Run a query, returning the first row or null. */
export async function one(text, params = []) {
  return (await q(text, params))[0] || null;
}

/** Build the unique identity key from first + last name. */
export function nameKey(first, last) {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`;
}

// Timestamps are stored as UTC ISO strings (TEXT), exactly as before, so all the
// time logic in src/time.js keeps working unchanged. ISO-8601 UTC strings sort
// and compare correctly, so range filters on entry_at stay valid.
const SCHEMA = `
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
  name_key      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sites (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  radius_m   INTEGER NOT NULL DEFAULT 120,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attendances (
  id          BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  site_id     BIGINT NOT NULL REFERENCES sites(id),
  entry_at    TEXT NOT NULL,
  exit_at     TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_att_emp   ON attendances(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_entry ON attendances(entry_at);
CREATE INDEX IF NOT EXISTS idx_att_open  ON attendances(employee_id, exit_at);
`;

/** Create tables/indexes if missing (idempotent). Safe to run on every boot. */
export async function initSchema() {
  if (!DB_CONFIGURED) {
    console.warn(
      "[avvio] DATABASE_URL non impostata: database non configurato. " +
        "Imposta la connessione Supabase per salvare i dati in modo permanente."
    );
    return;
  }
  const p = getPool();
  await p.query(SCHEMA); // multi-statement DDL (no params → simple protocol)
}

/**
 * Seed or update the single admin account from environment variables.
 * The password is only ever stored as a bcrypt hash.
 */
export async function seedAdmin({ username, password }) {
  if (!DB_CONFIGURED) return;
  if (!username || !password) {
    console.warn(
      "[avvio] ADMIN_USERNAME/ADMIN_PASSWORD non impostate: l'accesso admin resta " +
        "disattivato finché non le configuri nelle Environment Variables."
    );
    return;
  }
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 12);
  const existing = await one("SELECT id FROM admins LIMIT 1");
  if (!existing) {
    await q(
      "INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, $3)",
      [username, hash, now]
    );
    return;
  }
  // Keep the single admin row in sync with the env config (username + password)
  // and clear any lingering lockout so a fresh config always lets the admin in.
  await q(
    "UPDATE admins SET username = $1, password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $3",
    [username, hash, existing.id]
  );
}
