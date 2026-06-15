import { create } from 'zustand';

import { RADIUS_DEFAULT_M } from '../domain/constants';
import type { EventDatePreset } from '../domain/eventDatePresets';
import type { PostType, Species } from '../domain/post';

export type ViewMode = 'map' | 'list';

/**
 * Local UI state for the home feed: view mode + the filter-bar selections.
 * Domain types only — consumers map this to `PostFilters` via
 * `usePostFilters`. Consume with per-field selectors so a `viewMode` flip
 * does not re-render filter consumers (and vice versa).
 */
export interface FiltersState {
  viewMode: ViewMode;
  /** null = all types. */
  type: PostType | null;
  /** null = all species. */
  species: Species | null;
  radiusM: number;
  /**
   * Stored as the chosen PRESET, not a resolved date: "hoy" must mean the
   * current day whenever the query runs, not the day the chip was tapped.
   */
  datePreset: EventDatePreset;
  setViewMode: (viewMode: ViewMode) => void;
  /** Tapping the already-selected chip clears the filter (back to all). */
  toggleType: (type: PostType) => void;
  toggleSpecies: (species: Species) => void;
  setRadiusM: (radiusM: number) => void;
  setDatePreset: (datePreset: EventDatePreset) => void;
}

// No persist middleware by design: filter state is session-only.
// GPS coordinates must never enter this store.
export const useFiltersStore = create<FiltersState>((set) => ({
  // 'list' until the real map lands (S1.4): the map pane is a placeholder.
  viewMode: 'list',
  type: null,
  species: null,
  radiusM: RADIUS_DEFAULT_M,
  datePreset: 'todas',
  setViewMode: (viewMode) => set({ viewMode }),
  toggleType: (type) => set((state) => ({ type: state.type === type ? null : type })),
  toggleSpecies: (species) =>
    set((state) => ({ species: state.species === species ? null : species })),
  setRadiusM: (radiusM) => set({ radiusM }),
  setDatePreset: (datePreset) => set({ datePreset }),
}));
