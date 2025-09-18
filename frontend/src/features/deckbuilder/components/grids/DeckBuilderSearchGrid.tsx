'use client';

import { Card } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { DeckBuilderSearchCard } from '../cards/DeckBuilderSearchCard';

export interface DeckBuilderSearchGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: Card) => void;
  onAddToDeck?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  showRarity?: boolean;
  priority?: boolean;
  deckCards?: Card[]; // Pass deck cards to determine if search card is in deck
}

export function DeckBuilderSearchGrid({
  cards,
  onCardClick,
  onAddToDeck,
  onQuantityChange,
  showRarity = true,
  priority = false,
  gridSize = 'compact', // Use compact grid for better space efficiency
  deckCards = [],
  ...baseProps
}: DeckBuilderSearchGridProps) {
  return (
    <BaseCardGrid
      {...baseProps}
      cards={cards}
      gridSize={gridSize}
    >
      {(card, index) => {
        // Check if this card is in the deck
        const isInDeck = deckCards.some(deckCard => 
          deckCard.card_url === card.card_url || deckCard.image_url === card.image_url
        );
        
        return (
          <DeckBuilderSearchCard
            card={card}
            onClick={onCardClick || (() => {})}
            onAddToDeck={onAddToDeck}
            onQuantityChange={onQuantityChange}
            showRarity={showRarity}
            priority={priority && index === 0}
            isInDeck={isInDeck}
          />
        );
      }}
    </BaseCardGrid>
  );
}
