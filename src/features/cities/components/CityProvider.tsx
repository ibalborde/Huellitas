import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { City } from '../domain/city';
import { useActiveCities } from '../hooks/useActiveCities';

export interface CityContextValue {
  /**
   * The city every geo query must be scoped to. `null` while cities are
   * loading (or if none is active) — consumers gate their queries on it.
   */
  activeCity: City | null;
  /** All active cities, for the city picker / future expansion. */
  cities: City[];
  isLoading: boolean;
  error: Error | null;
  setActiveCity: (city: City) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

const NO_CITIES: City[] = [];

/**
 * Holds the active service area. Defaults to the FIRST active city returned
 * by the backend (launch order) — never a hardcoded one (multi-city rule).
 * Mount once in app/_layout.tsx, inside QueryClientProvider.
 */
export function CityProvider({ children }: PropsWithChildren) {
  const { data: cities = NO_CITIES, isPending, error } = useActiveCities();
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const activeCity = selectedCity ?? cities[0] ?? null;

  const value = useMemo<CityContextValue>(
    () => ({
      activeCity,
      cities,
      isLoading: isPending,
      error: error ?? null,
      setActiveCity: setSelectedCity,
    }),
    [activeCity, cities, isPending, error],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

/** Access to the active city. Must be used under CityProvider. */
export function useActiveCity(): CityContextValue {
  const value = useContext(CityContext);
  if (value === null) {
    throw new Error('useActiveCity must be used within a CityProvider (see app/_layout.tsx).');
  }
  return value;
}
