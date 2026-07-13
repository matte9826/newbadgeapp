/* Shared UI helpers for both apps: logo, API wrapper, toasts, formatting.
   The logo is an inline SVG placeholder (leaf mark) shown top-left on every
   screen; swap `logoMark()` / public/icons for the real company logo later. */

export const COMPANY = { name: "The Secret Garden" };

export async function loadConfig() {
  try {
    const r = await fetch("/api/config");
    if (r.ok) {
      const cfg = await r.json();
      if (cfg.companyName) COMPANY.name = cfg.companyName;
    }
  } catch {}
  return COMPANY;
}

/** Inline SVG leaf mark in brand green. */
export function logoMark(size = 34) {
  return `
  <svg class="brand__mark" width="${size}" height="${size}" viewBox="0 0 40 40"
       fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="40" height="40" rx="11" fill="#16A34A"/>
    <path d="M28.5 11.5c0 8.4-5.6 14.2-13.4 15.1-.4-6.9 3.2-11.6 8.2-13.6-4.4 1-8.1 3.6-10.2 8.1-1.2-1.9-1.6-4-1.6-5.7 5.2-4.9 12.6-4.4 17-3.9Z"
          fill="#DCFCE7"/>
    <path d="M12.2 30c1.2-4.4 3.4-7.6 6.6-10" stroke="#DCFCE7" stroke-width="2"
          stroke-linecap="round"/>
  </svg>`;
}

/** Full brand lockup (mark + wordmark). Rendered top-left on every page. */
export function brandHTML(href = null) {
  const inner = `
    ${logoMark()}
    <span class="brand__name">
      <b>${COMPANY.name}</b>
      <span>Presenze Cantieri</span>
    </span>`;
  return href
    ? `<a class="brand" href="${href}">${inner}</a>`
    : `<div class="brand">${inner}</div>`;
}

/** JSON fetch wrapper. Returns { ok, status, data }. */
export async function api(path, { method = "GET", body } = {}) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res, data;
  try {
    res = await fetch(path, opts);
    data = await res.json().catch(() => ({}));
  } catch (e) {
    return { ok: false, status: 0, data: { error: "Connessione non riuscita. Riprova." } };
  }
  return { ok: res.ok, status: res.status, data };
}

let toastWrap;
export function toast(message, kind = "") {
  if (!toastWrap) {
    toastWrap = document.createElement("div");
    toastWrap.className = "toast-wrap";
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement("div");
  el.className = "toast" + (kind ? ` toast--${kind}` : "");
  el.innerHTML = message;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s, transform .25s";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 260);
  }, kind === "err" ? 4200 : 2800);
}

/** seconds -> "HH:MM:SS" */
export function hms(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

/** seconds -> "3h 20m" compact */
export function humanHours(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/** Register the service worker (installable PWA). Safe to call anywhere. */
export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}
