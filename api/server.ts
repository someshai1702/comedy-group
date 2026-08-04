import express from "express";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { supabase } from "../supabase.js";

dotenv.config();

const app = express();
const DB_FILE = path.join(process.cwd(), "db.json");

app.use(express.json());

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({ apiKey: key });
    }
  }
  return aiClient;
}

async function readDatabaseFromFile(): Promise<any> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      families: [],
      menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
      events: [],
      rsvps: [],
      notifications: []
    };
  }
}

async function readDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabase || !supabaseUrl || !supabaseKey) {
    return await readDatabaseFromFile();
  }

  try {
    const [
      { data: families },
      { data: menuItems },
      { data: events },
      { data: rsvps },
      { data: notifications }
    ] = await Promise.all([
      supabase.from("families").select("*"),
      supabase.from("menu_items").select("*"),
      supabase.from("events").select("*"),
      supabase.from("rsvps").select("*"),
      supabase.from("notifications").select("*").order("createdAt", { ascending: false })
    ]);

    const menu: any = { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] };
    if (menuItems) {
      for (const item of menuItems) {
        if (menu[item.category]) {
          menu[item.category].push({ id: item.id, name: item.name });
        }
      }
    }

    return {
      families: families || [],
      menu,
      events: events || [],
      rsvps: rsvps || [],
      notifications: notifications || []
    };
  } catch (error) {
    console.error("Error reading database from Supabase, using fallback:", error);
    return await readDatabaseFromFile();
  }
}

async function writeDatabaseToFile(db: any): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

async function writeDatabase(db: any) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  
  if (!supabase || !supabaseUrl || !supabaseKey) {
    return await writeDatabaseToFile(db);
  }

  try {
    const { data: existingFamilies } = await supabase.from("families").select("id");
    if (existingFamilies) {
      const dbIds = db.families.map((f: any) => f.id);
      const toDelete = existingFamilies.map((f: any) => f.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("families").delete().in("id", toDelete);
      }
    }
    if (db.families.length > 0) {
      await supabase.from("families").upsert(db.families.map((f: any) => ({
        id: f.id, name: f.name, adults: f.adults, children: f.children, pin: f.pin, photoUrl: f.photoUrl
      })));
    }

    const menuItems: any[] = [];
    for (const category of Object.keys(db.menu)) {
      for (const item of db.menu[category]) {
        menuItems.push({ id: item.id, name: item.name, category: category });
      }
    }
    const { data: existingMenuItems } = await supabase.from("menu_items").select("id");
    if (existingMenuItems) {
      const dbIds = menuItems.map((item: any) => item.id);
      const toDelete = existingMenuItems.map((item: any) => item.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("menu_items").delete().in("id", toDelete);
      }
    }
    if (menuItems.length > 0) {
      await supabase.from("menu_items").upsert(menuItems);
    }

    const { data: existingEvents } = await supabase.from("events").select("id");
    if (existingEvents) {
      const dbIds = db.events.map((e: any) => e.id);
      const toDelete = existingEvents.map((e: any) => e.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("events").delete().in("id", toDelete);
      }
    }
    if (db.events.length > 0) {
      await supabase.from("events").upsert(db.events.map((e: any) => ({
        id: e.id, name: e.name || "", type: e.type, hostFamilyId: e.hostFamilyId,
        date: e.date, time: e.time, restaurant: e.restaurant || "", address: e.address || "",
        googleMapsUrl: e.googleMapsUrl || "", deadline: e.deadline || "", notes: e.notes || "",
        isActive: e.isActive !== false
      })));
    }

    const { data: existingRsvps } = await supabase.from("rsvps").select("eventId, familyId");
    if (existingRsvps) {
      const dbKeys = db.rsvps.map((r: any) => `${r.eventId}_${r.familyId}`);
      const toDelete = existingRsvps.filter((r: any) => !dbKeys.includes(`${r.eventId}_${r.familyId}`));
      for (const item of toDelete) {
        await supabase.from("rsvps").delete().match({ eventId: item.eventId, familyId: item.familyId });
      }
    }
    if (db.rsvps.length > 0) {
      await supabase.from("rsvps").upsert(db.rsvps.map((r: any) => ({
        eventId: r.eventId, familyId: r.familyId, attending: r.attending, reason: r.reason || "",
        adultsAttendingCount: r.adsAttendingCount || 0, childrenAttendingCount: r.childrenAttendingCount || 0,
        order: r.order || {}, specialInstructions: r.specialInstructions || "", updatedAt: r.updatedAt
      })));
    }

    const { data: existingNotifs } = await supabase.from("notifications").select("id");
    if (existingNotifs) {
      const dbIds = db.notifications.map((n: any) => n.id);
      const toDelete = existingNotifs.map((n: any) => n.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("notifications").delete().in("id", toDelete);
      }
    }
    if (db.notifications.length > 0) {
      await supabase.from("notifications").upsert(db.notifications.map((n: any) => ({
        id: n.id, eventId: n.eventId || null, title: n.title, message: n.message,
        type: n.type, createdAt: n.createdAt
      })));
    }
  } catch (error) {
    console.error("Error writing database to Supabase:", error);
    throw error;
  }
}

