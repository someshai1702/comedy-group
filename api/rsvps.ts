import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/rsvps - Submit or update RSVP
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { eventId, familyId, attending, reason, adultsAttendingCount, childrenAttendingCount, order, specialInstructions } = req.body;

  if (!eventId || !familyId || !attending) {
    return res.status(400).json({ error: "Missing required RSVP fields" });
  }

  try {
    // Check if event exists and is active
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, is_active")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (!event.is_active) {
      return res.status(403).json({ error: "This event is currently locked by the captain. No orders or changes are accepted." });
    }

    const rsvpData = {
      event_id: eventId,
      family_id: familyId,
      attending,
      reason: attending === "No" ? (reason || "Out of station") : "",
      adults_attending_count: attending === "Yes" ? (adultsAttendingCount ?? 2) : 0,
      children_attending_count: attending === "Yes" ? (childrenAttendingCount ?? 0) : 0,
      order: attending === "Yes" ? (order || {}) : {},
      special_instructions: attending === "Yes" ? (specialInstructions || "") : "",
      updated_at: new Date().toISOString()
    };

    // Upsert RSVP
    const { data, error } = await supabase
      .from("rsvps")
      .upsert([rsvpData], { onConflict: "event_id,family_id" })
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, rsvp: data });
  } catch (err) {
    console.error("Error submitting RSVP:", err);
    return res.status(500).json({ error: "Failed to submit RSVP" });
  }
}
