// Notification Service
// Handles push notifications for PWA on all devices and browsers

import { getToken, onMessage, isSupported } from "firebase/messaging";
import { getMessaging } from "firebase/messaging";
import { initializeApp } from "firebase/app";
import { firebaseConfig, VAPID_PUBLIC_KEY } from "./firebase";

const API_BASE = "/api";

// Initialize Firebase Messaging
let messaging: any = null;
let notificationPermission: NotificationPermission = "default";

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export interface NotificationMessage {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  type: "event" | "reminder" | "update" | "ticket";
}

// Check if Firebase Messaging is supported
async function checkMessagingSupport(): Promise<boolean> {
  try {
    const supported = await isSupported();
    console.log("Firebase Messaging supported:", supported);
    return supported;
  } catch (error) {
    console.warn("Error checking messaging support:", error);
    return false;
  }
}

// Initialize Firebase and messaging
export async function initializePushNotifications(): Promise<boolean> {
  console.log("🚀 Initializing push notifications...");
  
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("❌ Push notifications not supported - no service worker or push manager");
    return false;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Service Worker registered:", registration.scope);

    // Request notification permission
    notificationPermission = await Notification.requestPermission();
    console.log("📝 Notification permission:", notificationPermission);
    
    if (notificationPermission !== "granted") {
      console.warn("❌ Notification permission denied");
      return false;
    }

    // Check if Firebase Messaging is supported
    const fcmSupported = await checkMessagingSupport();
    if (!fcmSupported) {
      console.warn("⚠️ Firebase Messaging not supported, using browser push");
      return await subscribeBrowserPush(registration);
    }

    // Initialize Firebase Messaging
    try {
      console.log("🔧 Initializing Firebase with config:", firebaseConfig.projectId);
      const app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
      console.log("✅ Firebase Messaging initialized");

      // Get FCM token
      console.log("🔑 Getting FCM token with VAPID key...");
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log("✅ FCM Token obtained:", token.substring(0, 50) + "...");
        await saveFCMToken(token);
        
        // Listen for foreground messages
        onMessage(messaging, (payload: any) => {
          console.log("📨 Foreground message received:", payload);
          showNotificationFromPayload(payload);
        });
        
        return true;
      } else {
        console.warn("⚠️ No FCM token returned - notifications may not work");
      }
    } catch (fcmError: any) {
      console.error("❌ Firebase Messaging error:", fcmError.message || fcmError);
      // Fallback to browser push
      console.log("🔄 Falling back to browser push...");
      return await subscribeBrowserPush(registration);
    }

    return false;
  } catch (error: any) {
    console.error("❌ Push initialization failed:", error.message || error);
    return false;
  }
}

async function subscribeBrowserPush(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await saveSubscription(subscription);
    console.log("Browser push subscription saved");
    return true;
  } catch (error) {
    console.error("Browser push subscription failed:", error);
    return false;
  }
}

async function saveFCMToken(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: `https://fcm.googleapis.com/fcm/send/${token}`,
        keys: { p256dh: token, auth: "auth" },
        fcmToken: token,
        type: "fcm"
      })
    });
  } catch (error) {
    console.error("Save FCM token failed:", error);
  }
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch(`${API_BASE}/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription)
    });
  } catch (error) {
    console.error("Save subscription failed:", error);
  }
}

// Send notification to all subscribers
export async function sendNotificationToAll(payload: NotificationPayload): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return { success: response.ok, message: result.message || "Notification sent" };
  } catch (error) {
    console.error("Send notification failed:", error);
    return { success: false, message: "Failed to send notification" };
  }
}

// Show notification from Firebase payload
function showNotificationFromPayload(payload: any): void {
  const notificationTitle = payload.notification?.title || payload.title || "Comedy Group";
  const notificationOptions = {
    body: payload.notification?.body || payload.body || "",
    icon: payload.notification?.icon || "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: payload.data?.tag || "comedy-group",
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(notificationTitle, notificationOptions);
    });
  }
}

// Show local notification
export function showLocalNotification(title: string, body: string, options?: NotificationOptions): void {
  if (Notification.permission !== "granted") {
    console.warn("Notification permission not granted");
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification(title, {
      body,
      icon: "/public/comedy_group.png",
      badge: "/public/comedy_group.png",
      tag: "comedy-group",
      vibrate: [200, 100, 200],
      requireInteraction: true,
      ...options
    });
  });
}

// Event notification templates
export const NotificationTemplates = {
  newEvent: (eventName: string, host: string) => ({
    title: "🎉 New Event Created!",
    body: `${eventName} - Hosted by ${host}. Tap to RSVP now!`,
    tag: "new-event",
    type: "event" as const
  }),
  eventReminder: (eventName: string, deadline: string) => ({
    title: "⏰ Event Reminder",
    body: `${eventName} - Vote before ${deadline}`,
    tag: "event-reminder",
    type: "reminder" as const
  }),
  eventUpdate: (eventName: string) => ({
    title: "📢 Event Update",
    body: `${eventName} has been updated. Check the latest details!`,
    tag: "event-update",
    type: "update" as const
  }),
  ticketUpdate: (eventName: string, totalTickets: number) => ({
    title: "🎟️ Ticket Update",
    body: `${eventName}: ${totalTickets} tickets confirmed`,
    tag: "ticket-update",
    type: "ticket" as const
  })
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getNotificationStatus(): "granted" | "denied" | "default" {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

// Get notification permission state
export function getPermissionState(): NotificationPermission {
  if (typeof Notification !== "undefined") {
    return Notification.permission;
  }
  return "denied";
}
