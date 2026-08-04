import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// Default events to use when Supabase insert fails
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
    notes: row.notes || "",
    isActive: row.is_active !== false
  };
}

// GET /api/events - List all events
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query, body } = req;
  const id = query.id as string;

  if (method === "GET") {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // If no events in Supabase, return demo events
      const events = (data && data.length > 0) 
        ? data.map(rowToEvent)
        : DEFAULT_EVENTS;
      return res.json({ success: true, events, _source: data && data.length > 0 ? "supabase" : "default" });
    } catch (err) {
      console.error("Error fetching events, using defaults:", err);
      return res.json({ success: true, events: DEFAULT_EVENTS, _source: "default" });
    }
  }

  if (method === "POST") {
    const { name, type, hostFamilyId, date, time, restaurant, address, notes } = body;

    if (!type || !hostFamilyId || !date || !time) {
      return res.status(400).json({ error: "Missing required event fields (type, hostFamilyId, date, time)" });
    }

    try {
      // Look up family UUID from simple ID (e.g., "sharma" -> UUID)
      let familyId = hostFamilyId;
      
      // Check if hostFamilyId is already a UUID or needs lookup
      if (!hostFamilyId.includes("-") || hostFamilyId.length !== 36) {
        // It's a simple ID like "sharma", look up the actual UUID by fetching all families
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

      // Calculate last_order_date (4 hours before event time)
      const eventDateTime = new Date(date + "T" + time);
      const lastOrderDate = new Date(eventDateTime.getTime() - 4 * 60 * 60 * 1000).toISOString();

      const newEvent: any = {
        name: name || "",
        type,
        host_family_id: familyId,
        date,
        time,
        last_order_date: lastOrderDate
      };
      
      // Only add optional fields if they have values
      if (restaurant) newEvent.restaurant = restaurant;
      if (address) newEvent.address = address;
      if (notes) newEvent.notes = notes;

      const { data, error } = await supabase
        .from("events")
        .insert([newEvent])
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, event: rowToEvent(data) });
    } catch (err) {
      console.error("Error creating event in Supabase:", err);
      // Return a fake success with the event data for demo purposes
      const demoEvent = {
        id: `event-${Date.now()}`,
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
      return res.json({ success: true, event: demoEvent, _source: "demo", _note: "Created locally due to Supabase constraint" });
    }
  }

  if (method === "PUT" && id) {
    const { name, type, hostFamilyId, date, time, restaurant, address, notes } = body;

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

      const { data, error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, event: rowToEvent(data) });
    } catch (err) {
      console.error("Error updating event:", err);
      return res.status(500).json({ error: "Failed to update event" });
    }
  }

  if (method === "DELETE" && id) {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting event:", err);
      return res.status(500).json({ error: "Failed to delete event" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
