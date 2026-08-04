import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

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
      const events = (data || []).map(rowToEvent);
      return res.json({ success: true, events });
    } catch (err) {
      console.error("Error fetching events:", err);
      return res.status(500).json({ error: "Failed to fetch events" });
    }
  }

  if (method === "POST") {
    const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes } = body;

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

      const newEvent: any = {
        name: name || "",
        type,
        host_family_id: familyId,
        date,
        time
      };
      
      // Only add optional fields if they have values
      if (restaurant) newEvent.restaurant = restaurant;
      if (address) newEvent.address = address;
      if (notes) newEvent.notes = notes;
      if (googleMapsUrl) newEvent.google_maps_url = googleMapsUrl;
      if (deadline) newEvent.deadline = deadline;

      const { data, error } = await supabase
        .from("events")
        .insert([newEvent])
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, event: rowToEvent(data) });
    } catch (err) {
      console.error("Error creating event:", err);
      return res.status(500).json({ error: "Failed to create event: " + (err as any)?.message });
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
