'use client';

import { Card, ExpandedCard } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { DeckBuilderSearchCard } from '../cards/DeckBuilderSearchCard';

export interface DeckBuilderSearchGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: ExpandedCard) => void;
  onAddToDeck?: (card: ExpandedCard) => void;
  onQuantityChange?: (card: ExpandedCard, change: number) => void;
  showRarity?: boolean;
  priority?: boolean;
  deckCards?: ExpandedCard[]; // Pass deck cards to determine if search card is in deck
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
          deckCard.card_url === card.card_url
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
