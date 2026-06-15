import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { citiesKeys, useActiveCity } from '@/features/cities';
import { getUserMessage } from '@/lib/errors';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { RADIUS_PRESETS_M } from '../domain/constants';
import { usePostFilters } from '../hooks/usePostFilters';
import { usePostsNearby } from '../hooks/usePostsNearby';
import { useFiltersStore } from '../store/filtersStore';
import { PostsList } from './PostsList';

/** Nearby feed: wires city + filters + infinite query into the list. */
export function PostsFeed() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { activeCity, isLoading: isCityLoading, error: cityError } = useActiveCity();
  const filters = usePostFilters();
  const setRadiusM = useFiltersStore((state) => state.setRadiusM);

  // S1.4 adds the user's GPS fix as the preferred search center; until then
  // we search from the active city's center. null while the city resolves —
  // the hook is disabled until both city and center are non-null.
  const center = activeCity?.center ?? null;
  const query = usePostsNearby({ center, filters });

  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);

  const nextRadiusM = RADIUS_PRESETS_M.find((r) => r > (filters.radiusM ?? 0));

  const handleRetry = useCallback(() => {
    if (cityError !== null) {
      void queryClient.invalidateQueries({ queryKey: citiesKeys.all });
    } else {
      void query.refetch();
    }
  }, [cityError, queryClient, query.refetch]);

  const handleRefresh = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  const handleEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const handleExpandRadius = useCallback(() => {
    if (nextRadiusM !== undefined) {
      setRadiusM(nextRadiusM);
    }
  }, [nextRadiusM, setRadiusM]);

  const error = cityError ?? query.error;
  if (error !== null) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon={<Text style={styles.icon}>🐾</Text>}
          title="No pudimos cargar las publicaciones"
          description={getUserMessage(error)}
          actionLabel="Reintentar"
          onAction={handleRetry}
        />
      </View>
    );
  }

  if (!isCityLoading && activeCity === null) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon={<Text style={styles.icon}>🐾</Text>}
          title="No hay ciudades disponibles"
          description="No pudimos encontrar una ciudad activa. Probá de nuevo en un rato."
          actionLabel="Reintentar"
          onAction={() => void queryClient.invalidateQueries({ queryKey: citiesKeys.all })}
        />
      </View>
    );
  }

  // isPending also covers the disabled-while-city-resolves window.
  if (query.isPending) {
    return (
      <View style={styles.centered} accessibilityLabel="Cargando publicaciones">
        <ActivityIndicator size="large" color={theme.colors.brand} />
        <Text style={styles.loadingText}>Buscando publicaciones cerca…</Text>
      </View>
    );
  }

  return (
    <PostsList
      posts={posts}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={handleRefresh}
      onEndReached={handleEndReached}
      isFetchingNextPage={query.isFetchingNextPage}
      onExpandRadius={nextRadiusM === undefined ? undefined : handleExpandRadius}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    icon: {
      fontSize: 44,
    },
  });
