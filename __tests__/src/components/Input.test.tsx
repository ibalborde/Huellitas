import { fireEvent, screen } from '@testing-library/react-native';

import { Input } from '@/components';
import { darkTheme, lightTheme, type Theme, type ThemeMode } from '@/theme';

import { renderWithTheme } from '../helpers/theme-testing';

const MODES: readonly [ThemeMode, Theme][] = [
  ['light', lightTheme],
  ['dark', darkTheme],
];

describe('Input', () => {
  it('associates the visible label with the field via nativeID', async () => {
    await renderWithTheme(<Input label="Nombre de la mascota" />, 'light');

    const label = screen.getByText('Nombre de la mascota');
    const field = screen.getByLabelText('Nombre de la mascota');

    expect(label.props.nativeID).toEqual(expect.any(String));
    expect(field.props.accessibilityLabelledBy).toBe(label.props.nativeID);
  });

  it('gives two instances distinct label ids', async () => {
    await renderWithTheme(
      <>
        <Input label="Nombre" />
        <Input label="Barrio" />
      </>,
      'light',
    );

    const firstId: unknown = screen.getByText('Nombre').props.nativeID;
    const secondId: unknown = screen.getByText('Barrio').props.nativeID;

    expect(firstId).not.toBe(secondId);
  });

  it('shows helperText when there is no error', async () => {
    await renderWithTheme(<Input label="Nombre" helperText="Como figura en la chapita" />, 'light');

    expect(screen.getByText('Como figura en la chapita')).toBeOnTheScreen();
  });

  describe('error state', () => {
    it('shows errorText and hides helperText', async () => {
      await renderWithTheme(
        <Input
          label="Nombre"
          helperText="Como figura en la chapita"
          errorText="El nombre es obligatorio"
        />,
        'light',
      );

      expect(screen.getByText('El nombre es obligatorio')).toBeOnTheScreen();
      expect(screen.queryByText('Como figura en la chapita')).not.toBeOnTheScreen();
    });

    describe.each(MODES)('in %s mode', (mode, theme) => {
      it('paints the border and message with the mode-specific danger token', async () => {
        await renderWithTheme(<Input label="Nombre" errorText="Obligatorio" />, mode);

        expect(screen.getByLabelText('Nombre')).toHaveStyle({
          borderColor: theme.colors.danger,
        });
        expect(screen.getByText('Obligatorio')).toHaveStyle({ color: theme.colors.danger });
      });
    });
  });

  it('highlights the border with the brand token while focused', async () => {
    await renderWithTheme(<Input label="Nombre" />, 'light');
    const field = screen.getByLabelText('Nombre');

    expect(field).toHaveStyle({ borderColor: lightTheme.colors.border });

    await fireEvent(field, 'focus');
    expect(field).toHaveStyle({ borderColor: lightTheme.colors.brand });

    await fireEvent(field, 'blur');
    expect(field).toHaveStyle({ borderColor: lightTheme.colors.border });
  });

  it('keeps the danger border even while focused', async () => {
    await renderWithTheme(<Input label="Nombre" errorText="Obligatorio" />, 'light');
    const field = screen.getByLabelText('Nombre');

    await fireEvent(field, 'focus');

    expect(field).toHaveStyle({ borderColor: lightTheme.colors.danger });
  });

  it('forwards focus and blur events to the caller', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await renderWithTheme(<Input label="Nombre" onFocus={onFocus} onBlur={onBlur} />, 'light');
    const field = screen.getByLabelText('Nombre');

    await fireEvent(field, 'focus');
    await fireEvent(field, 'blur');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
