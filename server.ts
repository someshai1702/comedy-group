import express from "express";
import path from "path";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { supabase } from "./supabase.js";
import webpush from "web-push";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const DB_FILE = path.join(process.cwd(), "db.json");

// VAPID keys for push notifications
const VAPID_PUBLIC_KEY = "BDiG4S4Sod4ysuEUoaxjCYVbvpPejQLyUKx_BpGB_82ptF4LbLKAm2_a8R_U1AyoCBfxLVRUakANcHCZ_3thYtA";
const VAPID_PRIVATE_KEY = "Kz9W65Z5-56fPyN25CgWMAFu3PGpPyBopGc5pxADqHw";
const VAPID_SUBJECT = "mailto:admin@comedy-group.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Parse JSON body
app.use(express.json());

// Lazy-loaded Gemini Client
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

// Database Helpers
async function readDatabase() {
  if (!supabase) {
    console.error("[Supabase] Error: Supabase client is not initialized.");
    return {
      families: [],
      menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
      events: [],
      rsvps: [],
      notifications: []
    };
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

    // Reconstruct menu structure
    const menu: any = { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] };
    if (menuItems) {
      for (const item of menuItems) {
        if (menu[item.category]) {
          menu[item.category].push({
            id: item.id,
            name: item.name
          });
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
    return {
      families: [],
      menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
      events: [],
      rsvps: [],
      notifications: []
    };
  }
}

async function writeDatabase(db: any) {
  if (!supabase) {
    console.error("[Supabase] Error: Supabase client is not initialized.");
    throw new Error("Supabase client is not initialized. Please configure environment variables in Vercel.");
  }
  try {
    // 1. Sync Families
    const { data: existingFamilies } = await supabase.from("families").select("id");
    if (existingFamilies) {
      const dbIds = db.families.map((f: any) => f.id);
      const toDelete = existingFamilies.map((f: any) => f.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("families").delete().in("id", toDelete);
      }
    }
    if (db.families.length > 0) {
      const { error } = await supabase.from("families").upsert(
        db.families.map((f: any) => ({
          id: f.id,
          name: f.name,
          adults: f.adults,
          children: f.children,
          pin: f.pin,
          photoUrl: f.photoUrl
        }))
      );
      if (error) throw error;
    }

    // 2. Sync Menu Items
    const menuItems: any[] = [];
    for (const category of Object.keys(db.menu)) {
      const items = db.menu[category];
      for (const item of items) {
        menuItems.push({
          id: item.id,
          name: item.name,
          category: category
        });
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
      const { error } = await supabase.from("menu_items").upsert(menuItems);
      if (error) throw error;
    }

    // 3. Sync Events
    const { data: existingEvents } = await supabase.from("events").select("id");
    if (existingEvents) {
      const dbIds = db.events.map((e: any) => e.id);
      const toDelete = existingEvents.map((e: any) => e.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("events").delete().in("id", toDelete);
      }
    }
    if (db.events.length > 0) {
      const { error } = await supabase.from("events").upsert(
        db.events.map((e: any) => ({
          id: e.id,
          name: e.name || "",
          type: e.type,
          hostFamilyId: e.hostFamilyId,
          date: e.date,
          time: e.time,
          restaurant: e.restaurant || "",
          address: e.address || "",
          googleMapsUrl: e.googleMapsUrl || "",
          deadline: e.deadline || "",
          notes: e.notes || "",
          isActive: e.isActive !== false
        }))
      );
      if (error) throw error;
    }

    // 4. Sync RSVPs
    const { data: existingRsvps } = await supabase.from("rsvps").select("eventId, familyId");
    if (existingRsvps) {
      const dbKeys = db.rsvps.map((r: any) => `${r.eventId}_${r.familyId}`);
      const toDelete = existingRsvps.filter((r: any) => !dbKeys.includes(`${r.eventId}_${r.familyId}`));
      for (const item of toDelete) {
        await supabase.from("rsvps").delete().match({ eventId: item.eventId, familyId: item.familyId });
      }
    }
    if (db.rsvps.length > 0) {
      const { error } = await supabase.from("rsvps").upsert(
        db.rsvps.map((r: any) => ({
          eventId: r.eventId,
          familyId: r.familyId,
          attending: r.attending,
          reason: r.reason || "",
          adultsAttendingCount: r.adultsAttendingCount || 0,
          childrenAttendingCount: r.childrenAttendingCount || 0,
          order: r.order || {},
          specialInstructions: r.specialInstructions || "",
          updatedAt: r.updatedAt
        }))
      );
      if (error) throw error;
    }

    // 5. Sync Notifications
    const { data: existingNotifs } = await supabase.from("notifications").select("id");
    if (existingNotifs) {
      const dbIds = db.notifications.map((n: any) => n.id);
      const toDelete = existingNotifs.map((n: any) => n.id).filter(id => !dbIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("notifications").delete().in("id", toDelete);
      }
    }
    if (db.notifications.length > 0) {
      const { error } = await supabase.from("notifications").upsert(
        db.notifications.map((n: any) => ({
          id: n.id,
          eventId: n.eventId || null,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt
        }))
      );
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error writing database to Supabase:", error);
    throw error;
  }
}

async function cleanupExpiredEvents() {
  try {
    const db = await readDatabase();
    const now = Date.now();
    const expiryOffset = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    let dbChanged = false;
    const activeEvents = [];
    const expiredEventIds = [];

    for (const event of db.events) {
      const eventDateTimeStr = `${event.date}T${event.time}`;
      const eventTime = new Date(eventDateTimeStr).getTime();

      if (!isNaN(eventTime)) {
        if (now > eventTime + expiryOffset) {
          expiredEventIds.push(event.id);
          dbChanged = true;
          continue;
        }
      }
      activeEvents.push(event);
    }

    if (dbChanged) {
      db.events = activeEvents;
      // Clean up associated RSVPs
      db.rsvps = db.rsvps.filter((r: any) => !expiredEventIds.includes(r.eventId));
      // Clean up associated notifications
      db.notifications = db.notifications.filter((n: any) => !expiredEventIds.includes(n.eventId));

      await writeDatabase(db);
      console.log(`[Database Cleanup] Automatically deleted ${expiredEventIds.length} expired event(s) after 24 hours of expiry:`, expiredEventIds);
    }
  } catch (error) {
    console.error("[Database Cleanup] Error running cleanup:", error);
  }
}

// API Routes

// Get full Database
app.get("/api/db", async (req, res) => {
  await cleanupExpiredEvents();
  const db = await readDatabase();
  res.json(db);
});

// Authenticate Family
app.post("/api/login", async (req, res) => {
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

// Add Family
app.post("/api/families", async (req, res) => {
  const { name, adults, children, pin, photoUrl } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "Family Name and PIN are required" });
  }
  const db = await readDatabase();
  const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
  
  const newFamily = {
    id,
    name,
    adults: Array.isArray(adults) ? adults : [],
    children: Array.isArray(children) ? children : [],
    pin,
    photoUrl: photoUrl || "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200"
  };
  db.families.push(newFamily);
  await writeDatabase(db);
  res.json({ success: true, family: newFamily });
});

// Update Family Details
app.put("/api/families/:id", async (req, res) => {
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
  db.families[idx] = {
    ...db.families[idx],
    name,
    adults: Array.isArray(adults) ? adults : [],
    children: Array.isArray(children) ? children : [],
    pin,
    photoUrl: photoUrl || db.families[idx].photoUrl
  };
  await writeDatabase(db);
  res.json({ success: true, family: db.families[idx] });
});

// Delete Family
app.delete("/api/families/:id", async (req, res) => {
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

// Change PIN
app.put("/api/families/:id/change-pin", async (req, res) => {
  const { id } = req.params;
  const { oldPin, newPin } = req.body;
  if (!oldPin || !newPin || newPin.length !== 4) {
    return res.status(400).json({ error: "Old PIN and new 4-digit PIN are required" });
  }
  const db = await readDatabase();
  const family = db.families.find((f: any) => f.id === id);
  if (!family) {
    return res.status(404).json({ error: "Family not found" });
  }
  if (family.pin !== oldPin) {
    return res.status(400).json({ error: "Incorrect current PIN number" });
  }
  family.pin = newPin;
  await writeDatabase(db);
  res.json({ success: true });
});

// Create Event
app.post("/api/events", async (req, res) => {
  const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes } = req.body;

  if (!type || !hostFamilyId || !date || !time) {
    return res.status(400).json({ error: "Missing required event fields (type, hostFamilyId, date, time)" });
  }

  const db = await readDatabase();
  const newEvent = {
    id: `event_${Date.now()}`,
    name,
    type,
    hostFamilyId,
    date,
    time,
    restaurant: restaurant || "",
    address: address || "",
    googleMapsUrl: googleMapsUrl || "",
    deadline: deadline || new Date(new Date(date + "T" + time).getTime() - 4 * 60 * 60 * 1000).toISOString(),
    notes: notes || "",
    isActive: true
  };

  db.events.unshift(newEvent);

  // Add system notification for the group
  const hostFamily = db.families.find((f: any) => f.id === hostFamilyId);
  const hostName = hostFamily ? hostFamily.name : "A group captain";
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    eventId: newEvent.id,
    title: `🎉 New ${type} Scheduled!`,
    message: `${hostName} is hosting '${name}' at ${restaurant || "TBD"} on ${date} at ${time}. Order deadline is ${new Date(newEvent.deadline).toLocaleString()}.`,
    type: "info",
    createdAt: new Date().toISOString()
  });

  await writeDatabase(db);
  res.json({ success: true, event: newEvent });
});

// Edit Event Details
app.put("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  const { requesterFamilyId, ...updates } = req.body;

  if (!requesterFamilyId) {
    return res.status(400).json({ error: "Requester Family ID is required for authorization" });
  }

  const db = await readDatabase();
  const eventIndex = db.events.findIndex((e: any) => e.id === id);

  if (eventIndex === -1) {
    return res.status(404).json({ error: "Event not found" });
  }

  const event = db.events[eventIndex];
  if (requesterFamilyId !== "admin" && event.hostFamilyId !== requesterFamilyId) {
    return res.status(403).json({ error: "You do not have permission to edit this event" });
  }

  db.events[eventIndex] = {
    ...event,
    ...updates
  };

  await writeDatabase(db);
  res.json({ success: true, event: db.events[eventIndex] });
});

// Delete Event
app.delete("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  const requesterFamilyId = req.body.requesterFamilyId || req.query.familyId;
  console.log(`[DELETE /api/events/${id}] requesterFamilyId:`, requesterFamilyId);

  if (!requesterFamilyId) {
    console.log(`[DELETE /api/events/${id}] Rejecting: requesterFamilyId is missing`);
    return res.status(400).json({ error: "Requester Family ID is required for authorization" });
  }

  const db = await readDatabase();
  const eventIndex = db.events.findIndex((e: any) => e.id === id);
  console.log(`[DELETE /api/events/${id}] eventIndex:`, eventIndex);

  if (eventIndex === -1) {
    console.log(`[DELETE /api/events/${id}] Rejecting: event not found`);
    return res.status(404).json({ error: "Event not found" });
  }

  const event = db.events[eventIndex];
  console.log(`[DELETE /api/events/${id}] event hostFamilyId:`, event.hostFamilyId);
  if (requesterFamilyId !== "admin" && event.hostFamilyId !== requesterFamilyId) {
    console.log(`[DELETE /api/events/${id}] Rejecting: permission denied`);
    return res.status(403).json({ error: "You do not have permission to delete this event" });
  }

  // Remove event
  db.events.splice(eventIndex, 1);

  // Clean up associated RSVPs
  db.rsvps = db.rsvps.filter((r: any) => r.eventId !== id);

  // Clean up notifications for this event
  db.notifications = db.notifications.filter((n: any) => n.eventId !== id);

  await writeDatabase(db);
  res.json({ success: true });
});

