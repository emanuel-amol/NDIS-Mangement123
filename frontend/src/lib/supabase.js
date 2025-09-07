import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Helpful error in dev console if envs aren’t loaded
  // eslint-disable-next-line no-console
  console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY');
  console.log("REACT_APP_SUPABASE_URL =", process.env.REACT_APP_SUPABASE_URL);
console.log("REACT_APP_SUPABASE_ANON_KEY =", process.env.REACT_APP_SUPABASE_ANON_KEY ? "present" : "missing");

}

export const supabase = createClient(supabaseUrl, supabaseKey);
