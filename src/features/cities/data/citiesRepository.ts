import { DataError } from '@/lib/errors';
import type { Coordinates } from '@/lib/geo';
import { getSupabaseClient, type TypedSupabaseClient } from '@/lib/supabase';

import type { City } from '../domain/city';
import { parseEwkbPoint } from './ewkb';

export interface CitiesRepository {
  /** Active service areas, oldest first (launch order). */
  listActiveCities(): Promise<City[]>;
  /** The active city whose bounds cover the coordinate, or null if none. */
  resolveCity(coordinates: Coordinates): Promise<City | null>;
}

const CITY_COLUMNS = 'id, slug, name, country_code, timezone, center, is_active';

/**
 * Shape shared by the `cities` table select and the `resolve_city` RPC row.
 * `center` is `unknown` in the generated types (PostGIS geography); at
 * runtime PostgREST returns it as hex EWKB.
 */
interface CityRowLike {
  id: string;
  slug: string;
  name: string;
  country_code: string;
  timezone: string;
  center: unknown;
  is_active: boolean;
}

function mapCityRow(row: CityRowLike): City {
  if (typeof row.center !== 'string') {
    throw new DataError(
      `cities.center for "${row.slug}" is not an EWKB string (got ${typeof row.center})`,
      'No pudimos interpretar una ubicación recibida del servidor.',
    );
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    countryCode: row.country_code,
    timezone: row.timezone,
    center: parseEwkbPoint(row.center),
    isActive: row.is_active,
  };
}

/**
 * Supabase-backed implementation. `getClient` is injectable so integration
 * tests can point it at a specific client; it defaults to the lazy app-wide
 * client so importing this module never requires env configuration.
 */
export function createSupabaseCitiesRepository(
  getClient: () => TypedSupabaseClient = getSupabaseClient,
): CitiesRepository {
  return {
    async listActiveCities(): Promise<City[]> {
      const { data, error } = await getClient()
        .from('cities')
        .select(CITY_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error !== null) {
        throw new DataError(
          `listActiveCities failed: ${error.message}`,
          'No pudimos cargar las ciudades disponibles. Probá de nuevo en un rato.',
          { cause: error },
        );
      }

      return data.map(mapCityRow);
    },

    async resolveCity({ latitude, longitude }: Coordinates): Promise<City | null> {
      const { data, error } = await getClient().rpc('resolve_city', {
        lat: latitude,
        lng: longitude,
      });

      if (error !== null) {
        throw new DataError(
          `resolve_city failed: ${error.message}`,
          'No pudimos determinar tu ciudad. Probá de nuevo en un rato.',
          { cause: error },
        );
      }

      const row = data[0];
      return row === undefined ? null : mapCityRow(row);
    },
  };
}

/** Default repository used by the application layer (hooks). */
export const citiesRepository: CitiesRepository = createSupabaseCitiesRepository();
