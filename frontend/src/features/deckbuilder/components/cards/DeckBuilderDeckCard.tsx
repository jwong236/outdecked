'use client';

import React from 'react';
import Image from 'next/image';
import { getProductImageIcon } from '@/lib/imageUtils';
import { Card, ExpandedCard } from '@/types/card';
import { QuantityControl } from '@/components/shared/ui/QuantityControl';

export interface DeckBuilderDeckCardProps {
  card: ExpandedCard;
  onClick?: (card: ExpandedCard) => void;
  onQuantityChange?: (card: ExpandedCard, change: number) => void;
  className?: string;
  showRarity?: boolean;
  showPrices?: boolean;
  priority?: boolean;
}

export function DeckBuilderDeckCard({ 
  card, 
  onClick, 
  onQuantityChange,
  className = '',
  showRarity = true,
  showPrices = true,
  priority = false
}: DeckBuilderDeckCardProps) {
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    onClick?.(card);
  };

  const baseClasses = `
    group relative bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden
    hover:bg-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer
    border border-white/20 hover:border-white/30
  `;

  return (
    <div 
      className={`${baseClasses} p-3 ${className}`}
      onClick={handleCardClick}
    >
      {/* Card Image */}
      <div className="relative aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gray-800">
        {card.product_id ? (
          <Image
            src={getProductImageIcon(card.product_id)}
            alt={card.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            priority={priority}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `data:image/svg+xml;base64,${btoa(`
                <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="600" fill="#374151"/>
                  <text x="200" y="300" text-anchor="middle" fill="#9CA3AF" font-family="Arial" font-size="16">
                    Image not available
                  </text>
                </svg>
              `)}`;
            }}
            unoptimized={true}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* Quantity Overlay - always show for deck cards */}
        {(card.quantity || 0) > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            {card.quantity}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        {/* Card Name */}
        <div className="h-8 flex items-center">
          <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-blue-300 transition-colors duration-200 line-clamp-2">
            {card.name}
          </h3>
        </div>

        {/* Price (if enabled) */}
        {showPrices && card.price && (
          <div className="text-green-400 text-sm font-medium">
            ${card.price}
          </div>
        )}

        {/* Rarity (if enabled) */}
        {showRarity && (() => {
          const rarity = card.attributes?.find(attr => attr.name === 'Rarity')?.value;
          return rarity && (
            <div className="text-yellow-400 text-xs">
              {rarity}
            </div>
          );
        })()}
      </div>

      {/* Quantity Control - Always show for deck cards */}
      <div className="pt-1">
          <QuantityControl 
          card={card} 
          variant="control"
          context="deck"
          buttonLayout="4-button"
          size="sm" 
          className="w-full justify-center"
          quantity={card.quantity}
          onQuantityChange={onQuantityChange}
        />
      </div>

      {/* Click Indicator */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
