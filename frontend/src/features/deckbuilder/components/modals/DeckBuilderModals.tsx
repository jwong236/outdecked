'use client';

import React, { useEffect, useRef } from 'react';
import { CardDetailModal } from '@/features/search/CardDetailModal';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { DeckBuilderSettingsModal } from './DeckBuilderSettingsModal';
import { DecklistModal } from './DecklistModal';
import { useDeckOperations } from '../../hooks/useDeckOperations';
import { useDeckBuilderSelectors, useDeckBuilderActions } from '../../DeckBuilderContext';
import { useSearchLogic } from '../../hooks/useSearchLogic';

export function DeckBuilderModals() {
  const { 
    selectedCard, 
    selectedCardIndex, 
    isModalOpen, 
    modals,
    deckCards,
    deckName,
    currentDeck
  } = useDeckBuilderSelectors();
  
  // Get search results and pagination for navigation
  const { 
    searchResultsWithQuantities, 
    currentPage, 
    pagination, 
    handlePageChange 
  } = useSearchLogic();

  const { 
    setModalOpen,
    setSelectedCard,
    setShowSignInModal,
    setShowMoveConfirmModal,
    setShowPrintConfirmModal,
    setShowCoverModal,
    setShowDecklistModal,
    setShowCoverSelectionModal,
    setShowAdvancedFiltersModal,
    setShowClearDeckModal
  } = useDeckBuilderActions();

  const { 
    moveCardsFromHand,
    handlePrintToProxy,
    handleCoverSelection,
    handleClearDeck
  } = useDeckOperations();

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Track navigation direction for page changes
  const navigationDirection = useRef<'next' | 'prev' | null>(null);

  const handleNavigate = (index: number) => {
    // Check if we need to navigate to next/previous page
    if (index >= searchResultsWithQuantities.length && pagination?.has_next) {
      // Navigate to next page and select first card
      navigationDirection.current = 'next';
      handlePageChange(currentPage + 1);
      return;
    } else if (index < 0 && pagination?.has_prev) {
      // Navigate to previous page and select last card
      navigationDirection.current = 'prev';
      handlePageChange(currentPage - 1);
      return;
    }
    
    // Normal navigation within current page
    if (index >= 0 && index < searchResultsWithQuantities.length) {
      setSelectedCard(searchResultsWithQuantities[index], index);
    }
  };

  // Handle card selection when page changes
  useEffect(() => {
    if (navigationDirection.current && searchResultsWithQuantities.length > 0) {
      if (navigationDirection.current === 'next') {
        // Select first card of new page
        setSelectedCard(searchResultsWithQuantities[0], 0);
      } else if (navigationDirection.current === 'prev') {
        // Select last card of new page
        const lastIndex = searchResultsWithQuantities.length - 1;
        setSelectedCard(searchResultsWithQuantities[lastIndex], lastIndex);
      }
      navigationDirection.current = null; // Reset direction
    }
  }, [searchResultsWithQuantities, setSelectedCard]);


  return (
    <>
      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        allCards={searchResultsWithQuantities}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={pagination?.has_next || false}
        hasPrevPage={pagination?.has_prev || false}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={modals.showSignInModal}
        onClose={() => setShowSignInModal(false)}
        title="Sign In Required"
        message="You need to be signed in to access the deck builder. Sign in to create, edit, and manage your personal deck collection."
      />

      {/* Move Confirmation Modal */}
      {modals.showMoveConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-blue-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Move from Hand</h3>
              <p className="text-gray-300 mb-6">Cards moved successfully!</p>
              <button
                onClick={() => setShowMoveConfirmModal(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Confirmation Modal */}
      {modals.showPrintConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-cyan-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Print to Proxy</h3>
              <p className="text-gray-300 mb-6">Adding all cards to Proxy Printer?</p>
              <div className="space-y-3">
                <button
                  onClick={handlePrintToProxy}
                  className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Yes, Print
                </button>
                <button
                  onClick={() => setShowPrintConfirmModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decklist Modal */}
      <DecklistModal
        isOpen={modals.showDecklistModal}
        onClose={() => setShowDecklistModal(false)}
        deckName={deckName}
        cards={deckCards.map(card => ({
          name: card.name,
          image_url: card.image_url || '',
          quantity: card.quantity || 0,
          CardType: card.CardType || 'Unknown',
          RequiredEnergy: card.RequiredEnergy || '0'
        }))}
      />

      {/* Deck Builder Settings Modal */}
      <DeckBuilderSettingsModal />

      {/* Cover Selection Modal */}
      {modals.showCoverModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 bg-indigo-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Change Deck Cover</h3>
              <p className="text-gray-300">Select a card from your deck to use as the cover image.</p>
            </div>
            
            {deckCards.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                {deckCards.map((card, index) => (
                  <button
                    key={`${card.card_url}-${index}`}
                    onClick={() => {
                      console.log('🖼️ Setting deck cover to:', card.image_url, 'for card:', card.name);
                      handleCoverSelection(card.image_url || '');
                      setShowCoverModal(false);
                    }}
                    className="relative group aspect-[3/4] bg-white/10 rounded-lg overflow-hidden hover:bg-white/20 transition-colors"
                  >
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium truncate bg-black/50 rounded px-2 py-1">
                        {card.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-300 mb-4">No cards in deck to use as cover.</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCoverModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Deck Modal */}
      {modals.showClearDeckModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Clear Deck</h3>
              <p className="text-gray-300 mb-6">Are you sure you want to remove all cards from this deck? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearDeckModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearDeck}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Clear Deck
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
