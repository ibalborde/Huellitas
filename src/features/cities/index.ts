/**
 * Public API of the cities feature.
 * UI imports from here; the data layer (citiesRepository) is internal and is
 * only imported by hooks and by integration tests.
 */
export type { City } from './domain/city';
export { CityProvider, useActiveCity, type CityContextValue } from './components/CityProvider';
export { citiesKeys, useActiveCities } from './hooks/useActiveCities';
