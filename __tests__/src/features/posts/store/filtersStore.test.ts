import { RADIUS_DEFAULT_M } from '@/features/posts';
import { useFiltersStore } from '@/features/posts/store/filtersStore';

const initialState = useFiltersStore.getState();

beforeEach(() => {
  useFiltersStore.setState(initialState, true);
});

describe('filtersStore', () => {
  it('starts with no content filters, the default radius and all dates', () => {
    const state = useFiltersStore.getState();

    expect(state.viewMode).toBe('list');
    expect(state.type).toBeNull();
    expect(state.species).toBeNull();
    expect(state.radiusM).toBe(RADIUS_DEFAULT_M);
    expect(state.datePreset).toBe('todas');
  });

  it('toggles type: select, switch, and clear on the second tap', () => {
    useFiltersStore.getState().toggleType('perdido');
    expect(useFiltersStore.getState().type).toBe('perdido');

    useFiltersStore.getState().toggleType('encontrado');
    expect(useFiltersStore.getState().type).toBe('encontrado');

    useFiltersStore.getState().toggleType('encontrado');
    expect(useFiltersStore.getState().type).toBeNull();
  });

  it('toggles species independently from type', () => {
    useFiltersStore.getState().toggleType('perdido');
    useFiltersStore.getState().toggleSpecies('gato');
    expect(useFiltersStore.getState().species).toBe('gato');
    expect(useFiltersStore.getState().type).toBe('perdido');

    useFiltersStore.getState().toggleSpecies('gato');
    expect(useFiltersStore.getState().species).toBeNull();
  });

  it('sets view mode, radius and date preset', () => {
    useFiltersStore.getState().setViewMode('map');
    useFiltersStore.getState().setRadiusM(25_000);
    useFiltersStore.getState().setDatePreset('semana');

    const state = useFiltersStore.getState();
    expect(state.viewMode).toBe('map');
    expect(state.radiusM).toBe(25_000);
    expect(state.datePreset).toBe('semana');
  });
});
