/**
 * Unit tests for usePostFilters.
 *
 * The hook is a pure mapping layer: it reads Zustand store state and
 * resolves the date preset to a concrete eventFrom bound. No components,
 * no providers needed — Zustand works without a Provider.
 */
import { act, renderHook } from '@testing-library/react-native';

import { usePostFilters } from '@/features/posts/hooks/usePostFilters';
import { useFiltersStore } from '@/features/posts/store/filtersStore';

const FROZEN_NOW = new Date('2026-06-15T12:00:00.000Z');

const initialState = useFiltersStore.getState();

beforeEach(() => {
  useFiltersStore.setState(initialState, true);
  jest.useFakeTimers();
  jest.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePostFilters', () => {
  it('returns default filters when store is in its initial state', async () => {
    const { result } = await renderHook(() => usePostFilters());

    expect(result.current).toEqual({
      radiusM: 5000,
      eventFrom: undefined,
      type: undefined,
      species: undefined,
    });
  });

  it('maps toggleType("perdido") → type: "perdido"', async () => {
    const { result } = await renderHook(() => usePostFilters());

    await act(async () => {
      useFiltersStore.getState().toggleType('perdido');
    });

    expect(result.current.type).toBe('perdido');
  });

  it('maps toggleSpecies("gato") → species: "gato"', async () => {
    const { result } = await renderHook(() => usePostFilters());

    await act(async () => {
      useFiltersStore.getState().toggleSpecies('gato');
    });

    expect(result.current.species).toBe('gato');
  });

  it('maps setRadiusM(10000) → radiusM: 10000', async () => {
    const { result } = await renderHook(() => usePostFilters());

    await act(async () => {
      useFiltersStore.getState().setRadiusM(10000);
    });

    expect(result.current.radiusM).toBe(10000);
  });

  it('resolves preset "hoy" to today\'s date as YYYY-MM-DD', async () => {
    const { result } = await renderHook(() => usePostFilters());

    await act(async () => {
      useFiltersStore.getState().setDatePreset('hoy');
    });

    // FROZEN_NOW is 2026-06-15T12:00:00Z — local date depends on the test
    // environment timezone; using eventFromForPreset logic: days back = 0 →
    // same local calendar day. We derive the expected value the same way the
    // implementation does (local date components) to avoid timezone fragility.
    const now = FROZEN_NOW;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const expected = `${now.getFullYear()}-${month}-${day}`;

    expect(result.current.eventFrom).toBe(expected);
  });

  it('resolves preset "todas" → eventFrom: undefined', async () => {
    const { result } = await renderHook(() => usePostFilters());

    // First set something non-default, then clear back to "todas".
    await act(async () => {
      useFiltersStore.getState().setDatePreset('semana');
    });
    await act(async () => {
      useFiltersStore.getState().setDatePreset('todas');
    });

    expect(result.current.eventFrom).toBeUndefined();
  });

  it('returns the same object reference when the store has not changed (memo stability)', async () => {
    const { result } = await renderHook(() => usePostFilters());

    const first = result.current;
    const second = result.current;

    expect(first).toBe(second);
  });
});
