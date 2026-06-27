const CACHE_NAME = "comedy-planner-v5";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/comedy_group.png",
  "/icon-72.png",
  "/icon-96.png",
  "/icon-128.png",
  "/icon-144.png",
  "/icon-152.png",
  "/icon-192.png",
  "/icon-384.png",
  "/icon-512.png",
  "/src/main.tsx",
  "/src/index.css",
  "/src/App.tsx",
  "/src/types.ts"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching App Shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.error("[Service Worker] Cache open error: ", err);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache First with Network Fallback
self.addEventListener("fetch", (e) => {
  // Only cache GET requests, skip API routes
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        // Cache newly fetched assets
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline mode
        return caches.match("/");
      });
    })
  );
});

// Push Notification Event
self.addEventListener("push", (e) => {
  let data = {
    title: "Comedy Group",
    body: "You have a new notification!",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    tag: "comedy-group-notification",
    vibrate: [100, 50, 100],
    requireInteraction: true
  };

  if (e.data) {
    try {
      const payload = e.data.json();
      data = {
        ...data,
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        tag: payload.tag || data.tag
      };
    } catch (err) {
      data.body = e.data.text() || data.body;
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      vibrate: data.vibrate,
      requireInteraction: data.requireInteraction,
      actions: [
        { action: "open", title: "View" },
        { action: "dismiss", title: "Dismiss" }
      ]
    })
  );
});

// Notification Click Event
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") {
    return;
  }

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Background Sync for offline notifications (optional)
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-notifications") {
    console.log("[Service Worker] Background sync for notifications");
  }
});
