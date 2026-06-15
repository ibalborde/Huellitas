/**
 * S1.3 — Home screen (map/list toggle + filters + nearby feed).
 *
 * The city context and the posts repository are mocked; these tests pin the
 * screen wiring: header, toggle, filter chips driving the query, and the
 * remote-data states (loading / list / empty / error).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { useActiveCity, type City, type CityContextValue } from '@/features/cities';
import { useFiltersStore, type Post } from '@/features/posts';
import { postsRepository, type PostsPage } from '@/features/posts/data/postsRepository';
import { DataError } from '@/lib/errors';

import HomeScreen from '../../app/index';

jest.mock('@/features/cities', () => ({
  useActiveCity: jest.fn(),
  citiesKeys: { all: ['cities'] },
}));

jest.mock('@/features/posts/data/postsRepository', () => ({
  postsRepository: { fetchNearby: jest.fn() },
}));

const fetchNearbyMock = jest.mocked(postsRepository.fetchNearby);
const useActiveCityMock = jest.mocked(useActiveCity);

const TEST_CITY: City = {
  id: 'city-test-1',
  slug: 'testville',
  name: 'Testville',
  countryCode: 'AR',
  timezone: 'America/Argentina/Cordoba',
  center: { latitude: -30.5, longitude: -60.5 },
  isActive: true,
};

function cityContextValue(activeCity: City | null): CityContextValue {
  return {
    activeCity,
    cities: activeCity === null ? [] : [activeCity],
    isLoading: activeCity === null,
    error: null,
    setActiveCity: jest.fn(),
  };
}

function makePost(id: string, overrides: Partial<Post> = {}): Post {
  return {
    id,
    userId: 'user-1',
    cityId: TEST_CITY.id,
    type: 'perdido',
    status: 'activo',
    species: 'perro',
    title: `Post ${id}`,
    description: 'fixture',
    neighborhoodId: null,
    eventDate: '2026-06-01',
    hasCustody: false,
    createdAt: '2026-06-01T12:00:00Z',
    coordinates: TEST_CITY.center,
    distanceM: 350,
    ...overrides,
  };
}

function makePage(posts: Post[]): PostsPage {
  return { posts, nextCursor: null };
}

const INITIAL_METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * Note: React Query commits fetch results through a setTimeout(0)
 * (notifyManager), so a few act() warnings can show up in stderr even though
 * every test awaits its UI outcome. Known noise, same as the
 * usePostsNearby suite.
 */
async function renderHome() {
  const queryClient = new QueryClient({
    // staleTime: Infinity — no surprise refetches on remount (map/list flips),
    // so tests can settle deterministically. Key changes still fetch.
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: Infinity } },
  });
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <QueryClientProvider client={queryClient}>
        <HomeScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

const initialFiltersState = useFiltersStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  useFiltersStore.setState(initialFiltersState, true);
  useActiveCityMock.mockReturnValue(cityContextValue(TEST_CITY));
  fetchNearbyMock.mockResolvedValue(makePage([]));
});

describe('HomeScreen (app/index)', () => {
  it('shows the Huellitas title as a header and the active city name', async () => {
    await renderHome();

    const headers = screen.getAllByRole('header');
    expect(headers[0]).toHaveTextContent('Huellitas');
    expect(screen.getByText('📍 Testville')).toBeOnTheScreen();

    // Let the feed query settle before the test ends (avoids act() noise).
    await screen.findByText('No hay publicaciones cerca');
  });

  it('renders nearby posts with badge, distance and relative date', async () => {
    fetchNearbyMock.mockResolvedValue(
      makePage([makePost('post-1', { title: 'Se perdió Michi', species: 'gato' })]),
    );

    await renderHome();

    expect(await screen.findByText('Se perdió Michi')).toBeOnTheScreen();
    expect(screen.getByText('Perdido')).toBeOnTheScreen();
    expect(screen.getByText('a 350 m')).toBeOnTheScreen();
  });

  it('shows the empty state and widens the radius from its action', async () => {
    await renderHome();

    expect(await screen.findByText('No hay publicaciones cerca')).toBeOnTheScreen();

    // The widened search finds a post: proves the new radius reached the data layer.
    fetchNearbyMock.mockResolvedValue(makePage([makePost('post-1')]));
    fireEvent.press(screen.getByText('Ampliar la búsqueda'));

    // Default radius is 5 km; the next preset is 10 km.
    expect(useFiltersStore.getState().radiusM).toBe(10_000);
    expect(await screen.findByText('Post post-1')).toBeOnTheScreen();
    expect(fetchNearbyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ radiusM: 10_000 }),
    );
  });

  it('shows the user-facing error message with a retry action', async () => {
    fetchNearbyMock.mockRejectedValue(
      new DataError('boom', 'No pudimos buscar publicaciones cerca tuyo.'),
    );

    await renderHome();

    expect(await screen.findByText('No pudimos cargar las publicaciones')).toBeOnTheScreen();
    expect(screen.getByText('No pudimos buscar publicaciones cerca tuyo.')).toBeOnTheScreen();

    fetchNearbyMock.mockResolvedValue(makePage([makePost('post-1')]));
    fireEvent.press(screen.getByText('Reintentar'));

    expect(await screen.findByText('Post post-1')).toBeOnTheScreen();
  });

  it('switches to the map placeholder and back from the toggle', async () => {
    await renderHome();
    await screen.findByText('No hay publicaciones cerca');

    fireEvent.press(screen.getByRole('tab', { name: 'Mapa' }));
    expect(await screen.findByText('El mapa llega pronto')).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('tab', { name: 'Lista' }));
    expect(await screen.findByText('No hay publicaciones cerca')).toBeOnTheScreen();
  });

  it('sends the tapped type chip to the query and clears it on a second tap', async () => {
    await renderHome();
    await waitFor(() => expect(fetchNearbyMock).toHaveBeenCalled());

    fireEvent.press(screen.getByRole('button', { name: 'Perdidos' }));
    await waitFor(() =>
      expect(fetchNearbyMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: expect.objectContaining({ type: 'perdido' }) }),
      ),
    );

    // Second tap clears the filter; the original query is served from cache
    // (staleTime: Infinity), so we assert on the store, not on a new fetch.
    fireEvent.press(screen.getByRole('button', { name: 'Perdidos' }));
    expect(useFiltersStore.getState().type).toBeNull();
  });
});
