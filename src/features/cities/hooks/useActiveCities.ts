import { useQuery } from '@tanstack/react-query';

import { citiesRepository } from '../data/citiesRepository';

export const citiesKeys = {
  all: ['cities'] as const,
  active: () => [...citiesKeys.all, 'active'] as const,
};

/** Cities are quasi-static catalog data; an hour of staleness is fine. */
const CITIES_STALE_TIME_MS = 60 * 60 * 1000;

/** Active service areas, oldest first. Backbone of CityProvider. */
export function useActiveCities() {
  return useQuery({
    queryKey: citiesKeys.active(),
    queryFn: () => citiesRepository.listActiveCities(),
    staleTime: CITIES_STALE_TIME_MS,
  });
}