// GET /api/db
app.get("/db", async (req, res) => {
  const db = await readDatabase();
  res.json(db);
});

// POST /api/login
app.post("/login", async (req, res) => {
  const { familyId, pin } = req.body;
  if (!familyId || !pin) {
    return res.status(400).json({ error: "Family ID and PIN are required" });
  }
  const db = await readDatabase();
  const family = db.families.find((f: any) => f.id === familyId);
  if (!family) {
    return res.status(404).json({ error: "Family not found in the Comedy Group" });
  }
  if (family.pin !== pin) {
    return res.status(401).json({ error: "Incorrect 4-digit PIN" });
  }
  res.json({ success: true, family });
});

// POST /api/families
app.post("/families", async (req, res) => {
  const { name, adults, children, pin, photoUrl } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "Family Name and PIN are required" });
  }
  const db = await readDatabase();
  const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  const newFamily = { id, name, adults: Array.isArray(adults) ? adults : [], children: Array.isArray(children) ? children : [], pin, photoUrl: photoUrl || "" };
  db.families.push(newFamily);
  await writeDatabase(db);
  res.json({ success: true, family: newFamily });
});

// PUT /api/families/:id
app.put("/families/:id", async (req, res) => {
  const { id } = req.params;
  const { name, adults, children, pin, photoUrl } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "Family Name and PIN are required" });
  }
  const db = await readDatabase();
  const idx = db.families.findIndex((f: any) => f.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Family not found" });
  }
  db.families[idx] = { ...db.families[idx], name, adults: Array.isArray(adults) ? adults : [], children: Array.isArray(children) ? children : [], pin, photoUrl: photoUrl || db.families[idx].photoUrl };
  await writeDatabase(db);
  res.json({ success: true, family: db.families[idx] });
});

// DELETE /api/families/:id
app.delete("/families/:id", async (req, res) => {
  const { id } = req.params;
  if (id === "admin") {
    return res.status(400).json({ error: "Cannot delete the admin superuser" });
  }
  const db = await readDatabase();
  const initialLength = db.families.length;
  db.families = db.families.filter((f: any) => f.id !== id);
  if (db.families.length === initialLength) {
    return res.status(404).json({ error: "Family not found" });
  }
  db.rsvps = db.rsvps.filter((r: any) => r.familyId !== id);
  await writeDatabase(db);
  res.json({ success: true });
});

// PUT /api/families/:id/change-pin
app.put("/families/:id/change-pin", async (req, res) => {
  const { id } = req.params;
  const { oldPin, newPin } = req.body;
  if (!oldPin || !newPin) {
    return res.status(400).json({ error: "Current PIN and new PIN are required" });
  }
  if (newPin.length !== 4 || isNaN(Number(newPin))) {
    return res.status(400).json({ error: "New PIN must be a 4-digit number" });
  }
  const db = await readDatabase();
  const idx = db.families.findIndex((f: any) => f.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Family not found" });
  }
  if (db.families[idx].pin !== oldPin) {
    return res.status(401).json({ error: "Current PIN is incorrect" });
  }
  db.families[idx].pin = newPin;
  await writeDatabase(db);
  res.json({ success: true, family: db.families[idx] });
});

// POST /api/events
app.post("/events", async (req, res) => {
  const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes } = req.body;
  if (!name || !type || !hostFamilyId || !date || !time) {
    return res.status(400).json({ error: "Event name, type, host family, date, and time are required" });
  }
  const db = await readDatabase();
  const newEvent = {
    id: "event_" + Date.now(),
    name, type, hostFamilyId, date, time,
    restaurant: restaurant || "",
    address: address || "",
    googleMapsUrl: googleMapsUrl || "",
    deadline: deadline || "",
    notes: notes || "",
    isActive: true
  };
  db.events.unshift(newEvent);
  db.notifications.unshift({
    id: "notif_" + Date.now(),
    eventId: newEvent.id,
    title: "🎉 New Event Created!",
    message: `${db.families.find((f: any) => f.id === hostFamilyId)?.name || 'Someone'} is hosting a ${type} on ${date}. Please RSVP and submit your food order!`,
    type: "info",
    createdAt: new Date().toISOString()
  });
  await writeDatabase(db);
  res.json({ success: true, event: newEvent });
});

// PUT /api/events/:id
app.put("/events/:id", async (req, res) => {
  const { id } = req.params;
  const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes, isActive } = req.body;
  const db = await readDatabase();
  const idx = db.events.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Event not found" });
  }
  db.events[idx] = { ...db.events[idx], name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes, isActive };
  await writeDatabase(db);
  res.json({ success: true, event: db.events[idx] });
});

