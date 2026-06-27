// Notification Service
// Handles push notifications for PWA on all devices and browsers

import { VAPID_PUBLIC_KEY } from "./firebase";

const API_BASE = "/api";

// Types
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export interface DeviceSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  browser: string;
  createdAt: string;
}

// Register service worker and subscribe to push
export async function initializePushNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push notifications not supported");
    return false;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("Service Worker registered:", registration.scope);

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return false;
    }

    // Subscribe to push
    const subscription = await subscribeToPush(registration);
    if (subscription) {
      // Save subscription to server
      await saveSubscription(subscription);
      console.log("Push subscription saved");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Push initialization failed:", error);
    return false;
  }
}

async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      // Already subscribed
      return existingSubscription;
    }

    // Check if VAPID key is configured
    if (VAPID_PUBLIC_KEY.includes("YOUR_")) {
      console.warn("VAPID key not configured. Using demo mode.");
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    return subscription;
  } catch (error) {
    console.error("Subscribe to push failed:", error);
    return null;
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

// Send notification to all subscribers (called from admin panel)
export async function sendNotificationToAll(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (error) {
    console.error("Send notification failed:", error);
    return false;
  }
}

// Show local notification (for demo/testing)
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

// Event creation notification templates
export const NotificationTemplates = {
  newEvent: (eventName: string, host: string) => ({
    title: "🎉 New Event Created!",
    body: `${eventName} - Hosted by ${host}. Tap to RSVP now!`,
    icon: "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: "new-event"
  }),

  eventReminder: (eventName: string, deadline: string) => ({
    title: "⏰ Event Reminder",
    body: `${eventName} - Vote before ${deadline}`,
    icon: "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: "event-reminder"
  }),

  eventUpdate: (eventName: string) => ({
    title: "📢 Event Update",
    body: `${eventName} has been updated. Check the latest details!`,
    icon: "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: "event-update"
  }),

  ticketUpdate: (eventName: string, totalTickets: number) => ({
    title: "🎟️ Ticket Update",
    body: `${eventName}: ${totalTickets} tickets confirmed`,
    icon: "/public/comedy_group.png",
    badge: "/public/comedy_group.png",
    tag: "ticket-update"
  })
};

// Helper function
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

// Get notification permission status
export function getNotificationStatus(): "granted" | "denied" | "default" {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}
