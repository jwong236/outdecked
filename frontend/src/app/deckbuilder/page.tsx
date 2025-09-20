'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DeckListPage } from '@/features/deckbuilder/pages/DeckListPage';
import { DeckBuilderProvider } from '@/features/deckbuilder/DeckBuilderContext';
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';

function DeckBuilderContentWrapper() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId');


  // If deckId is provided, show the deck builder interface
  if (deckId) {
    return (
      <DeckBuilderProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <DeckBuilderContent />
        </Suspense>
      </DeckBuilderProvider>
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
