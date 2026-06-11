import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from '@/components';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '@/theme';

import { renderWithTheme } from '../helpers/theme-testing';

const MODES: readonly [ThemeMode, Theme][] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe('Card', () => {
  it('renders its children', async () => {
    await renderWithTheme(
      <Card>
        <Text>Contenido</Text>
      </Card>,
      'light',
    );

    expect(screen.getByText('Contenido')).toBeOnTheScreen();
  });

  describe.each(MODES)('in %s mode', (mode, theme) => {
    it('uses the mode-specific surface and border tokens', async () => {
      await renderWithTheme(
        <Card>
          <Text>Contenido</Text>
        </Card>,
        mode,
      );

      expect(screen.getByText('Contenido').parent).toHaveStyle({
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      });
    });
  });

  it('merges layout overrides without losing the themed surface', async () => {
    await renderWithTheme(
      <Card style={{ marginTop: 24 }}>
        <Text>Contenido</Text>
      </Card>,
      'light',
    );

    expect(screen.getByText('Contenido').parent).toHaveStyle({
      marginTop: 24,
      backgroundColor: lightTheme.colors.surface,
    });
  });
});
