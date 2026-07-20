import {
  loadConfig, brandHTML, logoMark, api, toast, hms, escapeHTML, COMPANY,
} from "/shared/ui.js";

const app = document.getElementById("app");
const state = { admin: null, page: "dashboard", sidebarOpen: false };

const I = {
  dash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`,
  day: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  sites: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13M10 12h4M10 16h4"/></svg>`,
  download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
  plus: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
  clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
  users: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  trash: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 5v6m4-6v6"/></svg>`,
  menu: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>`,
  empty: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13"/></svg>`,
};

init();
async function init() {
  await loadConfig();
  const me = await api("/api/me");
  if (me.data?.authenticated && me.data.role === "admin") {
    state.admin = { name: me.data.name };
    renderShell();
  } else {
    renderLogin();
  }
}

/* ============================================================= LOGIN */
function renderLogin() {
  app.innerHTML = `
  <div class="admin-login">
    <aside class="admin-login__aside">
      ${brandHTML()}
      <div class="al-hero">
        <h1>Console presenze cantieri</h1>
        <p>Gestisci cantieri, controlla le timbrature giornaliere ed esporta le ore lavorate.</p>
      </div>
      <div class="al-points">
        <div class="al-point"><span>${I.sites}</span> Cantieri con posizione GPS e raggio</div>
        <div class="al-point"><span>${I.day}</span> Vista giornaliera di entrate e uscite</div>
        <div class="al-point"><span>${I.download}</span> Export per Google Fogli</div>
      </div>
    </aside>
    <main class="admin-login__main">
      <div class="admin-login__card">
        <h2>Accedi</h2>
        <p>Area riservata al responsabile HR.</p>
        <form class="form-stack" id="loginForm">
          <div class="field"><label>Nome utente</label><input class="input" id="u" autocomplete="username" placeholder="Nome utente"></div>
          <div class="field"><label>Password</label><input class="input" id="p" type="password" autocomplete="current-password" placeholder="Password"></div>
          <div class="form-msg" id="msg"></div>
          <button class="btn btn--lg btn--block" type="submit">Entra</button>
        </form>
      </div>
    </main>
  </div>`;

  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const msg = document.getElementById("msg");
    btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span>`;
    const r = await api("/api/admin/login", {
      method: "POST",
      body: { username: document.getElementById("u").value.trim(), password: document.getElementById("p").value },
    });
    btn.disabled = false; btn.innerHTML = orig;
    if (r.ok) { state.admin = { name: r.data.username }; renderShell(); }
    else { msg.textContent = r.data?.error || "Accesso non riuscito."; msg.className = "form-msg err"; }
  });
}

/* ============================================================= SHELL */
function renderShell() {
  const nav = [
    ["dashboard", "Dashboard", I.dash],
    ["day", "Vista giornaliera", I.day],
    ["sites", "Cantieri", I.sites],
  ];
  const initials = (state.admin.name || "A").slice(0, 2).toUpperCase();
  app.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="menuBtn">${I.menu}</button>
      ${brandHTML()}
      <span style="width:44px"></span>
    </div>
    <div class="admin-shell">
      <aside class="sidebar" id="sidebar">
        ${brandHTML()}
        ${nav.map(([k, l, ic]) => `<button class="nav-item ${k === state.page ? "is-active" : ""}" data-page="${k}">${ic} ${l}</button>`).join("")}
        <div class="sidebar__foot">
          <div class="sidebar__user"><span class="av">${escapeHTML(initials)}</span><div><b>${escapeHTML(state.admin.name)}</b><div class="muted" style="font-size:var(--fs-xs)">Responsabile HR</div></div></div>
          <button class="btn btn--subtle btn--block" id="logoutBtn">Esci</button>
        </div>
      </aside>
      <main class="content" id="content"></main>
    </div>`;

  app.querySelectorAll(".nav-item").forEach((b) =>
    b.addEventListener("click", () => { state.page = b.dataset.page; state.sidebarOpen = false; renderShell(); })
  );
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    state.admin = null; renderLogin();
  });
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  if (menuBtn) menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    if (sidebar.classList.contains("open")) {
      const scrim = document.createElement("div"); scrim.className = "scrim";
      scrim.addEventListener("click", () => { sidebar.classList.remove("open"); scrim.remove(); });
      app.querySelector(".admin-shell").appendChild(scrim);
    }
  });

  if (state.page === "dashboard") pageDashboard();
  else if (state.page === "day") pageDay();
  else pageSites();
}
const content = () => document.getElementById("content");
const spin = () => `<div class="spin-center"><span class="spinner spinner--ink"></span></div>`;

