const SUPABASE_URL_VAR = 'EXPO_PUBLIC_SUPABASE_URL';
const SUPABASE_ANON_KEY_VAR = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

const FAKE_URL = 'http://127.0.0.1:54321';
const FAKE_ANON_KEY = 'fake-anon-key';

type SupabaseModule = typeof import('../../../src/lib/supabase');

const ORIGINAL_ENV = process.env;

/**
 * Loads src/lib/supabase fresh so getSupabaseClient's memoized instance and
 * env validation run against the current state of process.env.
 *
 * The client is created LAZILY (S1.2): importing the module never throws —
 * data-layer modules must stay importable without env — but the first
 * getSupabaseClient() call validates the env.
 */
function loadSupabaseModule(): SupabaseModule {
  let loadedModule: SupabaseModule | undefined;
  jest.isolateModules(() => {
    loadedModule = jest.requireActual<SupabaseModule>('../../../src/lib/supabase');
  });
  // isolateModules runs its callback synchronously, so loadedModule is set.
  return loadedModule as SupabaseModule;
}

describe('src/lib/supabase env validation', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws a descriptive error when EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env[SUPABASE_URL_VAR];
    process.env[SUPABASE_ANON_KEY_VAR] = FAKE_ANON_KEY;

    expect(() => loadSupabaseModule().getSupabaseClient()).toThrow(
      /Missing Supabase environment variables.*EXPO_PUBLIC_SUPABASE_URL/s,
    );
  });

  it('throws a descriptive error when EXPO_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env[SUPABASE_URL_VAR] = FAKE_URL;
    delete process.env[SUPABASE_ANON_KEY_VAR];

    expect(() => loadSupabaseModule().getSupabaseClient()).toThrow(
      /Missing Supabase environment variables.*EXPO_PUBLIC_SUPABASE_ANON_KEY/s,
    );
  });

  it('throws when both environment variables are missing', () => {
    delete process.env[SUPABASE_URL_VAR];
    delete process.env[SUPABASE_ANON_KEY_VAR];

    expect(() => loadSupabaseModule().getSupabaseClient()).toThrow(
      'Missing Supabase environment variables',
    );
  });

  it('treats empty strings as missing variables', () => {
    process.env[SUPABASE_URL_VAR] = '';
    process.env[SUPABASE_ANON_KEY_VAR] = '';

    expect(() => loadSupabaseModule().getSupabaseClient()).toThrow(
      'Missing Supabase environment variables',
    );
  });

  it('returns a memoized client when both variables are present', () => {
    process.env[SUPABASE_URL_VAR] = FAKE_URL;
    process.env[SUPABASE_ANON_KEY_VAR] = FAKE_ANON_KEY;

    const { getSupabaseClient } = loadSupabaseModule();
    const client = getSupabaseClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
    expect(client.auth).toBeDefined();
    expect(getSupabaseClient()).toBe(client);
  });
});
