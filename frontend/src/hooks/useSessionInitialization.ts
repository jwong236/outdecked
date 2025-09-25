import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { compactHandItems } from '@/lib/handUtils';
import { useAuth } from '@/features/auth/AuthContext';
import { useNotification } from '@/components/shared/NotificationContext';
import { CardRef } from '@/types/card';

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
  const { showNotification } = useNotification();
  
  // Track the last processed user to avoid duplicate login notifications
  const lastProcessedUserId = useRef<number | null>(null);

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
        // Only process if this is a new user (not a page refresh)
        if (lastProcessedUserId.current !== user.id) {
          console.log('👤 User logged in - populating session...');
          handleUserLogin(user, true); // true = show notification
          lastProcessedUserId.current = user.id;
        } else {
          console.log('👤 User session restored - populating session silently...');
          handleUserLogin(user, false); // false = no notification
        }
      } else {
        console.log('👤 User logged out - clearing user data...');
        handleUserLogout();
        lastProcessedUserId.current = null;
      }
    }
  }, [user, authLoading, sessionState.isInitialized]);

  const handleUserLogin = async (user: any, showLoginNotification: boolean = false) => {
    try {
      // Load user data from database
      const userData = await loadUserData();

      // Get current session state to preserve local data
      const currentState = useSessionStore.getState();
      
      // SESSION-WINS BEHAVIOR: Session data completely replaces account data
      batchUpdateUserData({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        },
        // Use account preferences for search settings (these are user preferences, not session data)
        searchPreferences: {
          query: '',
          sort: userData.searchPreferences.sort || 'name_asc',
          page: 1,
          per_page: userData.searchPreferences.per_page || 24,
          filters: [
            { type: 'and', field: 'PrintType', value: 'Base', displayText: 'Base Prints Only' },
            { type: 'not', field: 'CardType', value: 'Action Point', displayText: 'No Action Points' },
            { type: 'or', field: 'Rarity', value: 'Common', displayText: 'Base Rarity Only' },
            { type: 'or', field: 'Rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
            { type: 'or', field: 'Rarity', value: 'Rare', displayText: 'Base Rarity Only' },
            { type: 'or', field: 'Rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
          ],
        },
        // Use account deck builder data
        deckBuilder: userData.deckBuilder,
        // SESSION WINS: Current session cart completely replaces account cart
        handCart: currentState.handCart,
        // SESSION WINS: Current session proxy printer data is kept (doesn't sync to account anyway)
        proxyPrinter: currentState.proxyPrinter,
        sessionState: {
          ...currentState.sessionState,
          isLoggedIn: true,
          lastSync: new Date().toISOString(),
        },
      });

      console.log('✅ User logged in - session data preserved, account data loaded');
      
      // Show success notification only for genuine new logins
      if (showLoginNotification) {
        showNotification('Logged in successfully. Your current cart has been saved to your account.', 'success');
      }
    } catch (error) {
      console.error('❌ Failed to populate user session:', error);
    }
  };

  const handleUserLogout = () => {
    // Get current session state to preserve local data
    const currentState = useSessionStore.getState();
    
    // Clear user-specific data but preserve local session data (hand, proxy printer, etc.)
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
          { type: 'and', field: 'PrintType', value: 'Base', displayText: 'Base Prints Only' },
          { type: 'not', field: 'CardType', value: 'Action Point', displayText: 'No Action Points' },
          { type: 'or', field: 'Rarity', value: 'Common', displayText: 'Base Rarity Only' },
          { type: 'or', field: 'Rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
          { type: 'or', field: 'Rarity', value: 'Rare', displayText: 'Base Rarity Only' },
          { type: 'or', field: 'Rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
        ],
      },
      deckBuilder: {
        ...currentState.deckBuilder,
        deckList: [], // Clear user's deck list but keep current deck
      },
      // PRESERVE local session data - don't clear hand or proxy printer!
      handCart: currentState.handCart, // Keep hand items
      proxyPrinter: currentState.proxyPrinter, // Keep proxy printer data
      sessionState: {
        ...currentState.sessionState,
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
