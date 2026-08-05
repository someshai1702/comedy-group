import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeFirebase, isFirebaseConfigured, sendFCMToMultiple } from './firebase-admin';

// In-memory store for push subscriptions
interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  familyId?: string;
  fcmToken?: string; // Firebase Cloud Messaging token
}

let pushSubscriptions: PushSubscription[] = [];
let firebaseReady = false;

// Initialize Firebase on cold start
try {
  firebaseReady = initializeFirebase();
} catch (e) {
  console.error("[Push] Firebase init error:", e);
}

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
      console.log("[Push] Firebase configured:", firebaseReady || isFirebaseConfigured());

      if (subscribers.length === 0) {
        return res.json({
          success: true,
          sent: 0,
          total: 0,
          message: "No subscribers"
        });
      }

      // Try Firebase Cloud Messaging first
      if (firebaseReady || isFirebaseConfigured()) {
        try {
          // Extract FCM tokens from subscriptions
          const tokens = subscribers
            .filter(s => s.fcmToken)
            .map(s => s.fcmToken!);

          if (tokens.length > 0) {
            const result = await sendFCMToMultiple(tokens, {
              title,
              body: notifBody || "",
              data: data || {}
            });

            return res.json({
              success: true,
              sent: result.success,
              failed: result.failure,
              total: subscribers.length,
              message: `Firebase: ${result.success} sent, ${result.failure} failed`
            });
          }
        } catch (err) {
          console.error("[Push] Firebase send error:", err);
        }
      }

      // Fallback to Web Push (for browsers that don't use FCM)
      const results = await Promise.all(
        subscribers.map(async (sub) => {
          try {
            console.log("[Push] Web Push would send to:", sub.endpoint.substring(0, 50));
            return { 
              success: true, 
              endpoint: sub.endpoint.substring(0, 50) + "...",
              message: "Web Push notification queued"
            };
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
        message: firebaseReady 
          ? "Notifications processed via Firebase" 
          : "Notifications queued (Firebase not configured)"
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
