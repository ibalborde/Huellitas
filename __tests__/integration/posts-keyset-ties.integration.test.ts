/**
 * S1.2 — keyset pagination under DISTANCE TIES, against the REAL local stack
 * (S1.1 security re-review request, see posts-repository.integration.test.ts).
 *
 * posts_nearby orders by (distance_m, id) and the cursor uses row-comparison
 * semantics, so ties on distance at page boundaries are the case that breaks
 * naive keyset implementations (duplicates or skipped rows). This suite walks
 * 4+ pages over a dataset with tie groups STRADDLING page boundaries and
 * asserts the concatenation is exactly the single-shot result.
 *
 * It also pins the adversarial cursor case: a cursor pointing at an ARCHIVED
 * post (distance 0 from the center) must behave like page 1 — every visible
 * row is "after" it — without leaking the archived row or erroring.
 */
import {
  createSupabasePostsRepository,
  type PostsRepository,
  type PostsNearbyCursor,
} from '../../src/features/posts/data/postsRepository';
import type { Post } from '../../src/features/posts/domain/post';
import type { Database } from '../../src/lib/database.types';
import {
  assertStackReachable,
  createAnonClient,
  createServiceClient,
  createTestUser,
  wktPoint,
  type TestUser,
  type TypedClient,
} from './helpers';

// Northwest Rosario, inside the seeded bounds and >5 km away from the centers
// used by the other suites, so this dataset is isolated within its radius.
const SEARCH_CENTER = { latitude: -32.87, longitude: -60.76 } as const;
const SEARCH_RADIUS_M = 1500;
/** ~187 m per step at Rosario's latitude. */
const LNG_DEGREE_STEP = 0.002;

const PAGE_LIMIT = 2;
/** Hard stop for the pagination walk; the dataset needs only 4 pages. */
const MAX_PAGES = 10;

const EVENT_DATE = '2026-06-01';

