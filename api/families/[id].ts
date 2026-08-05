import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// Default families data - IDs must match Supabase family names
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

// Convert DB row to family object (matching Supabase schema columns)
function rowToFamily(row: any): any {
  // Use simple ID from the id column or derive from name
  const namePart = row.name ? row.name.split(" ")[0].toLowerCase() : "unknown";
  return {
    id: row.id || namePart,
    name: row.name,
    adults: row.adults || [],
    children: row.children || [],
    pin: row.pin || "0000",
    photoUrl: row.photoUrl || ""
  };
}

// Find family by simple ID
async function findFamilyById(id: string): Promise<any | null> {
  try {
    // Try to find by exact ID first
    const { data, error } = await supabase
      .from("families")
      .select("id, name, adults, children, pin, photoUrl")
      .eq("id", id.toLowerCase())
      .single();
    
    if (!error && data) {
      return rowToFamily(data);
    }
    
    // If not found by ID, try to find by name prefix
    const { data: allData, error: allError } = await supabase
      .from("families")
      .select("id, name, adults, children, pin, photoUrl");
    
    if (allError || !allData) return null;
    
    const idLower = id.toLowerCase();
    const matching = allData.find((f: any) => {
      const nameLower = (f.name || "").toLowerCase();
      return nameLower.startsWith(idLower) || nameLower.includes(idLower) || f.id === idLower;
    });
    
    if (matching) return rowToFamily(matching);
    return null;
  } catch {
    return null;
  }
}

// Update family in Supabase (using direct columns as per schema)
async function updateFamilyInDb(id: string, updates: any): Promise<any | null> {
  try {
    // First find the family
    const family = await findFamilyById(id);
    if (!family) return null;
    
    // Build update object with direct columns
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.adults !== undefined) updateData.adults = updates.adults;
    if (updates.children !== undefined) updateData.children = updates.children;
    if (updates.pin !== undefined) updateData.pin = updates.pin;
    if (updates.photoUrl !== undefined) updateData.photoUrl = updates.photoUrl;
    
    if (Object.keys(updateData).length === 0) {
      return family; // Nothing to update
    }
    
    console.log("[Family Update] Updating family:", id, "with:", updateData);
    
    const { data, error } = await supabase
      .from("families")
      .update(updateData)
      .eq("id", family.id)
      .select()
      .single();
    
    if (error) {
      console.error("Update error:", error);
      return null;
    }
    
    console.log("[Family Update] Success:", data);
    return rowToFamily(data);
  } catch (err) {
    console.error("Update failed:", err);
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
    const defaultFamily = DEFAULT_FAMILIES[id.toLowerCase()];
    if (defaultFamily) {
      return res.json({ success: true, family: defaultFamily, source: "default" });
    }
    return res.status(404).json({ error: "Family not found" });
  }

  // PUT /api/families/:id
  if (req.method === "PUT") {
    const { name, adults, children, pin, photoUrl } = req.body;
    
    console.log("[PUT /api/families/:id] id:", id, "updates:", { name, adults, children, pin, photoUrl });
    
    // Try to update in Supabase
    const updated = await updateFamilyInDb(id, { name, adults, children, pin, photoUrl });
    if (updated) {
      return res.json({ success: true, family: updated, source: "supabase" });
    }
    
    // Fall back to local update (won't persist on serverless)
    const defaultFamily = DEFAULT_FAMILIES[id.toLowerCase()];
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
    
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }
    
    if (family.pin !== currentPin) {
      return res.status(401).json({ error: "Current PIN incorrect" });
    }
    
    // Update PIN
    const updated = await updateFamilyInDb(id, { pin: newPin });
    if (updated) {
      return res.json({ success: true, family: updated, source: "supabase" });
    }
    
    return res.json({ success: true, family: { ...family, pin: newPin }, source: "memory" });
  }
	
  return res.status(405).json({ error: "Method not allowed" });
}
