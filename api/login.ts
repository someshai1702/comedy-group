import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// Default families data
const DEFAULT_FAMILIES: Record<string, any> = {
  sharma: { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200" },
  patel: { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" },
  mehta: { id: "mehta", name: "Mehta Family", adults: ["Raj", "Ritu"], children: ["Ishaan", "Anya"], pin: "3333", photoUrl: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200" },
  joshi: { id: "joshi", name: "Joshi Family", adults: ["Vikram", "Aditi"], children: ["Vivaan", "Saisha"], pin: "4444", photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200" },
  kapoor: { id: "kapoor", name: "Kapoor Family", adults: ["Sanjay", "Neha"], children: ["Rohan", "Shanaya"], pin: "5555", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
  malhotra: { id: "malhotra", name: "Malhotra Family", adults: ["Karan", "Pooja"], children: ["Arjun", "Myra"], pin: "6666", photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
  shah: { id: "shah", name: "Shah Family", adults: ["Nitin", "Swati"], children: ["Dev", "Riya"], pin: "7777", photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" },
  admin: { id: "admin", name: "Group Admin", adults: ["Captain Admin"], children: [], pin: "0000", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" }
};

// Convert DB row to family object
function rowToFamily(row: any): any {
  let extra: any = {};
  try {
    if (row.address) extra = JSON.parse(row.address);
  } catch {}
  return {
    id: row.name.toLowerCase().replace(/\s+/g, "_"),
    name: row.name,
    adults: extra.adults || [],
    children: extra.children || [],
    pin: extra.pin || "0000",
    photoUrl: row.photo_url || extra.photoUrl || ""
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { familyId, pin } = req.body;
  if (!familyId || !pin) {
    return res.status(400).json({ error: "Family ID and PIN required" });
  }

  // Try to find in Supabase first
  const familyName = familyId.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  try {
    const { data, error } = await supabase
      .from("families")
      .select("id, name, photo_url, address")
      .ilike("name", familyName)
      .single();
    
    if (!error && data) {
      const family = rowToFamily(data);
      if (family.pin === pin) {
        return res.json({ success: true, family, source: "supabase" });
      } else {
        return res.status(401).json({ error: "Incorrect PIN" });
      }
    }
  } catch (err) {
    console.error("Supabase error:", err);
  }

  // Fall back to defaults
  const defaultFamily = DEFAULT_FAMILIES[familyId];
  if (!defaultFamily) {
    return res.status(404).json({ error: "Family not found" });
  }

  if (defaultFamily.pin !== pin) {
    return res.status(401).json({ error: "Incorrect PIN" });
  }

  return res.json({ success: true, family: defaultFamily, source: "default" });
}
