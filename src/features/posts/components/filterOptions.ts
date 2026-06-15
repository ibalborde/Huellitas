/**
 * Filter-bar option lists: domain values paired with their es-AR labels.
 * Presentation-only module (labels are UI copy, not domain rules).
 */
import { RADIUS_PRESETS_M } from '../domain/constants';
import type { EventDatePreset } from '../domain/eventDatePresets';
import type { PostType, Species } from '../domain/post';
import type { FilterChipVariant } from './FilterChip';

export interface TypeOption {
  value: PostType;
  label: string;
  variant: FilterChipVariant;
}

export const TYPE_OPTIONS: readonly TypeOption[] = [
  { value: 'perdido', label: 'Perdidos', variant: 'lost' },
  { value: 'encontrado', label: 'Encontrados', variant: 'found' },
  { value: 'avistado', label: 'Avistados', variant: 'sighted' },
];

export interface SpeciesOption {
  value: Species;
  label: string;
}

export const SPECIES_OPTIONS: readonly SpeciesOption[] = [
  { value: 'perro', label: 'Perros' },
  { value: 'gato', label: 'Gatos' },
  { value: 'otro', label: 'Otros' },
];

export interface RadiusOption {
  value: number;
  label: string;
  accessibilityLabel: string;
}

const METERS_PER_KM = 1000;

export const RADIUS_OPTIONS: readonly RadiusOption[] = RADIUS_PRESETS_M.map((radiusM) => ({
  value: radiusM,
  label: `${radiusM / METERS_PER_KM} km`,
  accessibilityLabel: `Radio de ${radiusM / METERS_PER_KM} kilómetros`,
}));

export interface DateOption {
  value: EventDatePreset;
  label: string;
  accessibilityLabel?: string;
}

export const DATE_OPTIONS: readonly DateOption[] = [
  { value: 'todas', label: 'Todas', accessibilityLabel: 'Todas las fechas' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'semana', label: 'Última semana' },
  { value: 'mes', label: 'Último mes' },
];
