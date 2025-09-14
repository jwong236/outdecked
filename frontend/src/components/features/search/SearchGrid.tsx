'use client';

import { Card } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { SearchCard } from './SearchCard';

export interface SearchGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: Card) => void;
  onAddToDeck?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  showPrices?: boolean;
  showRarity?: boolean;
  priority?: boolean;
}

export function SearchGrid({
  cards,
  onCardClick,
  onAddToDeck,
  onQuantityChange,
  showPrices = true,
  showRarity = true,
  priority = false,
  ...baseProps
}: SearchGridProps) {
  return (
    <BaseCardGrid
      {...baseProps}
      cards={cards}
    >
      {(card, index) => (
        <SearchCard
          card={card}
          onClick={onCardClick || (() => {})}
          onAddToDeck={onAddToDeck}
          onQuantityChange={onQuantityChange}
          showPrices={showPrices}
          showRarity={showRarity}
          priority={priority && index === 0}
        />
      )}
    </BaseCardGrid>
  );
}
