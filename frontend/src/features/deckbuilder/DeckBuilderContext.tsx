'use client';

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { dataManager, Deck, CardReference } from '../../lib/dataManager';
import { Card } from '@/types/card';
import { DeckValidation, analyzeDeck } from '@/lib/deckValidation';

// Types
interface DeckBuilderState {
  currentDeck: Deck | null;
  deckCards: Card[];
  isLoading: boolean;
  deckName: string;
  originalDeckName: string;
  hasUnsavedNameChanges: boolean;
  deckSortBy: string;
  selectedCard: Card | null;
  selectedCardIndex: number;
  isModalOpen: boolean;
  showSignInModal: boolean;
  showMoveConfirmModal: boolean;
  moveMessage: string;
  showGoToSearch: boolean;
  showPrintConfirmModal: boolean;
  showCoverModal: boolean;
  showDecklistModal: boolean;
  showCoverSelectionModal: boolean;
  showAdvancedFiltersModal: boolean;
  showClearDeckModal: boolean;
}

type DeckBuilderAction =
  | { type: 'SET_CURRENT_DECK'; payload: Deck | null }
  | { type: 'SET_DECK_CARDS'; payload: Card[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DECK_NAME'; payload: string }
  | { type: 'SET_ORIGINAL_DECK_NAME'; payload: string }
  | { type: 'SET_HAS_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'SET_DECK_SORT_BY'; payload: string }
  | { type: 'SET_SELECTED_CARD'; payload: { card: Card | null; index: number } }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_SHOW_SIGN_IN_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_MOVE_CONFIRM_MODAL'; payload: boolean }
  | { type: 'SET_MOVE_MESSAGE'; payload: string }
  | { type: 'SET_SHOW_GO_TO_SEARCH'; payload: boolean }
  | { type: 'SET_SHOW_PRINT_CONFIRM_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_COVER_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_DECKLIST_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_COVER_SELECTION_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_ADVANCED_FILTERS_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_CLEAR_DECK_MODAL'; payload: boolean }
  | { type: 'UPDATE_DECK_CARD_QUANTITY'; payload: { card: Card; change: number } }
  | { type: 'CLEAR_DECK' }
  | { type: 'RESET_MODALS' };

// Initial state
const initialState: DeckBuilderState = {
  currentDeck: null,
  deckCards: [],
  isLoading: false,
  deckName: 'New Deck',
  originalDeckName: 'New Deck',
  hasUnsavedNameChanges: false,
  deckSortBy: 'required_energy',
  selectedCard: null,
  selectedCardIndex: 0,
  isModalOpen: false,
  showSignInModal: false,
  showMoveConfirmModal: false,
  moveMessage: '',
  showGoToSearch: false,
  showPrintConfirmModal: false,
  showCoverModal: false,
  showDecklistModal: false,
  showCoverSelectionModal: false,
  showAdvancedFiltersModal: false,
  showClearDeckModal: false,
};

// Reducer
function deckBuilderReducer(state: DeckBuilderState, action: DeckBuilderAction): DeckBuilderState {
  switch (action.type) {
    case 'SET_CURRENT_DECK':
      return { ...state, currentDeck: action.payload };
    case 'SET_DECK_CARDS':
      return { ...state, deckCards: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_DECK_NAME':
      return { ...state, deckName: action.payload };
    case 'SET_ORIGINAL_DECK_NAME':
      return { ...state, originalDeckName: action.payload };
    case 'SET_HAS_UNSAVED_CHANGES':
      return { ...state, hasUnsavedNameChanges: action.payload };
    case 'SET_DECK_SORT_BY':
      return { ...state, deckSortBy: action.payload };
    case 'SET_SELECTED_CARD':
      return { 
        ...state, 
        selectedCard: action.payload.card, 
        selectedCardIndex: action.payload.index 
      };
    case 'SET_MODAL_OPEN':
      return { ...state, isModalOpen: action.payload };
    case 'SET_SHOW_SIGN_IN_MODAL':
      return { ...state, showSignInModal: action.payload };
    case 'SET_SHOW_MOVE_CONFIRM_MODAL':
      return { ...state, showMoveConfirmModal: action.payload };
    case 'SET_MOVE_MESSAGE':
      return { ...state, moveMessage: action.payload };
    case 'SET_SHOW_GO_TO_SEARCH':
      return { ...state, showGoToSearch: action.payload };
    case 'SET_SHOW_PRINT_CONFIRM_MODAL':
      return { ...state, showPrintConfirmModal: action.payload };
    case 'SET_SHOW_COVER_MODAL':
      return { ...state, showCoverModal: action.payload };
    case 'SET_SHOW_DECKLIST_MODAL':
      return { ...state, showDecklistModal: action.payload };
    case 'SET_SHOW_COVER_SELECTION_MODAL':
      return { ...state, showCoverSelectionModal: action.payload };
    case 'SET_SHOW_ADVANCED_FILTERS_MODAL':
      return { ...state, showAdvancedFiltersModal: action.payload };
    case 'SET_SHOW_CLEAR_DECK_MODAL':
      return { ...state, showClearDeckModal: action.payload };
    case 'UPDATE_DECK_CARD_QUANTITY':
      const updatedDeck = updateDeckCardQuantity(state.currentDeck, action.payload.card, action.payload.change);
      // Convert deck cards to Card format for display
      const updatedDeckCards: Card[] = updatedDeck?.cards.map(deckItem => {
        const baseCard = {
          id: deckItem.id || 0,
          product_id: deckItem.product_id || 0,
          name: deckItem.name ?? '',
          clean_name: deckItem.clean_name || null,
          image_url: deckItem.image_url ?? null,
          card_url: deckItem.card_url,
          game: deckItem.game ?? '',
          category_id: deckItem.category_id || 0,
          group_id: deckItem.group_id || 0,
          group_name: deckItem.group_name,
          group_abbreviation: deckItem.group_abbreviation,
          image_count: deckItem.image_count || 0,
          is_presale: deckItem.is_presale || false,
          released_on: deckItem.released_on || '',
          presale_note: deckItem.presale_note || '',
          modified_on: deckItem.modified_on || '',
          price: deckItem.price || 0,
          low_price: deckItem.low_price || null,
          mid_price: deckItem.mid_price || null,
          high_price: deckItem.high_price || null,
          created_at: deckItem.created_at || '',
          quantity: deckItem.quantity
        };
        
        const dynamicAttrs: any = {};
        if (deckItem.SeriesName) dynamicAttrs.SeriesName = deckItem.SeriesName;
        if (deckItem.Rarity) dynamicAttrs.Rarity = deckItem.Rarity;
        if (deckItem.Number) dynamicAttrs.Number = deckItem.Number;
        if (deckItem.CardType) dynamicAttrs.CardType = deckItem.CardType;
        if (deckItem.RequiredEnergy) dynamicAttrs.RequiredEnergy = deckItem.RequiredEnergy;
        if (deckItem.Trigger) dynamicAttrs.Trigger = deckItem.Trigger;
        if (deckItem.Affinities) dynamicAttrs.Affinities = deckItem.Affinities;
        
        return { ...baseCard, ...dynamicAttrs };
      }) || [];
      
      return { 
        ...state, 
        currentDeck: updatedDeck,
        deckCards: updatedDeckCards
      };
    case 'CLEAR_DECK':
      return { 
        ...state, 
        currentDeck: state.currentDeck ? { ...state.currentDeck, cards: [], updatedAt: new Date() } : null,
        deckCards: []
      };
    case 'RESET_MODALS':
      return {
        ...state,
        isModalOpen: false,
        showSignInModal: false,
        showMoveConfirmModal: false,
        showGoToSearch: false,
        showPrintConfirmModal: false,
        showCoverModal: false,
        showDecklistModal: false,
        showCoverSelectionModal: false,
        showAdvancedFiltersModal: false,
        showClearDeckModal: false,
      };
    default:
      return state;
  }
}

// Helper function to update deck card quantity
function updateDeckCardQuantity(currentDeck: Deck | null, card: Card, change: number): Deck | null {
  if (!currentDeck || !card.card_url) return currentDeck;

  const existingCard = currentDeck.cards.find(c => c.card_url === card.card_url || c.image_url === card.image_url);
  const currentQuantity = existingCard?.quantity || 0;
  const newQuantity = currentQuantity + change;

  if (newQuantity <= 0) {
    // Remove card from deck
    const updatedCards = currentDeck.cards.filter(c => c.card_url !== card.card_url && c.image_url !== card.image_url);
    const updatedDeck: Deck = {
      ...currentDeck,
      cards: updatedCards,
      updatedAt: new Date()
    };
    
    // Update cover if deck becomes empty
    if (updatedCards.length === 0) {
      updatedDeck.cover = undefined;
    }
    
    // Don't make API call immediately - keep in session only
    return updatedDeck;
  } else {
    // Update or add card
    const updatedCards = existingCard
      ? currentDeck.cards.map(c => 
          (c.card_url === card.card_url || c.image_url === card.image_url)
            ? { ...c, quantity: newQuantity }
            : c
        )
      : [...currentDeck.cards, { 
          card_url: card.card_url!, 
          quantity: newQuantity,
          name: card.name,
          image_url: card.image_url,
          price: card.price,
          // Store all card attributes for complete data
          id: card.id,
          product_id: card.product_id,
          clean_name: card.clean_name,
          game: card.game,
          category_id: card.category_id,
          group_id: card.group_id,
          group_name: card.group_name,
          group_abbreviation: card.group_abbreviation,
          image_count: card.image_count,
          is_presale: card.is_presale,
          released_on: card.released_on,
          presale_note: card.presale_note,
          modified_on: card.modified_on,
          low_price: card.low_price,
          mid_price: card.mid_price,
          high_price: card.high_price,
          created_at: card.created_at,
          // Dynamic attributes
          SeriesName: card.SeriesName,
          Rarity: card.Rarity,
          Number: card.Number,
          CardType: card.CardType,
          RequiredEnergy: card.RequiredEnergy,
          ActionPointCost: card.ActionPointCost,
          ActivationEnergy: card.ActivationEnergy,
          Description: card.Description,
          GeneratedEnergy: card.GeneratedEnergy,
          BattlePointBP: card.BattlePointBP,
          Trigger: card.Trigger,
          Affinities: card.Affinities
        } as CardReference];

    const updatedDeck: Deck = {
      ...currentDeck,
      cards: updatedCards,
      updatedAt: new Date()
    };
    
    // Set cover if deck is valid and no cover exists
    if (!updatedDeck.cover && updatedCards.length > 0) {
      const isDeckValid = updatedDeck.is_legal !== undefined ? updatedDeck.is_legal : 
        analyzeDeck(updatedCards.map(cardRef => ({
          ...cardRef,
          quantity: cardRef.quantity,
          Trigger: cardRef.Trigger || '',
          name: cardRef.name || 'Unknown Card'
        } as any))).isValid;
      
      if (isDeckValid) {
        // Find the most expensive card
        let mostExpensiveCard: any = null;
        let highestPrice = 0;
        
        updatedCards.forEach(deckCard => {
          if (deckCard.price && deckCard.price > highestPrice) {
            highestPrice = deckCard.price;
            mostExpensiveCard = deckCard;
          }
        });
        
        if (mostExpensiveCard && mostExpensiveCard.image_url) {
          updatedDeck.cover = mostExpensiveCard.image_url;
        }
      }
    }
    
    // Don't make API call immediately - keep in session only
    return updatedDeck;
  }
}

// Context
const DeckBuilderContext = createContext<{
  state: DeckBuilderState;
  dispatch: React.Dispatch<DeckBuilderAction>;
} | null>(null);

// Provider
export function DeckBuilderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(deckBuilderReducer, initialState);

  return (
    <DeckBuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </DeckBuilderContext.Provider>
  );
}

// Hook
export function useDeckBuilder() {
  const context = useContext(DeckBuilderContext);
  if (!context) {
    throw new Error('useDeckBuilder must be used within a DeckBuilderProvider');
  }
  return context;
}

// Memoized selectors
export const useDeckBuilderSelectors = () => {
  const { state } = useDeckBuilder();
  
  return useMemo(() => ({
    currentDeck: state.currentDeck,
    deckCards: state.deckCards,
    isLoading: state.isLoading,
    deckName: state.deckName,
    originalDeckName: state.originalDeckName,
    hasUnsavedNameChanges: state.hasUnsavedNameChanges,
    deckSortBy: state.deckSortBy,
    selectedCard: state.selectedCard,
    selectedCardIndex: state.selectedCardIndex,
    isModalOpen: state.isModalOpen,
    modals: {
      showSignInModal: state.showSignInModal,
      showMoveConfirmModal: state.showMoveConfirmModal,
      showPrintConfirmModal: state.showPrintConfirmModal,
      showCoverModal: state.showCoverModal,
      showDecklistModal: state.showDecklistModal,
      showCoverSelectionModal: state.showCoverSelectionModal,
      showAdvancedFiltersModal: state.showAdvancedFiltersModal,
      showClearDeckModal: state.showClearDeckModal,
    },
    moveMessage: state.moveMessage,
    showGoToSearch: state.showGoToSearch,
  }), [state]);
};

// Action creators
export const useDeckBuilderActions = () => {
  const { dispatch } = useDeckBuilder();
  
  return useMemo(() => ({
    setCurrentDeck: (deck: Deck | null) => dispatch({ type: 'SET_CURRENT_DECK', payload: deck }),
    setDeckCards: (cards: Card[]) => dispatch({ type: 'SET_DECK_CARDS', payload: cards }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setDeckName: (name: string) => dispatch({ type: 'SET_DECK_NAME', payload: name }),
    setOriginalDeckName: (name: string) => dispatch({ type: 'SET_ORIGINAL_DECK_NAME', payload: name }),
    setHasUnsavedChanges: (hasChanges: boolean) => dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: hasChanges }),
    setDeckSortBy: (sortBy: string) => dispatch({ type: 'SET_DECK_SORT_BY', payload: sortBy }),
    setSelectedCard: (card: Card | null, index: number) => dispatch({ type: 'SET_SELECTED_CARD', payload: { card, index } }),
    setModalOpen: (open: boolean) => dispatch({ type: 'SET_MODAL_OPEN', payload: open }),
    setShowSignInModal: (show: boolean) => dispatch({ type: 'SET_SHOW_SIGN_IN_MODAL', payload: show }),
    setShowMoveConfirmModal: (show: boolean) => dispatch({ type: 'SET_SHOW_MOVE_CONFIRM_MODAL', payload: show }),
    setMoveMessage: (message: string) => dispatch({ type: 'SET_MOVE_MESSAGE', payload: message }),
    setShowGoToSearch: (show: boolean) => dispatch({ type: 'SET_SHOW_GO_TO_SEARCH', payload: show }),
    setShowPrintConfirmModal: (show: boolean) => dispatch({ type: 'SET_SHOW_PRINT_CONFIRM_MODAL', payload: show }),
    setShowCoverModal: (show: boolean) => dispatch({ type: 'SET_SHOW_COVER_MODAL', payload: show }),
    setShowDecklistModal: (show: boolean) => dispatch({ type: 'SET_SHOW_DECKLIST_MODAL', payload: show }),
    setShowCoverSelectionModal: (show: boolean) => dispatch({ type: 'SET_SHOW_COVER_SELECTION_MODAL', payload: show }),
    setShowAdvancedFiltersModal: (show: boolean) => dispatch({ type: 'SET_SHOW_ADVANCED_FILTERS_MODAL', payload: show }),
    setShowClearDeckModal: (show: boolean) => dispatch({ type: 'SET_SHOW_CLEAR_DECK_MODAL', payload: show }),
    updateDeckCardQuantity: (card: Card, change: number) => dispatch({ type: 'UPDATE_DECK_CARD_QUANTITY', payload: { card, change } }),
    clearDeck: () => dispatch({ type: 'CLEAR_DECK' }),
    resetModals: () => dispatch({ type: 'RESET_MODALS' }),
  }), [dispatch]);
};
