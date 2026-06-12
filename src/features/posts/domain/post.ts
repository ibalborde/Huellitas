import type { Coordinates } from '@/lib/geo';

/**
 * Domain enums. They mirror the Postgres enums (`post_type`, `post_status`,
 * `species`) on purpose, but are declared here so the domain stays
 * DB-independent: if the schema diverges, the data-layer mappers stop
 * compiling instead of leaking raw values into the app.
 */
export type PostType = 'perdido' | 'encontrado' | 'avistado';
export type PostStatus = 'activo' | 'resuelto' | 'archivado';
export type Species = 'gato' | 'perro' | 'otro';

/** A lost/found/sighted pet publication, as the UI consumes it. */
export interface Post {
  id: string;
  userId: string;
  cityId: string;
  type: PostType;
  status: PostStatus;
  species: Species;
  title: string;
  description: string;
  neighborhoodId: string | null;
  /** Day of the event (lost/found/sighted), ISO date `YYYY-MM-DD`. */
  eventDate: string;
  /** Whether the publisher is keeping the animal (encontrado posts). */
  hasCustody: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Where the event happened. */
  coordinates: Coordinates;
  /** Distance in meters from the center of the query that returned this post. */
  distanceM: number;
}

/** User-tunable filters for the nearby feed (filter bar state). */
export interface PostFilters {
  type?: PostType;
  species?: Species;
  radiusM?: number;
}