/* ============================================================= DASHBOARD */
let dashRange = { mode: "month", from: null, to: null };
async function pageDashboard() {
  content().innerHTML = `
    <div class="page-head">
      <div><h1>Dashboard</h1><p>Panoramica di entrate, uscite e ore lavorate.</p></div>
      <div class="head-actions" id="dashFilters"></div>
    </div>
    <div id="dashBody">${spin()}</div>`;
  renderDashFilters();
  await loadDashboard();
}
function renderDashFilters() {
  const el = document.getElementById("dashFilters");
  el.innerHTML = `
    <div class="seg-days" id="rangeSeg">
      <button data-r="month" class="${dashRange.mode === "month" ? "is-active" : ""}">Questo mese</button>
      <button data-r="7" class="${dashRange.mode === "7" ? "is-active" : ""}">7 giorni</button>
      <button data-r="30" class="${dashRange.mode === "30" ? "is-active" : ""}">30 giorni</button>
    </div>
    <button class="btn btn--ghost" id="dashExport">${I.download} Esporta</button>`;
  el.querySelectorAll("#rangeSeg button").forEach((b) =>
    b.addEventListener("click", () => { dashRange = rangeFrom(b.dataset.r); loadDashboard(); renderDashFilters(); })
  );
  document.getElementById("dashExport").addEventListener("click", () => {
    const q = dashRange.mode === "month" ? "" : `?from=${dashRange.from}&to=${dashRange.to}`;
    if (dashRange.mode === "month") { const r = rangeFrom("thismonth"); window.location = `/api/admin/export?from=${r.from}&to=${r.to}`; }
    else window.location = `/api/admin/export${q}`;
  });
}
function rangeFrom(mode) {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (mode === "month") return { mode: "month" };
  if (mode === "thismonth") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { mode: "month", from: iso(first), to: iso(today) };
  }
  const days = Number(mode);
  const from = new Date(today); from.setDate(from.getDate() - (days - 1));
  return { mode, from: iso(from), to: iso(today) };
}
async function loadDashboard() {
  const q = dashRange.mode === "month" ? "" : `?from=${dashRange.from}&to=${dashRange.to}`;
  const r = await api(`/api/admin/dashboard${q}`);
  if (!r.ok) { content().querySelector("#dashBody").innerHTML = `<div class="panel panel--pad">Errore nel caricamento.</div>`; return; }
  const d = r.data;
  const maxEmp = Math.max(1, ...d.perEmployee.map((x) => x.seconds));
  const maxSite = Math.max(1, ...d.perSite.map((x) => x.seconds));
  const maxDay = Math.max(1, ...d.perDay.map((x) => x.seconds));

  document.getElementById("dashBody").innerHTML = `
    <div class="kpi-row">
      <div class="kpi kpi--accent">
        <div class="k-label"><span class="k-ic">${I.clock}</span> Ore totali</div>
        <div class="k-value">${d.totalHms}</div>
        <div class="k-sub">${escapeHTML(labelRange(d))}</div>
      </div>
      <div class="kpi">
        <div class="k-label"><span class="k-ic">${I.users}</span> Turni</div>
        <div class="k-value">${d.totalShifts}</div>
        <div class="k-sub">${d.openCount} ancora aperti</div>
      </div>
      <div class="kpi">
        <div class="k-label"><span class="k-ic">${I.users}</span> Dipendenti attivi</div>
        <div class="k-value">${d.perEmployee.length}</div>
        <div class="k-sub">nel periodo</div>
      </div>
      <div class="kpi">
        <div class="k-label"><span class="k-ic">${I.sites}</span> Cantieri usati</div>
        <div class="k-value">${d.perSite.length}</div>
        <div class="k-sub">nel periodo</div>
      </div>
    </div>

    <div class="panel panel--pad">
      <div class="panel__head" style="padding:0 0 16px;border:0"><h3>Ore per giorno</h3></div>
      ${d.perDay.length ? dayCols(d.perDay, maxDay) : emptyMini("Nessun dato nel periodo.")}
    </div>

    <div class="chart-grid">
      <div class="panel panel--pad">
        <div class="panel__head" style="padding:0 0 10px;border:0"><h3>Ore per dipendente</h3></div>
        ${d.perEmployee.length ? d.perEmployee.map((x) => barRow(x.name, x.seconds, maxEmp)).join("") : emptyMini("Nessun dato.")}
      </div>
      <div class="panel panel--pad">
        <div class="panel__head" style="padding:0 0 10px;border:0"><h3>Ore per cantiere</h3></div>
        ${d.perSite.length ? d.perSite.map((x) => barRow(x.name, x.seconds, maxSite)).join("") : emptyMini("Nessun dato.")}
      </div>
    </div>`;
}
function labelRange(d) {
  return `${d.from} → ${d.to}`;
}
function barRow(name, seconds, max) {
  const pct = Math.round((seconds / max) * 100);
  return `<div class="bar-row"><div class="bl" title="${escapeHTML(name)}">${escapeHTML(name)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
    <div class="bar-val">${hms(seconds)}</div></div>`;
}
function dayCols(perDay, max) {
  return `<div class="cols">${perDay.map((x) => {
    const h = Math.round((x.seconds / max) * 150) + 4;
    const label = x.date.slice(8) + "/" + x.date.slice(5, 7);
    return `<div class="col" title="${x.date} · ${hms(x.seconds)}"><div class="bar" style="height:${h}px"></div><div class="cl">${label}</div></div>`;
  }).join("")}</div>`;
}
function emptyMini(msg) { return `<p class="muted" style="padding:20px 0">${escapeHTML(msg)}</p>`; }

