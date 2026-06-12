import type { Database } from '@/lib/database.types';
import { DataError } from '@/lib/errors';
import type { Coordinates } from '@/lib/geo';
import { getSupabaseClient, type TypedSupabaseClient } from '@/lib/supabase';

import { POSTS_PAGE_SIZE } from '../domain/constants';
import type { Post, PostFilters } from '../domain/post';

/**
 * Keyset cursor over (distance_m, id) — the last row of the previous page.
 * BOTH fields are required by design: `posts_nearby` treats a half cursor as
 * "no cursor" and silently restarts from page 1, so the cursor travels as one
 * object that either exists complete or not at all.
 */
export interface PostsNearbyCursor {
  afterDistance: number;
  afterId: string;
}

export interface FetchNearbyParams {
  /** Search center (user GPS or active city center). */
  center: Coordinates;
  /** Active city id — every geo query is scoped to a city (multi-city rule). */
  cityId: string;
  /** Search radius in meters; the server caps it at 50 km. */
  radiusM: number;
  /**
   * Optional content filters. Narrowed to type/species: the radius is a
   * geometry parameter of the query, not a row filter, so it travels as
   * `radiusM` above (PostFilters.radiusM is resolved by the hook).
   */
  filters?: Pick<PostFilters, 'type' | 'species'>;
  /** Page size, 1-200 (clamped both here and server-side). Default 20. */
  limit?: number;
  /** Omit for the first page. */
  cursor?: PostsNearbyCursor;
}

export interface PostsPage {
  posts: Post[];
  /** Cursor for the next page; null when this page is the last known one. */
  nextCursor: PostsNearbyCursor | null;
}

export interface PostsRepository {
  /**
   * Publicly visible posts near a point, closest first, keyset-paginated.
   * Only `activo` posts are returned (server default for `p_status`); expose
   * a status filter when a use case needs `resuelto` in the feed.
   */
  fetchNearby(params: FetchNearbyParams): Promise<PostsPage>;
}

type PostsNearbyRow = Database['public']['Functions']['posts_nearby']['Returns'][number];

/** Mirrors the posts_nearby clamp so nextCursor math sees the real page size. */
const LIMIT_MIN = 1;
const LIMIT_MAX = 200;

function clampLimit(limit: number): number {
  return Math.min(Math.max(Math.trunc(limit), LIMIT_MIN), LIMIT_MAX);
}

/**
 * Maps an RPC row to the domain entity. Note: generated types for RETURNS
 * TABLE drop nullability, but `neighborhood_id` IS nullable in the schema —
 * hence the defensive `?? null`.
 */
function mapPostsNearbyRow(row: PostsNearbyRow): Post {
  return {
    id: row.id,
    userId: row.user_id,
    cityId: row.city_id,
    type: row.type,
    status: row.status,
    species: row.species,
    title: row.title,
    description: row.description,
    neighborhoodId: row.neighborhood_id ?? null,
    eventDate: row.event_date,
    hasCustody: row.has_custody,
    createdAt: row.created_at,
    coordinates: { latitude: row.lat, longitude: row.lng },
    distanceM: row.distance_m,
  };
}

/**
 * Supabase-backed implementation. `getClient` is injectable so integration
 * tests can point it at a specific client; it defaults to the lazy app-wide
 * client so importing this module never requires env configuration.
 */
export function createSupabasePostsRepository(
  getClient: () => TypedSupabaseClient = getSupabaseClient,
): PostsRepository {
  return {
    async fetchNearby({
      center,
      cityId,
      radiusM,
      filters,
      limit = POSTS_PAGE_SIZE,
      cursor,
    }: FetchNearbyParams): Promise<PostsPage> {
      const pageSize = clampLimit(limit);

      const { data, error } = await getClient().rpc('posts_nearby', {
        lat: center.latitude,
        lng: center.longitude,
        radius_m: radiusM,
        p_city_id: cityId,
        p_type: filters?.type,
        p_species: filters?.species,
        p_limit: pageSize,
        // Together-or-neither: both fields come from the same cursor object,
        // so a half cursor (silent reset to page 1) is unrepresentable.
        p_after_distance: cursor?.afterDistance,
        p_after_id: cursor?.afterId,
      });

      if (error !== null) {
        throw new DataError(
          `posts_nearby failed: ${error.message}`,
          'No pudimos cargar las publicaciones cercanas. Probá de nuevo en un rato.',
          { cause: error },
        );
      }

      const lastRow = data.length >= pageSize ? data[data.length - 1] : undefined;

      return {
        posts: data.map(mapPostsNearbyRow),
        nextCursor:
          lastRow === undefined
            ? null
            : { afterDistance: lastRow.distance_m, afterId: lastRow.id },
      };
    },
  };
}

/** Default repository used by the application layer (hooks). */
export const postsRepository: PostsRepository = createSupabasePostsRepository();
