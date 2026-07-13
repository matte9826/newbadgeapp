import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DateTime } from "luxon";

import { q, one, seedAdmin, nameKey, initSchema } from "./src/db.js";
import {
  issueSession,
  clearSession,
  readSession,
  requireAdmin,
  requireUser,
} from "./src/auth.js";
import { withinRadius, distanceMeters } from "./src/geo.js";
import {
  nowIso,
  secondsBetween,
  monthBoundsUtc,
  dayBoundsUtc,
  rangeBoundsUtc,
  romeClockSeconds,
  romeDate,
  todayRome,
  ZONE,
} from "./src/time.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, "public");
const COMPANY_NAME = process.env.COMPANY_NAME || "Presenze Cantieri";
const ADMIN_LOCK_MINUTES = 15;
const ADMIN_MAX_ATTEMPTS = 3;

// Prepare the database (schema + admin) once per cold start. Never let a DB
// hiccup take the whole app down on boot — pages must still load.
await initSchema().catch((e) => console.error("[avvio] initSchema:", e.message));
await seedAdmin({
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD,
}).catch((e) => console.error("[avvio] seedAdmin:", e.message));

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

// ---------- helpers ----------
const clean = (s) => (typeof s === "string" ? s.trim() : "");
const isNum = (n) => typeof n === "number" && Number.isFinite(n);

// Wrap an async route so DB/unknown errors become clean JSON instead of a crash.
function h(fn) {
  return (req, res) =>
    Promise.resolve(fn(req, res)).catch((err) => {
      if (err && err.code === "DB_NOT_CONFIGURED") {
        return res.status(503).json({
          error: "Database non ancora configurato. Riprova più tardi.",
        });
      }
      console.error("[api]", req.method, req.originalUrl, "-", err?.message);
      if (!res.headersSent) res.status(500).json({ error: "Errore del server. Riprova." });
    });
}

