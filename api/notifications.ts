import type { VercelRequest, VercelResponse } from "@vercel/node";

// In-memory notifications store (persists across function invocations)
let notificationsCache: any[] = [];
let cacheInitialized = false;

// Default notifications (empty)
const DEFAULT_NOTIFICATIONS: any[] = [];

// GET /api/notifications - List all notifications
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const id = query.id as string;

  if (method === "GET") {
    // Return cached notifications
    return res.json({ 
      success: true, 
      notifications: cacheInitialized ? notificationsCache : DEFAULT_NOTIFICATIONS 
    });
  }

  if (method === "POST") {
    const { type, title, message, targetFamilyId, eventId, fromFamilyId } = body;

    if (!type || !message) {
      return res.status(400).json({ error: "Missing required fields (type, message)" });
    }

    // Create new notification
    const newNotification: any = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type || "info",
      title: title || "",
      message,
      targetFamilyId: targetFamilyId || "all", // "all" means broadcast to all
      eventId: eventId || null,
      fromFamilyId: fromFamilyId || null,
      read: false,
      createdAt: new Date().toISOString()
    };

    // Add to cache
    notificationsCache.unshift(newNotification);
    cacheInitialized = true;

    // Keep only last 100 notifications
    if (notificationsCache.length > 100) {
      notificationsCache = notificationsCache.slice(0, 100);
    }

    console.log("[Notifications] Created notification:", newNotification.id);

    return res.json({ success: true, notification: newNotification });
  }

  if (method === "PUT" && id) {
    // Mark notification as read
    const idx = notificationsCache.findIndex(n => n.id === id);
    if (idx >= 0) {
      notificationsCache[idx].read = true;
      return res.json({ success: true, notification: notificationsCache[idx] });
    }
    return res.status(404).json({ error: "Notification not found" });
  }

  if (method === "DELETE" && id) {
    // Delete notification
    notificationsCache = notificationsCache.filter(n => n.id !== id);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
