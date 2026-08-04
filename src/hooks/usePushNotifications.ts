import { useState, useEffect, useCallback } from "react";

// Firebase configuration - replace with your Firebase project values
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if Firebase is already initialized
let firebaseInitialized = false;
let messaging: any = null;

export function usePushNotifications(familyId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [token, setToken] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Firebase
  const initializeFirebase = useCallback(async () => {
    if (firebaseInitialized || typeof window === "undefined") return;

    try {
      // Check if firebase is available
      if (!(window as any).firebase) {
        // Load Firebase SDK if not already loaded
        if (!document.querySelector('script[src*="firebase-app"]')) {
          await loadFirebaseSDK();
        }
      }

      if ((window as any).firebase) {
        (window as any).firebase.initializeApp(firebaseConfig);
        messaging = (window as any).firebase.messaging();
        firebaseInitialized = true;
        
        // Register service worker
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          console.log("[Push] Service worker registered:", registration.scope);
        }
      }
    } catch (err) {
      console.error("[Push] Firebase init error:", err);
      setError("Failed to initialize Firebase");
    }
  }, []);

  // Load Firebase SDK dynamically
  const loadFirebaseSDK = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
      script.onload = () => {
        const script2 = document.createElement("script");
        script2.src = "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js";
        script2.onload = () => resolve();
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!familyId) {
      setError("No family ID provided");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize Firebase if needed
      await initializeFirebase();

      if (!messaging) {
        // Fallback: Use browser's Push API directly
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
            )
          });

          // Send subscription to backend
          await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "subscribe",
              subscription: subscription.toJSON(),
              familyId
            })
          });

          setSubscribed(true);
          setPermission("granted");
          return true;
        }
        return false;
      }

      // Use Firebase Cloud Messaging
      const token = await messaging.getToken({
        vapidKey: "YOUR_VAPID_KEY" // Replace with your VAPID public key
      });

      if (token) {
        // Send token to backend
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            subscription: { endpoint: token, keys: {} },
            familyId
          })
        });

        setToken(token);
        setSubscribed(true);
        setPermission("granted");
        return true;
      }
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setError(String(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, [familyId, initializeFirebase]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true);

    try {
      if (messaging) {
        await messaging.deleteToken(token || undefined);
      }

      if (token) {
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            endpoint: token
          })
        });
      }

      setToken(null);
      setSubscribed(false);
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Check current permission on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  // Auto-subscribe when family ID is available
  useEffect(() => {
    if (familyId && permission === "granted" && !subscribed) {
      subscribe();
    }
  }, [familyId, permission, subscribed, subscribe]);

  return {
    permission,
    token,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
