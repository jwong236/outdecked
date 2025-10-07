import { create } from 'zustand';
import { persist, createJSONStorage, devtools } from 'zustand/middleware';
import { Deck, CardRef, SearchParams } from '@/types/card';
import { apiConfig } from '@/lib/apiConfig';

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
  
  // User preferences
  preferences: Record<string, string>;
  
  

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
    lastSync: string | null; // ISO timestamp of last database sync
  };


  // ===== ACTIONS =====
  
  // Session initialization
  initializeSession: () => void;
  clearSession: () => void;
  batchUpdateUserData: (updates: Partial<SessionState>) => void;
  
  // User management
  setUser: (user: SessionState['user']) => void;
  getIsLoggedIn: () => boolean;
  
  // Authentication functions
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  updatePreferences: (preferences: Record<string, string>) => Promise<boolean>;
  loadUserPreferences: () => Promise<void>;
  loadAllUserData: () => Promise<void>;
  
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
  clearHand: () => Promise<void>;
  
  // Proxy printer management
  setPrintList: (items: CardRef[]) => void;
  setPrintSettings: (settings: Partial<SessionState['proxyPrinter']['printSettings']>) => void;
  setProxyPrinterState: (state: Partial<SessionState['proxyPrinter']>) => void;
  
  // Session state management
  setSessionState: (state: Partial<SessionState['sessionState']>) => void;
  
  // Database sync
  syncWithDatabase: () => Promise<void>;
  syncHandToDatabase: () => Promise<void>;
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

const defaultPreferences = {};

