/**
 * Test helpers for the theme system (NOT a test file: excluded by testMatch).
 *
 * Under Jest, @react-native/jest-preset replaces the whole
 * `react-native/Libraries/Utilities/useColorScheme` module with a
 * `jest.fn(() => 'light')` (see jest/mocks/useColorScheme.js), so the real
 * Appearance module is bypassed entirely — spying on
 * `Appearance.getColorScheme` has no effect. The only reliable seam is the
 * return value of that preset mock, which is what `mockSystemColorScheme`
 * sets.
 *
 * The mocked scheme persists for the rest of the test file (module
 * registries reset between files), so set it explicitly in every test that
 * depends on the mode — `renderWithTheme` always does.
 */
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import type { ColorSchemeName } from 'react-native';

import { ThemeProvider, type ThemeMode } from '../../../src/theme';

/**
 * What `useColorScheme()` can return at runtime. RN's TS type for
 * `ColorSchemeName` omits null/undefined, but the hook contract
 * (and `Appearance.getColorScheme()`) includes them.
 */
type SystemColorScheme = ColorSchemeName | null | undefined;

interface UseColorSchemeMockModule {
  default: jest.Mock<SystemColorScheme, []>;
}

const useColorSchemeMock = (
  jest.requireMock('react-native/Libraries/Utilities/useColorScheme') as UseColorSchemeMockModule
).default;

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark'] as const;

export function mockSystemColorScheme(scheme: SystemColorScheme): void {
  useColorSchemeMock.mockReturnValue(scheme);
}

type RenderResult = Awaited<ReturnType<typeof render>>;

/** Renders `ui` inside a ThemeProvider with the system scheme forced to `mode`. */
export async function renderWithTheme(ui: ReactElement, mode: ThemeMode): Promise<RenderResult> {
  mockSystemColorScheme(mode);
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
