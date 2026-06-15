/**
 * Quick event-date windows offered by the filter bar. A preset is a business
 * rule ("last week" = events since 7 days ago) that resolves to the
 * `PostFilters.eventFrom` lower bound; "todas" means no bound.
 */
export type EventDatePreset = 'todas' | 'hoy' | 'semana' | 'mes';

const PRESET_DAYS_BACK: Record<Exclude<EventDatePreset, 'todas'>, number> = {
  hoy: 0,
  semana: 7,
  mes: 30,
};

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Inclusive lower bound for a preset as a local ISO `YYYY-MM-DD` date
 * (same representation as `PostFilters.eventFrom`), or undefined for "todas".
 *
 * Uses the device-local calendar day. Resolving against the active city's
 * timezone is a deliberate non-goal for now: the difference only matters for
 * users browsing a city from another timezone, around midnight.
 */
export function eventFromForPreset(preset: EventDatePreset, now: Date): string | undefined {
  if (preset === 'todas') {
    return undefined;
  }

  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  from.setDate(from.getDate() - PRESET_DAYS_BACK[preset]);
  return toIsoDate(from);
}
