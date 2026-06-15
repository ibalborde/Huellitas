import { StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { useThemedStyles, type Theme } from '@/theme';

/**
 * Placeholder map pane. S1.4 replaces the body with react-native-maps fed by
 * a viewport-bounded snapshot query (NOT usePostsNearby — see
 * docs/ARCHITECTURE.md, design note for the map screen).
 */
export function PostsMap() {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <EmptyState
        icon={<Text style={styles.icon}>🗺️</Text>}
        title="El mapa llega pronto"
        description="Mientras tanto, podés ver todas las publicaciones desde la lista."
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    icon: {
      fontSize: 44,
    },
  });
