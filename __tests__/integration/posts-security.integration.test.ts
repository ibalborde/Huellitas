/**
 * F0.3 — SECURITY-CRITICAL integration tests (security-auditor request).
 *
 * posts_nearby is SECURITY DEFINER and bypasses RLS, so its WHERE clause IS
 * the access control for the map/feed path. These tests pin that boundary
 * against the real local stack:
 *   - archivado posts never leak (including p_status = 'archivado' / NULL),
 *   - posts in inactive cities never leak,
 *   - filters (p_type, p_species) and p_limit behave,
 *   - post_media moderation pipeline: auto-approve trigger, client can never
 *     write moderation_status, anon only sees approved media of visible posts,
 *   - created_at cannot be spoofed on insert (column-scoped grant).
 *
 * Setup uses the service-role key (resolved at runtime, never committed) to
 * create one confirmed user and a handful of posts; afterAll removes
 * everything it created.
 */
import type { Database } from '../../src/lib/database.types';
import {
  assertStackReachable,
  createAnonClient,
  createServiceClient,
  createSignedInClient,
  createTestUser,
  PG_INSUFFICIENT_PRIVILEGE,
  ROSARIO,
  wktPoint,
  type TestUser,
  type TypedClient,
} from './helpers';

type PostsNearbyArgs = Database['public']['Functions']['posts_nearby']['Args'];
type PostsNearbyArgsWithNullableStatus = Omit<PostsNearbyArgs, 'p_status'> & {
  p_status?: Database['public']['Enums']['post_status'] | null;
};

/**
 * posts_nearby with support for an EXPLICIT p_status: null. For PostgREST,
 * omitting the argument falls back to the SQL default ('activo') while
 * sending null means SQL NULL ("any public status"). The generated Args type
 * does not model null, hence the cast.
 */
function postsNearby(client: TypedClient, args: PostsNearbyArgsWithNullableStatus) {
  return client.rpc('posts_nearby', args as PostsNearbyArgs);
}

// Coordinates inside the temporary inactive-city polygon (Córdoba area),
// far away from Rosario so the two datasets never overlap.
const INACTIVE_CITY_POINT = { lat: -31.42, lng: -64.18 } as const;
const INACTIVE_CITY_BOUNDS =
  'SRID=4326;POLYGON((-64.30 -31.30, -64.05 -31.30, -64.05 -31.55, -64.30 -31.55, -64.30 -31.30))';

