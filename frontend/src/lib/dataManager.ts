import { Card } from '@/types/card';
import { apiConfig } from './apiConfig';

// Card reference for efficient storage
export interface CardReference {
  card_url: string;  // Unique identifier
  quantity: number;
  // Complete card data for offline viewing
  name?: string;
  image_url?: string | null;
  price?: number | null;
  id?: number;
  product_id?: number;
  clean_name?: string | null;
  game?: string;
  category_id?: number;
  group_id?: number;
  group_name?: string;
  group_abbreviation?: string;
  image_count?: number;
  is_presale?: boolean;
  released_on?: string;
  presale_note?: string;
  modified_on?: string;
  low_price?: number | null;
  mid_price?: number | null;
  high_price?: number | null;
  created_at?: string;
  // Dynamic attributes
  SeriesName?: string;
  Rarity?: string;
  Number?: string;
  CardType?: string;
  RequiredEnergy?: string;
  ActionPointCost?: string;
  ActivationEnergy?: string;
  Description?: string;
  GeneratedEnergy?: string;
  BattlePointBP?: string;
  Trigger?: string;
  Affinities?: string;
}

// Hand item extends Card with quantity
export interface HandItem extends Card {
  quantity: number;
}

// Deck structure
export interface Deck {
  id: string;
  name: string;
  game: string;
  cards: CardReference[];
  cover?: string; // URL of the cover card image
  createdAt: Date;
  updatedAt: Date;
  // Deck preferences (persistent)
  preferences?: {
    visibility: 'private' | 'public' | 'unlisted'; // Deck visibility
    defaultSeries?: string; // Default series filter for the deck
    defaultColorFilter?: string; // Single color filter for search
    printTypes: string[]; // Selected print types
    cardTypes: string[];  // Selected card types
    rarities: string[];   // Selected rarities
  };
  // Backend validation fields
  is_legal?: boolean; // Backend validation status
  validation_errors?: string[]; // Backend validation error messages
  total_cards?: number; // Total card count from backend
}

// Print list item
export interface PrintListItem extends CardReference {
  // Could add print-specific properties later
}

// Storage keys
const STORAGE_KEYS = {
  HAND: 'shoppingCart',
  DECKS: 'decks',
  CURRENT_DECK: 'currentDeck',
  PRINT_LIST: 'printList',
  DECK_COUNTER: 'deckCounter'
} as const;

class DataManager {
  // ===== HAND MANAGEMENT =====
  
