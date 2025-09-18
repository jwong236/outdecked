import { Suspense } from 'react';
import { DeckBuilderProvider } from '@/features/deckbuilder/DeckBuilderContext';
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // Return a placeholder ID for static export
  // This will be handled by client-side routing for actual deck IDs
  return [
    { id: 'placeholder' }
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