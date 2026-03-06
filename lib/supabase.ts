import { createClient } from '@supabase/supabase-js';

console.log('SUPABASE URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('SUPABASE KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 10));

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);