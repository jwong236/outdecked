'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const deckId = params.id as string;
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
    
    if (deckId === 'new') {
      // Check if there's a current deck being worked on
      const currentDeck = dataManager.getCurrentDeck();
      if (currentDeck) {
        // Redirect to the current deck being edited
        router.replace(`/deckbuilder/${currentDeck.id}`);
        return;
      }
      
      // Get series from URL parameters
      const seriesFromUrl = searchParams.get('series');
      createNewDeck(seriesFromUrl || undefined).catch(console.error);
    } else {
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
      console.log('🔧 DeckBuilderContent: Page unloading, saving deck...');
      if (currentDeck) {
        // Save to database but keep sessionStorage for now
        dataManager.updateDeck(currentDeck).catch(console.error);
      }
    };

    // Add beforeunload listener for browser navigation
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // This cleanup function runs when the component unmounts
      console.log('🔧 DeckBuilderContent: Component unmounting, saving deck...');
      if (currentDeck) {
        // Save to database but keep sessionStorage for now
        saveDeck().catch(console.error);
      }
      // Remove beforeunload listener
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