describe('F0.3 integration — posts_nearby security boundary & moderation', () => {
  let service: TypedClient;
  let anon: TypedClient;
  let ownerClient: TypedClient;
  let owner: TestUser;

  let rosarioCityId: string;
  let activoPostId: string;
  let resueltoPostId: string;
  let archivadoPostId: string;
  let inactiveCityId: string | undefined;
  let inactiveCityPostId: string | undefined;

  /** ids of every post this suite created, for result filtering and cleanup. */
  let createdPostIds: string[] = [];

  async function insertPostAsService(
    post: Database['public']['Tables']['posts']['Insert'],
  ): Promise<string> {
    const { data, error } = await service.from('posts').insert(post).select('id').single();
    if (error !== null || data === null) {
      throw new Error(`Test setup: could not insert post: ${error?.message ?? 'no row'}`);
    }
    createdPostIds.push(data.id);
    return data.id;
  }

  beforeAll(async () => {
    await assertStackReachable();
    service = createServiceClient();
    anon = createAnonClient();
    owner = await createTestUser(service, 'Integration Owner');
    ownerClient = await createSignedInClient(owner);

    const { data: rosario, error: rosarioError } = await service
      .from('cities')
      .select('id')
      .eq('slug', 'rosario')
      .single();
    if (rosarioError !== null || rosario === null) {
      throw new Error(`Test setup: rosario city not found: ${rosarioError?.message ?? ''}`);
    }
    rosarioCityId = rosario.id;

    // Three posts in the same Rosario area, one per status. Distinct
    // type/species so the filter tests can target exactly one post each.
    activoPostId = await insertPostAsService({
      user_id: owner.id,
      city_id: rosarioCityId, // overridden by the assign_post_city trigger anyway
      type: 'perdido',
      species: 'perro',
      status: 'activo',
      title: 'IT activo perdido perro',
      location: wktPoint(ROSARIO.lng, ROSARIO.lat),
    });
    resueltoPostId = await insertPostAsService({
      user_id: owner.id,
      city_id: rosarioCityId,
      type: 'encontrado',
      species: 'gato',
      status: 'resuelto',
      title: 'IT resuelto encontrado gato',
      location: wktPoint(ROSARIO.lng + 0.001, ROSARIO.lat),
    });
    archivadoPostId = await insertPostAsService({
      user_id: owner.id,
      city_id: rosarioCityId,
      type: 'avistado',
      species: 'otro',
      status: 'archivado',
      title: 'IT archivado avistado otro',
      location: wktPoint(ROSARIO.lng, ROSARIO.lat + 0.001),
    });

    // Inactive-city fixture: the assign_post_city trigger rejects posts
    // outside active cities, so create the city active, insert the post,
    // then deactivate the city.
    const { data: inactiveCity, error: cityError } = await service
      .from('cities')
      .insert({
        name: 'IT Inactive City',
        slug: `it-inactive-${Date.now().toString(36)}`,
        country_code: 'AR',
        center: wktPoint(INACTIVE_CITY_POINT.lng, INACTIVE_CITY_POINT.lat),
        bounds: INACTIVE_CITY_BOUNDS,
        timezone: 'America/Argentina/Cordoba',
        is_active: true,
      })
      .select('id')
      .single();
    if (cityError !== null || inactiveCity === null) {
      throw new Error(`Test setup: could not insert test city: ${cityError?.message ?? ''}`);
    }
    inactiveCityId = inactiveCity.id;

    inactiveCityPostId = await insertPostAsService({
      user_id: owner.id,
      city_id: inactiveCity.id,
      type: 'perdido',
      species: 'perro',
      status: 'activo',
      title: 'IT activo in inactive city',
      location: wktPoint(INACTIVE_CITY_POINT.lng, INACTIVE_CITY_POINT.lat),
    });

    const { error: deactivateError } = await service
      .from('cities')
      .update({ is_active: false })
      .eq('id', inactiveCity.id);
    if (deactivateError !== null) {
      throw new Error(`Test setup: could not deactivate test city: ${deactivateError.message}`);
    }
  });

  afterAll(async () => {
    // Posts first (they reference cities without cascade), then the user
    // (cascades profile + any leftover posts/media), then the test city.
    if (createdPostIds.length > 0) {
      await service.from('posts').delete().in('id', createdPostIds);
      createdPostIds = [];
    }
    if (owner !== undefined) {
      await service.auth.admin.deleteUser(owner.id);
    }
    if (inactiveCityId !== undefined) {
      await service.from('cities').delete().eq('id', inactiveCityId);
    }
  });

  describe('posts_nearby visibility boundary (anon caller)', () => {
    it('p_status null returns activo + resuelto, never archivado', async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
        p_status: null,
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row) => row.id);
      expect(ids).toContain(activoPostId);
      expect(ids).toContain(resueltoPostId);
      expect(ids).not.toContain(archivadoPostId);
    });

    it("p_status 'archivado' is clamped to the public set: zero rows", async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
        p_status: 'archivado',
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it("default p_status returns only 'activo' posts", async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row) => row.id);
      expect(ids).toContain(activoPostId);
      expect(ids).not.toContain(resueltoPostId);
      expect(ids).not.toContain(archivadoPostId);
    });

    it('never returns posts whose city is inactive', async () => {
      const { data, error } = await postsNearby(anon, {
        lat: INACTIVE_CITY_POINT.lat,
        lng: INACTIVE_CITY_POINT.lng,
        p_status: null,
      });

      expect(error).toBeNull();
      expect(data).toEqual([]);
      expect(inactiveCityPostId).toBeDefined();
    });

    it('p_type filters within the public set', async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
        p_status: null,
        p_type: 'encontrado',
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row) => row.id);
      expect(ids).toEqual([resueltoPostId]);
    });

    it('p_species filters within the public set', async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
        p_status: null,
        p_species: 'gato',
      });

      expect(error).toBeNull();
      const ids = (data ?? []).map((row) => row.id);
      expect(ids).toEqual([resueltoPostId]);
    });

    it('respects p_limit', async () => {
      const { data, error } = await postsNearby(anon, {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
        p_status: null,
        p_limit: 1,
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('post_media moderation pipeline', () => {
    let activoMediaId: string;
    let archivadoMediaId: string;

    it('media inserted by the post owner is auto-approved by the MVP trigger', async () => {
      const { data, error } = await ownerClient
        .from('post_media')
        .insert({ post_id: activoPostId, storage_path: 'it/activo-photo.jpg' })
        .select('id, moderation_status')
        .single();

      expect(error).toBeNull();
      expect(data?.moderation_status).toBe('approved');
      if (data === null) throw new Error('media insert returned no row');
      activoMediaId = data.id;
    });

    it('owner cannot set moderation_status on insert (no self-approval path)', async () => {
      const { error } = await ownerClient.from('post_media').insert({
        post_id: activoPostId,
        storage_path: 'it/self-approved.jpg',
        position: 5,
        moderation_status: 'approved',
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });

    it('owner cannot update moderation_status (column-scoped grant)', async () => {
      const { error } = await ownerClient
        .from('post_media')
        .update({ moderation_status: 'rejected' })
        .eq('id', activoMediaId);

      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });

    it('anon sees approved media of visible posts only (archived post media hidden)', async () => {
      // Approved media on a NON-visible (archivado) post, inserted by owner.
      const { data: archivedMedia, error: insertError } = await ownerClient
        .from('post_media')
        .insert({ post_id: archivadoPostId, storage_path: 'it/archivado-photo.jpg' })
        .select('id, moderation_status')
        .single();
      expect(insertError).toBeNull();
      expect(archivedMedia?.moderation_status).toBe('approved');
      if (archivedMedia === null) throw new Error('media insert returned no row');
      archivadoMediaId = archivedMedia.id;

      const { data, error } = await anon
        .from('post_media')
        .select('id')
        .in('id', [activoMediaId, archivadoMediaId]);

      expect(error).toBeNull();
      expect((data ?? []).map((row) => row.id)).toEqual([activoMediaId]);
    });
  });

  describe('created_at spoofing', () => {
    it('authenticated insert with explicit created_at is rejected (column-scoped grant)', async () => {
      const { error } = await ownerClient.from('posts').insert({
        user_id: owner.id,
        city_id: rosarioCityId,
        type: 'perdido',
        species: 'perro',
        title: 'IT created_at spoof',
        location: wktPoint(ROSARIO.lng, ROSARIO.lat),
        created_at: '2030-01-01T00:00:00Z',
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });
  });
});
