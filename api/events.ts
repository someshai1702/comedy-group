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

// Convert DB row to event object
function rowToEvent(row: any): any {
  return {
    id: row.id,
    name: row.name || "",
    type: row.type,
    hostFamilyId: row.host_family_id,
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
    host_family_id: event.hostFamilyId,
    date: event.date,
    time: event.time,
    last_order_date: event.deadline,
    restaurant: event.restaurant || "",
    address: event.address || "",
    notes: event.notes || "",
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
      // Look up family UUID from simple ID
      let familyId = hostFamilyId;
      if (!hostFamilyId.includes("-") || hostFamilyId.length !== 36) {
        const { data: families } = await supabase
          .from("families")
          .select("id, name");

        if (families) {
          const found = families.find((f: any) => {
            const derivedId = f.name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
            return derivedId === hostFamilyId.toLowerCase();
          });
          if (found) {
            familyId = found.id;
          }
        }
      }

      const eventRow = {
        name: newEvent.name,
        type: newEvent.type,
        host_family_id: familyId,
        date: newEvent.date,
        time: newEvent.time,
        last_order_date: newEvent.deadline,
        restaurant: newEvent.restaurant,
        address: newEvent.address,
        notes: newEvent.notes
      };

      const { data, error } = await supabase
        .from("events")
        .insert([eventRow])
        .select()
        .single();

      if (!error && data) {
        newEvent.id = data.id;
        savedToSupabase = true;
      }
    } catch (err) {
      console.error("Supabase save error:", err);
    }

    // Update cache
    if (!eventsCache) {
      eventsCache = [];
    }
    eventsCache.unshift(newEvent);
    cacheLoaded = true;

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

    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
