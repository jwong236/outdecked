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
  
  // Group and sort cards
  const groupedCards = useMemo(() => {
    // Group cards by CardType
    const groups: Record<string, ExpandedCard[]> = {};
    
    cards.forEach(card => {
      const cardType = card.attributes.find(attr => attr.name === 'CardType')?.value || 'Unknown';
      if (!groups[cardType]) {
        groups[cardType] = [];
      }
      groups[cardType].push(card);
    });
    
    // Sort cards within each group
    Object.keys(groups).forEach(cardType => {
      groups[cardType].sort((a, b) => {
        switch (sortBy) {
          case 'required_energy':
            // Sort by RequiredEnergy (convert to number for proper sorting)
            const energyA = parseInt(a.attributes.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            const energyB = parseInt(b.attributes.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            return energyA - energyB;
          case 'rarity':
            // Sort by rarity (define rarity order)
            const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'];
            const rarityA = rarityOrder.indexOf(a.attributes.find(attr => attr.name === 'Rarity')?.value || 'Common');
            const rarityB = rarityOrder.indexOf(b.attributes.find(attr => attr.name === 'Rarity')?.value || 'Common');
            return rarityB - rarityA; // Higher rarity first
          default:
            // Sort by name
            return a.name.localeCompare(b.name);
        }
      });
    });
    
    return groups;
  }, [cards, sortBy]);
  
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
