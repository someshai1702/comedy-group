import { useEffect, useState } from "react";
import { initializePushNotifications, getNotificationStatus } from "../services/notificationService";

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] = useState<string>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      // Check current permission status
      const status = getNotificationStatus();
      setNotificationPermission(status);

      // Request permission if not already granted
      if (status === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
          if (permission === "granted") {
            initializePush();
          }
        });
      } else if (status === "granted") {
        initializePush();
      }
    }
  }, []);

  const initializePush = async () => {
    try {
      const success = await initializePushNotifications();
      setIsSubscribed(success);
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
    }
  };

  return {
    notificationPermission,
    isSubscribed,
    requestPermission: () => Notification.requestPermission()
  };
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