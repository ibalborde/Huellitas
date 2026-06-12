/**
 * S1.2 — posts repository against the REAL local stack.
 *
 * Verifies that fetchNearby maps real posts_nearby rows into domain Posts and
 * that keyset pagination tiles pages without overlap. Setup uses the
 * service-role key (resolved at runtime, never committed) to create one user
 * and three posts; afterAll removes everything it created.
 *
 * NOTE for test-engineer (S1.1 security re-review request): add multi-page
 * keyset cases with DISTANCE TIES (several posts at the exact same location)
 * to pin the (distance, id) tie-breaker.
 */
import {
  createSupabasePostsRepository,
  type FetchNearbyParams,
  type PostsRepository,
} from '../../src/features/posts/data/postsRepository';
import type { Database } from '../../src/lib/database.types';
import {
  assertStackReachable,
  createServiceClient,
  createAnonClient,
  createTestUser,
  wktPoint,
  type TestUser,
  type TypedClient,
} from './helpers';

// Southwest Rosario, inside the seeded bounds but ~7 km away from the city
// center other suites use — keeps this dataset isolated within its radius.
const SEARCH_CENTER = { latitude: -32.975, longitude: -60.715 } as const;
const SEARCH_RADIUS_M = 1500;
/** ~187 m per step at Rosario's latitude. */
const LNG_DEGREE_STEP = 0.002;

const EVENT_DATE = '2026-06-01';
const DESCRIPTION = 'S1.2 mapping fixture';

