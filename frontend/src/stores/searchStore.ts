import { create } from 'zustand';
import { SearchFilters, FilterOption } from '@/types/card';

interface SearchState {
  // Search state
  filters: SearchFilters;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setQuery: (query: string) => void;
  setGame: (game: string) => void;
  setSeries: (series: string) => void;
  setColor: (color: string) => void;
  setCardType: (cardType: string) => void;
  setSort: (sort: string) => void;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  
  // Filter management
  addAndFilter: (filter: FilterOption) => void;
  addOrFilter: (filter: FilterOption) => void;
  addNotFilter: (filter: FilterOption) => void;
  removeAndFilter: (index: number) => void;
  removeOrFilter: (index: number) => void;
  removeNotFilter: (index: number) => void;
  clearAllFilters: () => void;
  
  // URL synchronization
  initializeFromUrl: (urlFilters: Partial<SearchFilters>) => void;
  
  syncToUrl: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Reset
  resetFilters: () => void;
}

const initialFilters: SearchFilters = {
  query: '',
  game: 'Union Arena',
  series: '',
  color: '',
  cardType: '',
  sort: 'required_energy_asc',
  page: 1,
  per_page: 24,
  and_filters: [
    {
      type: 'and',
      field: 'PrintType',
      value: 'Base',
      displayText: 'PrintType: Base',
    }
  ],
  or_filters: [],
  not_filters: [
    {
      type: 'not',
      field: 'CardType',
      value: 'Action Point',
      displayText: 'CardType: Action Point',
    },
    // Base Rarity Only filters - exclude all non-base rarities
    {
      type: 'not',
      field: 'Rarity',
      value: 'Common 1-Star',
      displayText: 'Rarity: Common 1-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Rare 1-Star',
      displayText: 'Rarity: Rare 1-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Rare 2-Star',
      displayText: 'Rarity: Rare 2-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Super Rare 1-Star',
      displayText: 'Rarity: Super Rare 1-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Super Rare 2-Star',
      displayText: 'Rarity: Super Rare 2-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Super Rare 3-Star',
      displayText: 'Rarity: Super Rare 3-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Uncommon 1-Star',
      displayText: 'Rarity: Uncommon 1-Star',
    },
    {
      type: 'not',
      field: 'Rarity',
      value: 'Union Rare',
      displayText: 'Rarity: Union Rare',
    }
  ],
};

export const useSearchStore = create<SearchState>((set) => ({
  filters: initialFilters,
  isLoading: false,
  error: null,

  // Basic filter setters
  setQuery: (query: string) => 
    set((state) => ({ 
      filters: { ...state.filters, query, page: 1 } 
    })),

  setGame: (game: string) => 
    set((state) => ({ 
      filters: { ...state.filters, game, page: 1 } 
    })),

  setSeries: (series: string) => 
    set((state) => {
      // Remove existing Series AND filters
      const filteredAndFilters = state.filters.and_filters.filter(f => f.field !== 'SeriesName');
      
      // Add new Series AND filter if series is selected
      const newAndFilters = series ? [
        ...filteredAndFilters,
        {
          type: 'and' as const,
          field: 'SeriesName',
          value: series,
          displayText: `SeriesName: ${series}`,
        }
      ] : filteredAndFilters;
      
      return { 
        filters: { 
          ...state.filters, 
          and_filters: newAndFilters,
          page: 1 
        } 
      };
    }),

  setColor: (color: string) => 
    set((state) => {
      // Remove existing Color AND filters
      const filteredAndFilters = state.filters.and_filters.filter(f => f.field !== 'Color');
      
      // Add new Color AND filter if color is selected
      const newAndFilters = color ? [
        ...filteredAndFilters,
        {
          type: 'and' as const,
          field: 'Color',
          value: color,
          displayText: `Color: ${color}`,
        }
      ] : filteredAndFilters;
      
      return { 
        filters: { 
          ...state.filters, 
          and_filters: newAndFilters,
          page: 1 
        } 
      };
    }),

  setCardType: (cardType: string) => 
    set((state) => {
      // Remove existing CardType AND filters
      const filteredAndFilters = state.filters.and_filters.filter(f => f.field !== 'CardType');
      
      // Add new CardType AND filter if cardType is selected
      const newAndFilters = cardType ? [
        ...filteredAndFilters,
        {
          type: 'and' as const,
          field: 'CardType',
          value: cardType,
          displayText: `CardType: ${cardType}`,
        }
      ] : filteredAndFilters;
      
      return { 
        filters: { 
          ...state.filters, 
          and_filters: newAndFilters,
          page: 1 
        } 
      };
    }),

  setSort: (sort: string) => 
    set((state) => ({ 
      filters: { ...state.filters, sort, page: 1 } 
    })),

  setPage: (page: number) => 
    set((state) => ({ 
      filters: { ...state.filters, page } 
    })),

  setPerPage: (perPage: number) => 
    set((state) => ({ 
      filters: { ...state.filters, per_page: perPage, page: 1 } 
    })),

  // Advanced filter management
  addAndFilter: (filter: FilterOption) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        and_filters: [...state.filters.and_filters, filter],
        page: 1
      } 
    })),

  addOrFilter: (filter: FilterOption) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        or_filters: [...state.filters.or_filters, filter],
        page: 1
      } 
    })),

  addNotFilter: (filter: FilterOption) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        not_filters: [...state.filters.not_filters, filter],
        page: 1
      } 
    })),

  removeAndFilter: (index: number) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        and_filters: state.filters.and_filters.filter((_, i) => i !== index),
        page: 1
      } 
    })),

  removeOrFilter: (index: number) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        or_filters: state.filters.or_filters.filter((_, i) => i !== index),
        page: 1
      } 
    })),

  removeNotFilter: (index: number) => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        not_filters: state.filters.not_filters.filter((_, i) => i !== index),
        page: 1
      } 
    })),

  clearAllFilters: () => 
    set((state) => ({ 
      filters: { 
        ...state.filters, 
        query: '',
        series: '',
        color: '',
        cardType: '',
        sort: '',
        and_filters: [],
        or_filters: [],
        not_filters: [],
        page: 1
      } 
    })),

  // Loading states
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  // URL synchronization
  initializeFromUrl: (urlFilters: Partial<SearchFilters>) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...urlFilters,
        // Only override arrays if they exist in URL filters, otherwise keep defaults
        and_filters: urlFilters.and_filters !== undefined ? urlFilters.and_filters : state.filters.and_filters,
        or_filters: urlFilters.or_filters !== undefined ? urlFilters.or_filters : state.filters.or_filters,
        not_filters: urlFilters.not_filters !== undefined ? urlFilters.not_filters : state.filters.not_filters,
      }
    })),


  syncToUrl: () => {
    // This will be called by components that need to sync to URL
    // The actual URL update logic is handled in the useUrlState hook
  },

  // Reset
  resetFilters: () => set({ filters: initialFilters, error: null }),
}));

// Helper functions to get current dropdown values from AND filters
export const getCurrentSeries = () => {
  const state = useSearchStore.getState();
  const seriesFilter = state.filters.and_filters.find(f => f.field === 'SeriesName');
  return seriesFilter ? seriesFilter.value : '';
};

export const getCurrentColor = () => {
  const state = useSearchStore.getState();
  const colorFilter = state.filters.and_filters.find(f => f.field === 'Color');
  return colorFilter ? colorFilter.value : '';
};

export const getCurrentCardType = () => {
  const state = useSearchStore.getState();
  const cardTypeFilter = state.filters.and_filters.find(f => f.field === 'CardType');
  return cardTypeFilter ? cardTypeFilter.value : '';
};
