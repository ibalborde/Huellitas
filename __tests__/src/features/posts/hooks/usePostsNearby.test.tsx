/**
 * S1.2 — usePostsNearby unit tests.
 *
 * The repository module and the city context hook are mocked, so these tests
 * pin the APPLICATION-layer contract only: query enablement, key stability
 * under GPS jitter, radius clamping and the keyset-cursor page flow. The real
 * repository is covered by __tests__/integration/.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';

import { useActiveCity, type City, type CityContextValue } from '@/features/cities';
import { POSTS_PAGE_SIZE, RADIUS_DEFAULT_M, RADIUS_MAX_M, usePostsNearby } from '@/features/posts';
import {
  postsRepository,
  type PostsNearbyCursor,
  type PostsPage,
} from '@/features/posts/data/postsRepository';
import type { Post } from '@/features/posts/domain/post';
import type { Coordinates } from '@/lib/geo';

jest.mock('@/features/posts/data/postsRepository', () => ({
  postsRepository: { fetchNearby: jest.fn() },
}));

jest.mock('@/features/cities', () => ({
  useActiveCity: jest.fn(),
}));

const fetchNearbyMock = jest.mocked(postsRepository.fetchNearby);
const useActiveCityMock = jest.mocked(useActiveCity);

const TEST_CITY: City = {
  id: 'city-test-1',
  slug: 'testville',
  name: 'Testville',
  countryCode: 'AR',
  timezone: 'America/Argentina/Cordoba',
  center: { latitude: -30.5, longitude: -60.5 },
  isActive: true,
};

const CENTER: Coordinates = { latitude: -30.5, longitude: -60.5 };

function cityContextValue(activeCity: City | null): CityContextValue {
  return {
    activeCity,
    cities: activeCity === null ? [] : [activeCity],
    isLoading: activeCity === null,
    error: null,
    setActiveCity: jest.fn(),
  };
}

function makePost(id: string, distanceM: number): Post {
  return {
    id,
    userId: 'user-1',
    cityId: TEST_CITY.id,
    type: 'perdido',
    status: 'activo',
    species: 'perro',
    title: `Post ${id}`,
    description: 'fixture',
    neighborhoodId: null,
    eventDate: '2026-06-01',
    hasCustody: false,
    createdAt: '2026-06-01T12:00:00Z',
    coordinates: CENTER,
    distanceM,
  };
}

function makePage(ids: string[], nextCursor: PostsNearbyCursor | null): PostsPage {
  return { posts: ids.map((id, index) => makePost(id, (index + 1) * 100)), nextCursor };
}

function createWrapper() {
  const queryClient = new QueryClient({
    // gcTime: 0 — the default (5 min) leaves gc timers alive after unmount,
    // which keeps the jest worker from exiting gracefully.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: PropsWithChildren): ReactElement {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

interface HookProps {
  center: Coordinates;
}

function renderPostsNearby(initialCenter: Coordinates) {
  return renderHook(({ center }: HookProps) => usePostsNearby({ center }), {
    wrapper: createWrapper(),
    initialProps: { center: initialCenter },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useActiveCityMock.mockReturnValue(cityContextValue(TEST_CITY));
  fetchNearbyMock.mockResolvedValue(makePage([], null));
});

describe('usePostsNearby', () => {
  describe('page flow (keyset cursor)', () => {
    it('requests the first page without a cursor and scoped to the active city', async () => {
      const { result } = await renderPostsNearby(CENTER);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);
      expect(fetchNearbyMock).toHaveBeenCalledWith({
        center: CENTER,
        cityId: TEST_CITY.id,
        radiusM: RADIUS_DEFAULT_M,
        filters: { type: undefined, species: undefined, eventFrom: undefined, eventTo: undefined },
        limit: POSTS_PAGE_SIZE,
        cursor: undefined,
      });
    });

    it('passes nextCursor through getNextPageParam with BOTH fields intact', async () => {
      const cursor: PostsNearbyCursor = { afterDistance: 240.5, afterId: 'post-b' };
      fetchNearbyMock
        .mockResolvedValueOnce(makePage(['post-a', 'post-b'], cursor))
        .mockResolvedValueOnce(makePage(['post-c'], null));

      const { result } = await renderPostsNearby(CENTER);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.hasNextPage).toBe(true);

      await act(async () => {
        await result.current.fetchNextPage();
      });

      expect(fetchNearbyMock).toHaveBeenCalledTimes(2);
      expect(fetchNearbyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: { afterDistance: 240.5, afterId: 'post-b' } }),
      );

      // fetchNextPage resolved, but the commit that exposes page 2 through
      // result.current can land one render later under React 19 → waitFor.
      await waitFor(() => {
        const ids = result.current.data?.pages.flatMap((page) =>
          page.posts.map((post) => post.id),
        );
        expect(ids).toEqual(['post-a', 'post-b', 'post-c']);
      });
      // Last page reported nextCursor: null → the feed knows it reached the end.
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe('query key stability under GPS jitter', () => {
    it('keeps the same cache entry when the center moves only in the 6th decimal', async () => {
      const { result, rerender } = await renderPostsNearby({
        latitude: -30.500001,
        longitude: -60.500001,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);

      // ~0.2 m jitter: must round to the same 3-decimal center → same key.
      await rerender({ center: { latitude: -30.500004, longitude: -60.499998 } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);
      // Both renders requested the SAME rounded center (key and request match).
      expect(fetchNearbyMock).toHaveBeenCalledWith(
        expect.objectContaining({ center: { latitude: -30.5, longitude: -60.5 } }),
      );
    });

    it('does refetch when the center moves beyond the rounding precision', async () => {
      const { result, rerender } = await renderPostsNearby(CENTER);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);

      // 3rd-decimal change (~111 m): a genuinely different search center.
      await rerender({ center: { latitude: -30.502, longitude: -60.5 } });

      await waitFor(() => expect(fetchNearbyMock).toHaveBeenCalledTimes(2));
      expect(fetchNearbyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ center: { latitude: -30.502, longitude: -60.5 } }),
      );
    });
  });

  describe('radius clamping', () => {
    it('clamps filters.radiusM to RADIUS_MAX_M before it reaches the repository', async () => {
      const { result } = await renderHook(
        () => usePostsNearby({ center: CENTER, filters: { radiusM: RADIUS_MAX_M + 10_000 } }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchNearbyMock).toHaveBeenCalledWith(
        expect.objectContaining({ radiusM: RADIUS_MAX_M }),
      );
    });

    it('passes a radius below the cap through unchanged, along with content filters', async () => {
      const { result } = await renderHook(
        () =>
          usePostsNearby({
            center: CENTER,
            filters: {
              radiusM: 1_000,
              type: 'encontrado',
              species: 'gato',
              eventFrom: '2026-06-01',
              eventTo: '2026-06-07',
            },
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchNearbyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          radiusM: 1_000,
          filters: {
            type: 'encontrado',
            species: 'gato',
            eventFrom: '2026-06-01',
            eventTo: '2026-06-07',
          },
        }),
      );
    });
  });

  describe('event-date range', () => {
    it('refetches when the range changes (eventFrom/eventTo are part of the query key)', async () => {
      const { result, rerender } = await renderHook(
        ({ eventFrom }: { eventFrom: string | undefined }) =>
          usePostsNearby({ center: CENTER, filters: { eventFrom, eventTo: '2026-06-07' } }),
        { wrapper: createWrapper(), initialProps: { eventFrom: undefined } },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);

      await rerender({ eventFrom: '2026-06-01' });

      await waitFor(() => expect(fetchNearbyMock).toHaveBeenCalledTimes(2));
      expect(fetchNearbyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ eventFrom: '2026-06-01', eventTo: '2026-06-07' }),
        }),
      );
    });
  });

  describe('city gating', () => {
    it('stays disabled while the active city is resolving, then fires once it resolves', async () => {
      useActiveCityMock.mockReturnValue(cityContextValue(null));

      const { result, rerender } = await renderPostsNearby(CENTER);

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
      expect(fetchNearbyMock).not.toHaveBeenCalled();

      useActiveCityMock.mockReturnValue(cityContextValue(TEST_CITY));
      await rerender({ center: CENTER });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(fetchNearbyMock).toHaveBeenCalledTimes(1);
      expect(fetchNearbyMock).toHaveBeenCalledWith(
        expect.objectContaining({ cityId: TEST_CITY.id }),
      );
    });
  });
});
