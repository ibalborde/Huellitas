import { eventFromForPreset } from '@/features/posts/domain/eventDatePresets';

describe('eventFromForPreset', () => {
  const NOW = new Date(2026, 5, 10, 23, 45); // 2026-06-10, late night (local)

  it('returns no bound for todas', () => {
    expect(eventFromForPreset('todas', NOW)).toBeUndefined();
  });

  it('resolves hoy to the current local day', () => {
    expect(eventFromForPreset('hoy', NOW)).toBe('2026-06-10');
  });

  it('resolves semana to 7 days back', () => {
    expect(eventFromForPreset('semana', NOW)).toBe('2026-06-03');
  });

  it('resolves mes to 30 days back, crossing the month boundary', () => {
    expect(eventFromForPreset('mes', NOW)).toBe('2026-05-11');
  });

  it('crosses the year boundary', () => {
    expect(eventFromForPreset('mes', new Date(2026, 0, 5))).toBe('2025-12-06');
  });
});