  /**
   * Get all cards in hand
   */
  getHand(): HandItem[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = sessionStorage.getItem(STORAGE_KEYS.HAND);
      const result = data ? JSON.parse(data) : [];
      return result;
    } catch (error) {
      console.error('Error loading hand:', error);
      return [];
    }
  }

  /**
   * Set entire hand
   */
  setHand(items: HandItem[]): void {
    try {
      if (typeof window === 'undefined') return;
      
      
      // Always save to sessionStorage as backup
      sessionStorage.setItem(STORAGE_KEYS.HAND, JSON.stringify(items));
      
      // If user is logged in, also save to database
      this.saveHandToDatabase(items);
      
      this.notifyHandUpdate();
    } catch (error) {
      console.error('Error saving hand:', error);
    }
  }

  /**
   * Clear hand (for logout - doesn't save to database)
   */
  clearHand(): void {
    try {
      if (typeof window === 'undefined') return;
      
      // Clear from sessionStorage only
      sessionStorage.setItem(STORAGE_KEYS.HAND, JSON.stringify([]));
      
      this.notifyHandUpdate();
    } catch (error) {
      console.error('Error clearing hand:', error);
    }
  }

  /**
   * Add card to hand or update quantity
   */
  addToHand(card: Card, quantity: number = 1): void {
    const hand = this.getHand();
    const existingIndex = hand.findIndex(item => item.card_url === card.card_url);
    
    if (existingIndex >= 0) {
      hand[existingIndex].quantity += quantity;
    } else {
      hand.push({ ...card, quantity });
    }
    
    this.setHand(hand);
  }

  /**
   * Update quantity of specific card in hand
   */
  updateHandQuantity(cardUrl: string, change: number): void {
    const hand = this.getHand();
    const existingIndex = hand.findIndex(item => item.card_url === cardUrl);
    
    if (existingIndex >= 0) {
      const newQuantity = hand[existingIndex].quantity + change;
      
      if (newQuantity <= 0) {
        hand.splice(existingIndex, 1);
      } else {
        hand[existingIndex].quantity = newQuantity;
      }
      
      this.setHand(hand);
    }
  }

  /**
   * Remove specific card from hand
   */
  removeFromHand(cardUrl: string): void {
    const hand = this.getHand();
    const filteredHand = hand.filter(item => item.card_url !== cardUrl);
    this.setHand(filteredHand);
  }


  /**
   * Get total items in hand
   */
  getHandTotalItems(): number {
    const hand = this.getHand();
    return hand.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ===== DECK MANAGEMENT =====
  
  /**
   * Get all decks from sessionStorage only (DEPRECATED - no longer used)
   */
  private _getDecksSync(): Deck[] {
    // This method is deprecated - all deck data should come from API
    console.warn('_getDecksSync is deprecated - all deck data should come from API');
    return [];
  }

  /**
   * Get all decks from API only
   */
  async getDecks(): Promise<Deck[]> {
    try {
      if (typeof window === 'undefined') return [];
      
      // Clear deck-related sessionStorage to prevent conflicts (but preserve hand data)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEYS.DECKS);
        sessionStorage.removeItem('decks'); // Also try the direct key
        sessionStorage.removeItem('outdecked_decks'); // Also try potential other keys
        // Removed sessionStorage.clear() to preserve hand data
      }
      
      const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.decks)) {
          
          // Convert backend format to frontend format
          const convertedDecks = data.decks.map(this.convertBackendDeckToFrontend.bind(this));
          
          // Deduplicate by ID to prevent any duplication issues
          const uniqueDecks = convertedDecks.reduce((acc: Deck[], deck: Deck) => {
            if (!acc.find(d => d.id === deck.id)) {
              acc.push(deck);
            }
            return acc;
          }, []);
          
          return uniqueDecks;
        }
      }
      
      console.warn('Failed to fetch decks from API');
      return [];
    } catch (error) {
      console.error('Error loading decks:', error);
      return [];
    }
  }

  /**
   * Convert backend deck format to frontend deck format
   */
  private convertBackendDeckToFrontend(backendDeck: any): Deck {
    return {
      id: backendDeck.id,
      name: backendDeck.name,
      game: backendDeck.game,
      cards: backendDeck.cards || [],
      cover: backendDeck.cover,
      createdAt: new Date(backendDeck.created_date),
      updatedAt: new Date(backendDeck.last_modified),
      preferences: {
        visibility: backendDeck.visibility || 'private',
        defaultSeries: backendDeck.defaultSeries || '',
        defaultColorFilter: backendDeck.savedDefaultFilters?.defaultColorFilter || '',
        printTypes: backendDeck.savedDefaultFilters?.printTypes || [],
        cardTypes: backendDeck.savedDefaultFilters?.cardTypes || [],
        rarities: backendDeck.savedDefaultFilters?.rarities || []
      },
      is_legal: backendDeck.is_legal,
      validation_errors: backendDeck.validation_errors,
      total_cards: backendDeck.total_cards
    };
  }

  /**
   * Get the current active deck from sessionStorage
   */
  getCurrentDeck(): Deck | null {
    try {
      if (typeof window === 'undefined') return null;
      const data = sessionStorage.getItem(STORAGE_KEYS.CURRENT_DECK);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading current deck:', error);
      return null;
    }
  }

  /**
   * Set the current active deck in sessionStorage
   */
  setCurrentDeck(deck: Deck): void {
    try {
      if (typeof window === 'undefined') return;
      console.log('🟢 SESSION: Creating currentDeck in sessionStorage:', { id: deck.id, name: deck.name });
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_DECK, JSON.stringify(deck));
    } catch (error) {
      console.error('Error saving current deck:', error);
    }
  }

  /**
   * Clear current deck from sessionStorage
   */
  clearCurrentDeck(): void {
    try {
      if (typeof window === 'undefined') return;
      console.log('🔴 SESSION: Deleting currentDeck from sessionStorage');
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_DECK);
    } catch (error) {
      console.error('Error clearing current deck:', error);
    }
  }

  /**
   * Create new deck (save to API only)
   */
  async createDeck(name?: string, game?: string, visibility?: 'private' | 'public' | 'unlisted', defaultSeries?: string, filterSettings?: { preferences: any }): Promise<Deck> {
    
    const counter = this.getDeckCounter();
    const deckName = name || `Deck ${counter + 1}`;
    
    const newDeck: Deck = {
      id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: deckName,
      game: game || 'Union Arena',
      cards: [],
      preferences: filterSettings?.preferences || {
        visibility: visibility || 'private',
        defaultSeries: defaultSeries || '',
        defaultColorFilter: '',
        printTypes: ['Base'], // Default: Basic Prints Only
        cardTypes: ['Action Point'], // Default: No Action Points
        rarities: ['Common', 'Uncommon', 'Rare', 'Super Rare'] // Default: Base Rarity Only
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    
    try {
      const backendDeck = this.convertFrontendDeckToBackend(newDeck);
      
      const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(backendDeck)
      });
      
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.deck) {
          // Use the deck data returned from the API (with proper ID, timestamps, etc.)
          const apiDeck = this.convertBackendDeckToFrontend(data.deck);
          this.incrementDeckCounter();
          return apiDeck;
        } else {
          console.error('🔧 DataManager.createDeck: API returned success=false or no deck data:', data);
        }
      } else {
        const errorText = await response.text();
        console.error('🔧 DataManager.createDeck: API error response:', response.status, errorText);
      }
      
      throw new Error(`Failed to create deck: ${response.status}`);
    } catch (error) {
      console.error('🔧 DataManager.createDeck: Exception caught:', error);
      throw error;
    }
  }

  /**
   * Update deck name (deprecated - use updateDeck instead)
   */
  updateDeckName(deckId: string, newName: string): void {
    // This method is deprecated - deck name updates should go through updateDeck API call
    console.warn('updateDeckName is deprecated - use updateDeck instead');
  }

  /**
   * Update entire deck (save to both API and optionally sessionStorage)
   */
  async updateDeck(deck: Deck, updateSession: boolean = true): Promise<void> {
    try {
      const updatedDeck = { ...deck, updatedAt: new Date() };
      
      const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deck.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(this.convertFrontendDeckToBackend(updatedDeck))
      });
      
      if (!response.ok) {
        throw new Error(`API save failed: ${response.status}`);
      }
      
      // Also save to sessionStorage for immediate UI updates (only if requested)
      if (updateSession) {
        this.setCurrentDeck(updatedDeck);
      }
      console.log('✅ Deck saved to database');
    } catch (error) {
      console.error('Error updating deck:', error);
      throw error;
    }
  }

  /**
   * Convert frontend deck format to backend deck format
   */
  private convertFrontendDeckToBackend(frontendDeck: Deck): any {
    return {
      id: frontendDeck.id,
      name: frontendDeck.name,
      game: frontendDeck.game,
      visibility: frontendDeck.preferences?.visibility || 'private',
      cards: frontendDeck.cards,
      cover: frontendDeck.cover,
      defaultSeries: frontendDeck.preferences?.defaultSeries || '',
      defaultFilters: {}, // No longer used
      savedDefaultFilters: {
        printTypes: frontendDeck.preferences?.printTypes || [],
        cardTypes: frontendDeck.preferences?.cardTypes || [],
        rarities: frontendDeck.preferences?.rarities || [],
        colors: [], // No longer used
        defaultColorFilter: frontendDeck.preferences?.defaultColorFilter || ''
      },
      is_legal: frontendDeck.is_legal,
      validation_errors: frontendDeck.validation_errors,
      total_cards: frontendDeck.total_cards
    };
  }

  /**
   * Save default filters to deck (deprecated - use updateDeck instead)
   */
  saveDefaultFiltersToDeck(deckId: string, cardTypes: string[], rarities: string[], colors: string[]): void {
    // This method is deprecated - filter updates should go through updateDeck API call
    console.warn('saveDefaultFiltersToDeck is deprecated - use updateDeck instead');
  }

  /**
   * Load default filters from deck (deprecated - deck data should come from API)
   */
  loadDefaultFiltersFromDeck(deckId: string): { cardTypes: string[], rarities: string[], colors: string[] } | null {
    // This method is deprecated - deck data should be loaded from API
    console.warn('loadDefaultFiltersFromDeck is deprecated - load deck data from API instead');
    return null;
  }

  /**
   * Add cards to deck
   */
  addCardsToDeck(deckId: string, cards: HandItem[]): void {
    // This method is deprecated - card updates should go through updateDeck API call
    console.warn('addCardsToDeck is deprecated - use updateDeck instead');
  }

  /**
   * Get specific deck by ID (deprecated - load deck data from API instead)
   */
  async getDeck(deckId: string): Promise<Deck | null> {
    try {
      const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckId}`), {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.deck) {
          return this.convertBackendDeckToFrontend(data.deck);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error loading deck:', error);
      return null;
    }
  }

  /**
   * Remove deck (deprecated - use deleteDeck API call instead)
   */
  removeDeck(deckId: string): void {
    // This method is deprecated - deck deletion should go through deleteDeck API call
    console.warn('removeDeck is deprecated - use deleteDeck instead');
  }


  // ===== PRINT LIST MANAGEMENT =====
  
  /**
   * Get print list
   */
  getPrintList(): PrintListItem[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = sessionStorage.getItem(STORAGE_KEYS.PRINT_LIST);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading print list:', error);
      return [];
    }
  }

  /**
   * Add cards to print list
   */
  addToPrintList(cards: HandItem[]): void {
    const printList = this.getPrintList();
    
    cards.forEach(card => {
      const cardRef: PrintListItem = {
        card_url: card.card_url!,
        quantity: card.quantity,
        name: card.name,
        image_url: card.image_url,
        price: card.price,
        group_id: card.group_id,
        group_name: card.group_name,
        group_abbreviation: card.group_abbreviation
      };
      
      const existingIndex = printList.findIndex(item => item.card_url === cardRef.card_url);
      if (existingIndex >= 0) {
        printList[existingIndex].quantity += cardRef.quantity;
      } else {
        printList.push(cardRef);
      }
    });
    
    this.setPrintList(printList);
  }


  /**
   * Clear print list
   */
  clearPrintList(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEYS.PRINT_LIST);
    this.notifyPrintListUpdate();
  }

  /**
   * Get total items in print list
   */
  getPrintListTotalItems(): number {
    const printList = this.getPrintList();
    return printList.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ===== UTILITY METHODS =====
  
  /**
   * Convert card references back to full cards (for display)
   * This would typically fetch from API in the future
   */
  async expandCardReferences(references: CardReference[]): Promise<Card[]> {
    // For now, return minimal card objects
    // In the future, this would make API calls to get full card data
    return references.map(ref => ({
      id: 0, // Would be fetched from API
      product_id: 0, // Would be fetched from API
      name: ref.name || 'Unknown Card',
      clean_name: null,
      image_url: ref.image_url || null,
      card_url: ref.card_url,
      price: ref.price || 0,
      // Add other required Card properties as needed
    } as Card));
  }

  /**
   * Get deck counter for auto-naming
   */
  private getDeckCounter(): number {
    try {
      if (typeof window === 'undefined') return 0;
      const counter = sessionStorage.getItem(STORAGE_KEYS.DECK_COUNTER);
      return counter ? parseInt(counter) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Increment deck counter
   */
  private incrementDeckCounter(): void {
    if (typeof window === 'undefined') return;
    const counter = this.getDeckCounter();
    sessionStorage.setItem(STORAGE_KEYS.DECK_COUNTER, (counter + 1).toString());
  }

  /**
   * Set decks (public method for clearing decks on logout)
   */
  setDecks(decks: Deck[]): void {
    this._setDecks(decks);
  }

  /**
   * Clear decks (for logout - doesn't save to database)
   */
  clearDecks(): void {
    try {
      if (typeof window === 'undefined') return;
      
      // SessionStorage now handled by sessionStore - don't create old keys
      // sessionStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing decks:', error);
    }
  }

  /**
   * Set decks (private method)
   */
  private _setDecks(decks: Deck[]): void {
    if (typeof window === 'undefined') return;
    // SessionStorage now handled by sessionStore - don't create old keys
    // sessionStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
    
    // If user is logged in, also save to database
    this.saveDecksToDatabase(decks);
  }

  /**
   * Save decks to database (private, async)
   */
  private async saveDecksToDatabase(decks: Deck[]): Promise<void> {
    try {
      // Save each deck individually using the proper /api/decks endpoint
      // This ensures backend validation is applied
      for (const deck of decks) {
        const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            id: deck.id,
            name: deck.name,
            game: deck.game,
            cards: deck.cards,
            visibility: deck.preferences?.visibility || 'private',
            cover: deck.cover,
            defaultSeries: deck.preferences?.defaultSeries || ''
          }),
        });

        if (!response.ok) {
          if (response.status === 401) {
            // User not logged in - skip this deck
            continue;
          }
          console.error(`Failed to save deck ${deck.id} to database:`, response.statusText);
        }
      }
    } catch (error) {
      // Network error or user not logged in - this is fine, sessionStorage will handle it
    }
  }

  /**
   * Load decks from database (async)
   */
  async loadDecksFromDatabase(): Promise<Deck[]> {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.decks) {
          // Save to sessionStorage as backup
          sessionStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(data.decks));
          return data.decks;
        }
      } else if (response.status === 401) {
        // User not logged in - keep current sessionStorage decks
        return this.getDecks();
      } else if (response.status === 404) {
        // No decks found - this is normal for new users
        return [];
      } else {
        console.error('Failed to load decks from database:', response.status, response.statusText);
      }
    } catch (error) {
    }
    
    // Fallback to sessionStorage
    return this.getDecks();
  }

  /**
   * Set print list
   */
  setPrintList(printList: PrintListItem[]): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEYS.PRINT_LIST, JSON.stringify(printList));
    this.notifyPrintListUpdate();
  }

  /**
   * Notify components of hand updates
   */
  private notifyHandUpdate(): void {
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  }

  /**
   * Notify components of print list updates
   */
  private notifyPrintListUpdate(): void {
    window.dispatchEvent(new CustomEvent('printListUpdated'));
  }

  /**
   * Save hand to database (if user is logged in)
   */
  private async saveHandToDatabase(items: HandItem[]): Promise<void> {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/users/me/hand'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ hand: items }),
      });

      if (!response.ok) {
        // If user is not logged in, this is expected - just use sessionStorage
        if (response.status === 401) {
          return;
        } else if (response.status === 404) {
          // API endpoint not found - this might be normal for some endpoints
          return;
        }
        console.error('Failed to save hand to database:', response.status, response.statusText);
      }
    } catch (error) {
      // Network error or user not logged in - this is fine, sessionStorage will handle it
    }
  }

  /**
   * Load hand from database (if user is logged in)
   */
  async loadHandFromDatabase(): Promise<void> {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/users/me/hand'), {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const dbHand = data.hand || [];
        
        // Replace current hand with database hand
        this.setHand(dbHand);
      } else if (response.status === 401) {
        // User not logged in - keep current sessionStorage hand
        return;
      } else if (response.status === 404) {
        // No hand found - this is normal for new users
        return;
      } else {
        console.error('Failed to load hand from database:', response.status, response.statusText);
      }
    } catch (error) {
    }
  }

  /**
   * Delete deck (API only)
   */
  async deleteDeck(deckId: string): Promise<void> {
    try {
      const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckId}`), { 
        method: 'DELETE',
        credentials: 'include',
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`API delete failed: ${response.status} - ${responseData.error || 'Unknown error'}`);
      }
      
      // Remove from sessionStorage after successful deletion
      const currentDecks = await this.getDecks();
      const updatedDecks = currentDecks.filter(deck => deck.id !== deckId);
      sessionStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(updatedDecks));
      
      // Also clear current deck if it's the one being deleted
      const currentDeck = this.getCurrentDeck();
      if (currentDeck && currentDeck.id === deckId) {
        this.clearCurrentDeck();
      }
      
    } catch (error) {
      console.error('Error deleting deck:', error);
      throw error;
    }
  }


}

// Export singleton instance
export const dataManager = new DataManager();
export default dataManager;

