import {
  loadConfig, brandHTML, logoMark, api, toast, hms, humanHours,
  escapeHTML, registerSW, COMPANY,
} from "/shared/ui.js";

const app = document.getElementById("app");
const state = {
  user: null,           // { firstName, lastName }
  view: "home",         // home | site | account
  sites: [],
  currentSite: null,    // site being viewed
  attendance: null,     // open attendance { id, site_id, site_name, entry_at }
  serverOffset: 0,      // serverNow - clientNow (ms)
  busy: false,
};
let chronoTimer = null;

/* ---------- icons ---------- */
const I = {
  user: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  site: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13M10 12h4M10 16h4"/></svg>`,
  chevron: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  empty: `<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V8l6-4 6 4v13"/></svg>`,
};

/* ---------- boot ---------- */
init();
async function init() {
  registerSW();
  await loadConfig();
  const me = await api("/api/me");
  if (me.data?.authenticated && me.data.role === "user") {
    const [first, ...rest] = (me.data.name || "").split(" ");
    state.user = { firstName: first, lastName: rest.join(" ") };
    await refreshData();
    render();
  } else {
    renderAuth();
  }
}

function serverNow() { return Date.now() + state.serverOffset; }

async function refreshData() {
  const [sitesR, curR] = await Promise.all([
    api("/api/sites/active"),
    api("/api/attendance/current"),
  ]);
  state.sites = sitesR.data?.sites || [];
  state.attendance = curR.data?.current || null;
  if (curR.data?.serverNow) {
    state.serverOffset = Date.parse(curR.data.serverNow) - Date.now();
  }
}

/* ============================================================= AUTH */
function renderAuth(mode = "login") {
  stopChrono();
  const tabs = [
    ["login", "Accedi"],
    ["register", "Registrati"],
    ["reset", "Password"],
  ];
  app.innerHTML = `
    <div class="auth">
      <div class="auth__logo">
        ${logoMark(76).replace('class="brand__mark"', 'class="mark-lg"')}
        <div>
          <h1>${escapeHTML(COMPANY.name)}</h1>
          <p>Presenze Cantieri · Area dipendenti</p>
        </div>
      </div>
      <div class="auth__card">
        <div class="seg" role="tablist">
          ${tabs.map(([k, l]) => `<button data-mode="${k}" class="${k === mode ? "is-active" : ""}">${l}</button>`).join("")}
        </div>
        <div id="authForm"></div>
      </div>
    </div>`;
  app.querySelectorAll(".seg button").forEach((b) =>
    b.addEventListener("click", () => renderAuth(b.dataset.mode))
  );
  renderAuthForm(mode);
}

function renderAuthForm(mode) {
  const box = document.getElementById("authForm");
  const nameFields = `
    <div class="field"><label>Nome</label><input class="input" id="f_first" autocomplete="given-name" placeholder="Es. Marco"></div>
    <div class="field"><label>Cognome</label><input class="input" id="f_last" autocomplete="family-name" placeholder="Es. Rossi"></div>`;

  if (mode === "login") {
    box.innerHTML = `
      <form class="form-stack" id="theForm">
        ${nameFields}
        <div class="field"><label>Password</label><input class="input" id="f_pass" type="password" autocomplete="current-password" placeholder="La tua password"></div>
        <div class="form-msg" id="msg"></div>
        <button class="btn btn--lg btn--block" type="submit">Accedi</button>
      </form>`;
    bindForm(async (v) => {
      const r = await api("/api/user/login", { method: "POST", body: { first: v.first, last: v.last, password: v.pass } });
      return handleAuth(r);
    });
  } else if (mode === "register") {
    box.innerHTML = `
      <form class="form-stack" id="theForm">
        ${nameFields}
        <div class="field"><label>Scegli una password</label><input class="input" id="f_pass" type="password" autocomplete="new-password" placeholder="Almeno 4 caratteri"></div>
        <div class="form-msg" id="msg"></div>
        <button class="btn btn--lg btn--block" type="submit">Crea account</button>
        <p class="auth__foot">Chiunque abbia il link può registrarsi.</p>
      </form>`;
    bindForm(async (v) => {
      const r = await api("/api/user/register", { method: "POST", body: { first: v.first, last: v.last, password: v.pass } });
      return handleAuth(r);
    });
  } else {
    box.innerHTML = `
      <form class="form-stack" id="theForm">
        <p class="muted" style="font-size:var(--fs-sm)">Reinserisci nome e cognome e scegli una nuova password.</p>
        ${nameFields}
        <div class="field"><label>Nuova password</label><input class="input" id="f_pass" type="password" autocomplete="new-password" placeholder="Almeno 4 caratteri"></div>
        <div class="form-msg" id="msg"></div>
        <button class="btn btn--lg btn--block" type="submit">Reimposta password</button>
      </form>`;
    bindForm(async (v) => {
      const r = await api("/api/user/reset-password", { method: "POST", body: { first: v.first, last: v.last, newPassword: v.pass } });
      if (r.ok) {
        showMsg("Password aggiornata. Ora puoi accedere.", "ok");
        setTimeout(() => renderAuth("login"), 1200);
        return true;
      }
      showMsg(r.data?.error || "Operazione non riuscita.", "err");
      return false;
    });
  }
}

