/**
 * Unit tests for FilterChip.
 *
 * Covers: label rendering, selected/unselected background, variant="lost"
 * crash-free render, accessibilityState, onPress, accessibilityLabel fallback,
 * hitSlop presence, and both themes.
 */
import { fireEvent, screen } from '@testing-library/react-native';

import { FilterChip } from '@/features/posts/components/FilterChip';

import { renderWithTheme, THEME_MODES } from '../../../helpers/theme-testing';

const noop = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FilterChip', () => {
  it('renders the label text', async () => {
    await renderWithTheme(
      <FilterChip label="Perdidos" selected={false} onPress={noop} />,
      'light',
    );

    expect(screen.getByText('Perdidos')).toBeOnTheScreen();
  });

  describe('variant="brand" (default)', () => {
    it('unselected chip has transparent background', async () => {
      await renderWithTheme(
        <FilterChip label="Perdidos" selected={false} onPress={noop} />,
        'light',
      );

      // The Pressable style carries the backgroundColor inline; when unselected
      // it should be 'transparent'.
      const pressable = screen.getByRole('button');
      const flatStyle = Array.isArray(pressable.props.style)
        ? Object.assign({}, ...pressable.props.style.filter(Boolean))
        : pressable.props.style ?? {};

      expect(flatStyle.backgroundColor).toBe('transparent');
    });

    it('selected chip has a non-transparent background', async () => {
      await renderWithTheme(
        <FilterChip label="Perdidos" selected={true} onPress={noop} />,
        'light',
      );

      const pressable = screen.getByRole('button');
      const flatStyle = Array.isArray(pressable.props.style)
        ? Object.assign({}, ...pressable.props.style.filter(Boolean))
        : pressable.props.style ?? {};

      expect(flatStyle.backgroundColor).not.toBe('transparent');
      expect(flatStyle.backgroundColor).toBeTruthy();
    });
  });

  it('variant="lost" selected renders without crashing', async () => {
    await renderWithTheme(
      <FilterChip label="Perdidos" selected={true} onPress={noop} variant="lost" />,
      'light',
    );

    expect(screen.getByText('Perdidos')).toBeOnTheScreen();
  });

  it('sets accessibilityState.selected=true when selected', async () => {
    await renderWithTheme(
      <FilterChip label="Perdidos" selected={true} onPress={noop} />,
      'light',
    );

    const element = screen.getByRole('button');
    expect(element).toBeSelected();
  });

  it('sets accessibilityState.selected=false when not selected', async () => {
    await renderWithTheme(
      <FilterChip label="Perdidos" selected={false} onPress={noop} />,
      'light',
    );

    const element = screen.getByRole('button');
    expect(element).not.toBeSelected();
  });

  it('calls onPress when the chip is pressed', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <FilterChip label="Perdidos" selected={false} onPress={onPress} />,
      'light',
    );

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the accessibilityLabel prop when provided', async () => {
    await renderWithTheme(
      <FilterChip
        label="Todas"
        selected={false}
        onPress={noop}
        accessibilityLabel="Todas las fechas"
      />,
      'light',
    );

    expect(screen.getByLabelText('Todas las fechas')).toBeOnTheScreen();
  });

  it('falls back to the label prop as accessibilityLabel when not provided', async () => {
    await renderWithTheme(
      <FilterChip label="Gatos" selected={false} onPress={noop} />,
      'light',
    );

    expect(screen.getByLabelText('Gatos')).toBeOnTheScreen();
  });

  it('has hitSlop set on the Pressable', async () => {
    await renderWithTheme(
      <FilterChip label="Perros" selected={false} onPress={noop} />,
      'light',
    );

    const pressable = screen.getByRole('button');
    expect(pressable.props.hitSlop).toBeDefined();
    expect(pressable.props.hitSlop).not.toBeNull();
  });

  describe.each(THEME_MODES)('theme: %s', (mode) => {
    it('renders without error', async () => {
      await expect(
        renderWithTheme(<FilterChip label="Avistados" selected={false} onPress={noop} />, mode),
      ).resolves.not.toThrow();
    });
  });
});
