'use client';

import React from 'react';
import { GroupedDeckGrid } from '../grids/GroupedDeckGrid';
import { DeckValidation } from '@/lib/deckValidation';
import { useSessionStore } from '@/stores/sessionStore';
import { Card, CardCache } from '@/types/card';
import { transformRawCardsToCards } from '@/lib/cardTransform';
import { apiConfig } from '@/lib/apiConfig';

interface DeckSectionProps {
  searchCache: CardCache;
  setSearchCache: (updater: (prev: CardCache) => CardCache) => void;
  onCardClick?: (card: any, source?: 'search' | 'deck') => void;
  onQuantityChange?: (card: any, change: number) => void;
  expandedCards?: any[]; // Get expanded cards from parent hook
  deckSortBy: string;
  setDeckSortBy: (sortBy: string) => void;
}

export const DeckSection = React.memo(function DeckSection({ searchCache, setSearchCache, onCardClick, onQuantityChange, expandedCards, deckSortBy, setDeckSortBy }: DeckSectionProps) {
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // Track which cards we've already requested to prevent infinite loops
  const requestedCardsRef = React.useRef<Set<string>>(new Set());
  
  // Function to fetch missing card data
  const fetchMissingCardData = React.useCallback(async (cardIds: string[]) => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/cards/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: cardIds }),
      });
      
      if (response.ok) {
        const rawCards = await response.json();
        
        // Transform raw API data to clean Card objects
        const cleanCards = transformRawCardsToCards(rawCards);
        
        setSearchCache(prev => {
          const newCache = { ...prev };
          cleanCards.forEach((card: any) => {
            newCache[card.product_id] = card;
          });
          return newCache;
        });
      }
    } catch (error) {
      console.error('❌ DeckSection: Error fetching card data:', error);
    }
  }, [setSearchCache]);
  
  // Use expanded cards from parent hook (single source of truth)
  const expandedCardsArray = expandedCards || [];
  
  // Auto-fetch missing card data when deck changes
  React.useEffect(() => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !(currentDeck as any).cards) {
      return;
    }
    
    const currentDeckCards = (currentDeck as any).cards;
    const missingCardIds = currentDeckCards
      .filter((deckCard: any) => {
        return !searchCache[deckCard.card_id] && !requestedCardsRef.current.has(deckCard.card_id.toString());
      })
      .map((deckCard: any) => deckCard.card_id.toString());
    
    if (missingCardIds.length > 0) {
      // Mark these cards as requested to prevent duplicate requests
      missingCardIds.forEach((id: string) => requestedCardsRef.current.add(id));
      fetchMissingCardData(missingCardIds);
    }
  }, [(currentDeck as any)?.cards, searchCache, fetchMissingCardData]);
  
  

  // Use the passed onQuantityChange handler instead of our own
  const handleQuantityChange = onQuantityChange || ((card: any, change: number) => {
    // Fallback implementation if no handler is provided
  });

  const handleCardClick = (card: any) => {
    onCardClick?.(card, 'deck');
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
                <option value="name_asc" className="bg-gray-800">Name (A-Z)</option>
                <option value="name_desc" className="bg-gray-800">Name (Z-A)</option>
                <option value="required_energy_asc" className="bg-gray-800">Required Energy (Low-High)</option>
                <option value="required_energy_desc" className="bg-gray-800">Required Energy (High-Low)</option>
                <option value="rarity_asc" className="bg-gray-800">Rarity (Low-High)</option>
                <option value="rarity_desc" className="bg-gray-800">Rarity (High-Low)</option>
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
        
        {expandedCardsArray.length > 0 && (
          <div className="mb-4">
            <DeckValidation deck={currentDeck} expandedCards={expandedCardsArray} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {expandedCardsArray.length > 0 ? (
          <GroupedDeckGrid
            cards={expandedCardsArray}
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
