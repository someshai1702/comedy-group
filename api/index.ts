import express, { Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs/promises";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Database file path for local fallback
const DB_FILE = path.join(process.cwd(), "db.json");

// ==================== SUPABASE HELPERS ====================

async function supabaseFetch(table: string, filters?: Record<string, string>) {
  if (!supabase) return null;
  let query = supabase.from(table).select("*");
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  const { data, error } = await query;
  if (error) { console.error(`Supabase ${table} error:`, error); return null; }
  return data;
}

async function supabaseInsert(table: string, row: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) { console.error(`Supabase insert error:`, error); return null; }
  return data;
}

async function supabaseUpdate(table: string, id: string, updates: any) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select().single();
  if (error) { console.error(`Supabase update error:`, error); return null; }
  return data;
}

async function supabaseDelete(table: string, id: string) {
  if (!supabase) return null;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) { console.error(`Supabase delete error:`, error); return false; }
  return true;
}

// ==================== LOCAL DATABASE FALLBACK ====================

const DEFAULT_DB = {
  families: [
    { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200" },
    { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" },
    { id: "mehta", name: "Mehta Family", adults: ["Raj", "Ritu"], children: ["Ishaan", "Anya"], pin: "3333", photoUrl: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200" },
    { id: "joshi", name: "Joshi Family", adults: ["Vikram", "Aditi"], children: ["Vivaan", "Saisha"], pin: "4444", photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200" },
    { id: "kapoor", name: "Kapoor Family", adults: ["Sanjay", "Neha"], children: ["Rohan", "Shanaya"], pin: "5555", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
    { id: "malhotra", name: "Malhotra Family", adults: ["Karan", "Pooja"], children: ["Arjun", "Myra"], pin: "6666", photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
    { id: "shah", name: "Shah Family", adults: ["Nitin", "Swati"], children: ["Dev", "Riya"], pin: "7777", photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" },
    { id: "admin", name: "Group Admin", adults: ["Captain Admin"], children: [], pin: "0000", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" }
  ],
  menu: {
    starters: [
      { id: "st_m_papad", name: "Masala Papad", price: 40 },
      { id: "st_r_papad", name: "Roasted Papad", price: 25 },
      { id: "st_tom_soup", name: "Tomato Soup", price: 110 },
      { id: "st_man_soup", name: "Manchow Soup", price: 120 },
      { id: "st_pan_chilli", name: "Paneer Chilli", price: 220 },
      { id: "st_pan_tikka", name: "Paneer Tikka", price: 240 },
      { id: "st_veg_manch", name: "Veg Manchurian", price: 170 }
    ],
    mainCourse: [
      { id: "mc_pan_but", name: "Paneer Butter Masala", price: 240 },
      { id: "mc_veg_kol", name: "Veg Kolhapuri", price: 210 },
      { id: "mc_mix_veg", name: "Mix Veg", price: 200 },
      { id: "mc_dal_fry", name: "Dal Fry", price: 140 }
    ],
    roti: [
      { id: "rt_plain_roti", name: "Plain Roti", price: 20 },
      { id: "rt_but_naan", name: "Butter Naan", price: 55 },
      { id: "rt_garlic_naan", name: "Garlic Naan", price: 70 }
    ],
    rice: [
      { id: "rc_plain", name: "Plain Rice", price: 110 },
      { id: "rc_jeera", name: "Jeera Rice", price: 130 },
      { id: "rc_biryani", name: "Veg Biryani", price: 220 }
    ],
    dessert: [
      { id: "ds_ice_cream", name: "Ice Cream", price: 80 },
      { id: "ds_gulab_jamun", name: "Gulab Jamun", price: 60 }
    ],
    drinks: [
      { id: "dr_water", name: "Water", price: 20 },
      { id: "dr_soft_drink", name: "Soft Drink", price: 40 }
    ]
  },
  events: [],
  rsvps: [],
  notifications: []
};

async function readLocalDatabase() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { ...DEFAULT_DB };
  }
}

async function writeLocalDatabase(db: any) {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write local DB:", e);
  }
}

// ==================== DATABASE OPERATIONS ====================

async function getAllData() {
  if (supabase) {
    const [families, menu, events, rsvps, notifications] = await Promise.all([
      supabaseFetch("families"),
      supabaseFetch("menu"),
      supabaseFetch("events"),
      supabaseFetch("rsvps"),
      supabaseFetch("notifications")
    ]);
    return {
      families: families || [],
      menu: menu?.[0] || { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
      events: events || [],
      rsvps: rsvps || [],
      notifications: notifications || []
    };
  }
  return readLocalDatabase();
}

// ==================== ROUTES ====================

// GET /db - Full database
app.get("/api/db", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ ...db, _version: "supabase_v1" });
});

// GET /api/families - List families
app.get("/api/families", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ success: true, families: db.families });
});

