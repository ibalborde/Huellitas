import { formatDistance, formatRelativeDate } from '@/lib/format';

describe('formatDistance', () => {
  it('formats meters below 1 km', () => {
    expect(formatDistance(350)).toBe('a 350 m');
    expect(formatDistance(999.4)).toBe('a 999 m');
  });

  it('formats km with a comma decimal below 10 km', () => {
    expect(formatDistance(1200)).toBe('a 1,2 km');
    expect(formatDistance(9500)).toBe('a 9,5 km');
  });

  it('drops the redundant ,0 decimal', () => {
    expect(formatDistance(1000)).toBe('a 1 km');
    expect(formatDistance(5020)).toBe('a 5 km');
  });

  it('rounds to whole km from 10 km up', () => {
    expect(formatDistance(10_000)).toBe('a 10 km');
    expect(formatDistance(15_500)).toBe('a 16 km');
  });
});

describe('formatRelativeDate', () => {
  const NOW = new Date(2026, 5, 10, 15, 30); // 2026-06-10, mid-afternoon

  it('says hoy for the same day and clamps future dates to hoy', () => {
    expect(formatRelativeDate('2026-06-10', NOW)).toBe('hoy');
    expect(formatRelativeDate('2026-06-12', NOW)).toBe('hoy');
  });

  it('says ayer and counts days within the week', () => {
    expect(formatRelativeDate('2026-06-09', NOW)).toBe('ayer');
    expect(formatRelativeDate('2026-06-07', NOW)).toBe('hace 3 días');
  });

  it('counts weeks, months and years with singular forms', () => {
    expect(formatRelativeDate('2026-06-03', NOW)).toBe('hace 1 semana');
    expect(formatRelativeDate('2026-05-27', NOW)).toBe('hace 2 semanas');
    expect(formatRelativeDate('2026-05-10', NOW)).toBe('hace 1 mes');
    expect(formatRelativeDate('2026-03-10', NOW)).toBe('hace 3 meses');
    expect(formatRelativeDate('2025-06-01', NOW)).toBe('hace 1 año');
    expect(formatRelativeDate('2023-06-01', NOW)).toBe('hace 3 años');
  });
});
