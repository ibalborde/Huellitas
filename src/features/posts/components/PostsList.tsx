import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  type ListRenderItemInfo,
} from 'react-native';

import { EmptyState } from '@/components';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import type { Post } from '../domain/post';
import { PostCard } from './PostCard';

export interface PostsListProps {
  posts: Post[];
  refreshing: boolean;
  onRefresh: () => void;
  /** Called near the end of the list; the caller guards hasNextPage. */
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  /** When provided, the empty state offers to widen the search radius. */
  onExpandRadius?: () => void;
}

// Module scope: stable identities so FlatList never re-mounts rows needlessly.
const keyExtractor = (post: Post) => post.id;

function renderPost({ item }: ListRenderItemInfo<Post>) {
  return <PostCard post={item} />;
}

const END_REACHED_THRESHOLD = 0.5;
// Cards are ~120pt tall: ~8 fill a phone screen, 7 windows bound memory.
const INITIAL_NUM_TO_RENDER = 8;
const MAX_TO_RENDER_PER_BATCH = 10;
const WINDOW_SIZE = 7;

export function PostsList({
  posts,
  refreshing,
  onRefresh,
  onEndReached,
  isFetchingNextPage,
  onExpandRadius,
}: PostsListProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isEmpty = posts.length === 0;

  return (
    <FlatList
      data={posts}
      keyExtractor={keyExtractor}
      renderItem={renderPost}
      style={styles.list}
      contentContainerStyle={isEmpty ? styles.emptyContent : styles.content}
      onEndReached={onEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      initialNumToRender={INITIAL_NUM_TO_RENDER}
      maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
      windowSize={WINDOW_SIZE}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand}
          colors={[theme.colors.brand]}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Text style={styles.emptyIcon}>🐾</Text>}
          title="No hay publicaciones cerca"
          description="No encontramos nada con estos filtros. Probá ampliar el radio de búsqueda."
          actionLabel={onExpandRadius === undefined ? undefined : 'Ampliar la búsqueda'}
          onAction={onExpandRadius}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator
            style={styles.footer}
            color={theme.colors.brand}
            accessibilityLabel="Cargando más publicaciones"
          />
        ) : null
      }
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    emptyContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    emptyIcon: {
      fontSize: 44,
    },
    footer: {
      paddingVertical: theme.spacing.lg,
    },
  });