// Toggle Event Active/Locked status
app.put("/api/events/:id/toggle-active", async (req, res) => {
  const { id } = req.params;
  const requesterFamilyId = req.body.requesterFamilyId || req.query.familyId;

  if (!requesterFamilyId) {
    return res.status(400).json({ error: "Requester Family ID is required for authorization" });
  }

  const db = await readDatabase();
  const eventIndex = db.events.findIndex((e: any) => e.id === id);

  if (eventIndex === -1) {
    return res.status(404).json({ error: "Event not found" });
  }

  const event = db.events[eventIndex];
  if (requesterFamilyId !== "admin" && event.hostFamilyId !== requesterFamilyId) {
    return res.status(403).json({ error: "You do not have permission to lock/unlock this event" });
  }

  const currentStatus = db.events[eventIndex].isActive;
  db.events[eventIndex].isActive = !currentStatus;

  // Notification for state change
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    eventId: id,
    title: db.events[eventIndex].isActive ? "🔓 Ordering Re-opened!" : "🔒 Food Ordering Closed!",
    message: db.events[eventIndex].isActive 
      ? `The captain has re-opened ordering for '${db.events[eventIndex].name}'.`
      : `Orders have been locked for '${db.events[eventIndex].name}'. No more changes can be made.`,
    type: db.events[eventIndex].isActive ? "success" : "warning",
    createdAt: new Date().toISOString()
  });

  await writeDatabase(db);
  res.json({ success: true, event: db.events[eventIndex] });
});

