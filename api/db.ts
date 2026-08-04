import type { VercelRequest, VercelResponse } from "@vercel/node";
import path from "path";
import fs from "fs/promises";

const DB_FILE = path.join(process.cwd(), "db.json");

async function readDatabaseFromFile(): Promise<any> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {
      families: [
        { id: "sharma", name: "Sharma Family", adults: ["Rahul", "Priya"], children: ["Kabir", "Meera"], pin: "1111", photoUrl: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200" },
        { id: "patel", name: "Patel Family", adults: ["Amit", "Sneha"], children: ["Aarav", "Diya"], pin: "2222", photoUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200" },
        { id: "mehta", name: "Mehta Family", adults: ["Raj", "Ritu"], children: ["Ishaan", "Anya"], pin: "3333", photoUrl: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200" },
        { id: "joshi", name: "Joshi Family", adults: ["Vikram", "Aditi"], children: ["Vivaan", "Saisha"], pin: "4444", photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200" },
        { id: "kapoor", name: "Kapoor Family", adults: ["Sanjay", "Neha"], children: ["Rohan", "Shanaya"], pin: "5555", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200" },
        { id: "malhotra", name: "Malhotra Family", adults: ["Karan", "Pooja"], children: ["Arjun", "Myra"], pin: "6666", photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" },
        { id: "shah", name: "Shah Family", adults: ["Nitin", "Swati"], children: ["Dev", "Riya"], pin: "7777", photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200" },
        { id: "admin", name: "Group Admin (Superuser)", adults: ["Captain Admin"], children: [], pin: "0000", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200" }
      ],
      menu: {
        starters: [
          { id: "st_m_papad", name: "Masala Papad", price: 40 },
          { id: "st_r_papad", name: "Roasted Papad", price: 25 },
          { id: "st_f_papad", name: "Fry Papad", price: 30 },
          { id: "st_tom_soup", name: "Tomato Soup", price: 110 },
          { id: "st_man_soup", name: "Manchow Soup", price: 120 },
          { id: "st_corn_soup", name: "Sweet Corn Soup", price: 120 },
          { id: "st_hs_soup", name: "Hot & Sour Soup", price: 120 },
          { id: "st_pan_chilli", name: "Paneer Chilli", price: 220 },
          { id: "st_pan_tikka", name: "Paneer Tikka", price: 240 },
          { id: "st_veg_crispy", name: "Veg Crispy", price: 180 },
          { id: "st_veg_manch", name: "Veg Manchurian", price: 170 },
          { id: "st_fries", name: "French Fries", price: 90 }
        ],
        mainCourse: [
          { id: "mc_pan_but", name: "Paneer Butter Masala", price: 240 },
          { id: "mc_pan_kad", name: "Kadai Paneer", price: 240 },
          { id: "mc_veg_kol", name: "Veg Kolhapuri", price: 210 },
          { id: "mc_veg_han", name: "Veg Handi", price: 215 },
          { id: "mc_mix_veg", name: "Mix Veg", price: 200 },
          { id: "mc_dal_fry", name: "Dal Fry", price: 140 },
          { id: "mc_dal_tad", name: "Dal Tadka", price: 150 },
          { id: "mc_jeera_aloo", name: "Jeera Aloo", price: 160 }
        ],
        roti: [
          { id: "rt_plain_roti", name: "Plain Roti", price: 20 },
          { id: "rt_but_roti", name: "Butter Roti", price: 25 },
          { id: "rt_chapati", name: "Chapati", price: 15 },
          { id: "rt_plain_naan", name: "Plain Naan", price: 45 },
          { id: "rt_but_naan", name: "Butter Naan", price: 55 },
          { id: "rt_but_kulcha", name: "Butter Kulcha", price: 60 },
          { id: "rt_garlic_naan", name: "Garlic Naan", price: 70 },
          { id: "rt_tand_roti", name: "Tandoori Roti", price: 25 }
        ],
        rice: [
          { id: "rc_plain", name: "Plain Rice", price: 110 },
          { id: "rc_jeera", name: "Jeera Rice", price: 130 },
          { id: "rc_biryani", name: "Veg Biryani", price: 220 },
          { id: "rc_steam", name: "Steam Rice", price: 110 },
          { id: "rc_khichdi", name: "Dal Khichdi", price: 160 }
        ],
        dessert: [
          { id: "ds_ice_cream", name: "Ice Cream", price: 80 },
          { id: "ds_gulab_jamun", name: "Gulab Jamun", price: 60 },
          { id: "ds_brownie", name: "Brownie", price: 140 },
          { id: "ds_rabdi", name: "Rabdi", price: 90 }
        ],
        drinks: [
          { id: "dr_water", name: "Water", price: 20 },
          { id: "dr_soft_drink", name: "Soft Drink", price: 40 },
          { id: "dr_lime_soda", name: "Lime Soda", price: 60 },
          { id: "dr_buttermilk", name: "Buttermilk", price: 30 }
        ]
      },
      events: [],
      rsvps: [],
      notifications: []
    };
  }
}

async function writeDatabaseToFile(db: any): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

// GET /db - Full database
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const db = await readDatabaseFromFile();
    return res.json({ ...db, _version: "db_v1", _timestamp: Date.now() });
  } else if (req.method === "POST") {
    const { name, type, hostFamilyId, date, time, restaurant, address, googleMapsUrl, deadline, notes } = req.body;
    if (!name || !type || !hostFamilyId || !date) {
      return res.status(400).json({ error: "Name, type, hostFamilyId, and date are required" });
    }
    const db = await readDatabaseFromFile();
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
    db.events.push(newEvent);
    try {
      await writeDatabaseToFile(db);
    } catch (err) {
      // Ignore write errors
    }
    return res.json({ success: true, event: newEvent });
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
