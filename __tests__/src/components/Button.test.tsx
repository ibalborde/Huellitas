import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '@/theme';

import { renderWithTheme } from '../helpers/theme-testing';

const MODES: readonly [ThemeMode, Theme][] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe('Button', () => {
  describe.each(MODES)('in %s mode', (mode, theme) => {
    it('applies the mode-specific brand tokens for the primary variant', async () => {
      await renderWithTheme(<Button label="Publicar" onPress={jest.fn()} />, mode);

      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: theme.colors.brand,
      });
      expect(screen.getByText('Publicar')).toHaveStyle({ color: theme.colors.onBrand });
    });

    it('renders the secondary variant with a brand border on transparent background', async () => {
      await renderWithTheme(
        <Button label="Cancelar" onPress={jest.fn()} variant="secondary" />,
        mode,
      );

      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: 'transparent',
        borderColor: theme.colors.brand,
      });
      expect(screen.getByText('Cancelar')).toHaveStyle({ color: theme.colors.brand });
    });

    it('renders the ghost variant without background or border', async () => {
      await renderWithTheme(<Button label="Omitir" onPress={jest.fn()} variant="ghost" />, mode);

      expect(screen.getByRole('button')).toHaveStyle({
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      });
    });
  });

  it('exposes the label and calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Publicar" onPress={onPress} />, 'light');

    await fireEvent.press(screen.getByRole('button', { name: 'Publicar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks onPress and exposes accessibilityState when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Publicar" onPress={onPress} disabled />, 'light');

    const button = screen.getByRole('button');
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  describe('when loading', () => {
    it('shows a spinner instead of the label', async () => {
      await renderWithTheme(<Button label="Publicar" onPress={jest.fn()} loading />, 'light');

      expect(screen.getByLabelText('Cargando')).toBeOnTheScreen();
      expect(screen.queryByText('Publicar')).not.toBeOnTheScreen();
    });

    it('blocks onPress and reports itself as busy', async () => {
      const onPress = jest.fn();
      await renderWithTheme(<Button label="Publicar" onPress={onPress} loading />, 'light');

      const button = screen.getByRole('button');
      await fireEvent.press(button);

      expect(onPress).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
      expect(button).toBeBusy();
    });
  });
});