describe('S1.2 integration — posts repository mapping & keyset pagination', () => {
  let service: TypedClient;
  let repository: PostsRepository;
  let owner: TestUser;
  let rosarioCityId: string;
  let createdPostIds: string[] = [];

  async function insertPostAtStep(
    step: number,
    overrides: Partial<Database['public']['Tables']['posts']['Insert']> &
      Pick<Database['public']['Tables']['posts']['Insert'], 'type' | 'species' | 'title'>,
  ): Promise<string> {
    const { data, error } = await service
      .from('posts')
      .insert({
        user_id: owner.id,
        city_id: rosarioCityId, // recomputed by the assign_post_city trigger
        description: DESCRIPTION,
        event_date: EVENT_DATE,
        location: wktPoint(SEARCH_CENTER.longitude + step * LNG_DEGREE_STEP, SEARCH_CENTER.latitude),
        ...overrides,
      })
      .select('id')
      .single();
    if (error !== null || data === null) {
      throw new Error(`Test setup: could not insert post: ${error?.message ?? 'no row'}`);
    }
    createdPostIds.push(data.id);
    return data.id;
  }

  beforeAll(async () => {
    await assertStackReachable();
    service = createServiceClient();
    const anon = createAnonClient();
    repository = createSupabasePostsRepository(() => anon);
    owner = await createTestUser(service, 'S1.2 Posts Repo Owner');

    const { data: rosario, error } = await service
      .from('cities')
      .select('id')
      .eq('slug', 'rosario')
      .single();
    if (error !== null || rosario === null) {
      throw new Error(`Test setup: rosario city not found: ${error?.message ?? ''}`);
    }
    rosarioCityId = rosario.id;

    // Three posts at increasing distance from SEARCH_CENTER.
    await insertPostAtStep(1, {
      type: 'perdido',
      species: 'perro',
      title: 'IT S1.2 nearest perdido perro',
    });
    await insertPostAtStep(2, {
      type: 'encontrado',
      species: 'gato',
      title: 'IT S1.2 middle encontrado gato',
      has_custody: true,
    });
    await insertPostAtStep(3, {
      type: 'avistado',
      species: 'otro',
      title: 'IT S1.2 farthest avistado otro',
    });
  });

  afterAll(async () => {
    if (createdPostIds.length > 0) {
      await service.from('posts').delete().in('id', createdPostIds);
      createdPostIds = [];
    }
    if (owner !== undefined) {
      await service.auth.admin.deleteUser(owner.id);
    }
  });

  function fetchPage(params?: {
    limit?: number;
    cursor?: { afterDistance: number; afterId: string };
    filters?: FetchNearbyParams['filters'];
  }) {
    return repository.fetchNearby({
      center: SEARCH_CENTER,
      cityId: rosarioCityId,
      radiusM: SEARCH_RADIUS_M,
      ...params,
    });
  }

  it('maps a real posts_nearby row into a domain Post', async () => {
    const page = await fetchPage({ limit: 10 });

    const post = page.posts.find((candidate) => candidate.id === createdPostIds[0]);
    expect(post).toBeDefined();
    expect(post).toMatchObject({
      userId: owner.id,
      cityId: rosarioCityId,
      type: 'perdido',
      status: 'activo',
      species: 'perro',
      title: 'IT S1.2 nearest perdido perro',
      description: DESCRIPTION,
      neighborhoodId: null,
      eventDate: EVENT_DATE,
      hasCustody: false,
    });
    expect(Number.isNaN(Date.parse(post?.createdAt ?? ''))).toBe(false);
    expect(post?.coordinates.latitude).toBeCloseTo(SEARCH_CENTER.latitude, 6);
    expect(post?.coordinates.longitude).toBeCloseTo(SEARCH_CENTER.longitude + LNG_DEGREE_STEP, 6);
    // ~187 m from the center; generous tolerance, the point is "1 step away".
    expect(post?.distanceM).toBeGreaterThan(120);
    expect(post?.distanceM).toBeLessThan(280);

    // has_custody must survive the mapping too (set on the middle post).
    const middle = page.posts.find((candidate) => candidate.id === createdPostIds[1]);
    expect(middle?.hasCustody).toBe(true);

    // Domain objects only — no raw row fields may leak out of the data layer.
    expect(post).not.toHaveProperty('user_id');
    expect(post).not.toHaveProperty('distance_m');
    expect(post).not.toHaveProperty('lat');
    expect(post).not.toHaveProperty('lng');

    // Closest first.
    const distances = page.posts.map((candidate) => candidate.distanceM);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('tiles pages with the keyset cursor: no overlap, no gaps, null at the end', async () => {
    const firstPage = await fetchPage({ limit: 2 });
    expect(firstPage.posts).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await fetchPage({ limit: 2, cursor: firstPage.nextCursor ?? undefined });
    const firstIds = firstPage.posts.map((post) => post.id);
    const secondIds = secondPage.posts.map((post) => post.id);

    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    expect([...firstIds, ...secondIds].sort()).toEqual([...createdPostIds].sort());
    // The last page came back short of the limit → no next cursor.
    expect(secondPage.posts).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('applies type and species filters', async () => {
    const bySpecies = await fetchPage({ limit: 10, filters: { species: 'gato' } });
    expect(bySpecies.posts.map((post) => post.id)).toEqual([createdPostIds[1]]);

    const byType = await fetchPage({ limit: 10, filters: { type: 'avistado' } });
    expect(byType.posts.map((post) => post.id)).toEqual([createdPostIds[2]]);
  });

  // S1.3a — event-date range filter. All fixtures share EVENT_DATE, so a
  // range that brackets it returns everything and a disjoint range nothing.
  it('applies the event-date range filter (inclusive bounds)', async () => {
    const inRange = await fetchPage({
      limit: 10,
      filters: { eventFrom: EVENT_DATE, eventTo: EVENT_DATE },
    });
    expect(inRange.posts.map((post) => post.id).sort()).toEqual([...createdPostIds].sort());
  });

  it('excludes posts outside the event-date range (each bound works alone)', async () => {
    const afterRange = await fetchPage({ limit: 10, filters: { eventFrom: '2026-06-02' } });
    expect(afterRange.posts).toEqual([]);

    const beforeRange = await fetchPage({ limit: 10, filters: { eventTo: '2026-05-31' } });
    expect(beforeRange.posts).toEqual([]);
  });
});