// DELETE /api/events/:id
app.delete("/events/:id", async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase();
  const idx = db.events.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Event not found" });
  }
  db.events.splice(idx, 1);
  db.rsvps = db.rsvps.filter((r: any) => r.eventId !== id);
  db.notifications = db.notifications.filter((n: any) => n.eventId !== id);
  await writeDatabase(db);
  res.json({ success: true });
});

// PUT /api/events/:id/toggle-active
app.put("/events/:id/toggle-active", async (req, res) => {
  const { id } = req.params;
  const db = await readDatabase();
  const idx = db.events.findIndex((e: any) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Event not found" });
  }
  db.events[idx].isActive = !db.events[idx].isActive;
  await writeDatabase(db);
  res.json({ success: true, event: db.events[idx] });
});

// POST /api/rsvps
app.post("/rsvps", async (req, res) => {
  const { eventId, familyId, attending, reason, adultsAttendingCount, childrenAttendingCount, order, specialInstructions } = req.body;
  if (!eventId || !familyId || !attending) {
    return res.status(400).json({ error: "Event ID, family ID, and attending status are required" });
  }
  const db = await readDatabase();
  const family = db.families.find((f: any) => f.id === familyId);
  const existingIdx = db.rsvps.findIndex((r: any) => r.eventId === eventId && r.familyId === familyId);
  const rsvpData = {
    eventId, familyId, attending, reason: reason || "",
    adultsAttendingCount: adultsAttendingCount || 0,
    childrenAttendingCount: childrenAttendingCount || 0,
    order: order || {},
    specialInstructions: specialInstructions || "",
    updatedAt: new Date().toISOString()
  };
  if (existingIdx !== -1) {
    db.rsvps[existingIdx] = rsvpData;
  } else {
    db.rsvps.push(rsvpData);
  }
  db.notifications.unshift({
    id: "notif_" + Date.now(),
    eventId,
    title: `✍️ RSVP Updated: ${family?.name || familyId}`,
    message: `${family?.name || familyId} submitted: ${attending} (${adultsAttendingCount || 0} Adults, ${childrenAttendingCount || 0} Kids).`,
    type: "success",
    createdAt: new Date().toISOString()
  });
  await writeDatabase(db);
  res.json({ success: true, rsvp: rsvpData });
});

// PUT /api/menu
app.put("/menu", async (req, res) => {
  const { section, items } = req.body;
  if (!section || !Array.isArray(items)) {
    return res.status(400).json({ error: "Section and items array are required" });
  }
  const db = await readDatabase();
  if (!db.menu[section]) {
    return res.status(400).json({ error: "Invalid menu section" });
  }
  db.menu[section] = items;
  await writeDatabase(db);
  res.json({ success: true });
});

// POST /api/notifications
app.post("/notifications", async (req, res) => {
  const { eventId, title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }
  const db = await readDatabase();
  const newNotif = {
    id: "notif_" + Date.now(),
    eventId: eventId || null,
    title,
    message,
    type: type || "info",
    createdAt: new Date().toISOString()
  };
  db.notifications.unshift(newNotif);
  await writeDatabase(db);
  res.json({ success: true, notification: newNotif });
});

// POST /api/generate-menu-suggestion
app.post("/generate-menu-suggestion", async (req, res) => {
  const { theme, notes } = req.body;
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(500).json({ error: "AI client not configured" });
  }
  try {
    const prompt = `You are the master chef AI for a family group dinner. Suggest a creative themed Indian restaurant menu...`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    res.json({ success: true, suggestion: response.text });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to generate AI menu suggestion: " + error.message });
  }
});

// POST /api/reset-db
app.post("/reset-db", async (req, res) => {
  const cleanDb = {
    families: [
      { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "" },
      { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "" },
      { id: "mehta", name: "Mehta Family", adults: ["Raj", "Ritu"], children: ["Ishaan", "Anya"], pin: "3333", photoUrl: "" },
      { id: "joshi", name: "Joshi Family", adults: ["Vikram", "Aditi"], children: ["Vivaan", "Saisha"], pin: "4444", photoUrl: "" },
      { id: "kapoor", name: "Kapoor Family", adults: ["Sanjay", "Neha"], children: ["Rohan", "Shanaya"], pin: "5555", photoUrl: "" },
      { id: "malhotra", name: "Malhotra Family", adults: ["Karan", "Pooja"], children: ["Arjun", "Myra"], pin: "6666", photoUrl: "" },
      { id: "admin", name: "System Admin", adults: ["Captain Admin"], children: [], pin: "0000", photoUrl: "" }
    ],
    menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
    events: [], rsvps: [], notifications: []
  };
  await writeDatabase(cleanDb);
  res.json({ success: true, db: cleanDb });
});

export default app;
