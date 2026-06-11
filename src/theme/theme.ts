import { darkColors, lightColors, type ThemeColors } from './colors';
import { radii, type Radii } from './radii';
import { spacing, type Spacing } from './spacing';
import { typography, type Typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
}

/** Minimum touch target size (a11y requirement: >= 44pt). */
export const MIN_TOUCH_TARGET = 44;

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radii,
  typography,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radii,
  typography,
};
