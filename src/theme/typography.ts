import type { TextStyle } from 'react-native';

/**
 * Type scale. Color is intentionally NOT part of these styles:
 * compose with a color token at the call site.
 */
export const typography = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  badge: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
