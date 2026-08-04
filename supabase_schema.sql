-- Comedy Group Planner - Supabase Schema

-- 1. Families table
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adults TEXT[] DEFAULT '{}',
  children TEXT[] DEFAULT '{}',
  pin TEXT NOT NULL,
  photoUrl TEXT DEFAULT ''
);

-- 2. Menu items table
CREATE TABLE menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC DEFAULT 0
);

-- 3. Events table
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  hostFamilyId TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  restaurant TEXT DEFAULT '',
  address TEXT DEFAULT '',
  googleMapsUrl TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  isActive BOOLEAN DEFAULT true
);

-- 4. RSVPs table
CREATE TABLE rsvps (
  eventId TEXT NOT NULL,
  familyId TEXT NOT NULL,
  attending TEXT NOT NULL,
  reason TEXT DEFAULT '',
  adultsAttendingCount INTEGER DEFAULT 0,
  childrenAttendingCount INTEGER DEFAULT 0,
  orderData JSONB DEFAULT '{}',
  specialInstructions TEXT DEFAULT '',
  updatedAt TEXT,
  PRIMARY KEY (eventId, familyId)
);

-- 5. Notifications table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  eventId TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  createdAt TEXT NOT NULL
);

-- Create index for notifications ordering
CREATE INDEX idx_notifications_createdAt ON notifications (createdAt DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (for the app)
CREATE POLICY "Allow all access to families" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to menu_items" ON menu_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rsvps" ON rsvps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Insert sample families data
INSERT INTO families (id, name, adults, children, pin, photoUrl) VALUES
('sharma', 'Sharma Family', ARRAY['Rahul', 'Priya'], ARRAY['Kabir', 'Meera'], '1111', 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=200'),
('patel', 'Patel Family', ARRAY['Amit', 'Sneha'], ARRAY['Aarav', 'Diya'], '2222', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=200'),
('mehta', 'Mehta Family', ARRAY['Raj', 'Ritu'], ARRAY['Ishaan', 'Anya'], '3333', 'https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?auto=format&fit=crop&q=80&w=200'),
('joshi', 'Joshi Family', ARRAY['Vikram', 'Aditi'], ARRAY['Vivaan', 'Saisha'], '4444', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200'),
('kapoor', 'Kapoor Family', ARRAY['Sanjay', 'Neha'], ARRAY['Rohan', 'Shanaya'], '5555', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
('malhotra', 'Malhotra Family', ARRAY['Karan', 'Pooja'], ARRAY['Arjun', 'Myra'], '6666', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'),
('shah', 'Shah Family', ARRAY['Nitin', 'Swati'], ARRAY['Dev', 'Riya'], '7777', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200'),
('admin', 'Group Admin (Superuser)', ARRAY['Captain Admin'], ARRAY[]::TEXT[], '0000', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200');

-- Insert sample menu items
INSERT INTO menu_items (id, name, category, price) VALUES
('st_m_papad', 'Masala Papad', 'starters', 40),
('st_r_papad', 'Roasted Papad', 'starters', 25),
('st_f_papad', 'Fry Papad', 'starters', 30),
('st_tom_soup', 'Tomato Soup', 'starters', 110),
('st_man_soup', 'Manchow Soup', 'starters', 120),
('st_corn_soup', 'Sweet Corn Soup', 'starters', 120),
('st_hs_soup', 'Hot & Sour Soup', 'starters', 120),
('st_pan_chilli', 'Paneer Chilli', 'starters', 220),
('st_pan_tikka', 'Paneer Tikka', 'starters', 240),
('st_veg_crispy', 'Veg Crispy', 'starters', 180),
('st_veg_manch', 'Veg Manchurian', 'starters', 170),
('st_fries', 'French Fries', 'starters', 90),
('mc_pan_but', 'Paneer Butter Masala', 'mainCourse', 240),
('mc_pan_kad', 'Kadai Paneer', 'mainCourse', 240),
('mc_veg_kol', 'Veg Kolhapuri', 'mainCourse', 210),
('mc_veg_han', 'Veg Handi', 'mainCourse', 215),
('mc_mix_veg', 'Mix Veg', 'mainCourse', 200),
('mc_dal_fry', 'Dal Fry', 'mainCourse', 140),
('mc_dal_tad', 'Dal Tadka', 'mainCourse', 150),
('mc_jeera_aloo', 'Jeera Aloo', 'mainCourse', 160),
('rt_plain_roti', 'Plain Roti', 'roti', 20),
('rt_but_roti', 'Butter Roti', 'roti', 25),
('rt_chapati', 'Chapati', 'roti', 15),
('rt_plain_naan', 'Plain Naan', 'roti', 45),
('rt_but_naan', 'Butter Naan', 'roti', 55),
('rt_but_kulcha', 'Butter Kulcha', 'roti', 60),
('rt_garlic_naan', 'Garlic Naan', 'roti', 70),
('rt_tand_roti', 'Tandoori Roti', 'roti', 25),
('rc_plain', 'Plain Rice', 'rice', 110),
('rc_jeera', 'Jeera Rice', 'rice', 130),
('rc_biryani', 'Veg Biryani', 'rice', 220),
('rc_steam', 'Steam Rice', 'rice', 110),
('rc_khichdi', 'Dal Khichdi', 'rice', 160),
('ds_ice_cream', 'Ice Cream', 'dessert', 80),
('ds_gulab_jamun', 'Gulab Jamun', 'dessert', 60),
('ds_brownie', 'Brownie', 'dessert', 140),
('ds_rabdi', 'Rabdi', 'dessert', 90),
('dr_water', 'Water', 'drinks', 20),
('dr_soft_drink', 'Soft Drink', 'drinks', 40),
('dr_lime_soda', 'Lime Soda', 'drinks', 60),
('dr_buttermilk', 'Buttermilk', 'drinks', 30);
