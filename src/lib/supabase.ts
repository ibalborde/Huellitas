import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // TODO(Sprint 2 — auth): persist the session with expo-secure-store and
    // enable autoRefreshToken/detectSessionInUrl as needed for native auth.
    persistSession: false,
    detectSessionInUrl: false,
  },
});
