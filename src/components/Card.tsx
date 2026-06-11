import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

export interface CardProps extends PropsWithChildren {
  /** Layout overrides only (margins, width). Surface look stays themed. */
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const styles = useThemedStyles(createStyles);

  return <View style={[styles.base, style]}>{children}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
    },
  });
