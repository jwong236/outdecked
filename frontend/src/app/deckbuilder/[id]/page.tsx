'use client';

import { DeckBuilderProvider } from '@/features/deckbuilder/DeckBuilderContext';
import { DeckBuilderContent } from '@/features/deckbuilder/DeckBuilderContent';

export default function DeckBuilderPage() {
  return (
    <DeckBuilderProvider>
      <DeckBuilderContent />
    </DeckBuilderProvider>
  );
}