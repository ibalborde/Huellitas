import type { Coordinates } from '@/lib/geo';

/**
 * An active service area. Cities are DATA, never code: the launch city
 * (Rosario) is just a seeded row, and nothing in the app may assume it.
 */
export interface City {
  id: string;
  /** URL-safe identifier, e.g. "rosario". */
  slug: string;
  name: string;
  /** ISO 3166-1 alpha-2, e.g. "AR". */
  countryCode: string;
  /** IANA timezone, e.g. "America/Argentina/Cordoba". */
  timezone: string;
  /** Geographic center — map recenter and fallback search center. */
  center: Coordinates;
  isActive: boolean;
}
