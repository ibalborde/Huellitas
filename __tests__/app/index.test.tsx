import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../../app/index';

describe('HomeScreen (app/index)', () => {
  it('renders without crashing', async () => {
    await render(<HomeScreen />);
  });

  it('shows the Huellitas title as a header', async () => {
    await render(<HomeScreen />);

    const title = screen.getByRole('header');
    expect(title).toHaveTextContent('Huellitas');
  });

  it('shows the placeholder subtitle in es-AR', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Estamos preparando todo. Volvé pronto.')).toBeOnTheScreen();
  });
});
