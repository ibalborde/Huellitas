/**
 * S1.2 — CityProvider / useActiveCity unit tests.
 *
 * The cities REPOSITORY is mocked (data layer boundary); the provider, the
 * useActiveCities hook and React Query run for real, so these tests cover the
 * actual loading → resolved/error lifecycle the app sees.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';

import { CityProvider, useActiveCity, type City } from '@/features/cities';
import { citiesRepository } from '@/features/cities/data/citiesRepository';

jest.mock('@/features/cities/data/citiesRepository', () => ({
  citiesRepository: { listActiveCities: jest.fn(), resolveCity: jest.fn() },
}));

const listActiveCitiesMock = jest.mocked(citiesRepository.listActiveCities);

function makeCity(id: string, slug: string): City {
  return {
    id,
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    countryCode: 'AR',
    timezone: 'America/Argentina/Cordoba',
    center: { latitude: -30.5, longitude: -60.5 },
    isActive: true,
  };
}

const FIRST_CITY = makeCity('city-1', 'primera');
const SECOND_CITY = makeCity('city-2', 'segunda');

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function createWrapper() {
  const queryClient = new QueryClient({
    // gcTime: 0 — the default (5 min) leaves gc timers alive after unmount,
    // which keeps the jest worker from exiting gracefully.
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: PropsWithChildren): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <CityProvider>{children}</CityProvider>
      </QueryClientProvider>
    );
  };
}

function renderActiveCity() {
  return renderHook(() => useActiveCity(), { wrapper: createWrapper() });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CityProvider / useActiveCity', () => {
  it('exposes a loading state with no active city while cities resolve', async () => {
    const pending = deferred<City[]>();
    listActiveCitiesMock.mockReturnValue(pending.promise);

    const { result } = await renderActiveCity();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activeCity).toBeNull();
    expect(result.current.cities).toEqual([]);
    expect(result.current.error).toBeNull();

    await act(async () => {
      pending.resolve([FIRST_CITY, SECOND_CITY]);
      await pending.promise;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCity).toEqual(FIRST_CITY);
  });

  it('defaults to the FIRST active city returned by the backend', async () => {
    listActiveCitiesMock.mockResolvedValue([FIRST_CITY, SECOND_CITY]);

    const { result } = await renderActiveCity();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCity).toEqual(FIRST_CITY);
    expect(result.current.cities).toEqual([FIRST_CITY, SECOND_CITY]);
  });

  it('setActiveCity switches the active city', async () => {
    listActiveCitiesMock.mockResolvedValue([FIRST_CITY, SECOND_CITY]);

    const { result } = await renderActiveCity();
    await waitFor(() => expect(result.current.activeCity).toEqual(FIRST_CITY));

    await act(async () => {
      result.current.setActiveCity(SECOND_CITY);
    });

    expect(result.current.activeCity).toEqual(SECOND_CITY);
    // The full list stays available for the picker.
    expect(result.current.cities).toEqual([FIRST_CITY, SECOND_CITY]);
  });

  it('keeps activeCity null when the backend returns no active cities', async () => {
    listActiveCitiesMock.mockResolvedValue([]);

    const { result } = await renderActiveCity();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeCity).toBeNull();
    expect(result.current.cities).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces repository errors with no active city', async () => {
    listActiveCitiesMock.mockRejectedValue(new Error('network down'));

    const { result } = await renderActiveCity();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.message).toBe('network down');
    expect(result.current.activeCity).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('useActiveCity throws an actionable error outside CityProvider', async () => {
    // React logs render errors to console.error; keep the test output clean.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(renderHook(() => useActiveCity())).rejects.toThrow(
        'useActiveCity must be used within a CityProvider',
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