/* ============================================================= DAILY VIEW */
let dayDate = null;
async function pageDay() {
  if (!dayDate) dayDate = new Date().toISOString().slice(0, 10);
  content().innerHTML = `
    <div class="page-head">
      <div><h1>Vista giornaliera</h1><p>Chi è entrato, a che ora e in quale cantiere.</p></div>
      <div class="head-actions">
        <div class="field"><input type="date" class="input" id="dayPicker" value="${dayDate}"></div>
        <button class="btn btn--ghost" id="dayExport">${I.download} Esporta CSV</button>
      </div>
    </div>
    <div id="dayBody">${spin()}</div>`;
  document.getElementById("dayPicker").addEventListener("change", (e) => { dayDate = e.target.value; loadDay(); });
  document.getElementById("dayExport").addEventListener("click", () => { window.location = `/api/admin/export?date=${dayDate}`; });
  await loadDay();
}
async function loadDay() {
  const r = await api(`/api/admin/day?date=${dayDate}`);
  const body = document.getElementById("dayBody");
  if (!r.ok) { body.innerHTML = `<div class="panel panel--pad">Errore nel caricamento.</div>`; return; }
  const d = r.data;
  const rows = d.entries.map((e) => `
    <tr>
      <td class="t-strong">${escapeHTML(e.employee)}</td>
      <td>${escapeHTML(e.site)}</td>
      <td class="t-mono">${e.entry}</td>
      <td class="t-mono">${e.exit ? e.exit : '<span class="badge badge--open badge--dot">In corso</span>'}</td>
      <td class="t-mono t-right t-strong">${e.hms ? e.hms : "—"}</td>
      <td class="t-right"><button class="icon-btn-sm" data-del="${e.id}" title="Elimina timbratura" aria-label="Elimina timbratura">${I.trash}</button></td>
    </tr>`).join("");

  body.innerHTML = `
    <div class="kpi-row">
      <div class="kpi"><div class="k-label"><span class="k-ic">${I.users}</span> Timbrature</div><div class="k-value">${d.entries.length}</div><div class="k-sub">${escapeHTML(prettyDate(d.date))}</div></div>
      <div class="kpi kpi--accent"><div class="k-label"><span class="k-ic">${I.clock}</span> Ore totali</div><div class="k-value">${d.totalHms}</div><div class="k-sub">turni chiusi</div></div>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Dipendente</th><th>Cantiere</th><th>Entrata</th><th>Uscita</th><th class="t-right">Ore</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="6"><div class="empty-row">${I.empty}<div>Nessuna timbratura in questa data.</div></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  body.querySelectorAll("[data-del]").forEach((btn) =>
    btn.addEventListener("click", () => deleteEntry(d.entries.find((e) => e.id === Number(btn.dataset.del))))
  );
}

async function deleteEntry(entry) {
  if (!entry) return;
  const ok = await confirmDialog({
    title: "Eliminare questa timbratura?",
    message: `Stai per eliminare il turno di <b>${escapeHTML(entry.employee)}</b> — cantiere <b>${escapeHTML(entry.site)}</b> (entrata ${entry.entry}${entry.exit ? ", uscita " + entry.exit : ", ancora in corso"}).<br><br>Verrà rimosso <b>anche dal totale ore del dipendente</b>. L'operazione non è reversibile.`,
    confirmLabel: "Elimina",
    danger: true,
  });
  if (!ok) return;
  const r = await api(`/api/admin/attendance/${entry.id}`, { method: "DELETE" });
  if (r.ok) { toast("Timbratura eliminata.", "ok"); loadDay(); }
  else toast(r.data?.error || "Eliminazione non riuscita.", "err");
}

