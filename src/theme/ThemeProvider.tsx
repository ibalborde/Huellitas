import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme, type StyleSheet } from 'react-native';

import { darkTheme, lightTheme, type Theme, type ThemeMode } from './theme';

const ThemeContext = createContext<Theme | null>(null);

function themeForMode(mode: ThemeMode): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

/** Follows the system color scheme. Mount once at the root (app/_layout.tsx). */
export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const theme = themeForMode(scheme === 'dark' ? 'dark' : 'light');

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Returns the active theme. Outside a ThemeProvider (e.g. a component
 * rendered standalone in a unit test) it falls back to the system scheme,
 * so presentation components stay renderable in isolation.
 */
export function useTheme(): Theme {
  const fromContext = useContext(ThemeContext);
  const systemScheme = useColorScheme();

  return fromContext ?? themeForMode(systemScheme === 'dark' ? 'dark' : 'light');
}

/**
 * Memoizes a StyleSheet built from the active theme.
 * Define the factory at module scope so its identity is stable.
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();

  return useMemo(() => factory(theme), [factory, theme]);
}
