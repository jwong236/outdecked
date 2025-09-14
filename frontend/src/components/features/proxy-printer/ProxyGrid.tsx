'use client';

import { Card } from '@/types/card';
import { BaseCardGrid, BaseCardGridProps } from '@/components/shared/grids/BaseCardGrid';
import { ProxyCard } from './ProxyCard';

export interface ProxyGridProps extends Omit<BaseCardGridProps, 'children'> {
  onCardClick?: (card: Card) => void;
  showPrices?: boolean;
  showRarity?: boolean;
  priority?: boolean;
}

export function ProxyGrid({
  cards,
  onCardClick,
  showPrices = true,
  showRarity = true,
  priority = false,
  ...baseProps
}: ProxyGridProps) {
  return (
    <BaseCardGrid
      {...baseProps}
      cards={cards}
    >
      {(card, index) => (
        <ProxyCard
          card={card}
          onClick={onCardClick}
          showPrices={showPrices}
          showRarity={showRarity}
          priority={priority && index === 0}
        />
      )}
    </BaseCardGrid>
  );
}
