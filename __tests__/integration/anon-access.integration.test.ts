/**
 * F0.3 — anon access surface against the real local stack.
 *
 * Verifies the read-only contract for unauthenticated visitors:
 * reference data is readable, resolve_city works, and the private surface
 * (profiles.whatsapp, zone_alerts, any write) is denied by grants/RLS.
 */
import {
  assertStackReachable,
  createAnonClient,
  PG_INSUFFICIENT_PRIVILEGE,
  ROSARIO,
  wktPoint,
  type TypedClient,
} from './helpers';

describe('F0.3 integration — anon access surface', () => {
  let anon: TypedClient;

  beforeAll(async () => {
    await assertStackReachable();
    anon = createAnonClient();
  });

  describe('reference data (cities, neighborhoods)', () => {
    it('lists Rosario as an active city', async () => {
      const { data, error } = await anon.from('cities').select('id, slug, name, is_active');

      expect(error).toBeNull();
      const rosario = data?.find((city) => city.slug === 'rosario');
      expect(rosario).toBeDefined();
      expect(rosario?.name).toBe('Rosario');
      expect(rosario?.is_active).toBe(true);
    });

    it('lists seeded neighborhoods for Rosario', async () => {
      const { data: rosario, error: cityError } = await anon
        .from('cities')
        .select('id')
        .eq('slug', 'rosario')
        .single();
      expect(cityError).toBeNull();
      expect(rosario).not.toBeNull();
      if (rosario === null) return;

      const { data: neighborhoods, error } = await anon
        .from('neighborhoods')
        .select('id, name')
        .eq('city_id', rosario.id);

      expect(error).toBeNull();
      expect(neighborhoods).not.toBeNull();
      expect(neighborhoods?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('resolve_city RPC', () => {
    it('resolves Rosario center coordinates to the rosario city', async () => {
      const { data, error } = await anon.rpc('resolve_city', {
        lat: ROSARIO.lat,
        lng: ROSARIO.lng,
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]?.slug).toBe('rosario');
    });

    it('returns no city for coordinates outside every active city (Buenos Aires)', async () => {
      const { data, error } = await anon.rpc('resolve_city', { lat: -34.6, lng: -58.4 });

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('profiles column-level privacy', () => {
    it('denies selecting whatsapp (authenticated-only column)', async () => {
      const { data, error } = await anon.from('profiles').select('whatsapp');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });

    it('allows selecting display_name', async () => {
      const { error } = await anon.from('profiles').select('id, display_name');

      expect(error).toBeNull();
    });
  });

  describe('private/write surface', () => {
    it('denies reading zone_alerts (push tokens are owner-only)', async () => {
      const { data, error } = await anon.from('zone_alerts').select('id');

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });

    it('denies inserting posts (publishing requires an account)', async () => {
      const spoofedUuid = '00000000-0000-4000-8000-000000000000';
      const { error } = await anon.from('posts').insert({
        user_id: spoofedUuid,
        city_id: spoofedUuid,
        type: 'perdido',
        species: 'perro',
        title: 'Anon spoof attempt',
        location: wktPoint(ROSARIO.lng, ROSARIO.lat),
      });

      expect(error).not.toBeNull();
      expect(error?.code).toBe(PG_INSUFFICIENT_PRIVILEGE);
    });
  });
});
