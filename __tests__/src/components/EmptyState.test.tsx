import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { EmptyState } from '@/components';

import { THEME_MODES, renderWithTheme } from '../helpers/theme-testing';

describe('EmptyState', () => {
  describe.each(THEME_MODES)('in %s mode', (mode) => {
    it('renders the title as a header along with the description', async () => {
      await renderWithTheme(
        <EmptyState title="Sin resultados" description="Probá ampliar el radio de búsqueda." />,
        mode,
      );

      expect(screen.getByRole('header')).toHaveTextContent('Sin resultados');
      expect(screen.getByText('Probá ampliar el radio de búsqueda.')).toBeOnTheScreen();
    });
  });

  it('fires the action callback when the button is pressed', async () => {
    const onAction = jest.fn();
    await renderWithTheme(
      <EmptyState title="Sin resultados" actionLabel="Reintentar" onAction={onAction} />,
      'light',
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no button when actionLabel is missing', async () => {
    await renderWithTheme(<EmptyState title="Sin resultados" onAction={jest.fn()} />, 'light');

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('renders no button when onAction is missing', async () => {
    await renderWithTheme(<EmptyState title="Sin resultados" actionLabel="Reintentar" />, 'light');

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('hides the decorative icon from assistive technology', async () => {
    await renderWithTheme(<EmptyState icon={<Text>🐾</Text>} title="Sin resultados" />, 'light');

    // Hidden for screen readers...
    expect(screen.queryByText('🐾')).not.toBeOnTheScreen();
    // ...but still rendered visually.
    expect(screen.getByText('🐾', { includeHiddenElements: true })).toBeTruthy();
  });
});
