import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, useThemedStyles, type Theme } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

interface VariantColors {
  background: string;
  pressedBackground: string;
  content: string;
  border: string;
}

function variantColors(theme: Theme, variant: ButtonVariant): VariantColors {
  const { colors } = theme;

  if (variant === 'primary') {
    return {
      background: colors.brand,
      pressedBackground: colors.brand,
      content: colors.onBrand,
      border: 'transparent',
    };
  }

  return {
    background: 'transparent',
    pressedBackground: colors.brandSoft,
    content: colors.brand,
    border: variant === 'secondary' ? colors.brand : 'transparent',
  };
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = variantColors(theme, variant);
  const isInactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.pressedBackground : colors.background,
          borderColor: colors.border,
        },
        isInactive && styles.inactive,
        pressed && variant === 'primary' && styles.pressedPrimary,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.content} accessibilityLabel="Cargando" />
      ) : (
        <Text style={[theme.typography.button, { color: colors.content }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1.5,
    },
    inactive: {
      opacity: 0.5,
    },
    pressedPrimary: {
      opacity: 0.85,
    },
  });
