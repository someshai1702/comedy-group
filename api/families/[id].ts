import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// Default families data - IDs must match Supabase family names
const DEFAULT_FAMILIES: Record<string, any> = {
  sharma: { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200" },
  patel: { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" },
  mangesh: { id: "mangesh", name: "Mangesh Devi & Family", adults: ["Mangesh", "Priyanka"], children: ["Prinkesh", "Piyush"], pin: "3333", photoUrl: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200" },
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
  // Use simple ID like "sharma", "patel" not "sharma_family"
  const namePart = row.name.split(" ")[0].toLowerCase();
  return {
    id: namePart,
    name: row.name,
    adults: extra.adults || [],
    children: extra.children || [],
    pin: extra.pin || "0000",
    photoUrl: row.photo_url || extra.photoUrl || ""
  };
}

// Find family by simple ID
async function findFamilyById(id: string): Promise<any | null> {
  try {
    // Fetch all families and find the one matching the ID
    const { data, error } = await supabase
      .from("families")
      .select("id, name, photo_url, address");
    
    if (error || !data) return null;
    
    // Find matching family by ID or by name prefix
    const idLower = id.toLowerCase();
    const matching = data.find((f: any) => {
      const nameLower = f.name.toLowerCase();
      return nameLower.startsWith(idLower) || nameLower.includes(idLower);
    });
    
    if (matching) return rowToFamily(matching);
    return null;
  } catch {
    return null;
  }
}

// Update family in Supabase
async function updateFamilyInDb(id: string, updates: any): Promise<any | null> {
  try {
    // First get the current row by finding matching family
    const { data: allFamilies, error: fetchError } = await supabase
      .from("families")
      .select("id, name, address, photo_url");
    
    if (fetchError || !allFamilies) {
      console.error("[updateFamilyInDb] Fetch error:", fetchError);
      return null;
    }
    
    const idLower = id.toLowerCase();
    const matching = allFamilies.find((f: any) => {
      const nameLower = f.name.toLowerCase();
      return nameLower.startsWith(idLower) || nameLower.includes(idLower);
    });
    
    if (!matching) {
      console.error("[updateFamilyInDb] No matching family for:", id);
      return null;
    }
    
    console.log("[updateFamilyInDb] Found family:", matching.name, "id:", matching.id);
    
    let extra: any = {};
    if (matching.address) {
      try { extra = JSON.parse(matching.address); } catch {}
    }
    console.log("[updateFamilyInDb] Current extra:", extra);
    
    // Apply updates
    if (updates.name !== undefined) {
      // For name change, we need to update the name field
    }
    if (updates.adults !== undefined) extra.adults = updates.adults;
    if (updates.children !== undefined) extra.children = updates.children;
    if (updates.pin !== undefined) extra.pin = updates.pin;
    if (updates.photoUrl !== undefined) extra.photoUrl = updates.photoUrl;
    
    console.log("[updateFamilyInDb] Updated extra:", extra);
    console.log("[updateFamilyInDb] JSON:", JSON.stringify(extra));
    
    const { data, error } = await supabase
      .from("families")
      .update({
        name: updates.name || matching.name,
        photo_url: updates.photoUrl,
        address: JSON.stringify(extra)
      })
      .eq("id", matching.id)
      .select()
      .single();
    
    if (error) {
      console.error("[updateFamilyInDb] Update error:", error);
      return null;
    }
    
    console.log("[updateFamilyInDb] Updated data:", data);
    return rowToFamily(data);
  } catch (err) {
    console.error("[updateFamilyInDb] Update failed:", err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "";
  
  // Extract family ID from URL
  let id = (req.query.id as string) || (req.query as any)?.id;
  if (!id || id === "[id]") {
    const parts = url.split("/").filter(Boolean);
    id = parts[parts.length - 1];
  }
  
  if (!id || id === "[id]") {
    return res.status(400).json({ error: "Family ID required" });
  }

  // GET /api/families/:id
  if (req.method === "GET") {
    // Try Supabase first
    const family = await findFamilyById(id);
    if (family) {
      return res.json({ success: true, family, source: "supabase" });
    }
    // Fall back to defaults
    const defaultFamily = DEFAULT_FAMILIES[id];
    if (defaultFamily) {
      return res.json({ success: true, family: defaultFamily, source: "default" });
    }
    return res.status(404).json({ error: "Family not found" });
  }

  // PUT /api/families/:id
  if (req.method === "PUT") {
    const { name, adults, children, pin, photoUrl } = req.body;
    
    // Try to update in Supabase
    const updated = await updateFamilyInDb(id, { name, adults, children, pin, photoUrl });
    if (updated) {
      return res.json({ success: true, family: updated, source: "supabase" });
    }
    
    // Fall back to local update (won't persist on serverless)
    const defaultFamily = DEFAULT_FAMILIES[id];
    if (!defaultFamily) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    const result = {
      ...defaultFamily,
      ...(name !== undefined && { name }),
      ...(adults !== undefined && { adults }),
      ...(children !== undefined && { children }),
      ...(pin !== undefined && { pin }),
      ...(photoUrl !== undefined && { photoUrl })
    };
    return res.json({ success: true, family: result, source: "memory" });
  }

  // PUT /api/families/:id?action=change-pin
  if ((req.method === "PUT" || req.method === "PATCH") && req.query?.action === "change-pin") {
    const { currentPin, newPin } = req.body;
    
    // Get current family from Supabase
    const family = await findFamilyById(id);
    console.log("[change-pin] Found family:", family ? family.name : "not found", "PIN:", family?.pin);
    console.log("[change-pin] Input currentPin:", currentPin);
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    if (family.pin !== currentPin) {
      console.log("[change-pin] PIN mismatch!");
      return res.status(401).json({ error: "Current PIN incorrect" });
    }
    
    console.log("[change-pin] PIN match! Updating to:", newPin);
    
    // Update PIN
    const updated = await updateFamilyInDb(id, { pin: newPin });
    console.log("[change-pin] Update result:", updated ? "success" : "failed");
    if (updated) {
      return res.json({ success: true, family: updated, source: "supabase" });
    }
    
    return res.json({ success: true, family: { ...family, pin: newPin }, source: "memory" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
