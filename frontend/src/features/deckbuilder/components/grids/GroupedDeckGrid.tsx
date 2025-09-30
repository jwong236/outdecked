'use client';

import React, { useMemo } from 'react';
import { Card, ExpandedCard } from '@/types/card';
import { DeckBuilderDeckCard } from '../cards/DeckBuilderDeckCard';

interface GroupedDeckGridProps {
  cards: ExpandedCard[];
  onCardClick: (card: ExpandedCard) => void;
  onQuantityChange: (card: ExpandedCard, change: number) => void;
  sortBy: string;
  className?: string;
}

export function GroupedDeckGrid({ 
  cards, 
  onCardClick, 
  onQuantityChange, 
  sortBy,
  className = '' 
}: GroupedDeckGridProps) {
  
  // Group cards by CardType (cards are already sorted by useDeckOperations)
  const groupedCards = useMemo(() => {
    // Group cards by CardType
    const groups: Record<string, ExpandedCard[]> = {};
    
    cards.forEach(card => {
      const cardType = card.attributes?.find(attr => attr.name === 'CardType')?.value || 'Unknown';
      if (!groups[cardType]) {
        groups[cardType] = [];
      }
      groups[cardType].push(card);
    });
    
    return groups;
  }, [cards]);
  
  // Define card type order
  const cardTypeOrder = ['Character', 'Event', 'Action Point', 'Site'];
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Row-based Layout */}
      {cardTypeOrder.map(cardType => {
        const typeCards = groupedCards[cardType];
        if (!typeCards || typeCards.length === 0) return null;
        
        return (
          <div key={cardType} className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{cardType}</h3>
              <div className="flex-1 h-px bg-white/20"></div>
              <span className="text-sm text-white/70">
                {typeCards.length} {typeCards.length === 1 ? 'card' : 'cards'}
              </span>
            </div>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {typeCards.map((card) => (
                <DeckBuilderDeckCard
                  key={`deck-${card.card_url}`}
                  card={card}
                  onClick={onCardClick}
                  onQuantityChange={onQuantityChange}
                  showRarity={false}
                  showPrices={true}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
