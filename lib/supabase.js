/* lib/supabase.js */
/*
  This sets up the Supabase client that we use to read/write
  data from our database. It uses the public URL and anon key
  from your .env.local file.
  
  We import this wherever we need to talk to the database.
*/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create and export the client so other files can use it
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
