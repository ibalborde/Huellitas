import { screen } from '@testing-library/react-native';

import { Badge } from '@/components';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '@/theme';

import { renderWithTheme } from '../helpers/theme-testing';

const MODES: readonly [ThemeMode, Theme][] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe('Badge', () => {
  describe.each(MODES)('in %s mode', (mode, theme) => {
    it('renders the lost variant with the mode-specific soft/text pair', async () => {
      await renderWithTheme(<Badge label="Perdido" variant="lost" />, mode);

      expect(screen.getByLabelText('Perdido')).toHaveStyle({
        backgroundColor: theme.colors.lostSoft,
      });
      expect(screen.getByText('Perdido')).toHaveStyle({ color: theme.colors.lostText });
    });

    it('renders the found variant with the mode-specific soft/text pair', async () => {
      await renderWithTheme(<Badge label="Encontrado" variant="found" />, mode);

      expect(screen.getByLabelText('Encontrado')).toHaveStyle({
        backgroundColor: theme.colors.foundSoft,
      });
      expect(screen.getByText('Encontrado')).toHaveStyle({ color: theme.colors.foundText });
    });

    it('renders the sighted variant with the mode-specific soft/text pair', async () => {
      await renderWithTheme(<Badge label="Avistado" variant="sighted" />, mode);

      expect(screen.getByLabelText('Avistado')).toHaveStyle({
        backgroundColor: theme.colors.sightedSoft,
      });
      expect(screen.getByText('Avistado')).toHaveStyle({ color: theme.colors.sightedText });
    });
  });

  it('defaults to the neutral variant: outlined, transparent background', async () => {
    await renderWithTheme(<Badge label="Rosario" />, 'light');

    expect(screen.getByLabelText('Rosario')).toHaveStyle({
      backgroundColor: 'transparent',
      borderColor: lightTheme.colors.border,
    });
    expect(screen.getByText('Rosario')).toHaveStyle({
      color: lightTheme.colors.textSecondary,
    });
  });

  it('exposes the label to assistive technology', async () => {
    await renderWithTheme(<Badge label="Perdido" variant="lost" />, 'light');

    expect(screen.getByLabelText('Perdido')).toBeOnTheScreen();
  });
});
