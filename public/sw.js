const CACHE_NAME = "comedy-planner-v6";

// Install Event
self.addEventListener("install", (e) => {
  console.log("[Service Worker] Installing...");
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

// Fetch Event - Network First with Cache Fallback
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push Notification Event - Enhanced with Sound & Badges
self.addEventListener("push", (e) => {
  let notificationData = {
    title: "🎉 Comedy Group",
    body: "You have a new notification!",
    icon: "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: "comedy-group",
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    silent: false,
    timestamp: Date.now()
  };

  if (e.data) {
    try {
      const payload = e.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
        icon: payload.icon || "/public/comedy_group.png",
        badge: payload.badge || "/public/comedy_group.png"
      };
    } catch (err) {
      notificationData.body = e.data.text() || notificationData.body;
    }
  }

  e.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      vibrate: notificationData.vibrate,
      requireInteraction: notificationData.requireInteraction,
      timestamp: notificationData.timestamp,
      data: {
        url: notificationData.url || "/",
        dateOfArrival: Date.now()
      },
      actions: [
        { action: "open", title: "📱 Open App" },
        { action: "dismiss", title: "❌ Dismiss" }
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

  const targetUrl = e.notification.data?.url || "/";

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message handler for direct notifications from the app
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, badge, tag } = e.data;
    
    self.registration.showNotification(title, {
      body,
      icon: icon || "/public/comedy_group.png",
      badge: badge || "/public/comedy_group.png",
      tag: tag || "comedy-group",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      timestamp: Date.now()
    });
  }
});

// Background Sync
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-notifications") {
    console.log("[Service Worker] Syncing notifications...");
  }
});
