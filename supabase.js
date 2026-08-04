import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Only create client if we have valid credentials (not placeholder values)
const isValidKey = supabaseKey && 
  !["undefined", "null", "your-", "sb_"].some(v => supabaseKey.includes(v)) &&
  supabaseKey.length > 50 && 
  !supabaseKey.startsWith("yjiw");

export const supabase = (supabaseUrl && isValidKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;
