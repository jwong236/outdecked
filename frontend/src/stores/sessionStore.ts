import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { Deck, CardRef, SearchParams } from '@/types/card';

/**
 * Centralized Session Store
 * 
 * This store manages all session data for the application.
 * It's initialized with empty values on app startup and populated
 * as the user interacts with different features.
 * 
 * When user logs in, this data syncs with the database.
 */

interface SessionState {
  // ===== USER DATA =====
  user: {
    id: number | null;
    username: string | null;
    email: string | null;
    role: 'owner' | 'admin' | 'moderator' | 'user' | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  

  // ===== SEARCH FEATURE =====
  searchPreferences: SearchParams;
  

  // ===== DECK BUILDER FEATURE =====
  deckBuilder: {
    // User's deck list - stored as compact deck IDs only
    deckList: string[];
    // Current deck being edited (loaded on-demand) - null when no deck loaded
    currentDeck: Deck | null;
  };

  // ===== HAND CART FEATURE =====
  handCart: {
    // Cards in user's hand (for checking) - stored as lightweight references
    handItems: CardRef[];
  };

  // ===== PROXY PRINTER FEATURE =====
  proxyPrinter: {
    // Cards to print - stored as lightweight references
    printList: CardRef[];
    
    // Print settings
    printSettings: {
      marginTop: number; // inches
      marginBottom: number;
      marginLeft: number;
      marginRight: number;
      cardGap: number; // Gap between cards in inches
      showPreview: boolean;
    };
    
  };

  // ===== SESSION MANAGEMENT =====
  sessionState: {
    isInitialized: boolean;
    isLoggedIn: boolean;
    lastSync: string | null; // ISO timestamp of last database sync
  };


  // ===== ACTIONS =====
  
  // Session initialization
  initializeSession: () => void;
  clearSession: () => void;
  batchUpdateUserData: (updates: Partial<SessionState>) => void;
  
  // User management
  setUser: (user: SessionState['user']) => void;
  
  // Search management
  setSearchPreferences: (preferences: SessionState['searchPreferences']) => void;
  addFilter: (filter: { type: 'and' | 'or' | 'not'; field: string; value: string; displayText: string }) => void;
  removeFilter: (index: number) => void;
  clearAllFilters: () => void;
  setPage: (page: number) => void;
  setSort: (sort: string) => void;
  setSeries: (series: string) => void;
  setCardType: (cardType: string) => void;
  setColor: (color: string) => void;
  getQuery: () => string;
  getSeries: () => string;
  getCardType: () => string;
  getColor: () => string;
  getFiltersForAPI: () => SearchParams;
  
  // Deck builder management
  setDeckList: (deckIds: string[]) => void;
  setCurrentDeck: (deck: Deck | null) => void;
  clearCurrentDeck: () => void;
  
  setDeckBuilderState: (state: Partial<SessionState['deckBuilder']>) => void;
  
  // Hand cart management
  setHandItems: (items: CardRef[]) => void;
  setHandCartState: (state: Partial<SessionState['handCart']>) => void;
  addToHand: (product_id: number, quantity: number) => void;
  removeFromHand: (product_id: number) => void;
  updateHandQuantity: (product_id: number, quantity: number) => void;
  clearHand: () => void;
  
  // Proxy printer management
  setPrintList: (items: CardRef[]) => void;
  setPrintSettings: (settings: Partial<SessionState['proxyPrinter']['printSettings']>) => void;
  setProxyPrinterState: (state: Partial<SessionState['proxyPrinter']>) => void;
  
  // Session state management
  setSessionState: (state: Partial<SessionState['sessionState']>) => void;
  
  // Database sync
  syncWithDatabase: () => Promise<void>;
  markAsSynced: () => void;
  
  // Helper functions
  filterToCompact: (filter: { type: 'and' | 'or' | 'not'; field: string; value: string }) => string;
  compactToFilter: (compactFilter: string) => { type: 'and' | 'or' | 'not'; field: string; value: string };
}

// Default values for session initialization
const defaultUser = {
  id: null,
  username: null,
  email: null,
  role: null,
  display_name: null,
  avatar_url: null,
};


const defaultSearchPreferences: SearchParams = {
  query: '',
  sort: 'name_asc',
  per_page: 24,
  page: 1,
  filters: [
    { type: 'and', field: 'PrintType', value: 'Base', displayText: 'Base Prints Only' },
    { type: 'not', field: 'CardType', value: 'Action Point', displayText: 'No Action Points' },
    { type: 'or', field: 'Rarity', value: 'Common', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'Rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'Rarity', value: 'Rare', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'Rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
  ],
};


const defaultDeckBuilder = {
  deckList: [],
  currentDeck: null,
};

const defaultHandCart = {
  handItems: [],
};

const defaultProxyPrinter = {
  printList: [],
  printSettings: {
    marginTop: 0.5,
    marginBottom: 0.5,
    marginLeft: 0.5,
    marginRight: 0.5,
    cardGap: 0.1,
    showPreview: false,
  },
};

const defaultSessionState = {
  isInitialized: false,
  isLoggedIn: false,
  lastSync: null,
};


export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set, get) => ({
  // ===== INITIAL STATE =====
  user: defaultUser,
  searchPreferences: defaultSearchPreferences,
  deckBuilder: defaultDeckBuilder,
  handCart: defaultHandCart,
  proxyPrinter: defaultProxyPrinter,
  sessionState: defaultSessionState,

  // ===== SESSION MANAGEMENT =====
  initializeSession: () => {
    console.log('🔄 Initializing session with default values...');
    set({
      user: defaultUser,
      searchPreferences: defaultSearchPreferences,
      deckBuilder: defaultDeckBuilder,
      handCart: defaultHandCart,
      proxyPrinter: defaultProxyPrinter,
      sessionState: {
        ...defaultSessionState,
        isInitialized: true,
      },
    });
    console.log('✅ Session initialized');
  },

  clearSession: () => {
    console.log('🧹 Clearing session...');
    set({
      user: defaultUser,
      searchPreferences: defaultSearchPreferences,
      deckBuilder: defaultDeckBuilder,
      handCart: defaultHandCart,
      proxyPrinter: defaultProxyPrinter,
      sessionState: {
        ...defaultSessionState,
        isInitialized: true,
        isLoggedIn: false,
      },
    });
    console.log('✅ Session cleared');
  },

  // Batch update function to avoid multiple actions
  batchUpdateUserData: (updates) => {
    set((state) => ({
      ...state,
      ...updates,
    }));
  },

  // ===== USER MANAGEMENT =====
  setUser: (user) => {
    set((state) => ({
      user,
      sessionState: {
        ...state.sessionState,
        isLoggedIn: user.id !== null,
      },
    }));
  },


  // ===== SEARCH MANAGEMENT =====
  setSearchPreferences: (preferences) => {
    set({ searchPreferences: preferences });
  },

  // Helper function to convert filter to compact format
  filterToCompact: (filter: { type: 'and' | 'or' | 'not'; field: string; value: string }) => {
    const prefix = filter.type === 'and' ? '&' : filter.type === 'or' ? '|' : '!';
    return `${prefix}${filter.field}=${filter.value}`;
  },

  // Helper function to convert compact format to filter
  compactToFilter: (compactFilter: string) => {
    const type = compactFilter[0] as '&' | '|' | '!';
    const [field, value] = compactFilter.slice(1).split('=');
    return {
      type: type === '&' ? 'and' as const : type === '|' ? 'or' as const : 'not' as const,
      field,
      value,
    };
  },

  addFilter: (filter) => {
    set((state) => {
      const newFilters = [...state.searchPreferences.filters, filter];
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  removeFilter: (index) => {
    set((state) => {
      const newFilters = state.searchPreferences.filters.filter((_, i) => i !== index);
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  clearAllFilters: () => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        filters: [],
      },
    }));
  },


  setPage: (page) => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        page,
      },
    }));
  },

  setSort: (sort) => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        sort,
      },
    }));
  },

  setSeries: (series) => {
    set((state) => {
      // Remove existing series filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'SeriesName');
      // Add new series filter if not empty
      const newFilters = series ? [...filteredFilters, { type: 'and' as const, field: 'SeriesName', value: series, displayText: `Series: ${series}` }] : filteredFilters;
      
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  setCardType: (cardType) => {
    set((state) => {
      // Remove existing cardType filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'CardType');
      // Add new cardType filter if not empty
      const newFilters = cardType ? [...filteredFilters, { type: 'and' as const, field: 'CardType', value: cardType, displayText: `Card Type: ${cardType}` }] : filteredFilters;
      
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  setColor: (color) => {
    set((state) => {
      // Remove existing color filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'ActivationEnergy');
      // Add new color filter if not empty
      const newFilters = color ? [...filteredFilters, { type: 'and' as const, field: 'ActivationEnergy', value: color, displayText: `Color: ${color}` }] : filteredFilters;
      
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  getQuery: () => {
    // Query is temporary UI state, not stored in sessionStore
    // This will be overridden by components that have local query state
    return '';
  },

  getSeries: () => {
    const state = get();
    const seriesFilter = state.searchPreferences.filters.find(f => f.field === 'SeriesName' && f.type === 'and');
    return seriesFilter ? seriesFilter.value : '';
  },

  getCardType: () => {
    const state = get();
    const cardTypeFilter = state.searchPreferences.filters.find(f => f.field === 'CardType' && f.type === 'and');
    return cardTypeFilter ? cardTypeFilter.value : '';
  },

  getColor: () => {
    const state = get();
    const colorFilter = state.searchPreferences.filters.find(f => f.field === 'ActivationEnergy' && f.type === 'and');
    return colorFilter ? colorFilter.value : '';
  },

  getFiltersForAPI: () => {
    const state = get();
    const { searchPreferences } = state;
    
    // Return the complete SearchParams object
    return {
      query: searchPreferences.query,
      sort: searchPreferences.sort,
      page: searchPreferences.page,
      per_page: searchPreferences.per_page,
      filters: searchPreferences.filters,
    };
  },


  // ===== DECK BUILDER MANAGEMENT =====
  setDeckList: (deckIds) => {
    set((state) => ({
      deckBuilder: { ...state.deckBuilder, deckList: deckIds },
    }));
  },

  setCurrentDeck: (deck) => {
    set((state) => ({
      deckBuilder: { ...state.deckBuilder, currentDeck: deck },
    }));
  },

  clearCurrentDeck: () => {
    set((state) => ({
      deckBuilder: { ...state.deckBuilder, currentDeck: null },
    }));
  },



  setDeckBuilderState: (state) => {
    set((current) => ({
      deckBuilder: { ...current.deckBuilder, ...state },
    }));
  },

  // ===== HAND CART MANAGEMENT =====
  setHandItems: (items) => {
    set((state) => ({
      handCart: { ...state.handCart, handItems: items },
    }));
  },

  setHandCartState: (state) => {
    set((current) => ({
      handCart: { ...current.handCart, ...state },
    }));
  },

  addToHand: (product_id, quantity) => {
    set((state) => {
      const existingIndex = state.handCart.handItems.findIndex(item => item.card_id === product_id);
      let newHandItems;
      
      if (existingIndex >= 0) {
        // Update existing item
        newHandItems = [...state.handCart.handItems];
        newHandItems[existingIndex] = {
          ...newHandItems[existingIndex],
          quantity: newHandItems[existingIndex].quantity + quantity
        };
      } else {
        // Add new item
        newHandItems = [...state.handCart.handItems, { card_id: product_id, quantity }];
      }
      
      return {
        handCart: { ...state.handCart, handItems: newHandItems }
      };
    });
  },

  removeFromHand: (product_id) => {
    set((state) => ({
      handCart: {
        ...state.handCart,
        handItems: state.handCart.handItems.filter(item => item.card_id !== product_id)
      }
    }));
  },

  updateHandQuantity: (product_id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return {
          handCart: {
            ...state.handCart,
            handItems: state.handCart.handItems.filter(item => item.card_id !== product_id)
          }
        };
      }
      
      const newHandItems = state.handCart.handItems.map(item =>
        item.card_id === product_id ? { ...item, quantity } : item
      );
      
      return {
        handCart: { ...state.handCart, handItems: newHandItems }
      };
    });
  },

  clearHand: () => {
    set((state) => ({
      handCart: { ...state.handCart, handItems: [] }
    }));
  },

  // ===== PROXY PRINTER MANAGEMENT =====
  setPrintList: (items) => {
    set((state) => ({
      proxyPrinter: { ...state.proxyPrinter, printList: items },
    }));
  },

  setPrintSettings: (settings) => {
    set((state) => ({
      proxyPrinter: {
        ...state.proxyPrinter,
        printSettings: { ...state.proxyPrinter.printSettings, ...settings },
      },
    }));
  },

  setProxyPrinterState: (state) => {
    set((current) => ({
      proxyPrinter: { ...current.proxyPrinter, ...state },
    }));
  },

  // ===== SESSION STATE MANAGEMENT =====
  setSessionState: (state) => {
    set((current) => ({
      sessionState: { ...current.sessionState, ...state },
    }));
  },

  // ===== DATABASE SYNC =====
  syncWithDatabase: async () => {
    const state = get();
    if (!state.sessionState.isLoggedIn) {
      console.log('⚠️ Cannot sync - user not logged in');
      return;
    }

    console.log('🔄 Syncing session with database...');
    // TODO: Implement database sync logic
    // This will upload local changes and download user data
    get().markAsSynced();
  },

  markAsSynced: () => {
    set((state) => ({
      sessionState: {
        ...state.sessionState,
        lastSync: new Date().toISOString(),
      },
    }));
  },
    }),
    {
      name: 'outdecked-session-storage', // unique name for sessionStorage key
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage instead of localStorage
      partialize: (state) => ({
        // Only persist the data we want to save across page refreshes
        user: state.user,
        searchPreferences: state.searchPreferences,
        handCart: state.handCart,
        deckBuilder: state.deckBuilder,
        proxyPrinter: state.proxyPrinter,
        sessionState: {
          isInitialized: state.sessionState.isInitialized,
          isLoggedIn: state.sessionState.isLoggedIn,
          lastSync: state.sessionState.lastSync,
        },
      }),
      migrate: (persistedState: any, version: number) => {
        // Migration function to update old data structures
        if (persistedState?.searchPreferences?.sort === 'name') {
          console.log('🔄 Migrating sort value from "name" to "name_asc"');
          persistedState.searchPreferences.sort = 'name_asc';
        }
        return persistedState;
      },
    }
  ),
    { name: 'SessionStore' } // This will show up in Redux DevTools
  )
);
