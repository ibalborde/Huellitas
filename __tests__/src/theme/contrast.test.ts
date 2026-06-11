/**
 * WCAG 2.x contrast checks for both palettes, computed with pure math
 * (no rendering). Thresholds:
 *   - 4.5:1 for text-bearing pairs (AA, normal text)
 *   - 3:1 for tokens documented as graphics-only in src/theme/colors.ts
 *     (status strong colors used for map pins / icons)
 */
import { darkColors, lightColors, type ThemeColors } from '@/theme/colors';

const AA_TEXT_MIN = 4.5;
const AA_GRAPHICS_MIN = 3;

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function relativeLuminance(hex: string): number {
  if (!HEX_COLOR_PATTERN.test(hex)) {
    throw new Error(`Expected a 6-digit hex color, got "${hex}"`);
  }

  const [r, g, b] = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

/** [foreground, background] token pairs that carry text. */
const TEXT_PAIRS: readonly [keyof ThemeColors, keyof ThemeColors][] = [
  ['textPrimary', 'background'],
  ['textSecondary', 'background'],
  ['danger', 'background'],
  ['onBrand', 'brand'],
  ['lostText', 'lostSoft'],
  ['foundText', 'foundSoft'],
  ['sightedText', 'sightedSoft'],
];

/** Status strong colors: documented as pins/icons only (>= 3:1 vs background). */
const GRAPHICS_PAIRS: readonly [keyof ThemeColors, keyof ThemeColors][] = [
  ['lost', 'background'],
  ['found', 'background'],
  ['sighted', 'background'],
];

const PALETTES: readonly [string, ThemeColors][] = [
  ['light', lightColors],
  ['dark', darkColors],
];

describe.each(PALETTES)('%s palette', (_paletteName, palette) => {
  it('only contains 6-digit hex values (contrast math precondition)', () => {
    for (const [token, value] of Object.entries(palette)) {
      expect({ token, value }).toEqual({ token, value: expect.stringMatching(HEX_COLOR_PATTERN) });
    }
  });

  it.each(TEXT_PAIRS)(`%s on %s meets AA for text (>= ${AA_TEXT_MIN}:1)`, (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(AA_TEXT_MIN);
  });

  it.each(GRAPHICS_PAIRS)(
    `%s on %s meets AA for graphics (>= ${AA_GRAPHICS_MIN}:1)`,
    (fg, bg) => {
      expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(AA_GRAPHICS_MIN);
    },
  );
});

describe('contrastRatio (self-check of the test math)', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('returns 1:1 for identical colors', () => {
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('rejects non-hex inputs instead of computing garbage', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow('hex color');
  });
});
