import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRET_FILE = path.join(__dirname, "..", "data", ".jwt_secret");

// Resolve a stable signing secret: prefer env, else a persisted random one so
// sessions survive restarts without hard-coding anything into the repo.
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  try {
    return fs.readFileSync(SECRET_FILE, "utf8").trim();
  } catch {
    const secret = crypto.randomBytes(48).toString("hex");
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
    return secret;
  }
}

const SECRET = resolveSecret();
const COOKIE = "sgp_session";
const MAX_AGE = 1000 * 60 * 60 * 12; // 12h

export function issueSession(res, payload) {
  const token = jwt.sign(payload, SECRET, { expiresIn: "12h" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Server-side role enforcement on every protected route. The separate /admin
// and /user URLs are only entry points, never a security boundary.
export function requireAdmin(req, res, next) {
  const s = readSession(req);
  if (!s || s.role !== "admin") {
    return res.status(401).json({ error: "Non autorizzato" });
  }
  req.session = s;
  next();
}

export function requireUser(req, res, next) {
  const s = readSession(req);
  if (!s || s.role !== "user") {
    return res.status(401).json({ error: "Non autorizzato" });
  }
  req.session = s;
  next();
}
