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
      menu: { starters: [], mainCourse: [], roti: [], rice: [], dessert: [], drinks: [] },
      events: [],
      rsvps: [],
      notifications: []
    };
  }
}

async function writeDatabaseToFile(db: any): Promise<void> {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("families.ts handler called, method:", req.method);
  if (req.method === "GET") {
    const db = await readDatabaseFromFile();
    return res.json({ success: true, families: db.families });
  } else if (req.method === "POST") {
    console.log("POST request to families.ts");
    const { name, adults, children, pin, photoUrl } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: "Family Name and PIN are required" });
    }
    const db = await readDatabaseFromFile();
    const id = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    const newFamily = {
      id,
      name,
      adults: Array.isArray(adults) ? adults : [],
      children: Array.isArray(children) ? children : [],
      pin,
      photoUrl: photoUrl || ""
    };
    db.families.push(newFamily);
    await writeDatabaseToFile(db);
    return res.json({ success: true, family: newFamily });
  } else {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed", received: req.method });
  }
}
