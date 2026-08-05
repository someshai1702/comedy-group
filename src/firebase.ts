// Firebase configuration for frontend
// These values should be set as environment variables in Vercel

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration - set these in Vercel Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBbKwHnN6Em2K_16-4oY2xtgmBxml8R4Lo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "comedy-group-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "comedy-group-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "comedy-group-project.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "841868646390",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:841868646390:web:cb41e7892ab8ddbc4759d7",
};

// Initialize Firebase only once
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) {
    console.warn("[Firebase] Not configured. Set VITE_FIREBASE_* environment variables.");
    return null;
  }

  if (!app) {
    app = getApps().length === 0 
      ? initializeApp(firebaseConfig)
      : getApps()[0];
  }
  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  if (!messaging) {
    try {
      messaging = getMessaging(firebaseApp);
    } catch (error) {
      console.error("[Firebase] Failed to get messaging:", error);
      return null;
    }
  }
  return messaging;
}

// Request FCM token
export async function requestFCMToken(): Promise<string | null> {
  const mess = getFirebaseMessaging();
  if (!mess) {
    console.warn("[Firebase] Messaging not available");
    return null;
  }

  try {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn("[Firebase] Service workers not supported");
      return null;
    }

    // Get existing token or request new one
    const token = await getToken(mess, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "BBpGh0AzhMCqEIb7nc9qbIakcQc662UG4pu8H5PSiF2TR8WKoiwiw0QkUfOpmaT6Vk0qo1zkMcqLS5X-h2coRnE",
    });

    if (token) {
      console.log("[Firebase] FCM Token obtained:", token.substring(0, 20) + "...");
      return token;
    } else {
      console.log("[Firebase] No registration token available");
      return null;
    }
  } catch (error) {
    console.error("[Firebase] Error getting token:", error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  const mess = getFirebaseMessaging();
  if (!mess) {
    return null;
  }

  try {
    const unsubscribe = onMessage(mess, (payload) => {
      console.log("[Firebase] Foreground message received:", payload);
      callback(payload);
    });
    return unsubscribe;
  } catch (error) {
    console.error("[Firebase] Error setting up foreground listener:", error);
    return null;
  }
}
