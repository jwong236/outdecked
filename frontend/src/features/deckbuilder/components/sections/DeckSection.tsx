'use client';

import React from 'react';
import { GroupedDeckGrid } from '../grids/GroupedDeckGrid';
import { DeckValidation } from '@/lib/deckValidation';
import { useSessionStore } from '@/stores/sessionStore';

interface DeckSectionProps {
  searchCache: Record<string, any>;
  setSearchCache: (updater: (prev: Record<string, any>) => Record<string, any>) => void;
  onCardClick?: (card: any) => void;
  onQuantityChange?: (card: any, change: number) => void;
}

export const DeckSection = React.memo(function DeckSection({ searchCache, setSearchCache, onCardClick, onQuantityChange }: DeckSectionProps) {
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // Track which cards we've already requested to prevent infinite loops
  const requestedCardsRef = React.useRef<Set<string>>(new Set());
  
  // Function to fetch missing card data
  const fetchMissingCardData = React.useCallback(async (cardIds: string[]) => {
    try {
      console.log('🃏 DeckSection: Fetching missing card data for:', cardIds);
      const response = await fetch('/api/cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: cardIds }),
      });
      
      if (response.ok) {
        const cards = await response.json();
        console.log('🃏 DeckSection: API returned cards:', cards);
        setSearchCache(prev => {
          const newCache = { ...prev };
          cards.forEach((card: any) => {
            console.log('🃏 DeckSection: Caching card with product_id:', card.product_id, 'for request:', cardIds);
            newCache[card.product_id] = card;
          });
          return newCache;
        });
        console.log('✅ DeckSection: Fetched and cached card data');
      } else {
        console.error('❌ DeckSection: Failed to fetch card data:', response.status);
      }
    } catch (error) {
      console.error('❌ DeckSection: Error fetching card data:', error);
    }
  }, [setSearchCache]);
  
  // Create deck cards array - cards now only store card_id and quantity, get full data from cache
  const deckCards = React.useMemo(() => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !(currentDeck as any).cards) {
      return [];
    }
    
    return (currentDeck as any).cards.map((deckCard: any) => {
      // Get full card data from cache using string key
      const cardIdStr = deckCard.card_id.toString();
      const fullCardData = searchCache[cardIdStr];
      if (fullCardData) {
        return {
          ...fullCardData,
          quantity: deckCard.quantity
        };
      } else {
        // Fallback for missing cache data
        return {
          id: deckCard.card_id,
          quantity: deckCard.quantity,
          name: `Card ${deckCard.card_id}`,
          image_url: '',
          card_url: '',
        };
      }
    });
  }, [(currentDeck as any)?.cards, searchCache]);
  
  // Auto-fetch missing card data when deck changes
  React.useEffect(() => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !(currentDeck as any).cards) {
      return;
    }
    
    const deckCards = (currentDeck as any).cards;
    const missingCardIds = deckCards
      .filter((deckCard: any) => {
        const cardIdStr = deckCard.card_id.toString();
        return !searchCache[cardIdStr] && !requestedCardsRef.current.has(cardIdStr);
      })
      .map((deckCard: any) => deckCard.card_id.toString());
    
    if (missingCardIds.length > 0) {
      console.log('🃏 DeckSection: Found missing card data, fetching:', missingCardIds);
      // Mark these cards as requested to prevent duplicate requests
      missingCardIds.forEach((id: string) => requestedCardsRef.current.add(id));
      fetchMissingCardData(missingCardIds);
    }
  }, [(currentDeck as any)?.cards, searchCache, fetchMissingCardData]);
  
  // Debug: Log the final deckCards array
  React.useEffect(() => {
  }, [deckCards]);
  
  const [deckSortBy, setDeckSortBy] = React.useState('name');

  // Use the passed onQuantityChange handler instead of our own
  const handleQuantityChange = onQuantityChange || ((card: any, change: number) => {
    console.log('DeckSection fallback handleQuantityChange called with:', card.name, change);
    // Fallback implementation if no handler is provided
  });

  const handleCardClick = (card: any) => {
    onCardClick?.(card);
  };

  const handleClearDeck = () => {
    if (currentDeck && Object.keys(currentDeck).length > 0) {
      const updatedDeck = { ...currentDeck, cards: [] };
      setCurrentDeck(updatedDeck);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 flex flex-col">
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Current Deck
            {currentDeck && (currentDeck as any).cards && (
              <span className="ml-2 text-sm font-normal text-white/70">
                ({(currentDeck as any).cards.reduce((sum: number, c: any) => sum + c.quantity, 0)} cards)
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white">Sort by:</label>
              <select
                value={deckSortBy}
                onChange={(e) => setDeckSortBy(e.target.value)}
                className="px-3 py-1 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name" className="bg-gray-800">Name (A-Z)</option>
                <option value="required_energy" className="bg-gray-800">Required Energy</option>
                <option value="rarity" className="bg-gray-800">Rarity</option>
              </select>
            </div>
            
            <button
              onClick={handleClearDeck}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center gap-1"
              disabled={!currentDeck || Object.keys(currentDeck).length === 0 || !(currentDeck as any).cards || (currentDeck as any).cards.length === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Deck
            </button>
          </div>
        </div>
        
        {deckCards.length > 0 && (
          <div className="mb-4">
            <DeckValidation cards={deckCards} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {deckCards.length > 0 ? (
          <GroupedDeckGrid
            cards={deckCards}
            onCardClick={handleCardClick}
            onQuantityChange={(card, change) => {
              handleQuantityChange(card, change);
            }}
            sortBy={deckSortBy}
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-white/70">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p>No cards in deck yet</p>
              <p className="text-sm">Search and add cards to build your deck</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