// Submit RSVP and Order
app.post("/api/rsvps", async (req, res) => {
  const { eventId, familyId, attending, reason, adultsAttendingCount, childrenAttendingCount, order, specialInstructions } = req.body;

  if (!eventId || !familyId || !attending) {
    return res.status(400).json({ error: "Missing required RSVP fields" });
  }

  const db = await readDatabase();
  const event = db.events.find((e: any) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  // Check if active (unlocked) unless administrator override
  if (!event.isActive) {
    return res.status(403).json({ error: "This event is currently locked by the captain. No orders or changes are accepted." });
  }

  // Find or insert RSVP
  const existingRsvpIndex = db.rsvps.findIndex((r: any) => r.eventId === eventId && r.familyId === familyId);
  const family = db.families.find((f: any) => f.id === familyId);
  const familyName = family ? family.name : "A family";

  const rsvpPayload = {
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

  if (existingRsvpIndex !== -1) {
    db.rsvps[existingRsvpIndex] = rsvpPayload;
  } else {
    db.rsvps.push(rsvpPayload);
  }

  // Add system notification for successful submission
  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    eventId,
    title: `✍️ RSVP Updated: ${familyName}`,
    message: `${familyName} submitted: ${attending === "Yes" ? `Yes (${rsvpPayload.adultsAttendingCount} Adults, ${rsvpPayload.childrenAttendingCount} Kids)` : `No (${rsvpPayload.reason})`}.`,
    type: attending === "Yes" ? "success" : "warning",
    createdAt: new Date().toISOString()
  });

  await writeDatabase(db);
  res.json({ success: true, rsvp: rsvpPayload });
});

