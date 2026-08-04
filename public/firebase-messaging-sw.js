// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background
//
// SETUP REQUIRED:
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Replace the firebaseConfig below with your project's config
// 3. Add your VAPID key in Firebase Console → Messaging → Settings → Web Push certificates

importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// Firebase configuration - REPLACE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging
const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log("[FCM SW] Received background message:", payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || "Comedy Group";
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || "New notification",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: payload.data?.tag || "default",
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: "open", title: "Open App" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM SW] Notification clicked:", event);
  
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes("comedy-group") && "focus" in client) {
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
