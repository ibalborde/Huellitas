/**
 * Geographic primitives shared across feature domains.
 * Pure types and functions only — safe to import from any layer, including domain.
 */

/** A WGS84 coordinate pair. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Rounds a value to a fixed number of decimal places. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Rounds both axes of a coordinate pair to the given decimal precision. */
export function roundCoordinates(coordinates: Coordinates, decimals: number): Coordinates {
  return {
    latitude: roundTo(coordinates.latitude, decimals),
    longitude: roundTo(coordinates.longitude, decimals),
  };
}
