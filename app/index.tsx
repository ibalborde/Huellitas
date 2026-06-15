import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActiveCity } from '@/features/cities';
import {
  PostFiltersBar,
  PostsFeed,
  PostsMap,
  ViewModeToggle,
  useFiltersStore,
} from '@/features/posts';
import { useThemedStyles, type Theme } from '@/theme';

/**
 * Home: header + map/list toggle + filter bar over the nearby feed.
 * Public by design — browsing never requires an account.
 */
export default function HomeScreen() {
  const styles = useThemedStyles(createStyles);
  const { activeCity } = useActiveCity();
  const viewMode = useFiltersStore((state) => state.viewMode);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Huellitas
        </Text>
        <Text
          style={styles.city}
          accessibilityLabel={
            activeCity === null ? 'Buscando tu ciudad' : `Ciudad: ${activeCity.name}`
          }
        >
          {activeCity === null ? 'Buscando tu ciudad…' : `📍 ${activeCity.name}`}
        </Text>
      </View>
      <View style={styles.toggle}>
        <ViewModeToggle />
      </View>
      <PostFiltersBar />
      {viewMode === 'map' ? <PostsMap /> : <PostsFeed />}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    title: {
      ...theme.typography.title,
      color: theme.colors.brand,
    },
    city: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    toggle: {
      paddingHorizontal: theme.spacing.lg,
    },
  });
