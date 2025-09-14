'use client';

import { Card } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { CartCard } from './CartCard';

export interface CartGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  showPrices?: boolean;
  showRarity?: boolean;
  priority?: boolean;
}

export function CartGrid({
  cards,
  onCardClick,
  onQuantityChange,
  showPrices = true,
  showRarity = true,
  priority = false,
  ...baseProps
}: CartGridProps) {
  return (
    <BaseCardGrid
      {...baseProps}
      cards={cards}
    >
      {(card, index) => (
        <CartCard
          card={card}
          onClick={onCardClick}
          onQuantityChange={onQuantityChange}
          showPrices={showPrices}
          showRarity={showRarity}
          priority={priority && index === 0}
        />
      )}
    </BaseCardGrid>
  );
}
