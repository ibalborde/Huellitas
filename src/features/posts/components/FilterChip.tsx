import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

/** `lost`/`found`/`sighted` tint the selected chip with the post-type status. */
export type FilterChipVariant = 'brand' | 'lost' | 'found' | 'sighted';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: FilterChipVariant;
  /** Override when the visual label alone is ambiguous (e.g. "Todas"). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

interface ChipColors {
  background: string;
  text: string;
  border: string;
}

function chipColors(theme: Theme, variant: FilterChipVariant, selected: boolean): ChipColors {
  const { colors } = theme;

  if (!selected) {
    return { background: 'transparent', text: colors.textSecondary, border: colors.border };
  }

  switch (variant) {
    case 'brand':
      return { background: colors.brand, text: colors.onBrand, border: colors.brand };
    case 'lost':
      return { background: colors.lostSoft, text: colors.lostText, border: colors.lost };
    case 'found':
      return { background: colors.foundSoft, text: colors.foundText, border: colors.found };
    case 'sighted':
      return { background: colors.sightedSoft, text: colors.sightedText, border: colors.sighted };
  }
}

/**
 * Visual height is 40pt; vertical hitSlop tops it up to the 44pt minimum
 * touch target. Rows around chips must keep a gap >= 8 so slops don't overlap.
 */
const CHIP_MIN_HEIGHT = 40;
const CHIP_VERTICAL_HIT_SLOP = { top: 2, bottom: 2 };

export function FilterChip({
  label,
  selected,
  onPress,
  variant = 'brand',
  accessibilityLabel,
  accessibilityHint,
}: FilterChipProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = chipColors(theme, variant, selected);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      hitSlop={CHIP_VERTICAL_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors.background, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[theme.typography.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: CHIP_MIN_HEIGHT,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.pill,
      borderWidth: 1.5,
    },
    pressed: {
      opacity: 0.7,
    },
  });