function hms(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
const decimalHours = (sec) => Math.round((sec / 3600) * 100) / 100;

// ================= AUTH =================

app.post("/api/admin/login", h(async (req, res) => {
  const username = clean(req.body?.username);
  const password = req.body?.password ?? "";
  const admin = await one("SELECT * FROM admins WHERE username = $1", [username]);

  // Uniform response for unknown user to avoid leaking which field is wrong,
  // but still honour the lockout when the username matches.
  if (!admin) {
    return res.status(401).json({ error: "Credenziali non valide" });
  }

  if (admin.locked_until && DateTime.fromISO(admin.locked_until) > DateTime.utc()) {
    const mins = Math.max(
      1,
      Math.ceil(DateTime.fromISO(admin.locked_until).diff(DateTime.utc(), "minutes").minutes)
    );
    return res.status(423).json({
      error: `Account bloccato per troppi tentativi. Riprova tra ${mins} minuti.`,
      lockedMinutes: mins,
    });
  }

  const ok = bcrypt.compareSync(password, admin.password_hash);
  if (!ok) {
    const attempts = admin.failed_attempts + 1;
    if (attempts >= ADMIN_MAX_ATTEMPTS) {
      const until = DateTime.utc().plus({ minutes: ADMIN_LOCK_MINUTES }).toISO();
      await q("UPDATE admins SET failed_attempts = 0, locked_until = $1 WHERE id = $2", [
        until,
        admin.id,
      ]);
      return res.status(423).json({
        error: `Troppi tentativi falliti. Account bloccato per ${ADMIN_LOCK_MINUTES} minuti.`,
        lockedMinutes: ADMIN_LOCK_MINUTES,
      });
    }
    await q("UPDATE admins SET failed_attempts = $1 WHERE id = $2", [attempts, admin.id]);
    const left = ADMIN_MAX_ATTEMPTS - attempts;
    return res.status(401).json({ error: `Credenziali non valide. Tentativi rimasti: ${left}.` });
  }

  await q("UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = $1", [admin.id]);
  issueSession(res, { role: "admin", uid: admin.id, name: admin.username });
  res.json({ ok: true, role: "admin", username: admin.username });
}));

app.post("/api/user/register", h(async (req, res) => {
  const first = clean(req.body?.first);
  const last = clean(req.body?.last);
  const password = req.body?.password ?? "";
  if (!first || !last) return res.status(400).json({ error: "Inserisci nome e cognome." });
  if (String(password).length < 4)
    return res.status(400).json({ error: "La password deve avere almeno 4 caratteri." });

  const key = nameKey(first, last);
  const exists = await one("SELECT id FROM employees WHERE name_key = $1", [key]);
  if (exists)
    return res.status(409).json({
      error: "Esiste già un account con questo nome e cognome. Accedi o reimposta la password.",
    });

  const hash = bcrypt.hashSync(String(password), 12);
  const row = await one(
    `INSERT INTO employees (first_name, last_name, name_key, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [first, last, key, hash, nowIso()]
  );
  issueSession(res, { role: "user", uid: row.id, name: `${first} ${last}` });
  res.json({ ok: true, role: "user", firstName: first, lastName: last });
}));

app.post("/api/user/login", h(async (req, res) => {
  const first = clean(req.body?.first);
  const last = clean(req.body?.last);
  const password = req.body?.password ?? "";
  if (!first || !last) return res.status(400).json({ error: "Inserisci nome e cognome." });

  const emp = await one("SELECT * FROM employees WHERE name_key = $1", [nameKey(first, last)]);
  if (!emp || !bcrypt.compareSync(String(password), emp.password_hash)) {
    return res.status(401).json({ error: "Nome, cognome o password non corretti." });
  }
  issueSession(res, { role: "user", uid: emp.id, name: `${emp.first_name} ${emp.last_name}` });
  res.json({ ok: true, role: "user", firstName: emp.first_name, lastName: emp.last_name });
}));

app.post("/api/user/reset-password", h(async (req, res) => {
  const first = clean(req.body?.first);
  const last = clean(req.body?.last);
  const newPassword = req.body?.newPassword ?? "";
  if (!first || !last) return res.status(400).json({ error: "Inserisci nome e cognome." });
  if (String(newPassword).length < 4)
    return res.status(400).json({ error: "La nuova password deve avere almeno 4 caratteri." });

  const emp = await one("SELECT id FROM employees WHERE name_key = $1", [nameKey(first, last)]);
  if (!emp)
    return res.status(404).json({ error: "Nessun account trovato con questo nome e cognome." });

  await q("UPDATE employees SET password_hash = $1 WHERE id = $2", [
    bcrypt.hashSync(String(newPassword), 12),
    emp.id,
  ]);
  res.json({ ok: true });
}));

app.post("/api/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

app.get("/api/config", (req, res) => {
  res.json({ companyName: COMPANY_NAME, timezone: ZONE });
});

app.get("/api/me", (req, res) => {
  const s = readSession(req);
  if (!s) return res.json({ authenticated: false });
  res.json({ authenticated: true, role: s.role, name: s.name });
});

// ================= EMPLOYEE =================

app.get("/api/sites/active", requireUser, h(async (req, res) => {
  const sites = await q(
    "SELECT id, name FROM sites WHERE status = 'active' ORDER BY LOWER(name)"
  );
  res.json({ sites });
}));

app.get("/api/attendance/current", requireUser, h(async (req, res) => {
  const row = await one(
    `SELECT a.id, a.site_id, a.entry_at, s.name AS site_name
       FROM attendances a JOIN sites s ON s.id = a.site_id
       WHERE a.employee_id = $1 AND a.exit_at IS NULL
       ORDER BY a.entry_at DESC LIMIT 1`,
    [req.session.uid]
  );
  res.json({ current: row || null, serverNow: nowIso() });
}));

app.post("/api/attendance/clock-in", requireUser, h(async (req, res) => {
  const siteId = Number(req.body?.site_id);
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);

  if (!isNum(lat) || !isNum(lng)) {
    return res.status(400).json({
      error: "Posizione non disponibile. Attiva il GPS e consenti l'accesso alla posizione.",
      code: "no_gps",
    });
  }

  const open = await one(
    "SELECT id FROM attendances WHERE employee_id = $1 AND exit_at IS NULL",
    [req.session.uid]
  );
  if (open) {
    return res.status(409).json({
      error: "Hai già un turno aperto. Timbra l'uscita prima di iniziarne un altro.",
      code: "already_open",
    });
  }

  const site = await one("SELECT * FROM sites WHERE id = $1", [siteId]);
  if (!site || site.status !== "active") {
    return res.status(400).json({ error: "Cantiere non disponibile." });
  }

  if (!withinRadius(site.lat, site.lng, site.radius_m, lat, lng)) {
    const dist = Math.round(distanceMeters(site.lat, site.lng, lat, lng));
    return res.status(422).json({
      error: `Sei fuori dal raggio del cantiere: avvicinati per timbrare.`,
      code: "out_of_range",
      distance: dist,
      radius: site.radius_m,
    });
  }

  const entry = nowIso();
  const row = await one(
    `INSERT INTO attendances (employee_id, site_id, entry_at, created_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [req.session.uid, siteId, entry, entry]
  );
  res.json({
    ok: true,
    current: { id: row.id, site_id: siteId, site_name: site.name, entry_at: entry },
    serverNow: entry,
  });
}));

app.post("/api/attendance/clock-out", requireUser, h(async (req, res) => {
  const open = await one(
    `SELECT a.*, s.name AS site_name FROM attendances a JOIN sites s ON s.id = a.site_id
       WHERE a.employee_id = $1 AND a.exit_at IS NULL ORDER BY a.entry_at DESC LIMIT 1`,
    [req.session.uid]
  );
  if (!open) return res.status(409).json({ error: "Nessun turno aperto da chiudere." });

  const exit = nowIso();
  await q("UPDATE attendances SET exit_at = $1 WHERE id = $2", [exit, open.id]);
  res.json({
    ok: true,
    siteName: open.site_name,
    entry_at: open.entry_at,
    exit_at: exit,
    seconds: secondsBetween(open.entry_at, exit),
  });
}));

app.get("/api/account/summary", requireUser, h(async (req, res) => {
  const emp = await one("SELECT * FROM employees WHERE id = $1", [req.session.uid]);
  const { startIso, endIso } = monthBoundsUtc();
  const rows = await q(
    `SELECT entry_at, exit_at FROM attendances
       WHERE employee_id = $1 AND exit_at IS NOT NULL AND entry_at >= $2 AND entry_at < $3`,
    [req.session.uid, startIso, endIso]
  );
  const seconds = rows.reduce((acc, r) => acc + secondsBetween(r.entry_at, r.exit_at), 0);
  const monthLabel = DateTime.now().setZone(ZONE).setLocale("it").toFormat("LLLL yyyy");
  res.json({
    firstName: emp.first_name,
    lastName: emp.last_name,
    monthSeconds: seconds,
    monthHms: hms(seconds),
    monthDecimal: decimalHours(seconds),
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    shifts: rows.length,
  });
}));

// ================= ADMIN =================

app.get("/api/admin/sites", requireAdmin, h(async (req, res) => {
  const sites = await q("SELECT * FROM sites ORDER BY status, LOWER(name)");
  res.json({ sites });
}));

function validateSite(body) {
  const name = clean(body?.name);
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const radius = Math.round(Number(body?.radius_m));
  const status = body?.status === "closed" ? "closed" : "active";
  if (!name) return { error: "Il nome del cantiere è obbligatorio." };
  if (!isNum(lat) || lat < -90 || lat > 90) return { error: "Latitudine non valida." };
  if (!isNum(lng) || lng < -180 || lng > 180) return { error: "Longitudine non valida." };
  if (!isNum(radius) || radius < 10 || radius > 5000)
    return { error: "Il raggio deve essere tra 10 e 5000 metri." };
  return { value: { name, lat, lng, radius, status } };
}

app.post("/api/admin/sites", requireAdmin, h(async (req, res) => {
  const v = validateSite(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { name, lat, lng, radius, status } = v.value;
  const row = await one(
    `INSERT INTO sites (name, lat, lng, radius_m, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, lat, lng, radius, status, nowIso()]
  );
  res.json({ ok: true, id: row.id });
}));

app.put("/api/admin/sites/:id", requireAdmin, h(async (req, res) => {
  const id = Number(req.params.id);
  const exists = await one("SELECT id FROM sites WHERE id = $1", [id]);
  if (!exists) return res.status(404).json({ error: "Cantiere non trovato." });
  const v = validateSite(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const { name, lat, lng, radius, status } = v.value;
  await q(
    "UPDATE sites SET name = $1, lat = $2, lng = $3, radius_m = $4, status = $5 WHERE id = $6",
    [name, lat, lng, radius, status, id]
  );
  res.json({ ok: true });
}));

// Daily view: everyone who clocked in on a given Rome-local day.
app.get("/api/admin/day", requireAdmin, h(async (req, res) => {
  const date = clean(req.query?.date) || todayRome();
  const { startIso, endIso } = dayBoundsUtc(date);
  const rows = await q(
    `SELECT a.id, a.entry_at, a.exit_at,
            e.first_name, e.last_name, s.name AS site_name
       FROM attendances a
       JOIN employees e ON e.id = a.employee_id
       JOIN sites s ON s.id = a.site_id
       WHERE a.entry_at >= $1 AND a.entry_at < $2
       ORDER BY a.entry_at ASC`,
    [startIso, endIso]
  );

  const entries = rows.map((r) => {
    const sec = r.exit_at ? secondsBetween(r.entry_at, r.exit_at) : 0;
    return {
      id: r.id,
      employee: `${r.first_name} ${r.last_name}`,
      site: r.site_name,
      entry: romeClockSeconds(r.entry_at),
      exit: r.exit_at ? romeClockSeconds(r.exit_at) : null,
      open: !r.exit_at,
      seconds: sec,
      hms: r.exit_at ? hms(sec) : null,
    };
  });
  const totalSeconds = entries.reduce((a, e) => a + e.seconds, 0);
  res.json({ date, entries, totalSeconds, totalHms: hms(totalSeconds), serverToday: todayRome() });
}));

// Dashboard aggregates over a Rome-local date range (default: current month).
app.get("/api/admin/dashboard", requireAdmin, h(async (req, res) => {
  let startIso, endIso, from, to;
  if (clean(req.query?.from) && clean(req.query?.to)) {
    from = clean(req.query.from);
    to = clean(req.query.to);
    ({ startIso, endIso } = rangeBoundsUtc(from, to));
  } else {
    ({ startIso, endIso } = monthBoundsUtc());
    from = romeDate(startIso);
    to = romeDate(DateTime.fromISO(endIso).minus({ days: 1 }).toISO());
  }

  const rows = await q(
    `SELECT a.entry_at, a.exit_at, e.first_name, e.last_name, s.name AS site_name
       FROM attendances a
       JOIN employees e ON e.id = a.employee_id
       JOIN sites s ON s.id = a.site_id
       WHERE a.entry_at >= $1 AND a.entry_at < $2`,
    [startIso, endIso]
  );

  const byEmp = new Map();
  const bySite = new Map();
  const byDay = new Map();
  let totalSeconds = 0;
  let openCount = 0;

  for (const r of rows) {
    const sec = r.exit_at ? secondsBetween(r.entry_at, r.exit_at) : 0;
    if (!r.exit_at) openCount++;
    totalSeconds += sec;
    const emp = `${r.first_name} ${r.last_name}`;
    const day = romeDate(r.entry_at);
    const e = byEmp.get(emp) || { name: emp, seconds: 0, shifts: 0 };
    e.seconds += sec;
    e.shifts += 1;
    byEmp.set(emp, e);
    const st = bySite.get(r.site_name) || { name: r.site_name, seconds: 0, shifts: 0 };
    st.seconds += sec;
    st.shifts += 1;
    bySite.set(r.site_name, st);
    byDay.set(day, (byDay.get(day) || 0) + sec);
  }

  const fmt = (arr) =>
    arr
      .map((x) => ({ ...x, hms: hms(x.seconds), hours: decimalHours(x.seconds) }))
      .sort((a, b) => b.seconds - a.seconds);

  const perDay = [...byDay.entries()]
    .map(([date, seconds]) => ({ date, seconds, hours: decimalHours(seconds) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  res.json({
    from,
    to,
    totalSeconds,
    totalHms: hms(totalSeconds),
    totalShifts: rows.length,
    openCount,
    perEmployee: fmt([...byEmp.values()]),
    perSite: fmt([...bySite.values()]),
    perDay,
  });
}));

// CSV export, Google Sheets friendly (UTF-8 BOM + comma separated).
app.get("/api/admin/export", requireAdmin, h(async (req, res) => {
  let startIso, endIso, label;
  if (clean(req.query?.from) && clean(req.query?.to)) {
    ({ startIso, endIso } = rangeBoundsUtc(clean(req.query.from), clean(req.query.to)));
    label = `${clean(req.query.from)}_${clean(req.query.to)}`;
  } else {
    const date = clean(req.query?.date) || todayRome();
    ({ startIso, endIso } = dayBoundsUtc(date));
    label = date;
  }

  const rows = await q(
    `SELECT a.entry_at, a.exit_at, e.first_name, e.last_name, s.name AS site_name
       FROM attendances a
       JOIN employees e ON e.id = a.employee_id
       JOIN sites s ON s.id = a.site_id
       WHERE a.entry_at >= $1 AND a.entry_at < $2
       ORDER BY a.entry_at ASC`,
    [startIso, endIso]
  );

  const esc = (val) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = [
    "Data",
    "Dipendente",
    "Cantiere",
    "Entrata",
    "Uscita",
    "Ore (hh:mm:ss)",
    "Ore (decimali)",
    "Stato",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const sec = r.exit_at ? secondsBetween(r.entry_at, r.exit_at) : 0;
    lines.push(
      [
        romeDate(r.entry_at),
        `${r.first_name} ${r.last_name}`,
        r.site_name,
        romeClockSeconds(r.entry_at),
        r.exit_at ? romeClockSeconds(r.exit_at) : "",
        r.exit_at ? hms(sec) : "",
        r.exit_at ? String(decimalHours(sec)).replace(".", ",") : "",
        r.exit_at ? "Chiuso" : "Aperto",
      ]
        .map(esc)
        .join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="presenze_${label}.csv"`);
  res.send(csv);
}));

// ================= STATIC + PAGES =================

app.use("/shared", express.static(path.join(PUB, "shared")));
app.use("/icons", express.static(path.join(PUB, "icons")));

app.get("/manifest.webmanifest", (req, res) =>
  res.type("application/manifest+json").sendFile(path.join(PUB, "manifest.webmanifest"))
);
app.get("/sw.js", (req, res) =>
  res.type("application/javascript").sendFile(path.join(PUB, "sw.js"))
);

app.use("/user", express.static(path.join(PUB, "user")));
app.get(/^\/user(\/.*)?$/, (req, res) => res.sendFile(path.join(PUB, "user", "index.html")));

app.use("/admin", express.static(path.join(PUB, "admin")));
app.get(/^\/admin(\/.*)?$/, (req, res) => res.sendFile(path.join(PUB, "admin", "index.html")));

app.get("/", (req, res) => res.redirect("/user"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// On Vercel (and other serverless hosts) the platform invokes the exported app
// as a function handler — we must NOT open a long-lived listening socket there.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`${COMPANY_NAME} — Presenze Cantieri`);
    console.log(`  Dipendenti (telefono):  http://localhost:${PORT}/user`);
    console.log(`  Admin (pc):             http://localhost:${PORT}/admin`);
  });
}

export default app;
