/**
 * S1.2 — cities repository against the REAL local stack.
 *
 * Verifies the data layer's row → domain mapping with real PostgREST
 * serialization (snake_case columns, hex-EWKB geography centers) and the
 * resolve_city RPC behavior for in/out-of-bounds coordinates.
 */
import {
  createSupabaseCitiesRepository,
  type CitiesRepository,
} from '../../src/features/cities/data/citiesRepository';
import { assertStackReachable, createAnonClient, ROSARIO } from './helpers';

/** Far outside every seeded city's bounds (Buenos Aires). */
const OUTSIDE_EVERY_CITY = { latitude: -34.6037, longitude: -58.3816 } as const;

describe('S1.2 integration — cities repository mapping', () => {
  let repository: CitiesRepository;

  beforeAll(async () => {
    await assertStackReachable();
    const anon = createAnonClient();
    repository = createSupabaseCitiesRepository(() => anon);
  });

  it('lists active cities as domain objects with parsed EWKB centers', async () => {
    const cities = await repository.listActiveCities();

    expect(cities.length).toBeGreaterThanOrEqual(1);
    expect(cities.every((city) => city.isActive)).toBe(true);

    const rosario = cities.find((city) => city.slug === 'rosario');
    expect(rosario).toBeDefined();
    expect(rosario).toMatchObject({
      name: 'Rosario',
      countryCode: 'AR',
      timezone: 'America/Argentina/Cordoba',
      isActive: true,
    });
    // The geography center round-trips through hex EWKB into plain numbers.
    expect(rosario?.center.latitude).toBeCloseTo(ROSARIO.lat, 4);
    expect(rosario?.center.longitude).toBeCloseTo(ROSARIO.lng, 4);

    // Domain objects only — no raw row fields may leak out of the data layer.
    expect(rosario).not.toHaveProperty('country_code');
    expect(rosario).not.toHaveProperty('is_active');
    expect(rosario).not.toHaveProperty('bounds');
  });

  it('resolves a coordinate inside an active city to that city', async () => {
    const city = await repository.resolveCity({
      latitude: ROSARIO.lat,
      longitude: ROSARIO.lng,
    });

    expect(city).not.toBeNull();
    expect(city?.slug).toBe('rosario');
    expect(city?.center.latitude).toBeCloseTo(ROSARIO.lat, 4);
  });

  it('returns null for a coordinate outside every active city', async () => {
    const city = await repository.resolveCity(OUTSIDE_EVERY_CITY);

    expect(city).toBeNull();
  });
});
