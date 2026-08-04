import express, { Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { supabase } from "../supabase.js";

dotenv.config();

const app = express();
app.use(express.json());

// Strip /api prefix for Vercel serverless
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    req.url = req.path.slice(4) || "/";
    req.path = req.path.slice(4) || "/"; // Also strip from req.path for route matching
  }
  next();
});

const DB_FILE = path.join(process.cwd(), "db.json");

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
  // Always use local file storage for now
  // Supabase integration can be added later
  return await readDatabaseFromFile();
}

// Test endpoint for debugging POST requests - DEPLOYED AT 2024-XX-XX
app.post("/test", async (req, res) => {
  console.log("POST /test called with body:", req.body);
  res.json({ success: true, received: req.body });
});

async function writeDatabaseToFile(db: any): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// Timeout wrapper for Supabase operations (3 second timeout)
async function withTimeout<T>(promise: Promise<T>, ms: number = 3000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Supabase timeout - falling back to local storage")), ms)
  );
  return Promise.race([promise, timeout]);
}

async function writeDatabase(db: any) {
  // Always use local file storage for now
  // Supabase integration can be added later
  await writeDatabaseToFile(db);
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

// Export for Vercel serverless
// SPA routing is handled by Vercel via vercel.json routes
export default app;
