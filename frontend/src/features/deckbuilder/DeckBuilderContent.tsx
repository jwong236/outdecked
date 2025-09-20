'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DeckBuilderHeader } from './DeckBuilderHeader';
import { SearchSection } from './components/sections/SearchSection';
import { DeckSection } from './components/sections/DeckSection';
import { DeckBuilderModals } from './components/modals/DeckBuilderModals';
import { useDeckOperations } from './hooks/useDeckOperations';
import { useSearchLogic } from './hooks/useSearchLogic';
import { useDeckBuilderActions, useDeckBuilderSelectors } from './DeckBuilderContext';
import { useAuth } from '@/features/auth/AuthContext';
import { dataManager } from '../../lib/dataManager';

export function DeckBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const deckId = searchParams.get('deckId');
  const isLoadingRef = useRef(false);
  
  const { setShowSignInModal } = useDeckBuilderActions();
  const { createNewDeck, loadDeck, saveDeck } = useDeckOperations();
  const { currentDeck } = useDeckBuilderSelectors();
  const hasInitialized = useRef(false);

  // Initialize series from URL parameters
  useEffect(() => {
    const seriesFromUrl = searchParams.get('series');
    if (seriesFromUrl) {
      // This will be handled by the search logic when the deck loads
    }
  }, [searchParams]);

  // Load deck or create new one
  useEffect(() => {
    // Check authentication first
    if (!authLoading && !user) {
      setShowSignInModal(true);
      return;
    }
    
    // Only proceed if user is authenticated
    if (!user) {
      return;
    }
    
    // Prevent running if already loading or already initialized
    if (isLoadingRef.current || hasInitialized.current) {
      return;
    }
    
    // Mark as initialized to prevent re-runs
    hasInitialized.current = true;
    isLoadingRef.current = true;
    
    // Handle different deck ID scenarios
    if (deckId === 'new' || !deckId) {
            // For new deck creation, don't check for existing current deck
            // This prevents redirecting to old decks when creating new ones
      
      // Get series from URL parameters
      const seriesFromUrl = searchParams.get('series');
      createNewDeck(seriesFromUrl || undefined).catch(console.error);
    } else {
      // Load specific deck by ID
      loadDeck(deckId);
    }
    
    // Reset loading flag after a short delay
    setTimeout(() => {
      isLoadingRef.current = false;
    }, 100);
  }, [deckId, user, router, createNewDeck, loadDeck, setShowSignInModal, authLoading]);

          // Save deck when component unmounts or page is being unloaded
          useEffect(() => {
            const handleBeforeUnload = () => {
              if (currentDeck) {
                // Save to database but don't update sessionStorage
                dataManager.updateDeck(currentDeck, false).catch(console.error);
              }
            };

            // Add event listeners
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
              // This cleanup function runs when the component unmounts
              if (currentDeck) {
                // Save to database but don't update sessionStorage
                saveDeck(false).catch(console.error);
              }
              // Remove event listeners
              window.removeEventListener('beforeunload', handleBeforeUnload);
            };
          }, [currentDeck, saveDeck]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Hide background switcher on this page */}
      <style jsx global>{`
        .fixed.top-20.right-4 {
          display: none !important;
        }
      `}</style>

      {/* Header */}
      <DeckBuilderHeader />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
        {/* Left Side - Search Cards */}
        <SearchSection />

        {/* Right Side - Current Deck */}
        <DeckSection />
      </div>

      {/* Modals */}
      <DeckBuilderModals />
    </div>
  );
}
