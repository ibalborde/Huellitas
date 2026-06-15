import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, useThemedStyles, type Theme } from '@/theme';

import { useFiltersStore, type ViewMode } from '../store/filtersStore';

interface Segment {
  value: ViewMode;
  label: string;
}

const SEGMENTS: readonly Segment[] = [
  { value: 'map', label: 'Mapa' },
  { value: 'list', label: 'Lista' },
];

/** Segmented map/list switch for the home screen. State lives in the store. */
export function ViewModeToggle() {
  const styles = useThemedStyles(createStyles);
  const viewMode = useFiltersStore((state) => state.viewMode);
  const setViewMode = useFiltersStore((state) => state.setViewMode);

  return (
    <View accessibilityRole="tablist" style={styles.track}>
      {SEGMENTS.map(({ value, label }) => {
        const selected = viewMode === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => setViewMode(value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radii.md,
      padding: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    segment: {
      flex: 1,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.sm,
    },
    segmentSelected: {
      backgroundColor: theme.colors.brand,
    },
    label: {
      ...theme.typography.button,
      color: theme.colors.textSecondary,
    },
    labelSelected: {
      color: theme.colors.onBrand,
    },
  });
