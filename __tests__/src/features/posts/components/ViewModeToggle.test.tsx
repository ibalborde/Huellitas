/**
 * Unit tests for ViewModeToggle.
 *
 * The component is a pure projection of the filtersStore.viewMode. Tests cover
 * rendering, initial selection, pressing each segment, accessibility roles and
 * states, and both themes.
 */
import { act, fireEvent, screen } from '@testing-library/react-native';

import { ViewModeToggle } from '@/features/posts/components/ViewModeToggle';
import { useFiltersStore } from '@/features/posts/store/filtersStore';

import { renderWithTheme, THEME_MODES } from '../../../helpers/theme-testing';

const initialState = useFiltersStore.getState();

beforeEach(() => {
  useFiltersStore.setState(initialState, true);
});

describe('ViewModeToggle', () => {
  it('renders both segments — "Mapa" and "Lista"', async () => {
    await renderWithTheme(<ViewModeToggle />, 'light');

    expect(screen.getByText('Mapa')).toBeOnTheScreen();
    expect(screen.getByText('Lista')).toBeOnTheScreen();
  });

  it('marks "Lista" as selected by default (store default is "list")', async () => {
    await renderWithTheme(<ViewModeToggle />, 'light');

    const listaTab = screen.getByRole('tab', { name: 'Lista' });
    const mapaTab = screen.getByRole('tab', { name: 'Mapa' });

    expect(listaTab).toBeSelected();
    expect(mapaTab).not.toBeSelected();
  });

  it('pressing "Mapa" calls setViewMode("map") and updates selection', async () => {
    await renderWithTheme(<ViewModeToggle />, 'light');

    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Mapa' }));
    });

    expect(useFiltersStore.getState().viewMode).toBe('map');

    const mapaTab = screen.getByRole('tab', { name: 'Mapa' });
    const listaTab = screen.getByRole('tab', { name: 'Lista' });
    expect(mapaTab).toBeSelected();
    expect(listaTab).not.toBeSelected();
  });

  it('pressing the already-selected segment does not crash', async () => {
    await renderWithTheme(<ViewModeToggle />, 'light');

    expect(() => {
      fireEvent.press(screen.getByRole('tab', { name: 'Lista' }));
    }).not.toThrow();
  });

  it('container has accessibilityRole="tablist"', async () => {
    const { container } = await renderWithTheme(<ViewModeToggle />, 'light');

    // RNTL 14 does not resolve 'tablist' via getByRole; use container.queryAll
    // with a predicate on the raw accessibilityRole prop.
    const tablistNodes = container.queryAll(
      (node) => node.props.accessibilityRole === 'tablist',
    );
    expect(tablistNodes).toHaveLength(1);
  });

  it('each segment has accessibilityRole="tab"', async () => {
    await renderWithTheme(<ViewModeToggle />, 'light');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
  });

  describe.each(THEME_MODES)('theme: %s', (mode) => {
    it('renders without error', async () => {
      await expect(renderWithTheme(<ViewModeToggle />, mode)).resolves.not.toThrow();
    });
  });
});
