/**
 * S1.3a — posts repository unit tests (RPC argument contract).
 *
 * The Supabase client is mocked, so these tests pin the DATA-layer contract
 * only: which `posts_nearby` arguments the repository builds from domain
 * filters. The event-date params must be present when the filter is set and
 * absent from the serialized request when it is not (PostgREST falls back to
 * the SQL defaults only for OMITTED params). End-to-end behavior is covered
 * by __tests__/integration/.
 */
import {
  createSupabasePostsRepository,
  type PostsRepository,
} from '@/features/posts/data/postsRepository';
import type { Database } from '@/lib/database.types';
import type { TypedSupabaseClient } from '@/lib/supabase';

type PostsNearbyArgs = Database['public']['Functions']['posts_nearby']['Args'];

const CENTER = { latitude: -32.95, longitude: -60.65 } as const;
const CITY_ID = 'city-test-1';
const RADIUS_M = 5_000;

const rpcMock = jest.fn((_fn: 'posts_nearby', _args: PostsNearbyArgs) =>
  Promise.resolve({ data: [], error: null }),
);

function lastRpcArgs(): PostsNearbyArgs {
  const lastCall = rpcMock.mock.calls.at(-1);
  if (lastCall === undefined) throw new Error('rpc was never called');
  return lastCall[1];
}

let repository: PostsRepository;

beforeEach(() => {
  rpcMock.mockClear();
  const client = { rpc: rpcMock } as unknown as TypedSupabaseClient;
  repository = createSupabasePostsRepository(() => client);
});

describe('postsRepository.fetchNearby — posts_nearby argument mapping', () => {
  it('passes the event-date range as p_event_from/p_event_to', async () => {
    await repository.fetchNearby({
      center: CENTER,
      cityId: CITY_ID,
      radiusM: RADIUS_M,
      filters: { type: 'perdido', eventFrom: '2026-06-01', eventTo: '2026-06-07' },
    });

    expect(lastRpcArgs()).toMatchObject({
      p_city_id: CITY_ID,
      p_type: 'perdido',
      p_event_from: '2026-06-01',
      p_event_to: '2026-06-07',
    });
  });

  it('does not send date params when the filter omits them (SQL defaults apply)', async () => {
    await repository.fetchNearby({
      center: CENTER,
      cityId: CITY_ID,
      radiusM: RADIUS_M,
      filters: { species: 'gato' },
    });

    const args = lastRpcArgs();
    expect(args.p_event_from).toBeUndefined();
    expect(args.p_event_to).toBeUndefined();
    // What actually travels: undefined params disappear from the JSON body.
    const serialized = JSON.parse(JSON.stringify(args)) as Record<string, unknown>;
    expect(serialized).not.toHaveProperty('p_event_from');
    expect(serialized).not.toHaveProperty('p_event_to');
  });
});
