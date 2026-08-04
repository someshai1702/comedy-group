import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://tmdsgjheinmjxqthzmvm.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "sb_publishable_yjiwdDGSPLJOO27mhdjU-g_XR-ir5Bg";
const supabase = createClient(supabaseUrl, supabaseKey);

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
      { id: "st_tom_soup", name: "Tomato Soup", price: 110 },
      { id: "st_man_soup", name: "Manchow Soup", price: 120 },
      { id: "st_pan_chilli", name: "Paneer Chilli", price: 220 }
    ],
    mainCourse: [
      { id: "mc_pan_but", name: "Paneer Butter Masala", price: 240 },
      { id: "mc_veg_kol", name: "Veg Kolhapuri", price: 210 },
      { id: "mc_dal_fry", name: "Dal Fry", price: 140 }
    ],
    roti: [
      { id: "rt_plain_roti", name: "Plain Roti", price: 20 },
      { id: "rt_but_naan", name: "Butter Naan", price: 55 }
    ],
    rice: [
      { id: "rc_plain", name: "Plain Rice", price: 110 },
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase
      .from("families")
      .select("id, name, photo_url, address");

    if (!error && data && data.length > 0) {
      const families = data.map((row: any) => {
        let extra: any = {};
        try {
          if (row.address) extra = JSON.parse(row.address);
        } catch {}
        return {
          id: row.name.toLowerCase().replace(/\s+/g, "_"),
          name: row.name,
          adults: extra.adults || [],
          children: extra.children || [],
          pin: extra.pin || "0000",
          photoUrl: row.photo_url || extra.photoUrl || ""
        };
      });
      return res.json({ ...DEFAULT_DB, families, _version: "db_v1", _source: "supabase" });
    }
  } catch (err) {
    console.error("Supabase error:", err);
  }

  return res.json({ ...DEFAULT_DB, _version: "db_v1", _source: "default" });
}
