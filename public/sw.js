const CACHE_NAME = "comedy-planner-v4";

// Install Event
self.addEventListener("install", (e) => {
  console.log("[Service Worker] Installing...");
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activating...");
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log("[Service Worker] Claiming clients");
      return self.clients.claim();
    })
  );
});

// Fetch Event - Network First, Cache Fallback
self.addEventListener("fetch", (e) => {
  // Skip non-GET requests and API routes
  if (e.request.method !== "GET") {
    return;
  }

  // Skip API routes
  if (e.request.url.includes("/api/")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(e.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to index.html for SPA navigation
          if (e.request.mode === "navigate") {
            return caches.match("/index.html");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
