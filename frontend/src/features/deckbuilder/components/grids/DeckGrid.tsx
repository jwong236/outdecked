'use client';

import { Card, ExpandedCard } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { DeckCard } from '../cards/DeckCard';

export interface DeckGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: ExpandedCard) => void;
  onQuantityChange?: (card: ExpandedCard, change: number) => void;
  onRemoveFromDeck?: (card: ExpandedCard) => void;
  onAddToDeck?: (card: ExpandedCard) => void;
  deckCards?: ExpandedCard[];
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