// POST /api/families - Create family
app.post("/api/families", async (req: Request, res: Response) => {
  const { name, adults, children, pin, photoUrl } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "Name and PIN required" });
  }
  const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  const newFamily = { id, name, adults: adults || [], children: children || [], pin, photoUrl: photoUrl || "" };
  
  if (supabase) {
    const result = await supabaseInsert("families", newFamily);
    if (result) return res.json({ success: true, family: result });
  }
  
  const db = await readLocalDatabase();
  db.families.push(newFamily);
  await writeLocalDatabase(db);
  res.json({ success: true, family: newFamily });
});

// GET /api/families/:id - Get single family
app.get("/api/families/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getAllData();
  const family = db.families.find((f: any) => f.id === id);
  if (!family) return res.status(404).json({ error: "Family not found" });
  res.json({ success: true, family });
});

// PUT /api/families/:id - Update family
app.put("/api/families/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, adults, children, pin, photoUrl } = req.body;
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (adults !== undefined) updates.adults = adults;
  if (children !== undefined) updates.children = children;
  if (pin !== undefined) updates.pin = pin;
  if (photoUrl !== undefined) updates.photoUrl = photoUrl;
  
  if (supabase) {
    const result = await supabaseUpdate("families", id, updates);
    if (result) return res.json({ success: true, family: result });
  }
  
  const db = await readLocalDatabase();
  const idx = db.families.findIndex((f: any) => f.id === id);
  if (idx === -1) return res.status(404).json({ error: "Family not found" });
  db.families[idx] = { ...db.families[idx], ...updates };
  await writeLocalDatabase(db);
  res.json({ success: true, family: db.families[idx] });
});

// PATCH /api/families/:id/change-pin - Change PIN
app.patch("/api/families/:id/change-pin", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentPin, newPin } = req.body;
  
  const db = await getAllData();
  const family = db.families.find((f: any) => f.id === id);
  if (!family) return res.status(404).json({ error: "Family not found" });
  if (family.pin !== currentPin) return res.status(401).json({ error: "Current PIN incorrect" });
  
  if (supabase) {
    const result = await supabaseUpdate("families", id, { pin: newPin });
    if (result) return res.json({ success: true, family: result });
  }
  
  const localDb = await readLocalDatabase();
  const idx = localDb.families.findIndex((f: any) => f.id === id);
  if (idx !== -1) {
    localDb.families[idx].pin = newPin;
    await writeLocalDatabase(localDb);
  }
  res.json({ success: true, family: { ...family, pin: newPin } });
});

// POST /api/login - Login
app.post("/api/login", async (req: Request, res: Response) => {
  const { familyId, pin } = req.body;
  if (!familyId || !pin) return res.status(400).json({ error: "Family ID and PIN required" });
  
  const db = await getAllData();
  const family = db.families.find((f: any) => f.id === familyId);
  if (!family) return res.status(404).json({ error: "Family not found" });
  if (family.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });
  
  res.json({ success: true, family });
});

