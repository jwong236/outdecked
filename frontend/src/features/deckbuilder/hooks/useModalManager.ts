import { useState, useEffect, useCallback } from 'react';
import { CardCache } from '@/types/card';

/**
 * Custom hook to manage all modal states and card navigation in deck builder
 */
export function useModalManager(
  searchCache: CardCache,
  currentSearchResults: any[],
  currentExpandedCards: any[]
) {
  // Modal states
  const [showDeckSettingsModal, setShowDeckSettingsModal] = useState(false);
  const [showSearchSettingsModal, setShowSearchSettingsModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  
  // Card detail modal state
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [selectedCardSource, setSelectedCardSource] = useState<'search' | 'deck' | null>(null);
  
  // Recalculate selectedCardIndex when search results change (for search cards)
  useEffect(() => {
    if (selectedCard && selectedCardSource === 'search' && currentSearchResults.length > 0) {
      const newIndex = currentSearchResults.findIndex(c => c.product_id === selectedCard.product_id);
      if (newIndex !== -1 && newIndex !== selectedCardIndex) {
        setSelectedCardIndex(newIndex);
      }
    }
  }, [currentSearchResults, selectedCard, selectedCardSource, selectedCardIndex]);
  
  // Handle card click (open detail modal)
  const handleCardClick = useCallback((card: any, source: 'search' | 'deck' = 'search') => {
    // Get full card data from search cache using product_id
    const fullCardData = searchCache[card.product_id];
    
    if (fullCardData) {
      // Find the card in the appropriate array for navigation
      let index = 0;
      let allCards: any[] = [];
      
      if (source === 'search') {
        allCards = currentSearchResults;
        index = allCards.findIndex(c => c.product_id === card.product_id);
      } else {
        allCards = currentExpandedCards;
        index = allCards.findIndex(c => c.product_id === card.product_id);
      }
      
      setSelectedCard(fullCardData); // Use full card data from cache
      setSelectedCardIndex(index);
      setSelectedCardSource(source);
      
      // Card found in cache, proceed with modal
    } else {
      console.error('Card not found in cache:', card.product_id);
    }
  }, [searchCache, currentSearchResults, currentExpandedCards]);

  // Close card detail modal
  const handleCloseModal = useCallback(() => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setSelectedCardSource(null);
  }, []);

  // Navigate to next/previous card in modal
  const handleNavigate = useCallback((newIndex: number) => {
    let allCards: any[] = [];
    
    // Get the appropriate cards array based on source
    if (selectedCardSource === 'search') {
      // It's a search card - use current search results (maintains sort order)
      allCards = currentSearchResults;
    } else if (selectedCardSource === 'deck') {
      // It's a deck card - use the properly sorted expanded cards array
      allCards = currentExpandedCards;
    }
    
    // Navigate to the new index
    if (newIndex >= 0 && newIndex < allCards.length) {
      setSelectedCard(allCards[newIndex]);
      setSelectedCardIndex(newIndex);
    }
  }, [selectedCardSource, currentSearchResults, currentExpandedCards]);

  return {
    // Modal visibility states
    showDeckSettingsModal,
    setShowDeckSettingsModal,
    showSearchSettingsModal,
    setShowSearchSettingsModal,
    showCoverModal,
    setShowCoverModal,
    
    // Card detail modal state
    selectedCard,
    selectedCardIndex,
    selectedCardSource,
    
    // Card detail modal handlers
    handleCardClick,
    handleCloseModal,
    handleNavigate,
  };
}

