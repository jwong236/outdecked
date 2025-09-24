import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { compactHandItems } from '@/lib/handUtils';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * Hook to initialize the session when the app starts
 * 
 * This hook:
 * 1. Initializes the session with default values
 * 2. Loads user data when user logs in
 * 3. Syncs with database when needed
 */
export function useSessionInitialization() {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    initializeSession, 
    batchUpdateUserData,
    sessionState 
  } = useSessionStore();

  // Initialize session on app startup
  useEffect(() => {
    if (!sessionState.isInitialized && !authLoading) {
      console.log('🚀 App starting - initializing session...');
      initializeSession();
    }
  }, [sessionState.isInitialized, authLoading, initializeSession]);

  // Handle user login/logout
  useEffect(() => {
    if (sessionState.isInitialized && !authLoading) {
      if (user) {
        console.log('👤 User logged in - populating session...');
        handleUserLogin(user);
      } else {
        console.log('👤 User logged out - clearing user data...');
        handleUserLogout();
      }
    }
  }, [user, authLoading, sessionState.isInitialized]);

  const handleUserLogin = async (user: any) => {
    try {
      // Load user data from database
      const userData = await loadUserData();

      // Get current session state to preserve local data
      const currentState = useSessionStore.getState();
      
      // Merge database data with local session data
      batchUpdateUserData({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        },
        // Preserve local filters, merge with database preferences
        searchPreferences: {
          query: '',
          sort: userData.searchPreferences.sort || 'name_asc',
          page: 1,
          per_page: userData.searchPreferences.per_page || 24,
          filters: currentState.searchPreferences.filters || [], // Keep local filters, fallback to empty array
        },
        deckBuilder: userData.deckBuilder,
        // Merge local hand items with database hand items (deduplicate by card_id)
        handCart: {
          ...userData.handCart,
          handItems: (() => {
            const allItems = [
              ...currentState.handCart.handItems, // Keep local hand items
              ...userData.handCart.handItems, // Add database hand items
            ];
            
            // Deduplicate by card_id, keeping the item with higher quantity
            const deduplicated = new Map<number, CardRef>();
            allItems.forEach(item => {
              const existing = deduplicated.get(item.card_id);
              if (!existing || item.quantity > existing.quantity) {
                deduplicated.set(item.card_id, item);
              }
            });
            
            return Array.from(deduplicated.values());
          })(),
        },
        proxyPrinter: userData.proxyPrinter,
        sessionState: {
          ...currentState.sessionState,
          isLoggedIn: true,
          lastSync: new Date().toISOString(),
        },
      });

      console.log('✅ User session populated with database data');
    } catch (error) {
      console.error('❌ Failed to populate user session:', error);
    }
  };

  const handleUserLogout = () => {
    // Clear user-specific data but keep session structure
    // Use batch update to avoid multiple actions
    batchUpdateUserData({
      user: {
        id: null,
        username: null,
        email: null,
        role: null,
        display_name: null,
        avatar_url: null,
      },
      searchPreferences: {
        query: '',
        sort: 'name_asc',
        per_page: 24,
        page: 1,
        filters: [
          { type: 'and', field: 'game', value: 'Union Arena', displayText: 'Game: Union Arena' },
          { type: 'and', field: 'print_type', value: 'Basic', displayText: 'Basic Prints Only' },
          { type: 'and', field: 'ActionPointCost', value: '0', displayText: 'No Action Points' },
          { type: 'and', field: 'Rarity', value: 'Base', displayText: 'Base Rarity Only' },
        ],
      },
      deckBuilder: {
        ...useSessionStore.getState().deckBuilder,
        deckList: [],
      },
      handCart: {
        ...useSessionStore.getState().handCart,
        handItems: [],
      },
      proxyPrinter: {
        ...useSessionStore.getState().proxyPrinter,
        printList: [],
      },
      sessionState: {
        ...useSessionStore.getState().sessionState,
        isLoggedIn: false,
        lastSync: null,
      },
    });

    console.log('✅ User session cleared');
  };


  const loadUserData = async () => {
    try {
      console.log('🔄 Loading user data from database...');
      
      // Load user preferences from database
      const preferencesResponse = await fetch('/api/users/me/preferences', {
        credentials: 'include',
      });
      const preferencesData = preferencesResponse.ok ? await preferencesResponse.json() : { preferences: {} };
      
      // Load user's hand from database
      const handResponse = await fetch('/api/users/me/hand', {
        credentials: 'include',
      });
      const handData = handResponse.ok ? await handResponse.json() : { hand: [] };
      
      // Load user's deck IDs from database
      const decksResponse = await fetch('/api/user/decks', {
        credentials: 'include',
      });
      const decksData = decksResponse.ok ? await decksResponse.json() : { data: { deck_ids: [] } };

      console.log('✅ User data loaded from database');
      
      // If we migrated the sort value, save it back to the database
      if (preferencesData.preferences.default_sort === 'name') {
        console.log('🔄 Migrating user preferences in database from "name" to "name_asc"');
        try {
          await fetch('/api/users/me/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              preferences: {
                default_sort: 'name_asc',
                cards_per_page: preferencesData.preferences.cards_per_page || 24,
              }
            }),
          });
          console.log('✅ User preferences migrated in database');
        } catch (error) {
          console.error('❌ Failed to migrate user preferences:', error);
        }
      }
      
      return {
        searchPreferences: {
          sort: preferencesData.preferences.default_sort === 'name' ? 'name_asc' : (preferencesData.preferences.default_sort || 'name_asc'),
          per_page: preferencesData.preferences.cards_per_page || 24,
          defaultFilters: {
            basicPrintsOnly: true, // Default values for now
            noActionPoints: true,
            baseRarityOnly: true,
          },
          advancedFilters: [], // Session-only, not from database
        },
        deckBuilder: {
          ...useSessionStore.getState().deckBuilder,
          deckList: decksData.data?.deck_ids || [],
        },
        handCart: {
          ...useSessionStore.getState().handCart,
          handItems: compactHandItems(handData.hand || []),
        },
        proxyPrinter: {
          ...useSessionStore.getState().proxyPrinter,
          // Print list is session-only, not stored in database
        },
      };
    } catch (error) {
      console.error('Failed to load user data:', error);
      return {
        searchPreferences: {
          sort: 'name_asc',
          per_page: 24,
          defaultFilters: {
            basicPrintsOnly: true,
            noActionPoints: true,
            baseRarityOnly: true,
          },
          advancedFilters: [],
        },
        deckBuilder: {
          ...useSessionStore.getState().deckBuilder,
          deckList: [],
        },
        handCart: {
          ...useSessionStore.getState().handCart,
          handItems: [],
        },
        proxyPrinter: {
          ...useSessionStore.getState().proxyPrinter,
        },
      };
    }
  };
}
