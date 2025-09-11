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
  sort: '',
  page: 1,
  per_page: 24,
  and_filters: [],
  or_filters: [],
  not_filters: [],
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
    set((state) => ({ 
      filters: { ...state.filters, series, page: 1 } 
    })),

  setColor: (color: string) => 
    set((state) => ({ 
      filters: { ...state.filters, color, page: 1 } 
    })),

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
        // Ensure arrays are properly initialized
        and_filters: urlFilters.and_filters || [],
        or_filters: urlFilters.or_filters || [],
        not_filters: urlFilters.not_filters || [],
      } 
    })),

  syncToUrl: () => {
    // This will be called by components that need to sync to URL
    // The actual URL update logic is handled in the useUrlState hook
  },

  // Reset
  resetFilters: () => set({ filters: initialFilters, error: null }),
}));
