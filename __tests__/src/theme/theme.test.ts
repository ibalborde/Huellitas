import { darkColors, lightColors } from '@/theme/colors';
import {
  MIN_TOUCH_TARGET,
  darkTheme,
  lightTheme,
  radii,
  spacing,
  typography,
} from '@/theme';

describe('theme objects', () => {
  it('lightTheme exposes mode "light" with the light palette', () => {
    expect(lightTheme.mode).toBe('light');
    expect(lightTheme.colors).toBe(lightColors);
  });

  it('darkTheme exposes mode "dark" with the dark palette', () => {
    expect(darkTheme.mode).toBe('dark');
    expect(darkTheme.colors).toBe(darkColors);
  });

  it('both modes share the same spacing, radii and typography scales', () => {
    expect(darkTheme.spacing).toBe(lightTheme.spacing);
    expect(darkTheme.radii).toBe(lightTheme.radii);
    expect(darkTheme.typography).toBe(lightTheme.typography);
    expect(lightTheme.spacing).toBe(spacing);
    expect(lightTheme.radii).toBe(radii);
    expect(lightTheme.typography).toBe(typography);
  });

  it('both palettes define exactly the same semantic tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('MIN_TOUCH_TARGET satisfies the 44pt accessibility floor', () => {
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });
});
