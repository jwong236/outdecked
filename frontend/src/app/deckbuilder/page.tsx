'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DeckListPage } from '@/features/deckbuilder/pages/DeckListPage';
// DeckBuilderProvider removed - using Zustand store instead
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { useSessionStore } from '@/stores/sessionStore';

function DeckBuilderContentWrapper() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId');
  const { user, sessionState } = useSessionStore();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const router = useRouter();
  
  const authLoading = !sessionState.isInitialized;
  const isLoggedIn = user.id !== null;

  // Show loading while checking authentication
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // If not logged in, show sign-in modal
  if (!isLoggedIn) {
    return (
      <SignInModal
        isOpen={true}
        onClose={() => router.push('/')}
        title="Sign In Required"
        message="You need to be signed in to access the deck builder. Sign in to create, edit, and save your decks."
      />
    );
  }

  // If deckId is provided, show the deck builder interface
  if (deckId) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <DeckBuilderContent />
      </Suspense>
    );
  }

  // Otherwise, show the deck list
  return <DeckListPage />;
}

export default function DeckBuilderPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeckBuilderContentWrapper />
    </Suspense>
  );
}