// Reusable confirmation dialog → resolves to true/false.
function confirmDialog({ title, message, confirmLabel = "Conferma", danger = false }) {
  return new Promise((resolve) => {
    const scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML = `
      <div class="modal" style="max-width:440px" role="dialog" aria-modal="true">
        <div class="modal__head"><h3>${escapeHTML(title)}</h3></div>
        <div class="modal__body"><p class="muted" style="line-height:1.55">${message}</p></div>
        <div class="modal__foot">
          <button class="btn btn--subtle" id="c_no">Annulla</button>
          <button class="btn ${danger ? "btn--danger" : ""}" id="c_yes">${escapeHTML(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(scrim);
    const done = (v) => { scrim.remove(); resolve(v); };
    scrim.querySelector("#c_no").addEventListener("click", () => done(false));
    scrim.querySelector("#c_yes").addEventListener("click", () => done(true));
    scrim.addEventListener("click", (e) => { if (e.target === scrim) done(false); });
  });
}
function prettyDate(iso) {
  try { return new Date(iso + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
}

/* ============================================================= SITES */
async function pageSites() {
  content().innerHTML = `
    <div class="page-head">
      <div><h1>Cantieri</h1><p>Crea e gestisci i cantieri con posizione GPS e raggio di tolleranza.</p></div>
      <div class="head-actions"><button class="btn" id="newSite">${I.plus} Nuovo cantiere</button></div>
    </div>
    <div id="sitesBody">${spin()}</div>`;
  document.getElementById("newSite").addEventListener("click", () => openSiteModal());
  await loadSites();
}
async function loadSites() {
  const r = await api("/api/admin/sites");
  const body = document.getElementById("sitesBody");
  if (!r.ok) { body.innerHTML = `<div class="panel panel--pad">Errore nel caricamento.</div>`; return; }
  const sites = r.data.sites;
  const rows = sites.map((s) => `
    <tr>
      <td class="t-strong">${escapeHTML(s.name)}</td>
      <td>
        <div>${s.address ? escapeHTML(s.address) : '<span class="muted">—</span>'}</div>
        <div class="t-mono muted" style="font-size:var(--fs-xs)">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</div>
      </td>
      <td class="t-mono">${s.radius_m} m</td>
      <td>${s.status === "active" ? '<span class="badge badge--in badge--dot">Attivo</span>' : '<span class="badge badge--closed badge--dot">Chiuso</span>'}</td>
      <td class="t-right"><button class="btn btn--ghost" data-edit="${s.id}">${I.edit} Modifica</button></td>
    </tr>`).join("");
  body.innerHTML = `
    <div class="panel">
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Cantiere</th><th>Indirizzo</th><th>Raggio</th><th>Stato</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5"><div class="empty-row">${I.empty}<div>Nessun cantiere. Creane uno per iniziare.</div></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
  body.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => openSiteModal(sites.find((s) => s.id === Number(b.dataset.edit))))
  );
}

