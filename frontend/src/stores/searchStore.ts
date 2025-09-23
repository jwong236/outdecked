import { create } from 'zustand';
import { SearchFilters, FilterOption } from '@/types/card';
import { apiClient } from '@/lib/api';

interface SearchState {
  // Search preferences (stored in sessionStorage) - SINGLE SOURCE OF TRUTH
  searchPreferences: {
    // Account-level search preferences
    sort: string;
    per_page: number;
    
    // Default filter toggles
    defaultFilters: {
      basicPrintsOnly: boolean;
      noActionPoints: boolean;
      baseRarityOnly: boolean;
    };
    
    // User-added filters stored in session
    advancedFilters: string[]; // format: "&field=value", "|field=value", "!field=value"
  };
  
  // Temporary UI state (not persisted)
  query: string;
  page: number;
  
  // UI state (not persisted)
  isLoading: boolean;
  error: string | null;
  userPreferencesLoaded: boolean;
  
  // Actions
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  
  // Advanced filter management
  addAdvancedFilter: (filter: FilterOption) => void;
  removeAdvancedFilter: (index: number) => void;
  clearAllFilters: () => void;
  
  // Helper functions to work with common filters
  setQuery: (query: string) => void;
  setSeries: (series: string) => void;
  setCardType: (cardType: string) => void;
  setSort: (sort: string) => void;
  setColor: (color: string) => void;
  
  // Helper getters to extract values from session
  getQuery: () => string;
  getSeries: () => string;
  getCardType: () => string;
  getSort: () => string;
  getColor: () => string;
  
  // Default filter toggles
  setDefaultFilterToggle: (toggleName: keyof SearchState['searchPreferences']['defaultFilters'], enabled: boolean) => void;
  
  // User preferences management (only account-level preferences saved to database)
  loadUserPreferences: () => Promise<void>;
  saveUserPreferences: () => Promise<void>;
  setUserPreferencesLoaded: (loaded: boolean) => void;
  
  // Session management
  loadSearchPreferences: () => void;
  saveSearchPreferences: () => void;
  
  // API integration
  getFiltersForAPI: () => SearchFilters;
}

// Helper functions for compact filter format
const compactToFilter = (compact: string): FilterOption => {
  const type = compact[0] as '&' | '|' | '!';
  const [field, value] = compact.slice(1).split('=');
  return {
    type: type === '&' ? 'and' : type === '|' ? 'or' : 'not',
    field,
    value,
    displayText: `${field}: ${value}`,
  };
};

const filterToCompact = (filter: FilterOption): string => {
  const type = filter.type === 'and' ? '&' : filter.type === 'or' ? '|' : '!';
  return `${type}${filter.field}=${filter.value}`;
};

// Default search preferences (all ON by default)
const defaultSearchPreferences = {
  // Account-level search preferences
  sort: 'name',
  per_page: 20,
  
  // Default filter toggles
  defaultFilters: {
    basicPrintsOnly: true,
    noActionPoints: true,
    baseRarityOnly: true,
  },
  
  // User-added filters stored in session
  advancedFilters: [] // format: "&field=value", "|field=value", "!field=value"
};

