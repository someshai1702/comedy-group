import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache for RSVPs (persists across function invocations in same container)
let rsvpsCache: any[] = [];

// Demo events that are always valid for RSVPs
const DEMO_EVENT_IDS = ["demo-event-1", "demo-event-2"];

// GET /api/rsvps - Get all RSVPs
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle GET request - return cached RSVPs
  if (req.method === "GET") {
    // Also try to fetch from Supabase and merge
    try {
      const { data, error } = await supabase.from("rsvps").select("*");
      if (!error && data && data.length > 0) {
        const supabaseRsvps = data.map((row: any) => ({
          eventId: row.event_id,
          familyId: row.family_id,
          attending: row.attending,
          reason: row.reason || "",
          adultsAttendingCount: row.adults_attending_count || 0,
          childrenAttendingCount: row.children_attending_count || 0,
          order: row.order || {},
          specialInstructions: row.special_instructions || "",
          updatedAt: row.updated_at
        }));
        return res.json({ success: true, rsvps: supabaseRsvps, _source: "supabase" });
      }
    } catch (err) {
      console.error("Supabase fetch error:", err);
    }
    return res.json({ success: true, rsvps: rsvpsCache, _source: "cache" });
  }

  // Handle POST request - submit RSVP
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, familyId, attending, reason, adultsAttendingCount, childrenAttendingCount, order, specialInstructions } = req.body;

  if (!eventId || !familyId || !attending) {
    return res.status(400).json({ error: "Missing required RSVP fields" });
  }

  try {
    // Check if event exists and is active
    let eventExists = DEMO_EVENT_IDS.includes(eventId);
    let isOrderingClosed = false;

    if (!eventExists) {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, is_ordering_closed")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        return res.status(404).json({ error: "Event not found" });
      }
      isOrderingClosed = event.is_ordering_closed === true;
    }

    if (isOrderingClosed) {
      return res.status(403).json({ error: "This event is currently locked by the captain. No orders or changes are accepted." });
    }

    // Create RSVP object in app format
    const rsvpData = {
      eventId,
      familyId,
      attending,
      reason: attending === "No" ? (reason || "Out of station") : "",
      adultsAttendingCount: attending === "Yes" ? (adultsAttendingCount ?? 2) : 0,
      childrenAttendingCount: attending === "Yes" ? (childrenAttendingCount ?? 0) : 0,
      order: attending === "Yes" ? (order || {}) : {},
      specialInstructions: attending === "Yes" ? (specialInstructions || "") : "",
      updatedAt: new Date().toISOString()
    };

    // Update or add to cache
    const existingIndex = rsvpsCache.findIndex(r => r.eventId === eventId && r.familyId === familyId);
    if (existingIndex >= 0) {
      rsvpsCache[existingIndex] = rsvpData;
    } else {
      rsvpsCache.push(rsvpData);
    }

    // Try to upsert RSVP to Supabase (for persistence)
    try {
      const supabaseRsvpData = {
        event_id: eventId,
        family_id: familyId,
        attending,
        reason: rsvpData.reason,
        adults_attending_count: rsvpData.adultsAttendingCount,
        children_attending_count: rsvpData.childrenAttendingCount,
        order: rsvpData.order,
        special_instructions: rsvpData.specialInstructions,
        updated_at: rsvpData.updatedAt
      };
      await supabase
        .from("rsvps")
        .upsert([supabaseRsvpData], { onConflict: "event_id,family_id" });
    } catch (supabaseError) {
      console.error("Supabase RSVP error (continuing with cache):", supabaseError);
    }

    return res.json({ success: true, rsvp: rsvpData, _source: "cache" });
  } catch (err) {
    console.error("Error submitting RSVP:", err);
    return res.status(500).json({ error: "Failed to submit RSVP" });
  }
}