function bindForm(submit) {
  const form = document.getElementById("theForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = {
      first: document.getElementById("f_first")?.value.trim(),
      last: document.getElementById("f_last")?.value.trim(),
      pass: document.getElementById("f_pass")?.value ?? "",
    };
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span>`;
    await submit(v);
    btn.disabled = false;
    btn.innerHTML = orig;
  });
}
function showMsg(text, kind) {
  const m = document.getElementById("msg");
  if (m) { m.textContent = text; m.className = `form-msg ${kind}`; }
}
async function handleAuth(r) {
  if (r.ok) {
    state.user = { firstName: r.data.firstName, lastName: r.data.lastName };
    await refreshData();
    state.view = "home";
    render();
    return true;
  }
  showMsg(r.data?.error || "Accesso non riuscito.", "err");
  return false;
}

/* ============================================================= SHELL */
function header() {
  return `
    <header class="u-header">
      ${brandHTML()}
      <button class="icon-btn" id="accountBtn" aria-label="Account">${I.user}</button>
    </header>`;
}
function mount(html) {
  app.innerHTML = header() + `<main class="u-main">${html}</main>`;
  const ab = document.getElementById("accountBtn");
  if (ab) ab.addEventListener("click", () => { state.view = "account"; render(); });
}

function render() {
  stopChrono();
  if (state.view === "site") return renderSite();
  if (state.view === "account") return renderAccount();
  return renderHome();
}

/* ============================================================= HOME */
function renderHome() {
  const hi = state.user?.firstName ? `Ciao, ${escapeHTML(state.user.firstName)}` : "Ciao";
  let resume = "";
  if (state.attendance) {
    resume = `
      <div class="resume-banner" id="resumeBanner">
        <div class="rb-meta">
          <small>Turno in corso</small>
          <div>${escapeHTML(state.attendance.site_name)}</div>
        </div>
        <div class="rb-clock" id="rbClock">00:00:00</div>
        ${I.chevron}
      </div>`;
  }

  const cards = state.sites.length
    ? `<div class="site-list">${state.sites.map(siteCard).join("")}</div>`
    : `<div class="empty">${I.empty}<p>Nessun cantiere attivo al momento.</p></div>`;

  mount(`
    <div class="u-greeting">
      <h2>${hi}</h2>
      <p>Tocca il cantiere di oggi per timbrare.</p>
    </div>
    ${resume}
    <div class="section-label">Cantieri attivi</div>
    ${cards}
  `);

  state.sites.forEach((s) => {
    document.getElementById(`site-${s.id}`)?.addEventListener("click", () => openSite(s));
  });
  const rb = document.getElementById("resumeBanner");
  if (rb) {
    const site = { id: state.attendance.site_id, name: state.attendance.site_name };
    rb.addEventListener("click", () => openSite(site));
    startChrono(() => {
      const el = document.getElementById("rbClock");
      if (el) el.textContent = hms((serverNow() - Date.parse(state.attendance.entry_at)) / 1000);
    });
  }
}
function siteCard(s) {
  const active = state.attendance && state.attendance.site_id === s.id;
  return `
    <button class="site-card" id="site-${s.id}">
      <span class="site-card__icon">${I.site}</span>
      <span class="site-card__body">
        <h3>${escapeHTML(s.name)}</h3>
        <p>${active ? '<span class="badge badge--in badge--dot">Sei in servizio qui</span>' : "Tocca per aprire"}</p>
      </span>
      <span class="site-card__chev">${I.chevron}</span>
    </button>`;
}
function openSite(site) { state.currentSite = site; state.view = "site"; render(); }

/* ============================================================= SITE / STAMP */
function renderSite() {
  const site = state.currentSite;
  const open = state.attendance;
  const openHere = open && open.site_id === site.id;
  const openElsewhere = open && open.site_id !== site.id;

  let zone = "";
  if (openHere) {
    zone = `
      <div class="chrono">
        <div class="status-pill"><span class="live-dot"></span> In servizio</div>
        <div class="chrono__time" id="chronoTime">00:00:00</div>
        <div class="chrono__since">Entrata registrata alle ${clock(open.entry_at)}</div>
      </div>
      <button class="stamp-btn stamp-btn--out" id="stampBtn">
        ${I.stop}
        <span class="stamp-btn__label">Timbra uscita</span>
        <span class="stamp-btn__sub">Chiudi il turno</span>
      </button>`;
  } else if (openElsewhere) {
    zone = `
      <div class="blocked-note">Hai un turno aperto in <b>${escapeHTML(open.site_name)}</b>.<br>Timbra prima l'uscita da quel cantiere.</div>
      <button class="stamp-btn stamp-btn--blocked" disabled>
        ${I.bolt}
        <span class="stamp-btn__label">Non disponibile</span>
      </button>
      <button class="btn btn--ghost" id="goOther">Vai al turno aperto</button>`;
  } else {
    zone = `
      <p class="offduty-hint">Premi per timbrare l'entrata. Verificheremo che tu sia in cantiere.</p>
      <button class="stamp-btn stamp-btn--in" id="stampBtn">
        ${I.bolt}
        <span class="stamp-btn__label">Timbra entrata</span>
        <span class="stamp-btn__sub">Tocca per iniziare</span>
      </button>
      <div class="gps-note">${I.pin} Serve la posizione GPS attiva</div>`;
  }

  mount(`
    <button class="back-btn" id="backBtn">${I.back} Cantieri</button>
    <div class="site-view">
      <div class="site-hero">
        <div class="eyebrow">Cantiere</div>
        <h2>${escapeHTML(site.name)}</h2>
      </div>
      <div class="stamp-zone">${zone}</div>
    </div>
  `);

  document.getElementById("backBtn").addEventListener("click", () => { state.view = "home"; render(); });
  const other = document.getElementById("goOther");
  if (other) other.addEventListener("click", () => openSite({ id: open.site_id, name: open.site_name }));

  const btn = document.getElementById("stampBtn");
  if (openHere) {
    startChrono(() => {
      const el = document.getElementById("chronoTime");
      if (el) el.textContent = hms((serverNow() - Date.parse(open.entry_at)) / 1000);
    });
    btn.addEventListener("click", clockOut);
  } else if (!openElsewhere) {
    btn.addEventListener("click", () => clockIn(site, btn));
  }
}
function clock(iso) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
}

/* ---- Clock IN: GPS check then register ---- */
function clockIn(site, btn) {
  if (state.busy) return;
  if (!("geolocation" in navigator)) {
    toast("Il tuo dispositivo non supporta il GPS.", "err");
    return;
  }
  state.busy = true;
  setLoading(btn, "Verifico la posizione…");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const r = await api("/api/attendance/clock-in", {
        method: "POST",
        body: { site_id: site.id, lat: latitude, lng: longitude },
      });
      state.busy = false;
      if (r.ok) {
        state.attendance = r.data.current;
        if (r.data.serverNow) state.serverOffset = Date.parse(r.data.serverNow) - Date.now();
        toast(`Entrata registrata alle <b>${clock(r.data.current.entry_at)}</b>`, "ok");
        render();
      } else {
        if (r.data?.code === "out_of_range") {
          toast(`${r.data.error} <b>(${r.data.distance} m dal cantiere)</b>`, "err");
        } else {
          toast(r.data?.error || "Timbratura non riuscita.", "err");
        }
        render();
      }
    },
    (err) => {
      state.busy = false;
      render();
      const msg =
        err.code === err.PERMISSION_DENIED
          ? "Posizione negata. Attiva la posizione e consenti l'accesso per timbrare."
          : "Impossibile leggere il GPS. Controlla che la posizione sia attiva.";
      toast(msg, "err");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

/* ---- Clock OUT ---- */
async function clockOut() {
  if (state.busy) return;
  state.busy = true;
  const r = await api("/api/attendance/clock-out", { method: "POST" });
  state.busy = false;
  if (r.ok) {
    state.attendance = null;
    toast(`Uscita registrata · ${humanHours(r.data.seconds)} di lavoro`, "ok");
    render();
  } else {
    toast(r.data?.error || "Uscita non riuscita.", "err");
    await refreshData();
    render();
  }
}

function setLoading(btn, label) {
  btn.className = "stamp-btn stamp-btn--loading";
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span><span class="stamp-btn__label">${label}</span>`;
}

