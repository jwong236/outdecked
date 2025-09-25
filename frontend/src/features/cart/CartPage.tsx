'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/types/card';
import { CartGrid } from '@/features/cart/CartGrid';
import { CardDetailModal } from '@/features/search/CardDetailModal';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { Deck, CardRef, ExpandedCard } from '@/types/card';
import { useSessionStore } from '@/stores/sessionStore';
import { fetchDecksBatch } from '@/lib/deckUtils';
import { useAuth } from '@/features/auth/AuthContext';
import { expandHandItems } from '@/lib/handUtils';

export function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { handCart, clearHand, setPrintList, deckBuilder } = useSessionStore();
  const [hand, setHand] = useState<ExpandedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showMoveToProxyConfirm, setShowMoveToProxyConfirm] = useState(false);
  const [showCopyToDeckModal, setShowCopyToDeckModal] = useState(false);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');

  useEffect(() => {
    const loadHand = async () => {
      try {
        console.log('🛒 CartPage: Loading hand data from sessionStore:', handCart.handItems);
        const expandedHand = await expandHandItems(handCart.handItems);
        console.log('🛒 CartPage: Expanded hand data:', expandedHand);
        setHand(expandedHand);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading hand:', error);
        setHand([]);
        setIsLoading(false);
      }
    };

    const loadDecks = async () => {
      if (deckBuilder.deckList.length === 0) {
        setDecks([]);
        return;
      }

      try {
        setDecksLoading(true);
        console.log('🛒 CartPage: Loading full deck data for IDs:', deckBuilder.deckList);
        const fullDecks = await fetchDecksBatch(deckBuilder.deckList);
        console.log('🛒 CartPage: Loaded full deck data:', fullDecks);
        setDecks(fullDecks);
      } catch (error) {
        console.error('Error loading decks:', error);
        setDecks([]);
      } finally {
        setDecksLoading(false);
      }
    };

    loadHand();
    loadDecks();
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      console.log('🛒 CartPage: Received cartUpdated event, reloading hand...');
      loadHand();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [handCart.handItems, deckBuilder.deckList]); // Reload when hand items or deck list change

  const handleClearHand = () => {
    clearHand();
    setHand([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleMoveToProxyClick = () => {
    setShowMoveToProxyConfirm(true);
  };

  const moveToProxyPrinter = () => {
    // Convert hand items to lightweight references
    const printListItems: CardRef[] = hand.map(card => ({
      card_id: card.product_id,
      quantity: card.quantity || 1
    }));
    
    // Add to print list using sessionStore
    setPrintList(printListItems);
    setShowMoveToProxyConfirm(false);
    
    // Redirect to proxy printer page
    window.location.href = '/proxy-printer';
  };

  const handleCopyToDeckClick = () => {
    if (!user) {
      // Show sign-in prompt instead of deck modal
      setShowCopyToDeckModal(true);
      return;
    }
    setShowCopyToDeckModal(true);
  };

  const copyToDeck = async () => {
    try {
      if (selectedDeckId === 'new') {
        // Create new deck using API
        const response = await fetch('/api/user/decks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newDeckName.trim() || 'New Deck',
            game: 'Union Arena',
            visibility: 'private',
            description: '',
            preferences: {
              series: 'One Piece',
              cardTypes: [],
              rarities: []
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create deck');
        }

        const data = await response.json();
        const newDeck = data.deck;
        
        // Add cards to the newly created deck using the batch endpoint
        console.log('🛒 Copy to deck - hand array:', hand);
        console.log('🛒 Copy to deck - hand length:', hand.length);
        const cardsToAdd = hand.map(card => {
          console.log('🛒 Processing card:', { name: card.name, product_id: card.product_id, quantity: card.quantity });
          return {
            card_id: card.product_id,
            quantity: card.quantity || 1
          };
        });
        console.log('🛒 Cards to add:', cardsToAdd);

        const addCardsResponse = await fetch(`/api/user/decks/${newDeck.id}/cards/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cards: cardsToAdd }),
        });

        if (!addCardsResponse.ok) {
          const errorText = await addCardsResponse.text();
          console.error('🛒 Failed to add cards to new deck:', addCardsResponse.status, errorText);
          throw new Error(`Failed to add cards to deck: ${addCardsResponse.status} ${errorText}`);
        }
        
        // Reload decks to reflect the new deck
        const deckData = await fetchDecksBatch(deckBuilder.deckList);
        setDecks(deckData);
      } else {
        // Add to existing deck
        const response = await fetch(`/api/user/decks/${selectedDeckId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Failed to fetch deck');
          return;
        }

        const data = await response.json();
        const existingDeck = data.deck;

        if (!existingDeck) {
          console.error('Deck not found');
          return;
        }

        // Add cards to existing deck using the batch endpoint
        console.log('🛒 Copy to existing deck - hand array:', hand);
        console.log('🛒 Copy to existing deck - hand length:', hand.length);
        const cardsToAdd = hand.map(card => {
          console.log('🛒 Processing card for existing deck:', { name: card.name, product_id: card.product_id, quantity: card.quantity });
          return {
            card_id: card.product_id,
            quantity: card.quantity || 1
          };
        });
        console.log('🛒 Cards to add to existing deck:', cardsToAdd);

        const addCardsResponse = await fetch(`/api/user/decks/${selectedDeckId}/cards/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cards: cardsToAdd }),
        });

        if (!addCardsResponse.ok) {
          const errorText = await addCardsResponse.text();
          console.error('🛒 Failed to add cards to existing deck:', addCardsResponse.status, errorText);
          throw new Error(`Failed to add cards to deck: ${addCardsResponse.status} ${errorText}`);
        }
      }
      
      setShowCopyToDeckModal(false);
      setSelectedDeckId('');
      setNewDeckName('');
    } catch (error) {
      console.error('Error copying cards to deck:', error);
    }
  };

  const handleCardClick = (card: Card) => {
    const index = hand.findIndex(c => c.product_id === card.product_id);
    setSelectedCard(card);
    setSelectedCardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
  };

  const handleNavigate = (index: number) => {
    if (hand[index]) {
      setSelectedCard(hand[index] || null);
      setSelectedCardIndex(index);
    }
  };

  const totalItems = handCart.handItems.reduce((total, item) => total + item.quantity, 0);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Check Hand
        </h1>
        <p className="text-gray-200">
          Review your selected cards and manage your collection
        </p>
      </div>

      {hand.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">Your hand is empty</h3>
            <p className="text-gray-300 mb-4">Add some cards to your hand from the search page.</p>
            <Link 
              href="/search" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Cards
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Hand Items */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <CartGrid
              cards={hand.filter(item => item && item.name)}
              onCardClick={handleCardClick}
            />
          </div>

          {/* Hand Summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Total Items: {totalItems}</h3>
              <div className="flex gap-3">
                <button 
                  onClick={handleMoveToProxyClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Copy to Proxy Printer
                </button>
                <button 
                  onClick={handleCopyToDeckClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Copy to Deck
                </button>
                <button 
                  onClick={handleClearClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Hand
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={hand.filter(item => item && item.name)}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={false}
        hasPrevPage={false}
      />

      {/* Clear Hand Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Clear Hand</h3>
            </div>
            
            <p className="text-gray-200 mb-6">
              Are you sure you want to clear your hand? This will remove all {totalItems} items and cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHand}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
              >
                Clear Hand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Proxy Printer Confirmation Modal */}
      {showMoveToProxyConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Copy to Proxy Printer</h3>
            </div>
            
            <p className="text-gray-200 mb-6">
              Copy all {totalItems} items from your hand to the proxy printer? This will add them to your print list.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMoveToProxyConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={moveToProxyPrinter}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                Copy to Proxy Printer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy to Deck Modal */}
      {showCopyToDeckModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {user ? `Copy to Deck (${totalItems} items)` : 'Sign In Required'}
                </h3>
              </div>
              <button
                onClick={() => setShowCopyToDeckModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Deck selection for authenticated users */}
            <div className="p-6">
                {/* Decks Grid */}
                <div>
                  <h4 className="text-white font-semibold mb-4">Select Deck</h4>
                  {decksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      <span className="ml-3 text-white">Loading decks...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                    {/* Create New Deck Option */}
                    <button
                      onClick={() => setSelectedDeckId('new')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedDeckId === 'new'
                          ? 'border-green-500 bg-green-500/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Create New Deck Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-32 h-44 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center">
                            <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Create New Deck Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white font-semibold truncate">Create New Deck</h5>
                          <p className="text-gray-300 text-sm">Start with a fresh deck</p>
                          <p className="text-gray-400 text-xs">New deck</p>
                        </div>
                        
                        {/* Selection Indicator */}
                        {selectedDeckId === 'new' && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                    
                    {/* Existing Decks */}
                    {decks.filter(deck => deck && deck.id && deck.name).map((deck) => (
                      <button
                        key={deck.id}
                        onClick={() => setSelectedDeckId(deck.id)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          selectedDeckId === deck.id
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* Deck Cover */}
                          <div className="flex-shrink-0">
                            {deck.cover ? (
                              <img
                                src={deck.cover}
                                alt={`${deck.name} cover`}
                                className="w-32 h-44 rounded-lg border border-white/20 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-32 h-44 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center">
                                <svg className="w-10 h-10 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Deck Info */}
                          <div className="flex-1 min-w-0">
                            <h5 className="text-white font-semibold truncate">{deck.name}</h5>
                            <p className="text-gray-300 text-sm">
                              {deck.cards.length} cards
                            </p>
                            <p className="text-gray-400 text-xs">
                              {deck.last_modified ? new Date(deck.last_modified).toLocaleDateString() : 
                               deck.created_date ? new Date(deck.created_date).toLocaleDateString() :
                               'Unknown date'}
                            </p>
                          </div>
                          
                          {/* Selection Indicator */}
                          {selectedDeckId === deck.id && (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    </div>
                  )}
                </div>
                
                {/* New Deck Name Input */}
                {selectedDeckId === 'new' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-white mb-2">
                      New Deck Name
                    </label>
                    <input
                      type="text"
                      value={newDeckName}
                      onChange={(e) => setNewDeckName(e.target.value)}
                      placeholder="Enter deck name..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}
                
                <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-white/20">
                  <button
                    onClick={() => setShowCopyToDeckModal(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={copyToDeck}
                    disabled={!selectedDeckId || (selectedDeckId === 'new' && !newDeckName.trim())}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150 disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    Copy Cards
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showCopyToDeckModal && !user}
        onClose={() => setShowCopyToDeckModal(false)}
        title="Sign In Required"
        message="You need to be signed in to copy cards to your decks. Sign in to save your hand contents and access your personal deck collection."
      />
    </div>
  );
}
