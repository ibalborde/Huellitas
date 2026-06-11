import { StyleSheet, Text, View } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

/** `lost` | `found` | `sighted` mirror the post-type semantics used app-wide. */
export type BadgeVariant = 'lost' | 'found' | 'sighted' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

interface BadgeColors {
  background: string;
  text: string;
  border: string;
}

function badgeColors(theme: Theme, variant: BadgeVariant): BadgeColors {
  const { colors } = theme;

  switch (variant) {
    case 'lost':
      return { background: colors.lostSoft, text: colors.lostText, border: 'transparent' };
    case 'found':
      return { background: colors.foundSoft, text: colors.foundText, border: 'transparent' };
    case 'sighted':
      return {
        background: colors.sightedSoft,
        text: colors.sightedText,
        border: 'transparent',
      };
    case 'neutral':
      return { background: 'transparent', text: colors.textSecondary, border: colors.border };
  }
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = badgeColors(theme, variant);

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.base, { backgroundColor: colors.background, borderColor: colors.border }]}
    >
      <Text style={[theme.typography.badge, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
    },
  });
