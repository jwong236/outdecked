import { Suspense } from 'react';
import { DeckBuilderProvider } from '@/features/deckbuilder/DeckBuilderContext';
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // Generate only one static route - all deck IDs will be handled client-side
  return [
    { id: 'deckbuilder' } // Single catch-all route
  ];
}

export default function DeckBuilderPage() {
  return (
    <DeckBuilderProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <DeckBuilderContent />
      </Suspense>
    </DeckBuilderProvider>
  );
}