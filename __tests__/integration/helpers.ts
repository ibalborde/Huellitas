/**
 * Shared helpers for integration tests against the LOCAL Supabase stack.
 *
 * These tests talk to the real API started by `supabase start`.
 *
 * Keys:
 *  - The anon (publishable) key below is the well-known local development
 *    default shipped by the Supabase CLI — it is NOT a secret.
 *  - The service-role secret key is NEVER hardcoded or committed: it is read
 *    from SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY, or resolved at
 *    runtime from `supabase status -o json`.
 */
import { execSync } from 'node:child_process';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../src/lib/database.types';

export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';

/** Local dev default published by the Supabase CLI; safe to commit. */
const LOCAL_DEV_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? LOCAL_DEV_ANON_KEY;

const STACK_HEALTH_TIMEOUT_MS = 3_000;

/** Postgres "insufficient_privilege" — what a denied grant surfaces as. */
export const PG_INSUFFICIENT_PRIVILEGE = '42501';

/** Rosario city center; matches supabase/seed.sql. */
export const ROSARIO = { lat: -32.9468, lng: -60.6393 } as const;

export type TypedClient = SupabaseClient<Database>;

const CLIENT_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

export function createAnonClient(): TypedClient {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, CLIENT_OPTIONS);
}

let cachedSecretKey: string | undefined;

/**
 * Resolves the local service-role secret key without ever persisting it:
 * env var first, `supabase status -o json` as fallback.
 */
export function getServiceRoleKey(): string {
  if (cachedSecretKey !== undefined) return cachedSecretKey;

  const fromEnv = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fromEnv !== undefined && fromEnv.length > 0) {
    cachedSecretKey = fromEnv;
    return fromEnv;
  }

  const stdout = execSync('supabase status -o json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  // The CLI may print warnings before the JSON object; skip to the payload.
  const jsonStart = stdout.indexOf('{');
  if (jsonStart === -1) {
    throw new Error(
      'Could not parse `supabase status -o json` output. Is the local stack running? (`supabase start`)',
    );
  }
  const status = JSON.parse(stdout.slice(jsonStart)) as Record<string, unknown>;
  const key = status['SECRET_KEY'] ?? status['SERVICE_ROLE_KEY'];
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(
      'No SECRET_KEY / SERVICE_ROLE_KEY in `supabase status` output. ' +
        'Set SUPABASE_SECRET_KEY or start the local stack with `supabase start`.',
    );
  }
  cachedSecretKey = key;
  return key;
}

export function createServiceClient(): TypedClient {
  return createClient<Database>(SUPABASE_URL, getServiceRoleKey(), CLIENT_OPTIONS);
}

/**
 * Fails fast with an actionable message when the local stack is not running,
 * instead of letting every test time out individually.
 */
export async function assertStackReachable(): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: ANON_KEY },
      signal: AbortSignal.timeout(STACK_HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`health endpoint answered HTTP ${response.status}`);
    }
  } catch (cause) {
    throw new Error(
      `Local Supabase stack is unreachable at ${SUPABASE_URL}. ` +
        'Run `supabase start` before `npm run test:integration`. ' +
        `(${cause instanceof Error ? cause.message : String(cause)})`,
    );
  }
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Creates a confirmed auth user via the admin API (profile row comes from the trigger). */
export async function createTestUser(
  service: TypedClient,
  displayName: string,
): Promise<TestUser> {
  const email = `it-${uniqueSuffix()}@huellitas.test`;
  const password = `it-pass-${uniqueSuffix()}`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error !== null || data.user === null) {
    throw new Error(`Could not create test user: ${error?.message ?? 'no user returned'}`);
  }
  return { id: data.user.id, email, password };
}

/** Fresh client authenticated as the given test user. */
export async function createSignedInClient(user: TestUser): Promise<TypedClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error !== null) {
    throw new Error(`Could not sign in test user ${user.email}: ${error.message}`);
  }
  return client;
}

/** WKT literal PostgREST accepts for geography(point) columns. */
export function wktPoint(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
