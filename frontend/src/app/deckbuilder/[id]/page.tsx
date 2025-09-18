import { DeckBuilderProvider } from '@/features/deckbuilder/DeckBuilderContext';
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // Return empty array for now - this will be handled by client-side routing
  // For static export, we need to return an array of objects with the dynamic parameter
  return [];
}

export default function DeckBuilderPage() {
  return (
    <DeckBuilderProvider>
      <DeckBuilderContent />
    </DeckBuilderProvider>
  );
}