describe('S1.2 integration — keyset pagination with distance ties & stale cursors', () => {
  let service: TypedClient;
  let repository: PostsRepository;
  let owner: TestUser;
  let rosarioCityId: string;
  let archivedPostId: string;
  /** Visible (activo) posts created by this suite. */
  let visiblePostIds: string[] = [];
  let createdPostIds: string[] = [];

  async function insertPost(
    post: Pick<Database['public']['Tables']['posts']['Insert'], 'title' | 'status' | 'location'>,
  ): Promise<string> {
    const { data, error } = await service
      .from('posts')
      .insert({
        user_id: owner.id,
        city_id: rosarioCityId, // recomputed by the assign_post_city trigger
        type: 'perdido',
        species: 'perro',
        description: 'S1.2 keyset ties fixture',
        event_date: EVENT_DATE,
        ...post,
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
    repository = createSupabasePostsRepository(() => createAnonClient());
    owner = await createTestUser(service, 'S1.2 Keyset Ties Owner');

    const { data: rosario, error } = await service
      .from('cities')
      .select('id')
      .eq('slug', 'rosario')
      .single();
    if (error !== null || rosario === null) {
      throw new Error(`Test setup: rosario city not found: ${error?.message ?? ''}`);
    }
    rosarioCityId = rosario.id;

    // Tie groups: 3 posts at EXACTLY one step away, 3 at exactly two steps,
    // 1 at three steps. With PAGE_LIMIT = 2 the walk needs 4 pages and BOTH
    // tie groups straddle a page boundary:
    //   page 1: A1, A2 | page 2: A3, B1 | page 3: B2, B3 | page 4: C1.
    const tieGroups: { step: number; count: number }[] = [
      { step: 1, count: 3 },
      { step: 2, count: 3 },
      { step: 3, count: 1 },
    ];
    for (const { step, count } of tieGroups) {
      const location = wktPoint(
        SEARCH_CENTER.longitude + step * LNG_DEGREE_STEP,
        SEARCH_CENTER.latitude,
      );
      for (let index = 0; index < count; index += 1) {
        visiblePostIds.push(
          await insertPost({
            title: `IT S1.2 ties step ${step} #${index + 1}`,
            status: 'activo',
            location,
          }),
        );
      }
    }

    // Archived post AT the search center (distance 0): never visible, but its
    // (distance, id) is a perfectly forgeable/stale cursor value.
    archivedPostId = await insertPost({
      title: 'IT S1.2 ties archived at center',
      status: 'archivado',
      location: wktPoint(SEARCH_CENTER.longitude, SEARCH_CENTER.latitude),
    });
  });

  afterAll(async () => {
    if (createdPostIds.length > 0) {
      await service.from('posts').delete().in('id', createdPostIds);
      createdPostIds = [];
      visiblePostIds = [];
    }
    if (owner !== undefined) {
      await service.auth.admin.deleteUser(owner.id);
    }
  });

  function fetchPage(params?: { limit?: number; cursor?: PostsNearbyCursor }) {
    return repository.fetchNearby({
      center: SEARCH_CENTER,
      cityId: rosarioCityId,
      radiusM: SEARCH_RADIUS_M,
      limit: params?.limit ?? PAGE_LIMIT,
      cursor: params?.cursor,
    });
  }

  /** Walks the cursor until nextCursor is null, returning every page. */
  async function fetchAllPages(): Promise<Post[][]> {
    const pages: Post[][] = [];
    let cursor: PostsNearbyCursor | undefined;
    for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex += 1) {
      const page = await fetchPage({ cursor });
      pages.push(page.posts);
      if (page.nextCursor === null) return pages;
      cursor = page.nextCursor;
    }
    throw new Error(`Pagination did not terminate within ${MAX_PAGES} pages`);
  }

  it('tiles 4 pages with ties at every boundary: no duplicates, no omissions', async () => {
    const singleShot = await fetchPage({ limit: 50 });
    const pages = await fetchAllPages();
    const walked = pages.flat();
    const walkedIds = walked.map((post) => post.id);

    // Exactly the single-shot result, in the same order — any duplicate or
    // skipped row at a tie boundary breaks this equality.
    expect(walkedIds).toEqual(singleShot.posts.map((post) => post.id));
    expect(new Set(walkedIds).size).toBe(walkedIds.length);
    expect([...walkedIds].sort()).toEqual([...visiblePostIds].sort());

    // The walk really crossed tie boundaries: 4 pages, full ones of size 2.
    expect(pages).toHaveLength(4);
    expect(pages.map((page) => page.length)).toEqual([2, 2, 2, 1]);
    const boundaryPairs: [Post, Post][] = [
      [pages[0][1], pages[1][0]], // inside the step-1 tie group
      [pages[1][1], pages[2][0]], // inside the step-2 tie group
    ];
    for (const [lastOfPage, firstOfNext] of boundaryPairs) {
      expect(firstOfNext.distanceM).toBeCloseTo(lastOfPage.distanceM, 6);
    }

    // Global order is (distance, id) ascending — uuids compare bytewise in
    // Postgres, which for canonical lowercase hex equals string comparison.
    for (let index = 1; index < walked.length; index += 1) {
      const previous = walked[index - 1];
      const current = walked[index];
      expect(current.distanceM).toBeGreaterThanOrEqual(previous.distanceM);
      if (current.distanceM === previous.distanceM) {
        expect(current.id > previous.id).toBe(true);
      }
    }
  });

  it('a cursor pointing at an archived post acts as page 1: no leak, no crash', async () => {
    const firstPage = await fetchPage({ limit: 50 });
    const staleCursorPage = await fetchPage({
      limit: 50,
      // The archived post sits at the center: (distance 0, its id) sorts
      // before every visible row, so a correct keyset query returns page 1.
      cursor: { afterDistance: 0, afterId: archivedPostId },
    });

    const staleIds = staleCursorPage.posts.map((post) => post.id);
    expect(staleIds).toEqual(firstPage.posts.map((post) => post.id));
    expect(staleIds).not.toContain(archivedPostId);
    expect([...staleIds].sort()).toEqual([...visiblePostIds].sort());
  });

  it('the archived post never appears on any page of the walk', async () => {
    const pages = await fetchAllPages();
    const ids = pages.flat().map((post) => post.id);
    expect(ids).not.toContain(archivedPostId);
  });
});
