import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge, Card, type BadgeVariant } from '@/components';
import { formatDistance, formatRelativeDate } from '@/lib/format';
import { useThemedStyles, type Theme } from '@/theme';

import type { Post, PostType, Species } from '../domain/post';

const TYPE_BADGES: Record<PostType, { label: string; variant: BadgeVariant }> = {
  perdido: { label: 'Perdido', variant: 'lost' },
  encontrado: { label: 'Encontrado', variant: 'found' },
  avistado: { label: 'Avistado', variant: 'sighted' },
};

const SPECIES_LABELS: Record<Species, string> = {
  gato: 'Gato',
  perro: 'Perro',
  otro: 'Otra especie',
};

export interface PostCardProps {
  post: Post;
  /**
   * Neighborhood display name. The nearby feed does not resolve
   * `post.neighborhoodId` to a name yet (the neighborhoods lookup lands in a
   * later sprint); pass it when available.
   */
  neighborhoodName?: string;
  /** Reference clock for relative dates; injectable for tests. */
  now?: Date;
}

/** Feed row: type badge + distance, title and a species/date/place meta line. */
export const PostCard = memo(function PostCard({
  post,
  neighborhoodName,
  now = new Date(),
}: PostCardProps) {
  const styles = useThemedStyles(createStyles);
  const badge = TYPE_BADGES[post.type];
  const metaParts = [SPECIES_LABELS[post.species], formatRelativeDate(post.eventDate, now)];
  if (neighborhoodName !== undefined) {
    metaParts.push(neighborhoodName);
  }

  return (
    <Card>
      <View style={styles.topRow}>
        <Badge label={badge.label} variant={badge.variant} />
        <Text style={styles.distance}>{formatDistance(post.distanceM)}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
    </Card>
  );
});

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    distance: {
      ...theme.typography.label,
      color: theme.colors.textSecondary,
    },
    title: {
      ...theme.typography.heading,
      color: theme.colors.textPrimary,
    },
    meta: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
  });
