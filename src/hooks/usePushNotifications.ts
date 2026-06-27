import { useEffect } from "react";

export function usePushNotifications() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      // Request notification permission
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted");
            subscribeToPush();
          }
        });
      } else if (Notification.permission === "granted") {
        subscribeToPush();
      }
    }
  }, []);
}

async function subscribeToPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    
    if (existingSubscription) {
      console.log("Already subscribed to push notifications");
      return;
    }

    // VAPID public key placeholder
    const applicationServerKey = urlBase64ToUint8Array(
      "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
    );

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log("Push subscription successful:", subscription);
    
    // Send subscription to server if needed
    // await fetch("/api/push/subscribe", {
    //   method: "POST",
    //   body: JSON.stringify(subscription),
    // });
    
  } catch (error) {
    console.error("Push subscription failed:", error);
  }
}

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

export function showLocalNotification(title: string, body: string) {
  if (typeof window !== "undefined" && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: "comedy-group-notification",
    });
  }
}