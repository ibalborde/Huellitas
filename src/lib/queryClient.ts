import { QueryClient } from '@tanstack/react-query';

/**
 * Mobile-sensible React Query defaults:
 * - staleTime 1 min: avoids refetch storms on focus/navigation while keeping
 *   the nearby feed reasonably fresh.
 * - retry 1: one retry is enough on flaky mobile networks; more just delays
 *   the error state the UI needs to show.
 */
const QUERY_STALE_TIME_MS = 60_000;
const QUERY_RETRY_COUNT = 1;

/** One instance per app (module scope in app/_layout.tsx); per-test in tests. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: QUERY_RETRY_COUNT,
      },
    },
  });
}