/* ============================================================= ACCOUNT */
async function renderAccount() {
  mount(`<button class="back-btn" id="backBtn">${I.back} Indietro</button>
    <div class="loading-screen" style="min-height:40vh"><span class="spinner spinner--ink"></span></div>`);
  document.getElementById("backBtn").addEventListener("click", () => { state.view = "home"; render(); });

  const r = await api("/api/account/summary");
  if (!r.ok) { toast("Impossibile caricare l'account.", "err"); return; }
  const d = r.data;
  const initials = `${(d.firstName || "?")[0] || ""}${(d.lastName || "")[0] || ""}`.toUpperCase();

  mount(`
    <button class="back-btn" id="backBtn2">${I.back} Indietro</button>
    <div class="account-head">
      <div class="avatar">${escapeHTML(initials)}</div>
      <div><h2>${escapeHTML(d.firstName)} ${escapeHTML(d.lastName)}</h2><p class="muted">Dipendente</p></div>
    </div>
    <div class="hours-card">
      <div class="hc-label">Ore lavorate</div>
      <div class="hc-big">${d.monthHms}</div>
      <div class="hc-month">${escapeHTML(d.monthLabel)}</div>
      <div class="hc-meta">
        <div><b>${d.monthDecimal}</b>ore totali</div>
        <div><b>${d.shifts}</b>turni chiusi</div>
      </div>
    </div>
    <div class="account-actions">
      <button class="btn btn--subtle btn--block" id="logoutBtn">Esci</button>
    </div>
    <p class="muted" style="text-align:center;margin-top:16px;font-size:var(--fs-xs)">Il totale mostra il mese in corso e riparte da zero ogni mese.<br>Lo storico resta sempre salvato.</p>
  `);
  document.getElementById("backBtn2").addEventListener("click", () => { state.view = "home"; render(); });
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    state.user = null; state.attendance = null; state.view = "home";
    renderAuth();
  });
}

/* ============================================================= chrono */
function startChrono(tick) {
  stopChrono();
  tick();
  chronoTimer = setInterval(tick, 1000);
}
function stopChrono() {
  if (chronoTimer) { clearInterval(chronoTimer); chronoTimer = null; }
}
