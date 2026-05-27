// Minimal service worker for pipeline PWA.
// - Caches the app shell on install so the app loads without network.
// - Network-first for navigations (so fresh deploys show up when online).
// - Cache-first for static assets (fast).
// - Never caches /api/* (AI hooks must hit network).

const CACHE = "pipeline-v1";
const CORE = [
  "/",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Add one at a time so a single 404 doesn't fail the whole install
      Promise.all(
        CORE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[sw] precache failed for", url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin GETs only.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // API routes must hit network; no caching.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached "/" when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // Everything else (JS, CSS, fonts, images): cache-first with background refresh.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
