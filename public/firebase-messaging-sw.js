// Firebase Messaging Service Worker
// This handles push notifications when the app is in the background
//
// SETUP REQUIRED:
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Set environment variables in Vercel:
//    - VITE_FIREBASE_API_KEY
//    - VITE_FIREBASE_AUTH_DOMAIN
//    - VITE_FIREBASE_PROJECT_ID
//    - VITE_FIREBASE_STORAGE_BUCKET
//    - VITE_FIREBASE_MESSAGING_SENDER_ID
//    - VITE_FIREBASE_APP_ID
//    - VITE_FIREBASE_VAPID_KEY (from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Default Firebase config - will be overwritten by config from main app
let firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Listen for configuration from main app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    console.log("[FCM SW] Received Firebase config");
    
    // Initialize Firebase with received config
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Get messaging instance
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
  }
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
