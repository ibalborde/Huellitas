/**
 * Unit tests for PostsList.
 *
 * Covers: empty state, expand-radius action visibility, post card rendering,
 * RefreshControl refreshing prop, loading footer, and both themes.
 */
import { screen } from '@testing-library/react-native';

import { PostsList } from '@/features/posts/components/PostsList';
import type { Post } from '@/features/posts/domain/post';

import { renderWithTheme, THEME_MODES } from '../../../helpers/theme-testing';

const noop = jest.fn();

const mockPost: Post = {
  id: '1',
  userId: 'u1',
  cityId: 'c1',
  type: 'perdido',
  status: 'activo',
  species: 'perro',
  title: 'Se perdió Rex',
  description: 'Labrador amarillo',
  neighborhoodId: null,
  eventDate: '2026-06-10',
  hasCustody: false,
  createdAt: '2026-06-10T12:00:00Z',
  coordinates: { latitude: -32.9, longitude: -60.6 },
  distanceM: 500,
};

const defaultProps = {
  posts: [] as Post[],
  refreshing: false,
  onRefresh: noop,
  onEndReached: noop,
  isFetchingNextPage: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PostsList', () => {
  describe('empty state', () => {
    it('renders the empty state title when posts is empty', async () => {
      await renderWithTheme(<PostsList {...defaultProps} />, 'light');

      expect(screen.getByText('No hay publicaciones cerca')).toBeOnTheScreen();
    });

    it('renders "Ampliar la búsqueda" action when onExpandRadius is provided', async () => {
      await renderWithTheme(
        <PostsList {...defaultProps} onExpandRadius={noop} />,
        'light',
      );

      expect(screen.getByText('Ampliar la búsqueda')).toBeOnTheScreen();
    });

    it('does NOT render "Ampliar la búsqueda" when onExpandRadius is not provided', async () => {
      await renderWithTheme(<PostsList {...defaultProps} />, 'light');

      expect(screen.queryByText('Ampliar la búsqueda')).toBeNull();
    });
  });

  describe('with posts', () => {
    it('renders the post title when posts are provided', async () => {
      await renderWithTheme(
        <PostsList {...defaultProps} posts={[mockPost]} />,
        'light',
      );

      expect(screen.getByText('Se perdió Rex')).toBeOnTheScreen();
    });

    it('does not render the empty state when posts are provided', async () => {
      await renderWithTheme(
        <PostsList {...defaultProps} posts={[mockPost]} />,
        'light',
      );

      expect(screen.queryByText('No hay publicaciones cerca')).toBeNull();
    });
  });

  describe('RefreshControl', () => {
    /**
     * In RNTL 14 / test-renderer, RefreshControl is passed as a React element
     * (not an instantiated component) via the `refreshControl` prop on the
     * underlying `RCTScrollView` node. The `refreshing` boolean lives on that
     * element's `.props`. We reach it via `container.queryAll` + prop access.
     */
    function getRefreshingProp(container: ReturnType<typeof container.queryAll>[number]) {
      return container;
    }

    it('passes refreshing=true to RefreshControl', async () => {
      const { container } = await renderWithTheme(
        <PostsList {...defaultProps} refreshing={true} />,
        'light',
      );

      const scrollViews = container.queryAll((node) => node.type === 'RCTScrollView');
      expect(scrollViews.length).toBeGreaterThan(0);
      // refreshControl is stored as a React element in the scrollView's props.
      const refreshControlElement = scrollViews[0]!.props.refreshControl as {
        props: { refreshing: boolean };
      };
      expect(refreshControlElement.props.refreshing).toBe(true);
    });

    it('passes refreshing=false to RefreshControl', async () => {
      const { container } = await renderWithTheme(
        <PostsList {...defaultProps} refreshing={false} />,
        'light',
      );

      const scrollViews = container.queryAll((node) => node.type === 'RCTScrollView');
      expect(scrollViews.length).toBeGreaterThan(0);
      const refreshControlElement = scrollViews[0]!.props.refreshControl as {
        props: { refreshing: boolean };
      };
      expect(refreshControlElement.props.refreshing).toBe(false);
    });
  });

  describe('loading footer', () => {
    it('shows the loading indicator when isFetchingNextPage=true', async () => {
      await renderWithTheme(
        <PostsList {...defaultProps} isFetchingNextPage={true} />,
        'light',
      );

      expect(
        screen.getByLabelText('Cargando más publicaciones'),
      ).toBeOnTheScreen();
    });

    it('does not show the loading indicator when isFetchingNextPage=false', async () => {
      await renderWithTheme(
        <PostsList {...defaultProps} isFetchingNextPage={false} />,
        'light',
      );

      expect(screen.queryByLabelText('Cargando más publicaciones')).toBeNull();
    });
  });

  describe.each(THEME_MODES)('theme: %s', (mode) => {
    it('renders without error (empty)', async () => {
      await expect(
        renderWithTheme(<PostsList {...defaultProps} />, mode),
      ).resolves.not.toThrow();
    });

    it('renders without error (with posts)', async () => {
      await expect(
        renderWithTheme(<PostsList {...defaultProps} posts={[mockPost]} />, mode),
      ).resolves.not.toThrow();
    });
  });
});
