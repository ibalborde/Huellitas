import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/** Supabase client bound to the generated schema types. */
export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/**
 * Returns the app-wide Supabase client, creating it on first use.
 *
 * Lazy on purpose: data-layer repositories import this accessor, and they must
 * stay importable when the env is not configured (unit tests, tooling).
 * A missing configuration surfaces as an error on first backend call — inside
 * React Query's error handling — instead of crashing module evaluation.
 */
export function getSupabaseClient(): TypedSupabaseClient {
  if (client !== null) {
    return client;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example).',
    );
  }

  client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // TODO(Sprint 2 — auth): persist the session with expo-secure-store and
      // enable autoRefreshToken/detectSessionInUrl as needed for native auth.
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
