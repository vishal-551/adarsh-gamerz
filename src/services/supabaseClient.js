import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY EXISTS:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase env missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);