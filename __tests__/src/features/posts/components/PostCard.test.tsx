import { screen } from '@testing-library/react-native';

import { PostCard } from '@/features/posts/components/PostCard';
import type { Post } from '@/features/posts';

import { renderWithTheme, THEME_MODES } from '../../../helpers/theme-testing';

const NOW = new Date(2026, 5, 10);

const POST: Post = {
  id: 'post-1',
  userId: 'user-1',
  cityId: 'city-1',
  type: 'encontrado',
  status: 'activo',
  species: 'perro',
  title: 'Encontré un perro en el parque',
  description: 'fixture',
  neighborhoodId: null,
  eventDate: '2026-06-09',
  hasCustody: true,
  createdAt: '2026-06-09T12:00:00Z',
  coordinates: { latitude: -32.95, longitude: -60.65 },
  distanceM: 1200,
};

describe.each(THEME_MODES)('PostCard (%s mode)', (mode) => {
  it('shows the type badge, title, distance and meta line', async () => {
    await renderWithTheme(<PostCard post={POST} now={NOW} />, mode);

    expect(screen.getByText('Encontrado')).toBeOnTheScreen();
    expect(screen.getByText('Encontré un perro en el parque')).toBeOnTheScreen();
    expect(screen.getByText('a 1,2 km')).toBeOnTheScreen();
    expect(screen.getByText('Perro · ayer')).toBeOnTheScreen();
  });

  it('appends the neighborhood name when provided', async () => {
    await renderWithTheme(
      <PostCard post={POST} neighborhoodName="Parque Independencia" now={NOW} />,
      mode,
    );

    expect(screen.getByText('Perro · ayer · Parque Independencia')).toBeOnTheScreen();
  });
});
