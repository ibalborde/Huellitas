/**
 * Pure es-AR formatting helpers for presentation text.
 * No React, no Intl (Hermes Intl coverage varies by platform): manual
 * formatting keeps the output predictable and testable.
 */

const METERS_PER_KM = 1000;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const MS_PER_DAY = 86_400_000;
/** Above this many km the decimal stops adding information. */
const KM_DECIMAL_CUTOFF = 10;

/** Distance from the search center: "a 350 m", "a 1,2 km", "a 12 km". */
export function formatDistance(meters: number): string {
  if (meters < METERS_PER_KM) {
    return `a ${Math.round(meters)} m`;
  }

  const km = meters / METERS_PER_KM;
  if (km >= KM_DECIMAL_CUTOFF) {
    return `a ${Math.round(km)} km`;
  }

  const withDecimal = km.toFixed(1).replace('.', ',');
  const label = withDecimal.endsWith(',0') ? withDecimal.slice(0, -2) : withDecimal;
  return `a ${label} km`;
}

/** Parses an ISO `YYYY-MM-DD` as a LOCAL date (no UTC shift surprises). Returns Invalid Date on malformed input. */
function parseIsoDateLocal(isoDate: string): Date {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return new Date(NaN);
  const [year, month, day] = parts.map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Relative day phrasing in es-AR for an ISO `YYYY-MM-DD` date:
 * "hoy", "ayer", "hace 3 días", "hace 2 semanas", "hace 1 mes", "hace 1 año".
 * Future dates clamp to "hoy" (event dates should never be in the future).
 */
export function formatRelativeDate(isoDate: string, now: Date): string {
  const event = parseIsoDateLocal(isoDate);
  if (isNaN(event.getTime())) return 'fecha desconocida';
  const elapsedMs = startOfDay(now).getTime() - event.getTime();
  const days = Math.round(elapsedMs / MS_PER_DAY);

  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < DAYS_PER_WEEK) return `hace ${days} días`;
  if (days < DAYS_PER_MONTH) {
    const weeks = Math.floor(days / DAYS_PER_WEEK);
    return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`;
  }
  if (days < DAYS_PER_YEAR) {
    const months = Math.floor(days / DAYS_PER_MONTH);
    return months === 1 ? 'hace 1 mes' : `hace ${months} meses`;
  }
  const years = Math.floor(days / DAYS_PER_YEAR);
  return years === 1 ? 'hace 1 año' : `hace ${years} años`;
}
