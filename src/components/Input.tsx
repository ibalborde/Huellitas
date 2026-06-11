import { useId, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH_TARGET, useTheme, useThemedStyles, type Theme } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Secondary guidance below the field. Hidden while there is an error. */
  helperText?: string;
  /** When present, the field renders in error state. */
  errorText?: string;
}

export function Input({ label, helperText, errorText, onFocus, onBlur, ...inputProps }: InputProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [focused, setFocused] = useState(false);
  // Unique per instance: two inputs sharing a label must not collide in
  // accessibilityLabelledBy.
  const labelId = useId();

  const hasError = errorText !== undefined && errorText.length > 0;
  const borderColor = hasError
    ? theme.colors.danger
    : focused
      ? theme.colors.brand
      : theme.colors.border;
  const supportText = hasError ? errorText : helperText;

  return (
    <View>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.field, { borderColor }]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {supportText !== undefined && (
        <Text
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}
          style={[styles.support, hasError && styles.supportError]}
        >
          {supportText}
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    label: {
      ...theme.typography.label,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    field: {
      ...theme.typography.body,
      minHeight: MIN_TOUCH_TARGET,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    support: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    supportError: {
      color: theme.colors.danger,
    },
  });
