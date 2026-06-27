import { useEffect, useState, useCallback } from "react";
import { initializePushNotifications, getNotificationStatus, showLocalNotification } from "../services/notificationService";

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  const initializePush = useCallback(async () => {
    try {
      const success = await initializePushNotifications();
      setIsSubscribed(success);
      if (success) {
        setNotificationPermission("granted");
      }
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      const status = getNotificationStatus();
      setNotificationPermission(status);

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
  }, [initializePush]);

  const requestPermission = useCallback(async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      await initializePush();
    }
    return permission;
  }, [initializePush]);

  return {
    notificationPermission,
    isSubscribed,
    fcmToken,
    requestPermission,
    showLocalNotification
  };
}

export { showLocalNotification } from "../services/notificationService";