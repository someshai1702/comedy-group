import { useEffect, useState, useCallback } from "react";
import { initializePushNotifications, getNotificationStatus, showLocalNotification, sendNotificationToAll, NotificationTemplates } from "../services/notificationService";

export function usePushNotifications() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<string>("");

  const initializePush = useCallback(async () => {
    try {
      console.log("🔔 Starting push notification initialization...");
      const success = await initializePushNotifications();
      setIsSubscribed(success);
      if (success) {
        setNotificationPermission("granted");
        setNotificationStatus("✅ Notifications enabled! You will receive event alerts.");
        
        // Test notification after a short delay
        setTimeout(() => {
          showLocalNotification(
            "🎉 Notifications Enabled!",
            "You will now receive alerts for new events and updates."
          );
        }, 2000);
      } else {
        setNotificationStatus("⚠️ Push subscription failed. Check browser console for errors.");
      }
    } catch (error: any) {
      console.error("Failed to initialize push notifications:", error);
      setNotificationStatus("❌ Error: " + (error.message || "Unknown error"));
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
          } else {
            setNotificationStatus("❌ Notifications blocked by user");
          }
        });
      } else if (status === "granted") {
        initializePush();
      } else {
        setNotificationStatus("❌ Notifications blocked - enable in browser settings");
      }
    } else {
      setNotificationStatus("❌ Your browser doesn't support push notifications");
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

  const testNotification = useCallback(async () => {
    showLocalNotification(
      "🧪 Test Notification",
      "This is a test notification from Comedy Group Planner!"
    );
    
    // Also try sending via server
    const result = await sendNotificationToAll(NotificationTemplates.newEvent("Test Event", "System"));
    console.log("Server notification result:", result);
  }, []);

  return {
    notificationPermission,
    isSubscribed,
    fcmToken,
    notificationStatus,
    requestPermission,
    showLocalNotification,
    testNotification
  };
}

export { showLocalNotification, sendNotificationToAll, NotificationTemplates } from "../services/notificationService";