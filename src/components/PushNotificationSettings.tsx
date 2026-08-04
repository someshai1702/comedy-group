import { useState, useEffect } from "react";

interface PushNotificationSettingsProps {
  familyId?: string;
}

export default function PushNotificationSettings({ familyId }: PushNotificationSettingsProps) {
  // Default to enabled - will be corrected after checking browser permission
  const [permission, setPermission] = useState<NotificationPermission>("granted");
  const [subscribed, setSubscribed] = useState(true); // Default to enabled
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check current permission and subscription status on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const browserPerm = Notification.permission;
      setPermission(browserPerm);

      // If browser permission is denied, show correct state
      if (browserPerm === "denied") {
        setSubscribed(false);
        return;
      }

      // Check if already subscribed
      checkSubscription();
    }
  }, [familyId]);

  const checkSubscription = async () => {
    try {
      const res = await fetch("/api/push");
      const data = await res.json();
      if (data.subscriptions) {
        const hasSubscription = data.subscriptions.some(
          (s: any) => s.familyId === familyId
        );
        setSubscribed(hasSubscription);
      }
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  };

  const enableNotifications = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        // Register service worker
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.ready;

          // Subscribe to push (using Web Push API)
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
            )
          });

          // Send subscription to backend
          const res = await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "subscribe",
              subscription: subscription.toJSON(),
              familyId
            })
          });

          const data = await res.json();
          if (data.success) {
            setSubscribed(true);
            setMessage({ type: "success", text: "Push notifications enabled!" });
          } else {
            setMessage({ type: "error", text: "Failed to enable notifications" });
          }
        }
      } else {
        setMessage({ type: "error", text: "Notification permission denied" });
      }
    } catch (err) {
      console.error("Enable notifications error:", err);
      setMessage({ type: "error", text: "Failed to enable notifications" });
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Get current subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Notify backend
        await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "unsubscribe",
            endpoint: subscription.endpoint
          })
        });
      }

      setSubscribed(false);
      setMessage({ type: "success", text: "Push notifications disabled" });
    } catch (err) {
      console.error("Disable notifications error:", err);
      setMessage({ type: "error", text: "Failed to disable notifications" });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          permission === "granted" && subscribed
            ? "bg-green-100 text-green-600"
            : permission === "denied"
            ? "bg-red-100 text-red-600"
            : "bg-gray-100 text-gray-600"
        }`}>
          {permission === "granted" && subscribed ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          ) : permission === "denied" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">Push Notifications</h4>
          <p className="text-sm text-gray-500">
            {permission === "granted" && subscribed
              ? "Receiving event notifications"
              : permission === "denied"
              ? "Notifications blocked by browser"
              : "Get notified when events are created"}
          </p>
        </div>

        <div>
          {permission === "denied" ? (
            <span className="text-sm text-red-500 font-medium">Blocked</span>
          ) : subscribed ? (
            <button
              onClick={disableNotifications}
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Disable"}
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={loading || permission === "denied"}
              className="px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "..." : "Enable"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
