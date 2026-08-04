import type { VercelRequest, VercelResponse } from "@vercel/node";

// In-memory store for push subscriptions
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  familyId?: string;
}

let pushSubscriptions: PushSubscription[] = [];

// Firebase Cloud Messaging server key (for legacy FCM API)
// This should be stored as an environment variable
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "";

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

// Convert base64 to Uint8Array for VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = Buffer.from(base64, "base64");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData[i];
  }
  return outputArray;
}

// POST - Subscribe to push notifications
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, body } = req;

  if (method === "POST") {
    // Subscribe endpoint
    if (body.action === "subscribe") {
      const { subscription, familyId } = body;

      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription" });
      }

      // Check if already subscribed
      const existingIdx = pushSubscriptions.findIndex(s => s.endpoint === subscription.endpoint);
      
      const newSub: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        familyId: familyId || "unknown"
      };

      if (existingIdx >= 0) {
        pushSubscriptions[existingIdx] = newSub;
      } else {
        pushSubscriptions.push(newSub);
      }

      console.log("[Push] New subscription for family:", familyId, "Endpoint:", subscription.endpoint.substring(0, 50) + "...");

      return res.json({ success: true, message: "Subscribed to push notifications" });
    }

    // Unsubscribe endpoint
    if (body.action === "unsubscribe") {
      const { endpoint } = body;

      if (!endpoint) {
        return res.status(400).json({ error: "Invalid endpoint" });
      }

      pushSubscriptions = pushSubscriptions.filter(s => s.endpoint !== endpoint);
      console.log("[Push] Unsubscribed:", endpoint.substring(0, 50) + "...");

      return res.json({ success: true, message: "Unsubscribed from push notifications" });
    }

    // Send notification to all subscribers
    if (body.action === "send" || (!body.action && body.title)) {
      const { title, body: notifBody, data, targetFamilyId } = body;

      if (!title) {
        return res.status(400).json({ error: "Missing title" });
      }

      // Filter subscribers by family if specified
      const subscribers = targetFamilyId && targetFamilyId !== "all"
        ? pushSubscriptions.filter(s => s.familyId === targetFamilyId)
        : pushSubscriptions;

      console.log("[Push] Sending to", subscribers.length, "subscribers. Title:", title);

      const results = await Promise.all(
        subscribers.map(async (sub) => {
          try {
            // Send using Web Push format
            const payload = JSON.stringify({
              notification: {
                title,
                body: notifBody || "",
                icon: "/icon-192.png",
                badge: "/badge-72.png",
                tag: "comedy-group",
                data: data || {}
              },
              data: data || {}
            });

            // Try FCM Web Push API
            if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
              const response = await fetch(sub.endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "TTL": "86400",
                  "Urgency": "high"
                },
                body: payload
              });

              if (!response.ok) {
                console.error("[Push] Failed to send to:", sub.endpoint.substring(0, 50));
              }
              return { success: response.ok, endpoint: sub.endpoint };
            }

            return { success: false, endpoint: sub.endpoint, error: "No VAPID keys configured" };
          } catch (err) {
            console.error("[Push] Error sending:", err);
            return { success: false, endpoint: sub.endpoint, error: String(err) };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;

      return res.json({
        success: true,
        sent: successCount,
        total: subscribers.length,
        results
      });
    }
  }

  // GET - Get subscription count
  if (method === "GET") {
    return res.json({
      success: true,
      subscriberCount: pushSubscriptions.length,
      subscriptions: pushSubscriptions.map(s => ({
        endpoint: s.endpoint.substring(0, 50) + "...",
        familyId: s.familyId
      }))
    });
  }

  // DELETE - Clear all subscriptions (admin only)
  if (method === "DELETE") {
    pushSubscriptions = [];
    return res.json({ success: true, message: "All subscriptions cleared" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
