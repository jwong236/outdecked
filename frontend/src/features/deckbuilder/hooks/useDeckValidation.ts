'use client';

import { useMemo } from 'react';
import { Card } from '@/types/card';
import { DeckValidation, analyzeDeck } from '@/lib/deckValidation';

export function useDeckValidation(cards: Card[]) {
  const validation = useMemo(() => {
    if (!cards || cards.length === 0) {
      return {
        totalCards: 0,
        totalTriggers: 0,
        colorTriggers: 0,
        specialTriggers: 0,
        finalTriggers: 0,
        isValid: false,
        errors: ['No cards in deck']
      };
    }

    return analyzeDeck(cards);
  }, [cards]);

  return validation;
}
