import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

// Default families data
const DEFAULT_FAMILIES = [
  { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200" },
  { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" },
  { id: "mehta", name: "Mehta Family", adults: ["Raj", "Ritu"], children: ["Ishaan", "Anya"], pin: "3333", photoUrl: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200" },
  { id: "joshi", name: "Joshi Family", adults: ["Vikram", "Aditi"], children: ["Vivaan", "Saisha"], pin: "4444", photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200" },
  { id: "kapoor", name: "Kapoor Family", adults: ["Sanjay", "Neha"], children: ["Rohan", "Shanaya"], pin: "5555", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
  { id: "malhotra", name: "Malhotra Family", adults: ["Karan", "Pooja"], children: ["Arjun", "Myra"], pin: "6666", photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
  { id: "shah", name: "Shah Family", adults: ["Nitin", "Swati"], children: ["Dev", "Riya"], pin: "7777", photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" },
  { id: "admin", name: "Group Admin", adults: ["Captain Admin"], children: [], pin: "0000", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" }
];

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

// GET /api/families - List all or single family
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Try multiple ways to get the family ID
  let familyId = req.query.id as string;
  
  // If no query param, try parsing from URL
  if (!familyId && typeof req.url === 'string') {
    const match = req.url.match(/[?&]id=([^&]+)/);
    if (match) {
      familyId = decodeURIComponent(match[1]);
    }
  }
  
  console.log("[API /api/families] Method:", req.method, "familyId from query:", req.query.id, "familyId from url:", familyId);
  
  // Handle GET requests
  if (req.method === "GET" || !req.method) {
    
    try {
      // If id is provided, return single family
      if (familyId) {
        // Try to find by exact ID
        const { data, error } = await supabase
          .from("families")
          .select("id, name, adults, children, pin, photoUrl")
          .eq("id", familyId.toLowerCase())
          .single();
        
        if (!error && data) {
          return res.json({ success: true, family: rowToFamily(data), source: "supabase" });
        }
        
        // If not found by ID, try by name prefix
        const { data: allData } = await supabase
          .from("families")
          .select("id, name, adults, children, pin, photoUrl");
        
        if (allData) {
          const idLower = familyId.toLowerCase();
          const matching = allData.find((f: any) => {
            const nameLower = (f.name || "").toLowerCase();
            return nameLower.startsWith(idLower) || nameLower.includes(idLower) || f.id === idLower;
          });
          
          if (matching) {
            return res.json({ success: true, family: rowToFamily(matching), source: "supabase" });
          }
        }
        
        // Fallback to defaults
        const defaultFamily = DEFAULT_FAMILIES.find(f => f.id === familyId.toLowerCase());
        if (defaultFamily) {
          return res.json({ success: true, family: defaultFamily, source: "default" });
        }
        
        return res.status(404).json({ error: "Family not found" });
      }
      
      // No id provided - return all families
      const { data, error } = await supabase
        .from("families")
        .select("id, name, adults, children, pin, photoUrl")
        .limit(50);

      if (error) {
        console.error("Supabase error:", error);
        return res.json({ success: true, families: DEFAULT_FAMILIES, source: "default" });
      }

      if (!data || data.length === 0) {
        return res.json({ success: true, families: DEFAULT_FAMILIES, source: "default" });
      }

      const families = data.map(rowToFamily);
      return res.json({ success: true, families, source: "supabase" });
    } catch (err) {
      console.error("Error:", err);
      return res.json({ success: true, families: DEFAULT_FAMILIES, source: "default" });
    }
  }

  // POST /api/families - Create or update family (id in body)
  if (req.method === "POST") {
    const { id, name, adults, children, pin, photoUrl } = req.body || {};
    
    console.log("[POST /api/families] id:", id, "name:", name);
    
    // If id is provided, update existing family
    if (id) {
      const familyId = typeof id === 'string' ? id : String(id);
      
      // Find the family first
      let currentFamily: any = null;
      
      const { data: byId } = await supabase
        .from("families")
        .select("id, name, adults, children, pin, photoUrl")
        .eq("id", familyId.toLowerCase())
        .single();
      
      if (byId) {
        currentFamily = byId;
      } else {
        // Try by name
        const { data: allData } = await supabase
          .from("families")
          .select("id, name, adults, children, pin, photoUrl");
        
        if (allData) {
          const idLower = familyId.toLowerCase();
          const matching = allData.find((f: any) => {
            const nameLower = (f.name || "").toLowerCase();
            return nameLower.startsWith(idLower) || nameLower.includes(idLower) || f.id === idLower;
          });
          if (matching) currentFamily = matching;
        }
      }
      
      if (!currentFamily) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      // Build update object
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (adults !== undefined) updateData.adults = adults;
      if (children !== undefined) updateData.children = children;
      if (pin !== undefined) updateData.pin = pin;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      
      console.log("[POST Update] Updating:", currentFamily.id, "with:", updateData);
      
      const { data, error } = await supabase
        .from("families")
        .update(updateData)
        .eq("id", currentFamily.id)
        .select()
        .single();
      
      if (error) {
        console.error("Update error:", error);
        return res.status(500).json({ error: "Failed to update family" });
      }
      
      console.log("[POST Update] Success:", data);
      return res.json({ success: true, family: rowToFamily(data), source: "supabase" });
    }
    
    // No id provided - return error (creation not implemented)
    return res.status(400).json({ error: "Family ID required for update" });
  }

  // DELETE /api/families - Delete a family (id in query param)
  if (req.method === "DELETE") {
    // Parse familyId from query
    let familyId = req.query.id as string;
    if (!familyId && typeof req.url === 'string') {
      const match = req.url.match(/[?&]id=([^&]+)/);
      if (match) {
        familyId = decodeURIComponent(match[1]);
      }
    }
    
    if (!familyId) {
      return res.status(400).json({ error: "Family ID required" });
    }
    
    try {
      // Find the family first
      let dbId: string | null = null;
      
      const { data: byId } = await supabase
        .from("families")
        .select("id")
        .eq("id", familyId.toLowerCase())
        .single();
      
      if (byId) {
        dbId = byId.id;
      } else {
        // Try by name
        const { data: allData } = await supabase
          .from("families")
          .select("id, name");
        
        if (allData) {
          const idLower = familyId.toLowerCase();
          const matching = allData.find((f: any) => {
            const nameLower = (f.name || "").toLowerCase();
            return nameLower.startsWith(idLower) || nameLower.includes(idLower) || f.id === idLower;
          });
          if (matching) dbId = matching.id;
        }
      }
      
      if (!dbId) {
        return res.status(404).json({ error: "Family not found" });
      }
      
      // Delete from Supabase
      const { error } = await supabase
        .from("families")
        .delete()
        .eq("id", dbId);
      
      if (error) {
        console.error("Delete error:", error);
        return res.status(500).json({ error: "Failed to delete family" });
      }
      
      return res.json({ success: true, message: "Family deleted" });
    } catch (err) {
      console.error("Delete failed:", err);
      return res.status(500).json({ error: "Failed to delete family" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
