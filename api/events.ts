import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache for events (persists across function invocations in same container)
let eventsCache: any[] | null = null;
let cacheLoaded = false;

// Mapping of short family IDs to UUIDs (from Supabase)
const FAMILY_ID_MAP: Record<string, string> = {
  "sharma": "54d7240d-09d2-495e-8ae5-bb0f00751668",
  "patel": "2e8e1bc8-0cdc-483b-8057-996659382b93",
  "joshi": "e0618efa-7f1b-4a48-be38-650139fd730d",
  "kapoor": "862b7940-e238-4211-9bc8-94cfbc4c6cec",
  "malhotra": "537da851-dedc-426f-b20a-9f454253cce8",
  "shah": "37458b23-234e-486a-89c1-fca8a8dd9cd8",
  "admin": "ee5a209b-0d3e-4a96-81ee-1b232d582983",
  "mehta": "54d7240d-09d2-495e-8ae5-bb0f00751668", // Default to Sharma if not found
  "mangesh": "a62fa2c5-71e2-48eb-8151-90ccc48a693e"
};

// Default events
const DEFAULT_EVENTS = [
  {
    id: "demo-event-1",
    name: "August Weekend Dinner",
    type: "Weekend Dinner",
    hostFamilyId: "sharma",
    date: "2026-08-15",
    time: "19:00",
    restaurant: "Spice Garden",
    address: "123 Main St",
    notes: "Let's have a great time!",
    isActive: true
  }
];

// Load events from embedded data
function getDefaultEvents(): any[] {
  return DEFAULT_EVENTS;
}

// Get UUID for a family ID (short ID or UUID)
function getFamilyUUID(shortId: string): string {
  // If it's already a UUID, return it
  if (shortId.includes("-") && shortId.length === 36) {
    return shortId;
  }
  // Look up in our map
  return FAMILY_ID_MAP[shortId.toLowerCase()] || shortId;
}

// Reverse mapping: UUID to short ID
const UUID_TO_FAMILY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(FAMILY_ID_MAP).map(([k, v]) => [v, k])
);

// Convert DB row to event object
function rowToEvent(row: any): any {
  // Convert UUID back to short family ID for display
  const hostFamilyId = UUID_TO_FAMILY_MAP[row.host_family_id] || row.host_family_id;
  
  return {
    id: row.id,
    name: row.name || "",
    type: row.type,
    hostFamilyId: hostFamilyId,
    date: row.date,
    time: row.time,
    restaurant: row.restaurant || "",
    address: row.address || "",
    googleMapsUrl: row.google_maps_url || "",
    deadline: row.last_order_date,
    notes: row.notes || "",
    isActive: row.is_active !== false
  };
}

// Event object to DB row
function eventToRow(event: any): any {
  return {
    name: event.name || "",
    type: event.type,
    host_family_id: event.hostFamilyId, // Using short IDs like "sharma"
    date: event.date,
    time: event.time,
    last_order_date: event.deadline || null,
    restaurant: event.restaurant || null,
    address: event.address || null,
    notes: event.notes || null,
    is_active: event.isActive !== false
  };
}

