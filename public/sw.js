/* Service worker — enables installability and an offline app shell.
   Deliberately conservative: never caches /api responses (they depend on the
   server clock and the session), so attendance data is always live. */
const VERSION = "sgp-v1";
const SHELL = [
  "/shared/tokens.css",
  "/shared/ui.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never intercept API calls — always hit the network for live/authorised data.
  if (url.pathname.startsWith("/api/")) return;

  // App shell / static assets: cache-first, then update in the background.
  if (SHELL.includes(url.pathname) || url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/shared/")) {
    e.respondWith(
      caches.match(request).then((cached) => {
        const net = fetch(request)
          .then((res) => {
            if (res.ok) caches.open(VERSION).then((c) => c.put(request, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // Navigations: network-first, fall back to a cached page shell when offline.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request).catch(() => caches.match(request).then((c) => c || caches.match("/user")))
    );
  }
});