export const useSearchStore = create<SearchState>((set, get) => ({
  searchPreferences: defaultSearchPreferences,
  // Temporary UI state (not persisted)
  query: '',
  page: 1,
  // UI state (not persisted)
  isLoading: false,
  error: null,
  userPreferencesLoaded: false,

  // Pagination
  setPage: (page: number) => {
    set({ page });
  },

  setPerPage: (perPage: number) => {
    set((state) => ({ 
      searchPreferences: { ...state.searchPreferences, per_page: perPage, page: 1 } 
    }));
    get().saveSearchPreferences();
  },

  // Advanced filter management
  addAdvancedFilter: (filter: FilterOption) => {
    set((state) => {
      const newAdvancedFilters = [...state.searchPreferences.advancedFilters, filterToCompact(filter)];
      return {
        searchPreferences: { ...state.searchPreferences, advancedFilters: newAdvancedFilters, page: 1 }
      };
    });
    get().saveSearchPreferences();
  },

  removeAdvancedFilter: (index: number) => {
    set((state) => {
      const newAdvancedFilters = state.searchPreferences.advancedFilters.filter((_, i) => i !== index);
      return {
        searchPreferences: { ...state.searchPreferences, advancedFilters: newAdvancedFilters, page: 1 }
      };
    });
    get().saveSearchPreferences();
  },

  clearAllFilters: () => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        // Only clear advanced filters, keep everything else
        advancedFilters: [],
      },
      // Reset temporary UI state
      query: '',
      page: 1,
    }));
    get().saveSearchPreferences();
  },

  // Helper functions to work with common filters
  setQuery: (query: string) => {
    set({ query, page: 1 });
  },

  setSeries: (series: string) => {
    const state = get();
    // Remove existing series filter
    const filteredAdvanced = state.searchPreferences.advancedFilters.filter(f => !f.startsWith('&SeriesName='));
    // Add new series filter if not empty
    const newAdvanced = series ? [...filteredAdvanced, `&SeriesName=${series}`] : filteredAdvanced;
    
    set((state) => ({ 
      searchPreferences: { ...state.searchPreferences, advancedFilters: newAdvanced, page: 1 } 
    }));
    get().saveSearchPreferences();
  },

  setCardType: (cardType: string) => {
    const state = get();
    // Remove existing cardType filter
    const filteredAdvanced = state.searchPreferences.advancedFilters.filter(f => !f.startsWith('&CardType='));
    // Add new cardType filter if not empty
    const newAdvanced = cardType ? [...filteredAdvanced, `&CardType=${cardType}`] : filteredAdvanced;
    
    set((state) => ({ 
      searchPreferences: { ...state.searchPreferences, advancedFilters: newAdvanced, page: 1 } 
    }));
    get().saveSearchPreferences();
  },

  setSort: (sort: string) => {
    set((state) => ({ 
      searchPreferences: { ...state.searchPreferences, sort, page: 1 } 
    }));
    get().saveSearchPreferences();
  },

  setColor: (color: string) => {
    const state = get();
    // Remove existing color filter
    const filteredAdvanced = state.searchPreferences.advancedFilters.filter(f => !f.startsWith('&ActivationEnergy='));
    // Add new color filter if not empty
    const newAdvanced = color ? [...filteredAdvanced, `&ActivationEnergy=${color}`] : filteredAdvanced;
    
    set((state) => ({ 
      searchPreferences: { ...state.searchPreferences, advancedFilters: newAdvanced, page: 1 } 
    }));
    get().saveSearchPreferences();
  },

  // Helper getters to extract values from session
  getQuery: () => {
    const state = get();
    return state.query;
  },

  getSeries: () => {
    const state = get();
    const seriesFilter = state.searchPreferences.advancedFilters.find(f => f.startsWith('&SeriesName='));
    return seriesFilter ? seriesFilter.split('=')[1] : '';
  },

  getCardType: () => {
    const state = get();
    const cardTypeFilter = state.searchPreferences.advancedFilters.find(f => f.startsWith('&CardType='));
    return cardTypeFilter ? cardTypeFilter.split('=')[1] : '';
  },

  getSort: () => {
    const state = get();
    return state.searchPreferences.sort;
  },

  getColor: () => {
    const state = get();
    const colorFilter = state.searchPreferences.advancedFilters.find(f => f.startsWith('&ActivationEnergy='));
    return colorFilter ? colorFilter.split('=')[1] : '';
  },

  // Default filter toggles
  setDefaultFilterToggle: (toggleName: keyof SearchState['searchPreferences']['defaultFilters'], enabled: boolean) => {
    set((state) => {
      const newDefaultFilters = { ...state.searchPreferences.defaultFilters, [toggleName]: enabled };
      return {
        searchPreferences: { ...state.searchPreferences, defaultFilters: newDefaultFilters }
      };
    });
    get().saveSearchPreferences();
  },

  // User preferences management
  loadUserPreferences: async () => {
    try {
      const response = await fetch('/api/users/me/preferences', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const preferences = data.preferences;
      
      // Apply user preferences to search preferences (only account-level preferences)
      set((state) => ({
        searchPreferences: {
          ...state.searchPreferences,
          sort: preferences.default_sort || 'name',
          per_page: preferences.cards_per_page || 20,
        }
      }));
      
      set({ userPreferencesLoaded: true });
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      set({ userPreferencesLoaded: true });
    }
  },

  saveUserPreferences: async () => {
    try {
      const state = get();
      const response = await fetch('/api/users/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          preferences: {
            default_sort: state.searchPreferences.sort,
            cards_per_page: state.searchPreferences.per_page,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  },

  setUserPreferencesLoaded: (loaded: boolean) => {
    set({ userPreferencesLoaded: loaded });
  },

  // Session management
  loadSearchPreferences: () => {
    try {
      const stored = sessionStorage.getItem('searchPreferences');
      if (stored) {
        const preferences = JSON.parse(stored);
        set({ searchPreferences: preferences });
      } else {
        // Save default preferences to session
        get().saveSearchPreferences();
      }
    } catch (error) {
      console.error('Failed to load search preferences:', error);
      // Save default preferences to session
      get().saveSearchPreferences();
    }
  },

  saveSearchPreferences: () => {
    try {
      const state = get();
      sessionStorage.setItem('searchPreferences', JSON.stringify(state.searchPreferences));
    } catch (error) {
      console.error('Failed to save search preferences:', error);
    }
  },

  // API integration - converts session preferences to API format
  getFiltersForAPI: () => {
    const state = get();
    const { searchPreferences } = state;
    
    // Convert advanced filters to API format
    const and_filters: FilterOption[] = [];
    const or_filters: FilterOption[] = [];
    const not_filters: FilterOption[] = [];
    
    searchPreferences.advancedFilters.forEach(compactFilter => {
      const filter = compactToFilter(compactFilter);
      if (filter.type === 'and') {
        and_filters.push(filter);
      } else if (filter.type === 'or') {
        or_filters.push(filter);
      } else if (filter.type === 'not') {
        not_filters.push(filter);
      }
    });
    
    // Apply default filters as NOT filters (same logic as deck builder)
    if (searchPreferences.defaultFilters.basicPrintsOnly) {
      // Basic Prints Only: Only show "Base" print type, filter out all others
      const nonBasePrintTypes = [
        'Pre-Release', 'Starter Deck', 'Pre-Release Starter', 'Promotion', 'Box Topper Foil'
      ];
      nonBasePrintTypes.forEach(printType => {
        not_filters.push({
          type: 'not',
          field: 'PrintType',
          value: printType,
          displayText: `PrintType: ${printType}`,
        });
      });
    }
    
    if (searchPreferences.defaultFilters.noActionPoints) {
      // No Action Points: Filter out Action Point cards, show all other card types
      not_filters.push({
        type: 'not',
        field: 'CardType',
        value: 'Action Point',
        displayText: 'CardType: Action Point',
      });
    }
    
    if (searchPreferences.defaultFilters.baseRarityOnly) {
      // Base Rarity Only: Only show base rarities (Common, Uncommon, Rare, Super Rare)
      // Filter out special rarities (1-Star, 2-Star, 3-Star variants and Union Rare)
      const specialRarities = [
        'Common 1-Star', 'Rare 1-Star', 'Rare 2-Star', 
        'Super Rare 1-Star', 'Super Rare 2-Star', 'Super Rare 3-Star', 
        'Uncommon 1-Star', 'Union Rare'
      ];
      specialRarities.forEach(value => {
        not_filters.push({
          type: 'not',
          field: 'Rarity',
          value: value,
          displayText: `Rarity: ${value}`,
        });
      });
    }
    
    return {
      query: state.query,
      game: 'Union Arena', // Default game
      series: state.getSeries(),
      color: state.getColor(),
      cardType: state.getCardType(),
      sort: searchPreferences.sort,
      page: state.page,
      per_page: searchPreferences.per_page,
      and_filters,
      or_filters,
      not_filters,
    };
  },
}));