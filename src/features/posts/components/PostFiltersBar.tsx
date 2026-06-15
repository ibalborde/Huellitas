import { ScrollView, StyleSheet, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

import { useFiltersStore } from '../store/filtersStore';
import { DATE_OPTIONS, RADIUS_OPTIONS, SPECIES_OPTIONS, TYPE_OPTIONS } from './filterOptions';
import { FilterChip } from './FilterChip';

/**
 * Two horizontally scrollable rows of chips over the filters store:
 * what (type + species) and where/when (radius + event date).
 */
export function PostFiltersBar() {
  const styles = useThemedStyles(createStyles);
  const type = useFiltersStore((state) => state.type);
  const species = useFiltersStore((state) => state.species);
  const radiusM = useFiltersStore((state) => state.radiusM);
  const datePreset = useFiltersStore((state) => state.datePreset);
  const toggleType = useFiltersStore((state) => state.toggleType);
  const toggleSpecies = useFiltersStore((state) => state.toggleSpecies);
  const setRadiusM = useFiltersStore((state) => state.setRadiusM);
  const setDatePreset = useFiltersStore((state) => state.setDatePreset);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {TYPE_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            variant={option.variant}
            selected={type === option.value}
            onPress={() => toggleType(option.value)}
            accessibilityHint="Filtra las publicaciones por tipo"
          />
        ))}
        <View style={styles.separator} />
        {SPECIES_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={species === option.value}
            onPress={() => toggleSpecies(option.value)}
            accessibilityHint="Filtra las publicaciones por especie"
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {RADIUS_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            selected={radiusM === option.value}
            onPress={() => setRadiusM(option.value)}
            accessibilityHint="Cambia el radio de búsqueda"
          />
        ))}
        <View style={styles.separator} />
        {DATE_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            accessibilityLabel={option.accessibilityLabel}
            selected={datePreset === option.value}
            onPress={() => setDatePreset(option.value)}
            accessibilityHint="Filtra por fecha del evento"
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    row: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    separator: {
      width: 1,
      alignSelf: 'stretch',
      marginVertical: theme.spacing.xs,
      backgroundColor: theme.colors.border,
    },
  });
