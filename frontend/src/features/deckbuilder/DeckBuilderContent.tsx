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
import { useSessionStore } from '@/stores/sessionStore';
import { StandardModal } from '@/components/shared/modals/BaseModal';
// Removed useAuth import - now using sessionStore
import { Card, CardCache } from '@/types/card';
import { transformRawCardsToCards } from '@/lib/cardTransform';
import { getProductImageIcon } from '@/lib/imageUtils';

export function DeckBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, sessionState } = useSessionStore();
  const authLoading = !sessionState.isInitialized;
  const deckId = searchParams.get('deckId');
  const isLoadingRef = useRef(false);
  
  
  
  const { deckBuilder, setCurrentDeck, clearCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // Debug currentDeck changes
  React.useEffect(() => {
    console.log('🃏 DeckBuilderContent: currentDeck changed:', {
      hasCurrentDeck: !!currentDeck,
      currentDeckId: currentDeck?.id,
      currentDeckName: currentDeck?.name,
      cardsCount: currentDeck?.cards?.length || 0,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
  }, [currentDeck]);
  const { clearAllFilters } = useSessionStore();
  const lastProcessedDeckId = useRef<string | null>(null);
  
  // Shared search cache state - lifted up from SearchSection to share with DeckSection
  const [searchCache, setSearchCache] = React.useState<CardCache>({});
  
  // Note: Cache is now persistent across deck loads for better performance
  
  // Verification: Log cache format to ensure consistency
  React.useEffect(() => {
    if (Object.keys(searchCache).length > 0) {
      const sampleCard = Object.values(searchCache)[0];
      console.log('🔍 Cache verification - Sample card:', {
        hasAttributes: !!sampleCard?.attributes,
        attributesType: Array.isArray(sampleCard?.attributes) ? 'array' : typeof sampleCard?.attributes,
        attributesLength: sampleCard?.attributes?.length,
        productId: sampleCard?.product_id,
        cacheKeys: Object.keys(searchCache).slice(0, 3) // First 3 keys
      });
    }
  }, [searchCache]);
  
  // Current search results for navigation
  const [currentSearchResults, setCurrentSearchResults] = React.useState<any[]>([]);
  
  // Deck sorting state
  const [deckSortBy, setDeckSortBy] = React.useState('required_energy_asc');
  
  // Use deck operations with search cache and sortBy
  const deckOperations = useDeckOperations(searchCache, setSearchCache, deckSortBy);
  
  // Get expanded cards from the hook (single source of truth)
  const { expandedCards: currentExpandedCards } = deckOperations;
  
  // Debug when currentSearchResults changes
  React.useEffect(() => {
    console.log('🔍 currentSearchResults updated:', {
      count: currentSearchResults.length,
      firstThree: currentSearchResults.slice(0, 3).map(c => c.name)
    });
  }, [currentSearchResults]);
  
  // Debug when currentExpandedCards changes
  React.useEffect(() => {
    console.log('🃏 currentExpandedCards updated:', {
      count: currentExpandedCards.length,
      firstThree: currentExpandedCards.slice(0, 3).map(c => c.name)
    });
  }, [currentExpandedCards]);
  
  // Function to fetch missing card data and populate cache
  const fetchMissingCardData = async (cardIds: string[]) => {
    try {
      const response = await fetch('/api/cards/batch', {
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
  
  // Modal state for card details (same pattern as SearchLayout)
  const [selectedCard, setSelectedCard] = React.useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = React.useState<number>(0);
  const [selectedCardSource, setSelectedCardSource] = React.useState<'search' | 'deck' | null>(null);
  
  // Recalculate selectedCardIndex when search results change (for search cards)
  React.useEffect(() => {
    if (selectedCard && selectedCardSource === 'search' && currentSearchResults.length > 0) {
      const newIndex = currentSearchResults.findIndex(c => c.product_id === selectedCard.product_id);
      if (newIndex !== -1 && newIndex !== selectedCardIndex) {
        console.log('🔍 Recalculating index for search card:', {
          cardName: selectedCard.name,
          oldIndex: selectedCardIndex,
          newIndex,
          searchResultsCount: currentSearchResults.length
        });
        setSelectedCardIndex(newIndex);
      }
    }
  }, [currentSearchResults, selectedCard, selectedCardSource, selectedCardIndex]);
  
  // Modal state for deck settings
  const [showDeckSettingsModal, setShowDeckSettingsModal] = React.useState(false);
  const [showSearchSettingsModal, setShowSearchSettingsModal] = React.useState(false);
  const [showCoverModal, setShowCoverModal] = React.useState(false);
  
  // Modal handlers (same pattern as SearchLayout)
  const handleCardClick = (card: any, source: 'search' | 'deck' = 'search') => {
    // Find the card in the appropriate array based on source
    let index = 0;
    let allCards: any[] = [];
    
    if (source === 'search') {
      // It's a search card - find in current search results (maintains sort order)
      allCards = currentSearchResults;
      index = allCards.findIndex(c => c.product_id === card.product_id);
      console.log('🔍 Card Click: Search card clicked:', {
        cardName: card.name,
        source,
        searchResultsCount: currentSearchResults.length,
        foundIndex: index,
        allCardsNames: allCards.slice(0, 3).map(c => c.name)
      });
    } else if (source === 'deck') {
      // It's a deck card - use the properly sorted expanded cards array
      allCards = currentExpandedCards;
      index = allCards.findIndex(c => c.product_id === card.product_id);
      console.log('🔍 Card Click: Deck card clicked:', {
        cardName: card.name,
        source,
        expandedCardsCount: currentExpandedCards.length,
        foundIndex: index,
        allCardsNames: allCards.slice(0, 3).map(c => c.name)
      });
    }
    
    setSelectedCard(card);
    setSelectedCardIndex(index);
    setSelectedCardSource(source);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setSelectedCardSource(null);
  };

  const handleNavigate = (newIndex: number) => {
    let allCards: any[] = [];
    
    // Get the appropriate cards array based on source
    if (selectedCardSource === 'search') {
      // It's a search card - use current search results (maintains sort order)
      allCards = currentSearchResults;
      console.log('🔍 Navigate: Using search results:', {
        source: selectedCardSource,
        searchResultsCount: currentSearchResults.length,
        newIndex,
        targetCard: allCards[newIndex]?.name
      });
    } else if (selectedCardSource === 'deck') {
      // It's a deck card - use the properly sorted expanded cards array
      allCards = currentExpandedCards;
      console.log('🔍 Navigate: Using expanded cards:', {
        source: selectedCardSource,
        expandedCardsCount: currentExpandedCards.length,
        newIndex,
        targetCard: allCards[newIndex]?.name
      });
    }
    
    // Navigate to the new index
    if (newIndex >= 0 && newIndex < allCards.length) {
      setSelectedCard(allCards[newIndex]);
      setSelectedCardIndex(newIndex);
    }
  };
  

  // Buy Deck handler - generates TCGPlayer Mass Entry URL
  const handleBuyDeck = async () => {
    if (!currentDeck || !currentDeck.cards || currentDeck.cards.length === 0) {
      alert('No cards in deck to buy');
      return;
    }

    try {
      console.log('🛒 Buy Deck - currentDeck.cards:', currentDeck.cards);
      const cardIds = currentDeck.cards.map(card => ({
        card_id: card.card_id,
        quantity: card.quantity || 1
      }));
      console.log('🛒 Buy Deck - sending to API:', cardIds);

      const response = await fetch('/api/tcgplayer/mass-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ card_ids: cardIds }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🛒 Buy Deck - API response:', data);
        // Open the TCGPlayer Mass Entry URL in a new tab
        window.open(data.url, '_blank');
      } else {
        const errorText = await response.text();
        console.error('🛒 Buy Deck - API error:', response.status, errorText);
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
    console.log('🃏 DeckBuilderContent: useEffect triggered with deckId:', deckId);
    if (!deckId) {
      console.log('🃏 DeckBuilderContent: No deckId, returning early');
      return;
    }
    
    const loadDeckData = async () => {
      try {
        const response = await fetch(`/api/user/decks/${deckId}`, {
          credentials: 'include',
        });
        
        
        const data = await response.json();
        
        
        if (data.success && data.deck) {
          // Migrate deck structure to new format
          const migratedDeck = {
            ...data.deck,
            visibility: data.deck.preferences?.visibility || data.deck.visibility || 'private',
            preferences: {
              series: data.deck.preferences?.series || data.deck.preferences?.defaultSeries || data.deck.defaultSeries || '',
              color: data.deck.preferences?.color || data.deck.preferences?.defaultColorFilter || '',
              cardTypes: data.deck.preferences?.cardTypes || [],
              printTypes: data.deck.preferences?.printTypes || [],
              rarities: data.deck.preferences?.rarities || []
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
            console.log('🃏 Loading deck cards from database:', migratedDeck.cards);
            migratedDeck.cards = migratedDeck.cards.map((card: any) => ({
              card_id: card.card_id || card.id,
              quantity: card.quantity
            }));
            console.log('🃏 Converted to session format:', migratedDeck.cards);
          }
          
          console.log('🃏 DeckBuilderContent: About to set currentDeck:', migratedDeck);
          setCurrentDeck(migratedDeck);
          console.log('🃏 DeckBuilderContent: currentDeck set, new value:', useSessionStore.getState().deckBuilder.currentDeck);
          
          // Note: Card data fetching will be handled by a separate effect
        }
      } catch (error) {
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
        console.log('🃏 Fetching missing card data for deck:', missingCardIds);
        fetchMissingCardData(missingCardIds);
      }
    }
  }, [currentDeck, searchCache]); // Run when deck or cache changes

  // Use a ref to capture the current deck value at unmount time
  const currentDeckRef = useRef(currentDeck);
  const isSavingRef = useRef(false);
  
  // Update the ref whenever currentDeck changes
  useEffect(() => {
    currentDeckRef.current = currentDeck;
  }, [currentDeck]);

  // Save currentDeck to database when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      const deckToSave = currentDeckRef.current;
      console.log('🃏 BeforeUnload: deckToSave:', deckToSave);
      console.log('🃏 BeforeUnload: has id?', !!(deckToSave && 'id' in deckToSave && deckToSave.id));
      console.log('🃏 BeforeUnload: has cards?', (deckToSave && 'cards' in deckToSave && deckToSave.cards) ? deckToSave.cards.length : 0);
      
      if (deckToSave && Object.keys(deckToSave).length > 0 && 'id' in deckToSave && deckToSave.id && !isSavingRef.current) {
        isSavingRef.current = true;
        // Use sendBeacon for reliable saving on page unload
        const data = JSON.stringify(deckToSave);
        const blob = new Blob([data], { type: 'application/json' });
        
        // Use fetch to trigger browser notification
        event.preventDefault();
        event.returnValue = 'Your deck changes are being saved automatically.';
        
        try {
          console.log('🃏 Using fetch to save deck before unload');
          const response = await fetch(`/api/user/decks/${(deckToSave as any).id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: data,
          });
          
          console.log('🃏 Save response status:', response.status);
          if (response.ok) {
            console.log('✅ Deck saved before page unload');
          } else {
            console.error('❌ Failed to save deck:', response.status);
          }
        } catch (error) {
          console.error('❌ Error saving deck on unload:', error);
        }
      }
    };

    // Save when component unmounts (navigation within app)
    const handleUnmount = async () => {
      const deckToSave = currentDeckRef.current;
      
      if (deckToSave && Object.keys(deckToSave).length > 0 && 'id' in deckToSave && deckToSave.id && !isSavingRef.current) {
        // Check if user is still authenticated before attempting save
        if (!user.id) {
          console.log('🔄 User not authenticated, skipping deck save on unmount');
          clearCurrentDeck();
          return;
        }
        
        isSavingRef.current = true;
        try {
          const deckId = (deckToSave as any).id;
          console.log('🔄 Saving deck on component unmount...', {
            deckId: deckId,
            deckData: deckToSave,
            userAuthenticated: !!user
          });
          const response = await fetch(`/api/user/decks/${deckId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(deckToSave),
          });
          
          console.log('🔄 Deck save response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          if (response.ok) {
            console.log('✅ Deck saved before component unmount');
          } else {
            let errorText = '';
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = 'Could not read response body';
            }
            console.error('Failed to save deck on unmount:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText || 'Empty response body'
            });
          }
        } catch (error) {
          console.error('Error saving deck on unmount:', error);
        }
      }
      
      // Clear session after save
      clearCurrentDeck();
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function for component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleUnmount();
    };
  }, [clearCurrentDeck]); // Remove user from dependencies to prevent race condition during session init

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <DeckBuilderHeader 
        onShowDeckSettings={() => {
          console.log('🔧 Opening deck settings modal');
          setShowDeckSettingsModal(true);
        }}
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
          onShowDeckSettings={() => {
            console.log('🔧 Opening search settings modal from search section');
            setShowSearchSettingsModal(true);
          }}
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
          onClose={() => {
            console.log('🔧 Closing deck settings modal');
            setShowDeckSettingsModal(false);
          }}
        />
      )}

      {/* Search Settings Modal */}
      {showSearchSettingsModal && (
        <DeckBuilderSearchSettingsModal
          isOpen={showSearchSettingsModal}
          onClose={() => {
            console.log('🔧 Closing search settings modal');
            setShowSearchSettingsModal(false);
          }}
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
                        console.log('🖼️ Setting deck cover to:', imageUrl, 'for card:', fullCardData.name);
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
            console.log('🔍 Modal: Using search results for navigation:', {
              source: selectedCardSource,
              searchResultsCount: currentSearchResults.length,
              selectedCardName: selectedCard.name,
              selectedCardIndex: selectedCardIndex
            });
            return currentSearchResults;
          } else if (selectedCardSource === 'deck') {
            // It's a deck card - use the properly sorted expanded cards array
            console.log('🔍 Modal: Using expanded cards for navigation:', {
              source: selectedCardSource,
              expandedCardsCount: currentExpandedCards.length,
              selectedCardName: selectedCard.name,
              selectedCardIndex: selectedCardIndex
            });
            return currentExpandedCards;
          }
          return [];
        })()}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={(() => {
          if (!selectedCard) return false;
          if (selectedCardSource === 'search') {
            const hasNext = selectedCardIndex < currentSearchResults.length - 1;
            console.log('🔍 hasNextPage check (search):', {
              selectedCardIndex,
              searchResultsLength: currentSearchResults.length,
              hasNext
            });
            return hasNext;
          } else if (selectedCardSource === 'deck') {
            const hasNext = selectedCardIndex < currentExpandedCards.length - 1;
            console.log('🔍 hasNextPage check (deck):', {
              selectedCardIndex,
              expandedCardsLength: currentExpandedCards.length,
              hasNext
            });
            return hasNext;
          }
          return false;
        })()}
        hasPrevPage={selectedCardIndex > 0}
      />
    </div>
  );
}
