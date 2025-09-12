'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/card';
import { CardGrid } from '@/components/CardGrid';
import { CardDetailModal } from '@/components/search/CardDetailModal';

interface HandItem extends Card {
  quantity: number;
}

export default function CartPage() {
  const [hand, setHand] = useState<HandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const loadHand = () => {
      const handData = JSON.parse(sessionStorage.getItem('shoppingCart') || '[]');
      setHand(handData);
      setIsLoading(false);
    };

    loadHand();
    
    // Listen for storage changes from other tabs
    const handleStorageChange = () => {
      loadHand();
    };
    
    // Listen for cart updates from the same tab (when QuantityControl removes items)
    const handleCartUpdate = () => {
      loadHand();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);


  const clearHand = () => {
    setHand([]);
    sessionStorage.removeItem('shoppingCart');
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleCardClick = (card: Card) => {
    const index = hand.findIndex(c => c.card_url === card.card_url);
    setSelectedCard(card);
    setSelectedCardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
  };

  const handleNavigate = (index: number) => {
    if (hand[index]) {
      setSelectedCard(hand[index]);
      setSelectedCardIndex(index);
    }
  };

  const totalItems = hand.reduce((sum, item) => sum + (item.quantity || 1), 0);

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
            <a 
              href="/search" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Cards
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Hand Items */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <CardGrid
              cards={hand}
              variant="cart"
              onCardClick={handleCardClick}
            />
          </div>

          {/* Hand Summary */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Total Items: {totalItems}</h3>
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
        </>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={hand}
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
                onClick={clearHand}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
              >
                Clear Hand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
