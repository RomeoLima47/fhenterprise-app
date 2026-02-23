// FH Enterprise Service Worker — Offline Cache + Auto-Sync
const CACHE_NAME = "fh-enterprise-v1";
const STATIC_CACHE = "fh-static-v1";
const DATA_CACHE = "fh-data-v1";

// App shell files to precache
const APP_SHELL = [
  "/",
  "/dashboard",
  "/board",
  "/calendar",
  "/projects",
  "/templates",
  "/analytics",
  "/team",
];

// ─── INSTALL: Precache app shell ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache what we can — don't fail if some routes need auth
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => {
            // Some routes may redirect to login — that's OK
          })
        )
      );
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// ─── ACTIVATE: Clean old caches ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ─── FETCH: Network-first with cache fallback ───────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations go through Convex WebSocket)
  if (request.method !== "GET") return;

  // Skip Convex WebSocket and API calls
  if (url.hostname.includes("convex.cloud")) return;

  // Skip Clerk auth endpoints
  if (url.hostname.includes("clerk")) return;

  // Skip browser extension requests
  if (url.protocol === "chrome-extension:") return;

  // For navigation requests (HTML pages): network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(() => {
          // Offline — serve from cache
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Fallback to cached root
            return caches.match("/") || new Response(
              offlinePage(),
              { headers: { "Content-Type": "text/html" } }
            );
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // For API/data requests: network-first with data cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(DATA_CACHE).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── SYNC: Background sync when back online ─────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "fh-sync-mutations") {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  // Notify all clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_START" });
  });

  // The actual sync is handled by Convex's built-in reconnection
  // This just notifies the UI
  clients.forEach((client) => {
    client.postMessage({ type: "SYNC_COMPLETE" });
  });
}

// ─── MESSAGE: Handle messages from the app ──────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CACHE_URLS") {
    const urls = event.data.urls || [];
    caches.open(STATIC_CACHE).then((cache) => {
      urls.forEach((url) => cache.add(url).catch(() => {}));
    });
  }
});

// ─── Offline fallback page ──────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FH Enterprise — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; padding: 2rem; max-width: 400px; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 0.875rem; line-height: 1.5; margin-bottom: 1.5rem; }
    button { background: #3b82f6; color: white; border: none; padding: 0.625rem 1.5rem; border-radius: 0.5rem; font-size: 0.875rem; cursor: pointer; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>FH Enterprise needs an internet connection to sync your data. Your recent changes will be saved automatically when you reconnect.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;
}