// ---- Geocoding via OpenStreetMap / Nominatim (client-side: uses the admin's
// own IP, no API key, avoids cloud-IP rate limits). ----
async function geocodeSearch(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "6",
      countrycodes: "it",
      "accept-language": "it",
    });
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map((d) => ({ label: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) }))
    .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
}
async function reverseGeocode(lat, lng) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?" +
      new URLSearchParams({ lat, lon: lng, format: "jsonv2", "accept-language": "it" });
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()).display_name || null;
  } catch {
    return null;
  }
}

function openSiteModal(site = null) {
  const editing = !!site;
  const s = site || { name: "", address: "", lat: "", lng: "", radius_m: 150, status: "active" };

  // Current chosen location. Prefilled when editing an existing site.
  const picked = {
    lat: isFinite(parseFloat(s.lat)) ? parseFloat(s.lat) : null,
    lng: isFinite(parseFloat(s.lng)) ? parseFloat(s.lng) : null,
    address: s.address || null,
  };
  // Default to the coordinates method when editing a site that has coordinates
  // but no address (e.g. a wooded site set purely by GPS).
  const initialMethod = editing && picked.address == null && picked.lat != null ? "coords" : "address";

  const scrim = document.createElement("div");
  scrim.className = "modal-scrim";
  scrim.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal__head">
        <h3>${editing ? "Modifica cantiere" : "Nuovo cantiere"}</h3>
        <p>Trova il cantiere per indirizzo, oppure impostalo con le coordinate GPS (utile dove non c'è una via, come boschi o campagna).</p>
      </div>
      <div class="modal__body">
        <div class="field"><label>Nome cantiere</label><input class="input" id="m_name" value="${escapeHTML(String(s.name))}" placeholder="Es. Villa Bianchi"></div>

        <div class="field">
          <label>Posizione del cantiere</label>
          <div class="method-tabs" id="m_method">
            <button type="button" data-m="address" class="${initialMethod === "address" ? "is-active" : ""}">${I.search} Cerca indirizzo</button>
            <button type="button" data-m="coords" class="${initialMethod === "coords" ? "is-active" : ""}">${I.pin} Coordinate GPS</button>
          </div>
        </div>

        <div class="method-pane" id="pane_address" ${initialMethod === "address" ? "" : "hidden"}>
          <div class="geo-wrap">
            <span class="geo-ic">${I.search}</span>
            <input class="input geo-input" id="m_addr" autocomplete="off" placeholder="Via, numero civico, città…">
            <div class="geo-results" id="m_results" hidden></div>
          </div>
          <div class="hint">Scrivi l'indirizzo e scegli dal menu: troviamo il punto GPS in automatico.</div>
        </div>

        <div class="method-pane" id="pane_coords" ${initialMethod === "coords" ? "" : "hidden"}>
          <div class="grid-2">
            <div class="field"><label>Latitudine</label><input class="input" id="m_lat" inputmode="decimal" value="${picked.lat ?? ""}" placeholder="45.4642"></div>
            <div class="field"><label>Longitudine</label><input class="input" id="m_lng" inputmode="decimal" value="${picked.lng ?? ""}" placeholder="9.1900"></div>
          </div>
          <button class="btn btn--ghost btn--block" id="useMyPos" type="button" style="margin-top:12px">${I.pin} Usa la mia posizione attuale</button>
          <div class="hint" style="margin-top:8px">Ideale per zone senza indirizzo (boschi, campagna): bastano il punto GPS e il raggio. Puoi anche incollare le coordinate da Google Maps.</div>
        </div>

        <div class="geo-confirmed" id="m_confirmed" hidden></div>

        <div class="field"><label>Raggio di tolleranza (metri)</label><input class="input" id="m_radius" inputmode="numeric" value="${s.radius_m}"><div class="hint">Consigliato 150 m: il GPS non è preciso al metro.</div></div>

        <div class="field"><label>Stato</label>
          <div class="status-toggle" id="m_status">
            <button type="button" data-s="active" class="${s.status === "active" ? "on-active" : ""}">Attivo</button>
            <button type="button" data-s="closed" class="${s.status === "closed" ? "on-closed" : ""}">Chiuso</button>
          </div>
        </div>
      </div>
      <div class="modal__foot">
        <button class="btn btn--subtle" id="m_cancel">Annulla</button>
        <button class="btn" id="m_save">${editing ? "Salva modifiche" : "Crea cantiere"}</button>
      </div>
    </div>`;
  document.body.appendChild(scrim);

  const $ = (sel) => scrim.querySelector(sel);
  const addrInput = $("#m_addr");
  const results = $("#m_results");
  const confirmed = $("#m_confirmed");
  const latInput = $("#m_lat");
  const lngInput = $("#m_lng");
  const nameInput = $("#m_name");

  function renderConfirmed() {
    if (picked.lat == null || picked.lng == null) {
      confirmed.hidden = true;
      confirmed.innerHTML = "";
      return;
    }
    const maps = `https://www.google.com/maps?q=${picked.lat},${picked.lng}`;
    confirmed.hidden = false;
    confirmed.innerHTML = `
      <span class="gc-pin">${I.pin}</span>
      <div class="gc-body">
        <div class="gc-addr">${escapeHTML(picked.address || "Posizione impostata manualmente")}</div>
        <div class="gc-coords t-mono">${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)} · <a href="${maps}" target="_blank" rel="noopener">Vedi su mappa</a></div>
      </div>
      <span class="gc-ok">✓</span>`;
  }
  function setPicked(lat, lng, address) {
    picked.lat = lat; picked.lng = lng; picked.address = address || null;
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    renderConfirmed();
  }
  renderConfirmed();

  // ---- address autocomplete (debounced) ----
  function hideResults() { results.hidden = true; results.innerHTML = ""; }
  function showResults(html) { results.hidden = false; results.innerHTML = html; }
  let debounce;
  let lastQuery = "";
  addrInput.addEventListener("input", () => {
    const query = addrInput.value.trim();
    clearTimeout(debounce);
    if (query.length < 3) { hideResults(); return; }
    showResults(`<div class="geo-loading"><span class="spinner spinner--ink"></span> Cerco l'indirizzo…</div>`);
    debounce = setTimeout(async () => {
      lastQuery = query;
      try {
        const items = await geocodeSearch(query);
        if (query !== lastQuery) return; // superseded by newer keystrokes
        if (!items.length) {
          showResults(`<div class="geo-empty">Nessun indirizzo trovato. Prova a essere più preciso o usa le coordinate manuali.</div>`);
          return;
        }
        showResults(
          items
            .map(
              (it, i) =>
                `<button type="button" class="geo-item" data-i="${i}">${I.pin}<span>${escapeHTML(it.label)}</span></button>`
            )
            .join("")
        );
        results.querySelectorAll(".geo-item").forEach((el) =>
          el.addEventListener("click", () => {
            const it = items[Number(el.dataset.i)];
            setPicked(it.lat, it.lng, it.label);
            addrInput.value = "";
            hideResults();
            if (!nameInput.value.trim()) {
              // Suggest a readable name: "Via Roma 12" rather than just "12".
              const parts = it.label.split(",").map((p) => p.trim());
              nameInput.value =
                /^\d+[a-z]?$/i.test(parts[0]) && parts[1] ? `${parts[1]} ${parts[0]}` : parts[0];
            }
          })
        );
      } catch {
        showResults(`<div class="geo-empty">Ricerca non disponibile ora. Inserisci le coordinate manualmente (opzioni avanzate).</div>`);
      }
    }, 600);
  });
  document.addEventListener("click", (e) => {
    if (!results.hidden && !scrim.querySelector(".geo-wrap").contains(e.target)) hideResults();
  });

  // ---- manual coordinate edits keep `picked` in sync ----
  function syncManual() {
    const la = parseFloat(latInput.value);
    const ln = parseFloat(lngInput.value);
    if (isFinite(la) && isFinite(ln)) {
      picked.lat = la; picked.lng = ln;
      picked.address = picked.address; // keep any address label
      renderConfirmed();
    }
  }
  latInput.addEventListener("input", () => { picked.address = null; syncManual(); });
  lngInput.addEventListener("input", () => { picked.address = null; syncManual(); });

  // ---- method tabs (address vs coordinates) ----
  const methodBox = $("#m_method");
  methodBox.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      methodBox.querySelectorAll("button").forEach((x) => x.classList.remove("is-active"));
      b.classList.add("is-active");
      $("#pane_address").hidden = b.dataset.m !== "address";
      $("#pane_coords").hidden = b.dataset.m !== "coords";
      hideResults();
    })
  );

  // ---- status toggle ----
  let status = s.status;
  const statusBox = $("#m_status");
  statusBox.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      status = b.dataset.s;
      statusBox.querySelectorAll("button").forEach((x) => { x.className = ""; });
      b.className = status === "active" ? "on-active" : "on-closed";
    })
  );

  // ---- use my current position (with reverse geocode for a friendly label) ----
  $("#useMyPos").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    if (!navigator.geolocation) { toast("GPS non disponibile su questo dispositivo.", "err"); return; }
    btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = `<span class="spinner spinner--ink"></span> Rilevo…`;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocode(latitude, longitude);
        setPicked(latitude, longitude, addr);
        btn.disabled = false; btn.innerHTML = orig;
        toast("Posizione attuale inserita.", "ok");
      },
      () => { btn.disabled = false; btn.innerHTML = orig; toast("Impossibile leggere la posizione.", "err"); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });

  const close = () => scrim.remove();
  $("#m_cancel").addEventListener("click", close);
  scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });

  $("#m_save").addEventListener("click", async () => {
    if (picked.lat == null || picked.lng == null) {
      toast("Cerca l'indirizzo del cantiere (o inserisci le coordinate).", "err");
      return;
    }
    const body = {
      name: nameInput.value.trim(),
      address: picked.address,
      lat: picked.lat,
      lng: picked.lng,
      radius_m: parseInt($("#m_radius").value, 10),
      status,
    };
    const btn = $("#m_save");
    btn.disabled = true; const orig = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span>`;
    const r = editing
      ? await api(`/api/admin/sites/${site.id}`, { method: "PUT", body })
      : await api("/api/admin/sites", { method: "POST", body });
    btn.disabled = false; btn.innerHTML = orig;
    if (r.ok) { close(); toast(editing ? "Cantiere aggiornato." : "Cantiere creato.", "ok"); loadSites(); }
    else toast(r.data?.error || "Salvataggio non riuscito.", "err");
  });
}
