import type { VercelRequest, VercelResponse } from "@vercel/node";
import path from "path";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";

const DB_FILE = path.join(process.cwd(), "db.json");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

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

async function getFamilies() {
  if (supabase) {
    const { data } = await supabase.from("families").select("*");
    if (data && data.length > 0) return data;
  }
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(data);
    return db.families || DEFAULT_FAMILIES;
  } catch {
    return DEFAULT_FAMILIES;
  }
}

async function saveFamily(family: any) {
  if (supabase) {
    const { data } = await supabase.from("families").upsert(family).select().single();
    if (data) return data;
  }
  try {
    let db = { families: [] };
    try {
      const data = await fs.readFile(DB_FILE, "utf-8");
      db = JSON.parse(data);
    } catch {}
    const idx = db.families.findIndex((f: any) => f.id === family.id);
    if (idx >= 0) {
      db.families[idx] = family;
    } else {
      db.families.push(family);
    }
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
  } catch {}
  return family;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || "";
  
  // Vercel passes the dynamic route parameter in req.query
  // For /api/families/sharma -> req.query = { id: "sharma" }
  let id = (req.query.id as string) || (req.query as any)?.id;
  
  // Fallback: extract from URL if query is not populated
  if (!id || id === "[id]") {
    const parts = url.split("/").filter(Boolean);
    id = parts[parts.length - 1];
  }
  
  if (!id || id === "[id]") {
    return res.status(400).json({ error: "Family ID required" });
  }

  // GET /api/families/:id
  if (req.method === "GET") {
    const families = await getFamilies();
    const family = families.find((f: any) => f.id === id);
    if (!family) return res.status(404).json({ error: "Family not found" });
    return res.json({ success: true, family });
  }

  // PUT /api/families/:id
  if (req.method === "PUT") {
    const { name, adults, children, pin, photoUrl } = req.body;
    const families = await getFamilies();
    const existing = families.find((f: any) => f.id === id);
    if (!existing) return res.status(404).json({ error: "Family not found" });
    const updated = {
      ...existing,
      ...(name !== undefined && { name }),
      ...(adults !== undefined && { adults }),
      ...(children !== undefined && { children }),
      ...(pin !== undefined && { pin }),
      ...(photoUrl !== undefined && { photoUrl })
    };
    await saveFamily(updated);
    return res.json({ success: true, family: updated });
  }

  // PATCH /api/families/:id/change-pin
  if (req.method === "PATCH" && url.includes("/change-pin")) {
    const { currentPin, newPin } = req.body;
    const families = await getFamilies();
    const family = families.find((f: any) => f.id === id);
    if (!family) return res.status(404).json({ error: "Family not found" });
    if (family.pin !== currentPin) return res.status(401).json({ error: "Current PIN incorrect" });
    const updated = { ...family, pin: newPin };
    await saveFamily(updated);
    return res.json({ success: true, family: updated });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
