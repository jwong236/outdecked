'use client';

import { Card } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { DeckCard } from './DeckCard';

export interface DeckGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  onRemoveFromDeck?: (card: Card) => void;
  onAddToDeck?: (card: Card) => void;
  deckCards?: Card[];
  showDeckActions?: boolean;
  showPrices?: boolean;
  showRarity?: boolean;
  priority?: boolean;
}

export function DeckGrid({
  cards,
  onCardClick,
  onQuantityChange,
  onRemoveFromDeck,
  onAddToDeck,
  deckCards = [],
  showDeckActions = false,
  showPrices = true,
  showRarity = true,
  priority = false,
  ...baseProps
}: DeckGridProps) {
  return (
    <BaseCardGrid
      {...baseProps}
      cards={cards}
    >
      {(card, index) => (
        <DeckCard
          card={card}
          onClick={onCardClick}
          onQuantityChange={onQuantityChange}
          onRemoveFromDeck={onRemoveFromDeck}
          onAddToDeck={onAddToDeck}
          deckCards={deckCards}
          showDeckActions={showDeckActions}
          showPrices={showPrices}
          showRarity={showRarity}
          priority={priority && index === 0}
        />
      )}
    </BaseCardGrid>
  );
}