// GET /api/events - List all events
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const id = query.id as string;

  if (method === "GET") {
    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const events = data.map(rowToEvent);
        eventsCache = events;
        cacheLoaded = true;
        return res.json({ success: true, events, _source: "supabase" });
      }
    } catch (err) {
      console.error("Supabase error:", err);
    }

    // Use cache if available
    if (cacheLoaded && eventsCache && eventsCache.length > 0) {
      return res.json({ success: true, events: eventsCache, _source: "cache" });
    }

    // Fall back to default events
    return res.json({ success: true, events: DEFAULT_EVENTS, _source: "default" });
  }

  if (method === "POST") {
    const { name, type, hostFamilyId, date, time, restaurant, address, notes, deadline } = body;

    if (!type || !hostFamilyId || !date || !time) {
      return res.status(400).json({ error: "Missing required event fields (type, hostFamilyId, date, time)" });
    }

    // Create the new event
    const newEvent: any = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || "",
      type,
      hostFamilyId,
      date,
      time,
      restaurant: restaurant || "",
      address: address || "",
      notes: notes || "",
      isActive: true
    };

    if (deadline) {
      newEvent.deadline = deadline;
    } else {
      // Calculate deadline (4 hours before event time)
      const eventDateTime = new Date(date + "T" + time);
      newEvent.deadline = new Date(eventDateTime.getTime() - 4 * 60 * 60 * 1000).toISOString();
    }

    // Try to save to Supabase
    let savedToSupabase = false;
    try {
      // Get the UUID for the host family
      const familyUUID = getFamilyUUID(hostFamilyId);
      
      console.log("[Events] Saving event with host_family_id:", familyUUID, "(from:", hostFamilyId, ")");

      // Calculate deadline if not provided (default: 4 hours before event)
      let deadlineDate = newEvent.deadline;
      if (!deadlineDate) {
        const eventDateTime = new Date(date + "T" + time);
        deadlineDate = new Date(eventDateTime.getTime() - 4 * 60 * 60 * 1000).toISOString();
      }

      const eventRow = {
        name: newEvent.name,
        type: newEvent.type,
        host_family_id: familyUUID,
        date: newEvent.date,
        time: newEvent.time,
        last_order_date: deadlineDate, // Required field
        restaurant: newEvent.restaurant || null,
        address: newEvent.address || null,
        notes: newEvent.notes || null
      };

      const { data, error } = await supabase
        .from("events")
        .insert([eventRow])
        .select()
        .single();

      if (!error && data) {
        newEvent.id = data.id;
        newEvent.deadline = deadlineDate;
        savedToSupabase = true;
        console.log("[Events] Successfully saved to Supabase:", data.id);
      } else if (error) {
        console.error("[Events] Supabase insert error:", error);
      }
    } catch (err) {
      console.error("[Events] Supabase save error:", err);
    }

    // Update cache
    if (!eventsCache) {
      eventsCache = [];
    }
    eventsCache.unshift(newEvent);
    cacheLoaded = true;

    // Create notification for all families
    try {
      const hostName = hostFamilyId.includes("-") ? hostFamilyId : hostFamilyId;
      await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event",
          title: "New Event Created",
          message: `${newEvent.type} "${newEvent.name}" has been created${newEvent.restaurant ? ` at ${newEvent.restaurant}` : ""} on ${newEvent.date}`,
          targetFamilyId: "all",
          eventId: newEvent.id,
          fromFamilyId: hostFamilyId
        })
      });

      // Also send push notification
      await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/api/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          title: `🎉 New ${newEvent.type}!`,
          body: `${newEvent.name} on ${newEvent.date}${newEvent.restaurant ? ` at ${newEvent.restaurant}` : ""}`,
          data: {
            type: "event",
            eventId: newEvent.id,
            eventName: newEvent.name,
            date: newEvent.date,
            restaurant: newEvent.restaurant
          },
          targetFamilyId: "all"
        })
      });
    } catch (notifErr) {
      console.error("Failed to create notification:", notifErr);
    }

    console.log("[Events] Created event:", newEvent.id, "Supabase:", savedToSupabase);

    return res.json({ 
      success: true, 
      event: newEvent, 
      _saved: savedToSupabase ? "supabase" : "memory",
      _message: savedToSupabase ? "Saved to database" : "Saved to memory (Supabase RLS restricted)"
    });
  }

  if (method === "PUT" && id) {
    const { name, type, hostFamilyId, date, time, restaurant, address, notes, isActive } = body;

    // Find and update in cache
    const idx = eventsCache?.findIndex(e => e.id === id);
    if (idx !== undefined && idx >= 0 && eventsCache) {
      const updated = {
        ...eventsCache[idx],
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(hostFamilyId !== undefined && { hostFamilyId }),
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(restaurant !== undefined && { restaurant }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive })
      };
      eventsCache[idx] = updated;

      // Try to update Supabase
      try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (hostFamilyId !== undefined) updateData.host_family_id = hostFamilyId;
        if (date !== undefined) updateData.date = date;
        if (time !== undefined) updateData.time = time;
        if (restaurant !== undefined) updateData.restaurant = restaurant;
        if (address !== undefined) updateData.address = address;
        if (notes !== undefined) updateData.notes = notes;

        await supabase
          .from("events")
          .update(updateData)
          .eq("id", id);
      } catch (err) {
        console.error("Supabase update error:", err);
      }

      return res.json({ success: true, event: updated });
    }

    return res.status(404).json({ error: "Event not found" });
  }

  if (method === "DELETE" && id) {
    // Get the requesting family from headers or body
    const requestingFamilyId = body?.familyId || query?.familyId || req.headers["x-family-id"];
    
    // Find the event to check permissions
    const eventToDelete = eventsCache?.find(e => e.id === id);
    
    if (!eventToDelete) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    // Check if the requesting family is the host or admin
    const isHost = eventToDelete.hostFamilyId === requestingFamilyId;
    const isAdmin = requestingFamilyId === "admin" || requestingFamilyId === "ee5a209b-0d3e-4a96-81ee-1b232d582983";
    
    if (!isHost && !isAdmin) {
      return res.status(403).json({ 
        error: "Not authorized", 
        message: "Only the host family or admin can delete this event" 
      });
    }

    console.log("[Events] Deleting event:", id, "by:", requestingFamilyId);

    // Remove from cache
    if (eventsCache) {
      eventsCache = eventsCache.filter(e => e.id !== id);
    }

    // Try to delete from Supabase
    try {
      await supabase
        .from("events")
        .delete()
        .eq("id", id);
    } catch (err) {
      console.error("Supabase delete error:", err);
    }

    return res.json({ success: true, message: "Event deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
