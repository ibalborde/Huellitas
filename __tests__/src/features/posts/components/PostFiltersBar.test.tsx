/**
 * Unit tests for PostFiltersBar.
 *
 * Covers rendering of all chip groups, toggle behaviour for type and species
 * filters (select → deselect on second tap), and both themes.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';

import { PostFiltersBar } from '@/features/posts/components/PostFiltersBar';
import { useFiltersStore } from '@/features/posts/store/filtersStore';

import { renderWithTheme, THEME_MODES } from '../../../helpers/theme-testing';

const initialState = useFiltersStore.getState();

beforeEach(() => {
  useFiltersStore.setState(initialState, true);
});

describe('PostFiltersBar', () => {
  describe('chip rendering', () => {
    it('renders all type chips', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      expect(screen.getByText('Perdidos')).toBeOnTheScreen();
      expect(screen.getByText('Encontrados')).toBeOnTheScreen();
      expect(screen.getByText('Avistados')).toBeOnTheScreen();
    });

    it('renders all species chips', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      expect(screen.getByText('Perros')).toBeOnTheScreen();
      expect(screen.getByText('Gatos')).toBeOnTheScreen();
      expect(screen.getByText('Otros')).toBeOnTheScreen();
    });

    it('renders all radius chips', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      expect(screen.getByText('1 km')).toBeOnTheScreen();
      expect(screen.getByText('5 km')).toBeOnTheScreen();
      expect(screen.getByText('10 km')).toBeOnTheScreen();
      expect(screen.getByText('25 km')).toBeOnTheScreen();
    });

    it('renders all date chips', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      expect(screen.getByText('Todas')).toBeOnTheScreen();
      expect(screen.getByText('Hoy')).toBeOnTheScreen();
      expect(screen.getByText('Última semana')).toBeOnTheScreen();
      expect(screen.getByText('Último mes')).toBeOnTheScreen();
    });
  });

  describe('type filter interactions', () => {
    it('pressing "Perdidos" selects it (store type = "perdido")', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      await act(async () => {
        fireEvent.press(screen.getByText('Perdidos'));
      });

      expect(useFiltersStore.getState().type).toBe('perdido');
    });

    it('pressing selected "Perdidos" again deselects it (toggle → null)', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      await act(async () => {
        fireEvent.press(screen.getByText('Perdidos'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Perdidos'));
      });

      expect(useFiltersStore.getState().type).toBeNull();
    });
  });

  describe('species filter interactions', () => {
    it('pressing "Gatos" selects species independently from type', async () => {
      await renderWithTheme(<PostFiltersBar />, 'light');

      await act(async () => {
        fireEvent.press(screen.getByText('Perdidos'));
      });
      await act(async () => {
        fireEvent.press(screen.getByText('Gatos'));
      });

      expect(useFiltersStore.getState().species).toBe('gato');
      // Type must remain unaffected.
      expect(useFiltersStore.getState().type).toBe('perdido');
    });
  });

  describe.each(THEME_MODES)('theme: %s', (mode) => {
    it('renders without error', async () => {
      await expect(renderWithTheme(<PostFiltersBar />, mode)).resolves.not.toThrow();
    });
  });
});
