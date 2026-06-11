/**
 * Semantic color palettes for Huellitas (light + dark).
 *
 * This is the ONLY place in the app where hex values are allowed
 * (besides native config in app.json). Components consume semantic
 * tokens via useTheme().
 *
 * Brand hue: coral #D85A30. The interactive `brand` token is tuned per
 * mode so that `onBrand` text meets WCAG AA (>= 4.5:1):
 *   - light: #C04A24 on #FFFFFF -> 4.95:1
 *   - dark:  #E8794F with #2B1209 text -> 6.10:1
 *
 * Post-type status tokens (used by map pins, badges and filters):
 *   - lost    = red/coral
 *   - found   = teal
 *   - sighted = amber
 * Each status ships a strong color (pins/icons, >= 3:1 vs background)
 * and a Soft/Text pair for badges (>= 4.5:1, all pairs measure > 6:1).
 *
 * Text contrast vs background:
 *   light: textPrimary 15.25:1, textSecondary 6.07:1, danger 6.26:1
 *   dark:  textPrimary 15.69:1, textSecondary 7.96:1, danger 6.55:1
 */
export interface ThemeColors {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  brand: string;
  onBrand: string;
  brandSoft: string;
  lost: string;
  lostSoft: string;
  lostText: string;
  found: string;
  foundSoft: string;
  foundText: string;
  sighted: string;
  sightedSoft: string;
  sightedText: string;
  success: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: '#FFF9F5',
  surface: '#FFFFFF',
  textPrimary: '#2D1F16',
  textSecondary: '#6B5D52',
  border: '#E8DCD3',
  brand: '#C04A24',
  onBrand: '#FFFFFF',
  brandSoft: '#FBE5DB',
  lost: '#C02D36',
  lostSoft: '#FBE3E1',
  lostText: '#8E1F26',
  found: '#0F7A6E',
  foundSoft: '#D8F0EC',
  foundText: '#075E54',
  sighted: '#B45309',
  sightedSoft: '#FCEFD7',
  sightedText: '#7C4A03',
  success: '#1B7A36',
  danger: '#B3261E',
};

export const darkColors: ThemeColors = {
  background: '#1C1411',
  surface: '#2A201B',
  textPrimary: '#F5EDE8',
  textSecondary: '#BCA89C',
  border: '#443830',
  brand: '#E8794F',
  onBrand: '#2B1209',
  brandSoft: '#3A241B',
  lost: '#F08C84',
  lostSoft: '#3D1F1D',
  lostText: '#F4A9A3',
  found: '#4FB8A8',
  foundSoft: '#15332E',
  foundText: '#7FD4C4',
  sighted: '#E0A33E',
  sightedSoft: '#3A2A12',
  sightedText: '#E5B566',
  success: '#6BCB85',
  danger: '#F2766B',
};
