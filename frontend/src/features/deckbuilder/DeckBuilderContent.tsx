'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DeckBuilderHeader } from './DeckBuilderHeader';
import { SearchSection } from './components/sections/SearchSection';
import { DeckSection } from './components/sections/DeckSection';
import { DeckBuilderSettingsModal } from './components/modals/DeckBuilderSettingsModal';
import { DeckBuilderSearchSettingsModal } from './components/modals/DeckBuilderSearchSettingsModal';
import { CardDetailModal } from '@/features/search/CardDetailModal';
import { useDeckOperations } from './hooks/useDeckOperations';
import { useDeckAutoSave } from './hooks/useDeckAutoSave';
import { useModalManager } from './hooks/useModalManager';
import { useSessionStore } from '@/stores/sessionStore';
import { StandardModal } from '@/components/shared/modals/BaseModal';
import { CardCache } from '@/types/card';
import { transformRawCardsToCards } from '@/lib/cardTransform';
import { getProductImageIcon, getProductImageCard } from '@/lib/imageUtils';
import { apiConfig } from '@/lib/apiConfig';

export function DeckBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, sessionState } = useSessionStore();
  const authLoading = !sessionState.isInitialized;
  const deckId = searchParams.get('deckId');
  const isLoadingRef = useRef(false);
  
  
  
  const { deckBuilder, setCurrentDeck, clearCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  const { clearAllFilters } = useSessionStore();
  const lastProcessedDeckId = useRef<string | null>(null);
  
  // Shared search cache state - lifted up from SearchSection to share with DeckSection
  const [searchCache, setSearchCache] = React.useState<CardCache>({});
  
  // Note: Cache is now persistent across deck loads for better performance
  
  
  
  // Current search results for navigation
  const [currentSearchResults, setCurrentSearchResults] = React.useState<any[]>([]);
  
  // Deck sorting state
  const [deckSortBy, setDeckSortBy] = React.useState('required_energy_asc');
  
  // Use deck operations with search cache and sortBy
  const deckOperations = useDeckOperations(searchCache, setSearchCache, deckSortBy);
  
  // Get expanded cards from the hook (single source of truth)
  const { expandedCards: currentExpandedCards } = deckOperations;
  
  
  // Function to fetch missing card data and populate cache
  const fetchMissingCardData = async (cardIds: string[]) => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/cards/batch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_ids: cardIds }),
      });
      
      if (response.ok) {
        const rawCards = await response.json();
        const cleanCards = transformRawCardsToCards(rawCards);
        
        // Populate the cache with the fetched card data
        setSearchCache(prev => {
          const newCache = { ...prev };
          cleanCards.forEach(card => {
            newCache[card.product_id] = card;
          });
          return newCache;
        });
      }
    } catch (error) {
      console.error('Error fetching card data:', error);
    }
  };
  
  // Modal management hook
  const {
    showDeckSettingsModal,
    setShowDeckSettingsModal,
    showSearchSettingsModal,
    setShowSearchSettingsModal,
    showCoverModal,
    setShowCoverModal,
    selectedCard,
    selectedCardIndex,
    selectedCardSource,
    handleCardClick,
    handleCloseModal,
    handleNavigate,
  } = useModalManager(searchCache, currentSearchResults, currentExpandedCards);
  

  // Buy Deck handler - generates TCGPlayer Mass Entry URL
  const handleBuyDeck = async () => {
    if (!currentDeck || !currentDeck.cards || currentDeck.cards.length === 0) {
      alert('No cards in deck to buy');
      return;
    }

    try {
      const cardIds = currentDeck.cards.map(card => ({
        card_id: card.card_id,
        quantity: card.quantity || 1
      }));

      const response = await fetch(apiConfig.getApiUrl('/api/tcgplayer/mass-entry'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ card_ids: cardIds }),
      });

      if (response.ok) {
        const data = await response.json();
        // Open the TCGPlayer Mass Entry URL in a new tab
        window.open(data.url, '_blank');
      } else {
        alert('Failed to generate TCGPlayer URL');
      }
    } catch (error) {
      console.error('Error generating buy URL:', error);
      alert('Error generating TCGPlayer URL');
    }
  };

  // Simple authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      // User not authenticated - could show sign in modal here if needed
    }
  }, [authLoading, user]);

  // Load deck data when deckId changes
  useEffect(() => {
    if (!deckId) {
      return;
    }
    
    const loadDeckData = async () => {
      try {
        const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckId}`), {
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.error('Failed to load deck:', response.status);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && data.deck) {
          // Migrate deck structure to new format
          const migratedDeck = {
            ...data.deck,
            visibility: data.deck.preferences?.visibility || data.deck.visibility || 'private',
            preferences: data.deck.preferences || {
              query: '',
              sort: 'name_asc',
              page: 1,
              per_page: 25,
              filters: []
            }
          };
          
          // Remove old fields
          delete migratedDeck.defaultSeries;
          delete migratedDeck.defaultFilters;
          delete migratedDeck.savedDefaultFilters;
          if (migratedDeck.preferences) {
            delete migratedDeck.preferences.visibility;
            delete migratedDeck.preferences.defaultSeries;
            delete migratedDeck.preferences.defaultColorFilter;
          }
          
          // Convert database format cards to session format
          if (migratedDeck.cards && migratedDeck.cards.length > 0) {
            migratedDeck.cards = migratedDeck.cards.map((card: any) => ({
              card_id: card.card_id || card.id,
              quantity: card.quantity
            }));
          }
          
          setCurrentDeck(migratedDeck);
          
          // Note: Card data fetching will be handled by a separate effect
        }
      } catch (error) {
        console.error('Error loading deck:', error);
      }
    };

    loadDeckData();
  }, [deckId, setCurrentDeck]); // Only reload when deckId changes

  // Fetch missing card data when deck is loaded and cache is available
  useEffect(() => {
    if (currentDeck && 'cards' in currentDeck && currentDeck.cards && currentDeck.cards.length > 0) {
      const missingCardIds = currentDeck.cards
        .filter((card: any) => !searchCache[card.card_id])
        .map((card: any) => card.card_id);
      
      if (missingCardIds.length > 0) {
        fetchMissingCardData(missingCardIds);
      }
    }
  }, [currentDeck, searchCache]); // Run when deck or cache changes

  // Auto-save deck on page exit/unmount
  useDeckAutoSave(currentDeck || {});

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <DeckBuilderHeader 
        onShowDeckSettings={() => setShowDeckSettingsModal(true)}
        onShowCoverModal={() => setShowCoverModal(true)}
        deckOperations={deckOperations}
        onBuyDeck={handleBuyDeck}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)] mt-6">
        {/* Left Side - Search Cards */}
        <SearchSection 
          searchCache={searchCache} 
          setSearchCache={setSearchCache}
          onCardClick={handleCardClick}
          fetchMissingCardData={fetchMissingCardData}
          onSearchResultsChange={setCurrentSearchResults}
          onQuantityChange={deckOperations.handleQuantityChange}
          onShowDeckSettings={() => setShowSearchSettingsModal(true)}
        />

        {/* Right Side - Current Deck */}
        <DeckSection 
          searchCache={searchCache}
          setSearchCache={setSearchCache}
          onCardClick={handleCardClick}
          onQuantityChange={deckOperations.handleQuantityChange}
          expandedCards={currentExpandedCards}
          deckSortBy={deckSortBy}
          setDeckSortBy={setDeckSortBy}
        />
      </div>

      {/* Deck Settings Modal */}
      {showDeckSettingsModal && (
        <DeckBuilderSettingsModal
          isOpen={showDeckSettingsModal}
          onClose={() => setShowDeckSettingsModal(false)}
        />
      )}

      {/* Search Settings Modal */}
      {showSearchSettingsModal && (
        <DeckBuilderSearchSettingsModal
          isOpen={showSearchSettingsModal}
          onClose={() => setShowSearchSettingsModal(false)}
        />
      )}

      {/* Cover Selection Modal */}
      {showCoverModal && (
        <StandardModal
          isOpen={showCoverModal}
          onClose={() => setShowCoverModal(false)}
          title="Change Deck Cover"
          icon={
            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          size="lg"
        >
          <div className="text-center mb-6">
            <p className="text-gray-300">Select a card from your deck to use as the cover image.</p>
          </div>
            
            {deckOperations.currentDeck && 'cards' in deckOperations.currentDeck && deckOperations.currentDeck.cards && deckOperations.currentDeck.cards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                {deckOperations.currentDeck.cards.map((deckCard: any, index: number) => {
                  const fullCardData = searchCache[deckCard.card_id];
                  if (!fullCardData) return null;
                  
                  return (
                    <button
                      key={`${deckCard.card_id}-${index}`}
                      onClick={() => {
                        const imageUrl = getProductImageCard(deckCard.card_id);
                        deckOperations.handleCoverSelection(imageUrl);
                        setShowCoverModal(false);
                      }}
                      className="relative group aspect-[3/4] bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors"
                    >
                      <img
                        src={getProductImageIcon(deckCard.card_id)}
                        alt={fullCardData.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600/80 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Set as Cover
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No cards in your deck yet.</p>
                <p className="text-gray-500 text-sm">Add some cards to your deck first, then you can select a cover image.</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowCoverModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
        </StandardModal>
      )}
      
      {/* Card Detail Modal (same pattern as SearchLayout) */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={(() => {
          if (!selectedCard) return [];
          
          // Get the appropriate cards array based on source
          if (selectedCardSource === 'search') {
            // It's a search card - use current search results (maintains sort order)
            return currentSearchResults;
          } else if (selectedCardSource === 'deck') {
            // It's a deck card - use the properly sorted expanded cards array
            return currentExpandedCards;
          }
          return [];
        })()}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={(() => {
          if (!selectedCard) return false;
          if (selectedCardSource === 'search') {
            return selectedCardIndex < currentSearchResults.length - 1;
          } else if (selectedCardSource === 'deck') {
            return selectedCardIndex < currentExpandedCards.length - 1;
          }
          return false;
        })()}
        hasPrevPage={selectedCardIndex > 0}
      />
    </div>
  );
}