const defaultSearchPreferences: SearchParams = {
  query: '',
  sort: 'recent_series_rarity_desc',
  per_page: 24,
  page: 1,
  filters: [
    // Basic Prints Only - Base OR Starter Deck
    { type: 'or', field: 'print_type', value: 'Base', displayText: 'Base Prints Only' },
    { type: 'or', field: 'print_type', value: 'Starter Deck', displayText: 'Base Prints Only' },
    // No Action Points - exclude Action Point cards
    { type: 'not', field: 'card_type', value: 'Action Point', displayText: 'No Action Points' },
    // Base Rarity Only - Common OR Uncommon OR Rare OR Super Rare OR Action Point
    { type: 'or', field: 'rarity', value: 'Common', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'rarity', value: 'Rare', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
    { type: 'or', field: 'rarity', value: 'Action Point', displayText: 'Base Rarity Only' },
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
  lastSync: null,
};


export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set, get) => ({
  // ===== INITIAL STATE =====
  user: defaultUser,
  preferences: defaultPreferences,
  searchPreferences: defaultSearchPreferences,
  deckBuilder: defaultDeckBuilder,
  handCart: defaultHandCart,
  proxyPrinter: defaultProxyPrinter,
  sessionState: defaultSessionState,

  // ===== SESSION MANAGEMENT =====
  initializeSession: () => {
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
    }, false, 'initializeSession');
  },

  clearSession: () => {
    set({
      user: defaultUser,
      preferences: defaultPreferences,
      searchPreferences: defaultSearchPreferences,
      deckBuilder: defaultDeckBuilder,
      handCart: defaultHandCart,
      proxyPrinter: defaultProxyPrinter,
      sessionState: {
        ...defaultSessionState,
        isInitialized: true,
      },
    }, false, 'clearSession');
  },

  // Batch update function to avoid multiple actions
  batchUpdateUserData: (updates) => {
    set((state) => ({
      ...state,
      ...updates,
    }), false, 'batchUpdateUserData');
  },

  // ===== USER MANAGEMENT =====
  setUser: (user) => {
    set({ user }, false, 'setUser');
  },

  getIsLoggedIn: () => {
    const state = get();
    return state.user.id !== null;
  },

  // ===== AUTHENTICATION FUNCTIONS =====
  login: async (username: string, password: string): Promise<boolean> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/login');
      console.log('Attempting login:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      
      console.log('Login response status:', response.status);
      console.log('Login response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        
        // Set user in store
        get().setUser(data.user);
        
        // Load ALL user data (preferences, hand cart, deck list)
        await get().loadAllUserData();
        
        return true;
      } else {
        console.log('Login failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('Login error data:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },

  register: async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/register');
      console.log('Attempting registration:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      console.log('Register response status:', response.status);

      if (response.ok) {
        // After successful registration, automatically log the user in
        const loginSuccess = await get().login(username, password);
        if (loginSuccess) {
          return { success: true };
        } else {
          return { success: false, error: 'Registration successful, but automatic login failed. Please sign in manually.' };
        }
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  logout: async (): Promise<void> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/logout');
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear user data
      get().setUser(defaultUser);
      set({ preferences: defaultPreferences }, false, 'logoutClearPreferences');
    }
  },

  checkAuthStatus: async (): Promise<void> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/me');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Batch update user and load data in one action to reduce race conditions
        set((state) => ({
          user: data.user,
          sessionState: {
            ...state.sessionState,
            isInitialized: true,
          },
        }), false, 'setUserAndInitialize');
        
        // Load user data after setting user
        await get().loadAllUserData();
      } else if (response.status === 401) {
        // 401 is expected when not logged in - this is not an error
        console.log('User not authenticated (401) - this is normal');
        set((state) => ({
          user: defaultUser,
          sessionState: {
            ...state.sessionState,
            isInitialized: true,
          },
        }), false, 'setUserAndInitialize');
      } else {
        // Other error statuses
        console.error('Unexpected response status:', response.status);
        set((state) => ({
          user: defaultUser,
          sessionState: {
            ...state.sessionState,
            isInitialized: true,
          },
        }), false, 'setUserAndInitialize');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set((state) => ({
        user: defaultUser,
        sessionState: {
          ...state.sessionState,
          isInitialized: true,
        },
      }), false, 'setUserAndInitialize');
    }
  },

  updatePreferences: async (newPreferences: Record<string, string>): Promise<boolean> => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/users/me/preferences'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: newPreferences }),
        credentials: 'include',
      });

      if (response.ok) {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        }), false, 'updatePreferences');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  },

  loadUserPreferences: async (): Promise<void> => {
    try {
      const url = apiConfig.getApiUrl('/api/users/me/preferences');
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ preferences: data.preferences }, false, 'loadUserPreferences');
      } else if (response.status === 404) {
        // 404 is normal for new users who don't have preferences yet
        set({ preferences: defaultPreferences }, false, 'loadUserPreferencesDefault404');
      } else {
        set({ preferences: defaultPreferences }, false, 'loadUserPreferencesDefaultError');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      set({ preferences: defaultPreferences }, false, 'loadUserPreferencesDefaultCatch');
    }
  },

  loadAllUserData: async (): Promise<void> => {
    try {
      console.log('🔄 Loading user data from database...');
      
      // Load user preferences, hand, and deck data in parallel
      const [preferencesResult, handResponse, decksResponse] = await Promise.allSettled([
        get().loadUserPreferences(),
        fetch(apiConfig.getApiUrl('/api/users/me/hand'), { credentials: 'include' }),
        fetch(apiConfig.getApiUrl('/api/user/decks'), { credentials: 'include' })
      ]);
      
      const handData = handResponse.status === 'fulfilled' && handResponse.value.ok 
        ? await handResponse.value.json() 
        : { hand: [] };
        
      const decksData = decksResponse.status === 'fulfilled' && decksResponse.value.ok 
        ? await decksResponse.value.json() 
        : { data: { deck_ids: [] } };
      
      console.log('✅ User data loaded from database');
      
      // Convert hand data to CardRef format
      const handArray = Array.isArray(handData.hand) ? handData.hand : [];
      const handItems = handArray.map((item: any) => {
        if (item.card_id && typeof item.quantity === 'number') {
          return item;
        }
        if (item.product_id) {
          return {
            card_id: item.product_id,
            quantity: item.quantity || 1
          };
        }
        return {
          card_id: item.id || item.card_id,
          quantity: item.quantity || 1
        };
      });
      
      // Only update if we have data from database, otherwise preserve local state
      set((state) => ({
        handCart: {
          ...state.handCart,
          handItems: handItems.length > 0 ? handItems : state.handCart.handItems,
        },
        deckBuilder: {
          ...state.deckBuilder,
          deckList: decksData.data?.deck_ids || [],
        },
      }), false, 'loadAllUserData');
      
    } catch (error) {
      console.error('Failed to load all user data:', error);
    }
  },


  // ===== SEARCH MANAGEMENT =====
  setSearchPreferences: (preferences) => {
    set({ searchPreferences: preferences }, false, 'setSearchPreferences');
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
    }, false, 'addFilter');
  },

  removeFilter: (index) => {
    set((state) => {
      const newFilters = state.searchPreferences.filters.filter((_, i) => i !== index);
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    }, false, 'removeFilter');
  },

  clearAllFilters: () => {
    set((state) => {
      // Only clear non-default filters, preserve default filters
      const defaultFilters = [
        { type: 'or' as const, field: 'print_type', value: 'Base', displayText: 'Basic Prints Only' },
        { type: 'or' as const, field: 'print_type', value: 'Starter Deck', displayText: 'Basic Prints Only' },
        { type: 'not' as const, field: 'card_type', value: 'Action Point', displayText: 'No Action Points' },
        { type: 'or' as const, field: 'rarity', value: 'Common', displayText: 'Base Rarity Only' },
        { type: 'or' as const, field: 'rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
        { type: 'or' as const, field: 'rarity', value: 'Rare', displayText: 'Base Rarity Only' },
        { type: 'or' as const, field: 'rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
        { type: 'or' as const, field: 'rarity', value: 'Action Point', displayText: 'Base Rarity Only' },
      ];
      
      return {
        searchPreferences: {
          ...state.searchPreferences,
          filters: defaultFilters,
        },
      };
    }, false, 'clearAllFilters');
  },


  setPage: (page) => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        page,
      },
    }), false, 'setPage');
  },

  setSort: (sort) => {
    set((state) => ({
      searchPreferences: {
        ...state.searchPreferences,
        sort,
      },
    }), false, 'setSort');
  },

  setSeries: (series) => {
    set((state) => {
      // Remove existing series filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'series');
      // Add new series filter if not empty
      const newFilters = series ? [...filteredFilters, { type: 'and' as const, field: 'series', value: series, displayText: `Series: ${series}` }] : filteredFilters;
      
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  setCardType: (cardType) => {
    set((state) => {
      // Remove existing cardType filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'card_type');
      // Add new cardType filter if not empty
      let newFilters = filteredFilters;
      if (cardType) {
        // Special case: "Action Point" should create a "No Action Points" filter (negative)
        if (cardType === 'Action Point') {
          newFilters = [...filteredFilters, { type: 'not' as const, field: 'card_type', value: 'Action Point', displayText: 'No Action Points' }];
        } else {
          newFilters = [...filteredFilters, { type: 'and' as const, field: 'card_type', value: cardType, displayText: `Card Type: ${cardType}` }];
        }
      }
      
      return {
        searchPreferences: { ...state.searchPreferences, filters: newFilters }
      };
    });
  },

  setColor: (color) => {
    set((state) => {
      // Remove existing color filter
      const filteredFilters = state.searchPreferences.filters.filter(f => f.field !== 'activation_energy');
      // Add new color filter if not empty
      const newFilters = color ? [...filteredFilters, { type: 'and' as const, field: 'activation_energy', value: color, displayText: `Color: ${color}` }] : filteredFilters;
      
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
    const seriesFilter = state.searchPreferences.filters.find(f => f.field === 'series' && f.type === 'and');
    return seriesFilter ? seriesFilter.value : '';
  },

  getCardType: () => {
    const state = get();
    const cardTypeFilter = state.searchPreferences.filters.find(f => f.field === 'card_type' && f.type === 'and');
    return cardTypeFilter ? cardTypeFilter.value : '';
  },

  getColor: () => {
    const state = get();
    const colorFilter = state.searchPreferences.filters.find(f => f.field === 'activation_energy' && f.type === 'and');
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
    }), false, 'setCurrentDeck');
  },

  clearCurrentDeck: () => {
    set((state) => ({
      deckBuilder: { ...state.deckBuilder, currentDeck: null },
    }), false, 'clearCurrentDeck');
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
    }, false, 'addToHand');
    
    // Sync to database if user is logged in
    const state = get();
    if (state.user.id) {
      // Debounce database sync to avoid too many requests
      setTimeout(() => {
        get().syncHandToDatabase();
      }, 500);
    }
  },

  removeFromHand: (product_id) => {
    set((state) => ({
      handCart: {
        ...state.handCart,
        handItems: state.handCart.handItems.filter(item => item.card_id !== product_id)
      }
    }), false, 'removeFromHand');
    
    // Sync to database if user is logged in
    const state = get();
    if (state.user.id) {
      setTimeout(() => {
        get().syncHandToDatabase();
      }, 500);
    }
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
    }, false, 'updateHandQuantity');
    
    // Sync to database if user is logged in
    const state = get();
    if (state.user.id) {
      setTimeout(() => {
        get().syncHandToDatabase();
      }, 500);
    }
  },

  clearHand: async () => {
    // Update local state immediately
    set((state) => ({
      handCart: { ...state.handCart, handItems: [] }
    }), false, 'clearHand');

    // Sync to database if user is logged in
    const state = get();
    if (state.user.id) {
      try {
        const response = await fetch(apiConfig.getApiUrl('/api/users/me/hand'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ hand: [] }),
        });

        if (response.ok) {
        } else {
          console.error('❌ clearHand: Failed to sync empty hand to database:', response.status);
        }
      } catch (error) {
        console.error('❌ clearHand: Error syncing empty hand to database:', error);
      }
    }
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
    if (!state.user.id) {
      console.log('⚠️ Cannot sync - user not logged in');
      return;
    }

    console.log('🔄 Syncing session with database...');
    // TODO: Implement database sync logic
    // This will upload local changes and download user data
    get().markAsSynced();
  },

  syncHandToDatabase: async () => {
    const state = get();
    if (!state.user.id) {
      return;
    }

    try {
      const response = await fetch(apiConfig.getApiUrl('/api/users/me/hand'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hand: state.handCart.handItems }),
      });

      if (response.ok) {
        console.log('✅ Hand synced to database');
      } else {
        console.error('❌ Failed to sync hand to database:', response.status);
      }
    } catch (error) {
      console.error('❌ Error syncing hand to database:', error);
    }
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
      name: 'outdecked-session-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage for persistence across browser sessions
      partialize: (state) => ({
        // Only persist the data we want to save across browser sessions
        user: state.user,
        preferences: state.preferences,
        searchPreferences: state.searchPreferences,
        handCart: state.handCart,
        deckBuilder: {
          // Only persist deckList, NOT currentDeck - load from database instead
          deckList: state.deckBuilder.deckList,
          currentDeck: null, // Always start with null, load from database
        },
        proxyPrinter: state.proxyPrinter,
        sessionState: {
          isInitialized: state.sessionState.isInitialized,
          lastSync: state.sessionState.lastSync,
        },
      }),
      migrate: (persistedState: any, version: number) => {
        // Migration function to update old data structures
        if (persistedState?.searchPreferences?.sort === 'name') {
          console.log('🔄 Migrating sort value from "name" to "recent_series_rarity_desc"');
          persistedState.searchPreferences.sort = 'recent_series_rarity_desc';
        }
        return persistedState;
      },
    }
  ),
    { name: 'SessionStore' } // This will show up in Redux DevTools
  )
);
