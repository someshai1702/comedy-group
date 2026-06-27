import { supabase } from "../supabase";
import fs from "fs/promises";
import path from "path";

async function runMigration() {
  console.log("[Migration] Starting migration from db.json to Supabase...");
  
  const dbPath = path.join(__dirname, "../db.json");
  let db: any;
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    db = JSON.parse(data);
  } catch (err) {
    console.error("[Migration] Error reading db.json:", err);
    process.exit(1);
  }

  // 1. Seed Families
  if (db.families && db.families.length > 0) {
    console.log(`[Migration] Seeding ${db.families.length} families...`);
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
    if (error) {
      console.error("[Migration] Error seeding families:", error.message);
    } else {
      console.log("[Migration] Families seeded successfully.");
    }
  }

  // 2. Seed Menu Items
  if (db.menu) {
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
    
    if (menuItems.length > 0) {
      console.log(`[Migration] Seeding ${menuItems.length} menu items...`);
      const { error } = await supabase.from("menu_items").upsert(menuItems);
      if (error) {
        console.error("[Migration] Error seeding menu items:", error.message);
      } else {
        console.log("[Migration] Menu items seeded successfully.");
      }
    }
  }

  // 3. Seed Events
  if (db.events && db.events.length > 0) {
    console.log(`[Migration] Seeding ${db.events.length} events...`);
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
    if (error) {
      console.error("[Migration] Error seeding events:", error.message);
    } else {
      console.log("[Migration] Events seeded successfully.");
    }
  }

  // 4. Seed RSVPs
  if (db.rsvps && db.rsvps.length > 0) {
    console.log(`[Migration] Seeding ${db.rsvps.length} RSVPs...`);
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
    if (error) {
      console.error("[Migration] Error seeding RSVPs:", error.message);
    } else {
      console.log("[Migration] RSVPs seeded successfully.");
    }
  }

  // 5. Seed Notifications
  if (db.notifications && db.notifications.length > 0) {
    console.log(`[Migration] Seeding ${db.notifications.length} notifications...`);
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
    if (error) {
      console.error("[Migration] Error seeding notifications:", error.message);
    } else {
      console.log("[Migration] Notifications seeded successfully.");
    }
  }

  console.log("[Migration] Database migration completed!");
}

runMigration();
