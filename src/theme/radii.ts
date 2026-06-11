/** Corner radius scale. `pill` produces fully rounded ends (badges, chips). */
export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export type Radii = typeof radii;
