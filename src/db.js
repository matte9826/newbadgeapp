import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, "presenze.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until   TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  name_key      TEXT NOT NULL UNIQUE,           -- lower(first)+'|'+lower(last)
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  radius_m   INTEGER NOT NULL DEFAULT 120,
  status     TEXT NOT NULL DEFAULT 'active',    -- 'active' | 'closed'
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  site_id     INTEGER NOT NULL REFERENCES sites(id),
  entry_at    TEXT NOT NULL,                    -- UTC ISO, second precision
  exit_at     TEXT,                             -- UTC ISO, null while open
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_att_emp   ON attendances(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_entry ON attendances(entry_at);
CREATE INDEX IF NOT EXISTS idx_att_open  ON attendances(employee_id, exit_at);
`);

/** Build the unique identity key from first + last name. */
export function nameKey(first, last) {
  return `${first.trim().toLowerCase()}|${last.trim().toLowerCase()}`;
}

/**
 * Seed or update the single admin account from environment variables.
 * The password is only ever stored as a bcrypt hash.
 */
export function seedAdmin({ username, password }) {
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env");
  }
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(password, 12);
  const existing = db.prepare("SELECT * FROM admins LIMIT 1").get();
  if (!existing) {
    db.prepare(
      "INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)"
    ).run(username, hash, now);
    return;
  }
  // Keep the single admin row in sync with .env (username + password), and
  // clear any lingering lockout so a fresh config always lets the admin in.
  db.prepare(
    "UPDATE admins SET username = ?, password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?"
  ).run(username, hash, existing.id);
}
