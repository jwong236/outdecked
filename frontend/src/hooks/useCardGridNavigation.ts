'use client';

import { useState, useCallback } from 'react';
import { ExpandedCard } from '@/types/card';

export type GridContext = 'search' | 'deckBuilderSearch' | 'deckBuilderDeck' | 'handCart' | 'proxyPrinter';

export interface UseCardGridNavigationProps {
  context: GridContext;
  cards: ExpandedCard[];
  onCardClick?: (card: ExpandedCard, source: GridContext) => void;
}

export interface UseCardGridNavigationReturn {
  // Navigation state
  selectedCard: ExpandedCard | null;
  selectedCardIndex: number;
  selectedCardSource: GridContext | null;
  
  // Navigation handlers
  handleCardClick: (card: ExpandedCard) => void;
  handleNavigate: (newIndex: number) => void;
  handleCloseModal: () => void;
  
  // Navigation props for CardDetailModal
  modalProps: {
    card: ExpandedCard | null;
    isOpen: boolean;
    onClose: () => void;
    allCards: ExpandedCard[];
    currentIndex: number;
    onNavigate: (newIndex: number) => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function useCardGridNavigation({
  context,
  cards,
  onCardClick,
}: UseCardGridNavigationProps): UseCardGridNavigationReturn {
  
  // Navigation state
  const [selectedCard, setSelectedCard] = useState<ExpandedCard | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [selectedCardSource, setSelectedCardSource] = useState<GridContext | null>(null);
  
  // Handle card click
  const handleCardClick = useCallback((card: ExpandedCard) => {
    const index = cards.findIndex(c => c.product_id === card.product_id);
    setSelectedCard(card);
    setSelectedCardIndex(index);
    setSelectedCardSource(context);
    
    // Call parent handler if provided
    onCardClick?.(card, context);
  }, [cards, context, onCardClick]);
  
  // Handle navigation
  const handleNavigate = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < cards.length) {
      setSelectedCard(cards[newIndex]);
      setSelectedCardIndex(newIndex);
    }
  }, [cards]);
  
  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setSelectedCardSource(null);
  }, []);
  
  // Modal props for CardDetailModal
  const modalProps = {
    card: selectedCard,
    isOpen: !!selectedCard,
    onClose: handleCloseModal,
    allCards: cards,
    currentIndex: selectedCardIndex,
    onNavigate: handleNavigate,
    hasNextPage: selectedCardIndex < cards.length - 1,
    hasPrevPage: selectedCardIndex > 0,
  };
  
  return {
    selectedCard,
    selectedCardIndex,
    selectedCardSource,
    handleCardClick,
    handleNavigate,
    handleCloseModal,
    modalProps,
  };
}
