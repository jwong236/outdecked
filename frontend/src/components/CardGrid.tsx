'use client';

import { Card } from './Card';
import { Card as CardType } from '@/types/card';

interface CardGridProps {
  cards: CardType[];
  isLoading?: boolean;
  onCardClick?: (card: CardType) => void;
}

export function CardGrid({ cards, isLoading, onCardClick }: CardGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {Array.from({ length: 24 }).map((_, index) => (
          <div key={index} className="bg-gray-200 rounded-lg animate-pulse">
            <div className="aspect-[3/4] rounded-t-lg bg-gray-300"></div>
            <div className="p-3">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">No cards found</div>
        <div className="text-gray-400 text-sm">
          Try adjusting your search criteria or filters
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card
          key={card.id}
          card={card}
          onClick={onCardClick}
        />
      ))}
    </div>
  );
}
