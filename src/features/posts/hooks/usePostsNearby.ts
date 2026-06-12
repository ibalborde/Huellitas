import { useInfiniteQuery } from '@tanstack/react-query';

import { useActiveCity } from '@/features/cities';
import { roundCoordinates, type Coordinates } from '@/lib/geo';

import { postsRepository, type PostsNearbyCursor } from '../data/postsRepository';
import { POSTS_PAGE_SIZE, RADIUS_DEFAULT_M, RADIUS_MAX_M } from '../domain/constants';
import type { PostFilters, PostType, Species } from '../domain/post';

/**
 * Center coordinates are rounded to 3 decimals (~111 m) before they reach the
 * query key, so normal GPS jitter does not churn the cache with near-identical
 * entries. The same rounded center goes to the server: key and request match.
 */
const COORD_QUERY_PRECISION = 3;

/**
 * Caps pages kept in cache. Bounds memory AND the cost of invalidation: React
 * Query v5 refetches every cached page sequentially when the query refreshes.
 */
const POSTS_NEARBY_MAX_PAGES = 5;

interface PostsNearbyKeyParams {
  /** null while the active city is still resolving (query stays disabled). */
  cityId: string | null;
  center: Coordinates;
  radiusM: number;
  type: PostType | null;
  species: Species | null;
  /** Inclusive event-date range, ISO `YYYY-MM-DD` strings (stable in keys). */
  eventFrom: string | null;
  eventTo: string | null;
}

export const postsKeys = {
  all: ['posts'] as const,
  nearby: (params: PostsNearbyKeyParams) => [...postsKeys.all, 'nearby', params] as const,
};

export interface UsePostsNearbyParams {
  /** Search center: user GPS fix, or the active city's center as fallback. */
  center: Coordinates;
  filters?: PostFilters;
}

/**
 * Infinite nearby feed, closest posts first.
 *
 * The active city is taken from CityProvider here — not from the caller — so
 * scoping every geo query to the active city is guaranteed by construction
 * (multi-city rule), not by every caller remembering to pass it. While the
 * city is resolving the query stays disabled (no flash of unscoped data).
 */
export function usePostsNearby({ center, filters }: UsePostsNearbyParams) {
  const { activeCity } = useActiveCity();
  const roundedCenter = roundCoordinates(center, COORD_QUERY_PRECISION);
  // Defense in depth: the server also caps the radius (posts_nearby SQL).
  const radiusM = Math.min(filters?.radiusM ?? RADIUS_DEFAULT_M, RADIUS_MAX_M);
  const type = filters?.type ?? null;
  const species = filters?.species ?? null;
  const eventFrom = filters?.eventFrom ?? null;
  const eventTo = filters?.eventTo ?? null;

  return useInfiniteQuery({
    queryKey: postsKeys.nearby({
      cityId: activeCity?.id ?? null,
      center: roundedCenter,
      radiusM,
      type,
      species,
      eventFrom,
      eventTo,
    }),
    enabled: activeCity !== null,
    maxPages: POSTS_NEARBY_MAX_PAGES,
    initialPageParam: null as PostsNearbyCursor | null,
    queryFn: ({ pageParam }) => {
      if (activeCity === null) {
        // Unreachable: the query is disabled until a city is active.
        throw new Error('usePostsNearby ran without an active city');
      }
      return postsRepository.fetchNearby({
        center: roundedCenter,
        cityId: activeCity.id,
        radiusM,
        filters: {
          type: type ?? undefined,
          species: species ?? undefined,
          eventFrom: eventFrom ?? undefined,
          eventTo: eventTo ?? undefined,
        },
        limit: POSTS_PAGE_SIZE,
        cursor: pageParam ?? undefined,
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