// GET /api/events - List events
app.get("/api/events", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ success: true, events: db.events });
});

// POST /api/events - Create event
app.post("/api/events", async (req: Request, res: Response) => {
  const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes } = req.body;
  if (!name || !type || !hostFamilyId || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const id = `evt_${Date.now()}`;
  const newEvent = {
    id, name, type, hostFamilyId, date,
    time: time || "",
    restaurant: restaurant || "",
    address: address || "",
    googleMapsUrl: googleMapsUrl || "",
    deadline: deadline || "",
    notes: notes || "",
    isActive: true
  };
  
  if (supabase) {
    const result = await supabaseInsert("events", newEvent);
    if (result) return res.json({ success: true, event: result });
  }
  
  const db = await readLocalDatabase();
  db.events.push(newEvent);
  await writeLocalDatabase(db);
  res.json({ success: true, event: newEvent });
});

// GET /api/events/:id - Get event
app.get("/api/events/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getAllData();
  const event = db.events.find((e: any) => e.id === id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json({ success: true, event });
});

// PATCH /api/events/:id/toggle-active - Toggle event active status
app.patch("/api/events/:id/toggle-active", async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await getAllData();
  const event = db.events.find((e: any) => e.id === id);
  if (!event) return res.status(404).json({ error: "Event not found" });
  
  const updates = { isActive: !event.isActive };
  if (supabase) {
    const result = await supabaseUpdate("events", id, updates);
    if (result) return res.json({ success: true, event: result });
  }
  
  const localDb = await readLocalDatabase();
  const idx = localDb.events.findIndex((e: any) => e.id === id);
  if (idx !== -1) {
    localDb.events[idx].isActive = updates.isActive;
    await writeLocalDatabase(localDb);
  }
  res.json({ success: true, event: { ...event, ...updates } });
});

// GET /api/rsvps - List RSVPs
app.get("/api/rsvps", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ success: true, rsvps: db.rsvps });
});

// POST /api/rsvps - Create RSVP
app.post("/api/rsvps", async (req: Request, res: Response) => {
  const { eventId, familyId, familyName, membersAttending, items, notes } = req.body;
  if (!eventId || !familyId || !familyName) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const id = `rsvp_${Date.now()}`;
  const newRsvp = {
    id, eventId, familyId, familyName,
    membersAttending: membersAttending || [],
    items: items || {},
    notes: notes || "",
    timestamp: new Date().toISOString()
  };
  
  if (supabase) {
    const result = await supabaseInsert("rsvps", newRsvp);
    if (result) return res.json({ success: true, rsvp: result });
  }
  
  const db = await readLocalDatabase();
  db.rsvps.push(newRsvp);
  await writeLocalDatabase(db);
  res.json({ success: true, rsvp: newRsvp });
});

// GET /api/menu - Get menu
app.get("/api/menu", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ success: true, menu: db.menu });
});

// GET /api/notifications - Get notifications
app.get("/api/notifications", async (req: Request, res: Response) => {
  const db = await getAllData();
  res.json({ success: true, notifications: db.notifications });
});

// POST /api/generate-menu-suggestion - AI menu suggestion
app.post("/api/generate-menu-suggestion", async (req: Request, res: Response) => {
  const { eventType, budget, dietaryRestrictions } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(503).json({ error: "AI service not configured" });
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Suggest a menu for a ${eventType || "family gathering"} with budget ${budget || "medium"}. Dietary: ${dietaryRestrictions || "none"}. Format as JSON with sections: starters, mainCourse, roti, rice, dessert, drinks.`,
    });
    res.json({ success: true, suggestion: response.text });
  } catch (e) {
    res.status(500).json({ error: "AI generation failed" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(process.cwd(), "dist")));
}

// Export for Vercel
export default async function handler(req: any, res: any) {
  return new Promise((resolve, reject) => {
    app(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}


