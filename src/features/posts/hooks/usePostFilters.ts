import { useMemo } from 'react';

import { eventFromForPreset } from '../domain/eventDatePresets';
import type { PostFilters } from '../domain/post';
import { useFiltersStore } from '../store/filtersStore';

/**
 * Maps the filter-bar store to the `PostFilters` shape `usePostsNearby`
 * expects: nulls become undefined and the date preset resolves to an
 * `eventFrom` lower bound at selection time. The single place that knows
 * about both shapes.
 */
export function usePostFilters(): PostFilters {
  const type = useFiltersStore((state) => state.type);
  const species = useFiltersStore((state) => state.species);
  const radiusM = useFiltersStore((state) => state.radiusM);
  const datePreset = useFiltersStore((state) => state.datePreset);

  return useMemo(
    () => ({
      type: type ?? undefined,
      species: species ?? undefined,
      radiusM,
      eventFrom: eventFromForPreset(datePreset, new Date()),
    }),
    [type, species, radiusM, datePreset],
  );
}
