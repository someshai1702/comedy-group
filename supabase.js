import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Only create client if we have valid credentials
export const supabase = (supabaseUrl && supabaseKey && supabaseKey !== "undefined" && supabaseKey !== "null")
  ? createClient(supabaseUrl, supabaseKey)
  : null;
