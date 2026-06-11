import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

import { Button } from './Button';

export interface EmptyStateProps {
  /** Decorative visual (emoji Text, illustration). Hidden from screen readers. */
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const styles = useThemedStyles(createStyles);
  const hasAction = actionLabel !== undefined && onAction !== undefined;

  return (
    <View style={styles.container}>
      {icon !== undefined && (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {icon}
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {description !== undefined && <Text style={styles.description}>{description}</Text>}
      {hasAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    action: {
      marginTop: theme.spacing.md,
    },
  });
