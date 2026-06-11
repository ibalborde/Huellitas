import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

// Placeholder screen. Replaced by the map/feed in F1.
export default function HomeScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.brand }]}>
        Huellitas
      </Text>
      <Text style={styles.subtitle}>Estamos preparando todo. Volvé pronto.</Text>
      <View style={styles.badges}>
        <Badge label="Perdido" variant="lost" />
        <Badge label="Encontrado" variant="found" />
        <Badge label="Avistado" variant="sighted" />
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.xl,
    },
    title: {
      ...theme.typography.title,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    badges: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
  });
