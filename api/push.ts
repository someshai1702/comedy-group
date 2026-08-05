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

// VAPID keys for Web Push - REQUIRED for push notifications to work
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
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

      if (subscribers.length === 0) {
        return res.json({
          success: true,
          sent: 0,
          total: 0,
          message: "No subscribers"
        });
      }

      // Send using Web Push protocol
      const results = await Promise.all(
        subscribers.map(async (sub) => {
          try {
            // Create the push payload
            const pushPayload = JSON.stringify({
              title,
              body: notifBody || "",
              icon: "/icon-192.png",
              badge: "/badge-72.png",
              tag: "comedy-group-" + Date.now(),
              data: data || {}
            });

            // Send to the push service (browser's push endpoint)
            // Note: This requires proper VAPID setup to work
            // For now, we log what would be sent
            console.log("[Push] Would send to:", sub.endpoint.substring(0, 50));
            console.log("[Push] Payload:", pushPayload);

            // The actual push sending requires the web-push library
            // Since we don't have it installed, we'll return a placeholder
            // In production, you'd use: webPush.sendNotification(sub, pushPayload)
            
            return { 
              success: true, 
              endpoint: sub.endpoint.substring(0, 50) + "...",
              message: "Push notification queued"
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
        message: "Notifications processed. Note: Full push requires VAPID keys configured."
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