// Update Menu Items
app.put("/api/menu", async (req, res) => {
  const { section, items } = req.body; // e.g. section = "starters"
  if (!section || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Section name and array of items required" });
  }

  const db = await readDatabase();
  if (!db.menu[section]) {
    return res.status(400).json({ error: `Menu section '${section}' does not exist.` });
  }

  db.menu[section] = items;
  await writeDatabase(db);
  res.json({ success: true, menu: db.menu });
});

// Send Group Notification Manually
app.post("/api/notifications", async (req, res) => {
  const { eventId, title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Title and message are required" });
  }

  const db = await readDatabase();
  const newNotif = {
    id: `notif_${Date.now()}`,
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

// Gemini-powered Creative Menu Helper
app.post("/api/generate-menu-suggestion", async (req, res) => {
  const { theme, notes } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      success: false,
      message: "No Gemini API Key configured in your AI Studio secrets, but here is a default creative menu idea:",
      suggestion: `### 🎭 theme: ${theme || "Bollywood Retro"}\n\n**Starters**:\n*   *Sholay Paneer Tikka* - Smoked cottage cheese chunks\n*   *Mughal-E-Azam Soup* - Rich tomato soup with roasted cumin\n\n**Main Course**:\n*   *Amar Akbar Anthony Curry* - Veg Kolhapuri style spicy curry\n*   *Don't Fear Dal* - Creamy slow-cooked Dal Makhani\n\n**Dessert**:\n*   *Dilwale Dulhania Gulab Jamun* - Hot sweet dumplings`
    });
  }

  try {
    const prompt = `You are the master chef AI and event organizer for a family group called the "Comedy Group" (7 families, 28 members total).
    The captain is organizing a dinner party with the theme/occasion: "${theme || "General Family Reunion"}" and special notes: "${notes || "make it fun!"}".
    
    Suggest a super creative and themed Indian restaurant menu. Align with standard popular categories like:
    1. Starters
    2. Main Course
    3. Rice and Bread (Roti) section
    4. Desserts & Drinks
    
    For each category, give 2-3 custom fun names related to the theme, along with a 1-sentence hilarious explanation for each. Keep it extremely engaging, funny, and warm, suited for a close-knit group of families. Use Markdown formatting.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      suggestion: response.text
    });
  } catch (error: any) {
    console.error("Gemini suggestion failed:", error);
    res.status(500).json({ error: "Failed to generate AI menu suggestion: " + error.message });
  }
});

// Reset Database to Clean State
app.post("/api/reset-db", async (req, res) => {
  const cleanDb = {
    "families": [
      {
        "id": "sharma",
        "name": "Sharma Family",
        "adults": ["Rahul", "Priya"],
        "children": ["Kabir", "Meera"],
        "pin": "1111"
      },
      {
        "id": "patel",
        "name": "Patel Family",
        "adults": ["Amit", "Sneha"],
        "children": ["Aarav", "Diya"],
        "pin": "2222"
      },
      {
        "id": "mehta",
        "name": "Mehta Family",
        "adults": ["Raj", "Ritu"],
        "children": ["Ishaan", "Anya"],
        "pin": "3333"
      },
      {
        "id": "joshi",
        "name": "Joshi Family",
        "adults": ["Vikram", "Aditi"],
        "children": ["Vivaan", "Saisha"],
        "pin": "4444"
      },
      {
        "id": "kapoor",
        "name": "Kapoor Family",
        "adults": ["Sanjay", "Neha"],
        "children": ["Rohan", "Shanaya"],
        "pin": "5555"
      },
      {
        "id": "malhotra",
        "name": "Malhotra Family",
        "adults": ["Karan", "Pooja"],
        "children": ["Arjun", "Myra"],
        "pin": "6666"
      },
      {
        "id": "admin",
        "name": "System Admin",
        "adults": ["Captain Admin"],
        "children": [],
        "pin": "0000"
      }
    ],
    "menu": {
      "starters": [
        { "id": "st_m_papad", "name": "Masala Papad", "price": 40 },
        { "id": "st_r_papad", "name": "Roasted Papad", "price": 25 },
        { "id": "st_f_papad", "name": "Fry Papad", "price": 30 },
        { "id": "st_tom_soup", "name": "Tomato Soup", "price": 110 },
        { "id": "st_man_soup", "name": "Manchow Soup", "price": 120 },
        { "id": "st_corn_soup", "name": "Sweet Corn Soup", "price": 120 },
        { "id": "st_hs_soup", "name": "Hot & Sour Soup", "price": 120 },
        { "id": "st_pan_chilli", "name": "Paneer Chilli", "price": 220 },
        { "id": "st_pan_tikka", "name": "Paneer Tikka", "price": 240 },
        { "id": "st_veg_crispy", "name": "Veg Crispy", "price": 180 },
        { "id": "st_veg_manch", "name": "Veg Manchurian", "price": 170 },
        { "id": "st_fries", "name": "French Fries", "price": 90 }
      ],
      "mainCourse": [
        { "id": "mc_pan_but", "name": "Paneer Butter Masala", "price": 240 },
        { "id": "mc_pan_kad", "name": "Kadai Paneer", "price": 240 },
        { "id": "mc_veg_kol", "name": "Veg Kolhapuri", "price": 210 },
        { "id": "mc_veg_han", "name": "Veg Handi", "price": 215 },
        { "id": "mc_mix_veg", "name": "Mix Veg", "price": 200 },
        { "id": "mc_dal_fry", "name": "Dal Fry", "price": 140 },
        { "id": "mc_dal_tad", "name": "Dal Tadka", "price": 150 },
        { "id": "mc_jeera_aloo", "name": "Jeera Aloo", "price": 160 }
      ],
      "roti": [
        { "id": "rt_plain_roti", "name": "Plain Roti", "price": 20 },
        { "id": "rt_but_roti", "name": "Butter Roti", "price": 25 },
        { "id": "rt_chapati", "name": "Chapati", "price": 15 },
        { "id": "rt_plain_naan", "name": "Plain Naan", "price": 45 },
        { "id": "rt_but_naan", "name": "Butter Naan", "price": 55 },
        { "id": "rt_but_kulcha", "name": "Butter Kulcha", "price": 60 },
        { "id": "rt_garlic_naan", "name": "Garlic Naan", "price": 70 },
        { "id": "rt_tand_roti", "name": "Tandoori Roti", "price": 25 }
      ],
      "rice": [
        { "id": "rc_plain", "name": "Plain Rice", "price": 110 },
        { "id": "rc_jeera", "name": "Jeera Rice", "price": 130 },
        { "id": "rc_biryani", "name": "Veg Biryani", "price": 220 },
        { "id": "rc_steam", "name": "Steam Rice", "price": 110 },
        { "id": "rc_khichdi", "name": "Dal Khichdi", "price": 160 }
      ],
      "dessert": [
        { "id": "ds_ice_cream", "name": "Ice Cream", "price": 80 },
        { "id": "ds_gulab_jamun", "name": "Gulab Jamun", "price": 60 },
        { "id": "ds_brownie", "name": "Brownie", "price": 140 },
        { "id": "ds_rabdi", "name": "Rabdi", "price": 90 }
      ],
      "drinks": [
        { "id": "dr_water", "name": "Water", "price": 20 },
        { "id": "dr_soft_drink", "name": "Soft Drink", "price": 40 },
        { "id": "dr_lime_soda", "name": "Lime Soda", "price": 60 },
        { "id": "dr_buttermilk", "name": "Buttermilk", "price": 30 }
      ]
    },
    "events": [
      {
        "id": "event_1",
        "name": "Comedy Group Grand Weekend Dinner",
        "type": "Weekend Dinner",
        "hostFamilyId": "sharma",
        "date": "2026-06-28",
        "time": "20:00",
        "restaurant": "Grand Punjab Heritage Restaurant",
        "address": "Link Road, Near Galaxy Mall, Andheri West, Mumbai",
        "googleMapsUrl": "https://maps.google.com/?q=Grand+Punjab+Restaurant+Andheri",
        "deadline": "2026-06-28T14:00:00.000Z",
        "notes": "Celebrate Vikram and Aditi's Joshi Family's wedding anniversary! Join us for delicious Punjabi food.",
        "isActive": true
      }
    ],
    "rsvps": [],
    "notifications": [
      {
        "id": "notif_1",
        "eventId": "event_1",
        "title": "🎉 New Event Created!",
        "message": "Sharma Family is hosting a Weekend Dinner on June 28th at Grand Punjab Heritage Restaurant. Please RSVP and submit your food order!",
        "type": "info",
        "createdAt": "2026-06-26T22:00:00.000Z"
      }
    ]
  };
  await writeDatabase(cleanDb);
  res.json({ success: true, db: cleanDb });
});


// Start server after integrating Vite in development or static hosting in production
async function startServer() {
  // Vite integration (only in local development)
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Push Notification Endpoints
  // Store push subscriptions in memory (in production, use a database)
  const pushSubscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    browser: string;
    createdAt: string;
  }> = [];

  // Subscribe to push notifications
  app.post("/api/notifications/subscribe", async (req, res) => {
    try {
      const subscription = req.body;
      if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: "Invalid subscription" });
      }

      // Check if already exists
      const existing = pushSubscriptions.find(s => s.endpoint === subscription.endpoint);
      if (!existing) {
        pushSubscriptions.push({
          ...subscription,
          browser: req.headers["user-agent"] || "unknown",
          createdAt: new Date().toISOString()
        });
      }

      res.json({ success: true, subscriberCount: pushSubscriptions.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  // Send push notification to all subscribers
  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { title, body, icon, tag, url } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: "Title and body are required" });
      }

      const notificationPayload = JSON.stringify({
        title,
        body,
        icon: icon || "/public/comedy_group.png",
        badge: "/public/comedy_group.png",
        tag: tag || "comedy-group",
        url: url || "/",
        vibrate: [200, 100, 200]
      });

      const notificationOptions = {
        TTL: 86400, // 24 hours
        urgency: "normal"
      };

      let successCount = 0;
      let failCount = 0;

      // Send to all subscribers
      const sendPromises = pushSubscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: subscription.keys },
            notificationPayload,
            notificationOptions
          );
          successCount++;
        } catch (err: any) {
          console.error("Push failed for subscriber:", err.message);
          failCount++;
          // Remove invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            const idx = pushSubscriptions.findIndex(s => s.endpoint === subscription.endpoint);
            if (idx !== -1) pushSubscriptions.splice(idx, 1);
          }
        }
      });

      await Promise.all(sendPromises);

      console.log("📢 Push Notification Sent:");
      console.log(`  Title: ${title}`);
      console.log(`  Success: ${successCount}, Failed: ${failCount}`);

      res.json({
        success: true,
        message: `Notification sent to ${successCount} subscribers`,
        successCount,
        failCount,
        subscriberCount: pushSubscriptions.length
      });
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Get subscriber count (for admin panel)
  app.get("/api/notifications/subscribers", (req, res) => {
    res.json({ count: pushSubscriptions.length });
  });

  // Demo: Send test notification
  app.post("/api/notifications/test", (req, res) => {
    console.log("📢 Test Notification Sent!");
    res.json({ success: true, message: "Check your browser for the notification" });
  });

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`Express Full-Stack server is actively running on http://localhost:${PORT}`);
      await cleanupExpiredEvents();

      // Check periodically every 10 minutes
      setInterval(async () => {
        await cleanupExpiredEvents();
      }, 10 * 60 * 1000);
    });
  }
}

startServer();

export default app;
