import { renderHook } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import {
  ThemeProvider,
  darkTheme,
  lightTheme,
  useTheme,
  useThemedStyles,
  type Theme,
} from '@/theme';

import { mockSystemColorScheme } from '../helpers/theme-testing';

describe('useTheme inside ThemeProvider', () => {
  it('returns the light theme when the system scheme is light', async () => {
    mockSystemColorScheme('light');

    const { result } = await renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current).toBe(lightTheme);
  });

  it('returns the dark theme when the system scheme is dark', async () => {
    mockSystemColorScheme('dark');

    const { result } = await renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current).toBe(darkTheme);
  });
});

describe('useTheme without a ThemeProvider (fallback)', () => {
  it('follows the system scheme when dark', async () => {
    mockSystemColorScheme('dark');

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toBe(darkTheme);
  });

  it('defaults to light when the system scheme is unknown', async () => {
    mockSystemColorScheme(null);

    const { result } = await renderHook(() => useTheme());

    expect(result.current).toBe(lightTheme);
  });
});

describe('useThemedStyles', () => {
  const createStyles = (theme: Theme) =>
    StyleSheet.create({
      box: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.lg,
      },
    });

  it('builds styles from the active theme in both modes', async () => {
    mockSystemColorScheme('light');
    const light = await renderHook(() => useThemedStyles(createStyles), {
      wrapper: ThemeProvider,
    });
    expect(light.result.current.box).toEqual(
      expect.objectContaining({ backgroundColor: lightTheme.colors.surface }),
    );

    mockSystemColorScheme('dark');
    const dark = await renderHook(() => useThemedStyles(createStyles), {
      wrapper: ThemeProvider,
    });
    expect(dark.result.current.box).toEqual(
      expect.objectContaining({ backgroundColor: darkTheme.colors.surface }),
    );
  });

  it('memoizes: a stable factory is invoked once across re-renders', async () => {
    mockSystemColorScheme('light');
    const factory = jest.fn(createStyles);

    const { result, rerender } = await renderHook(() => useThemedStyles(factory), {
      wrapper: ThemeProvider,
    });
    const firstStyles = result.current;
    await rerender(undefined);

    expect(result.current).toBe(firstStyles);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
