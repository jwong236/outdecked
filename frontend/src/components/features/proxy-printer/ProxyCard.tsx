'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/types/card';
import { QuantityControl } from '@/components/shared/grids/QuantityControl';
import { dataManager } from '@/lib/dataManager';

export interface ProxyCardProps {
  card: Card;
  onClick?: (card: Card) => void;
  className?: string;
  showPrices?: boolean;
  showRarity?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  priority?: boolean;
  onQuantityChange?: (card: Card, change: number) => void;
}

export function ProxyCard({ 
  card, 
  onClick, 
  className = '',
  showPrices = true,
  showRarity = true,
  variant = 'default',
  priority = false,
  onQuantityChange
}: ProxyCardProps) {
  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || price === 0) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'super rare': return 'text-purple-400';
      case 'ultra rare': return 'text-yellow-400';
      case 'secret rare': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const baseClasses = `
    group relative bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden
    hover:bg-white/20 hover:shadow-lg transition-all duration-300 cursor-pointer
    border border-white/20 hover:border-white/30
  `;

  const variantClasses = {
    default: 'p-4',
    compact: 'p-3',
    detailed: 'p-6',
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on quantity control
    if ((e.target as HTMLElement).closest('.quantity-control')) {
      return;
    }
    onClick?.(card);
  };

  // Get current quantity from print list
  const getCurrentQuantity = () => {
    const printList = dataManager.getPrintList();
    const existingItem = printList.find(item => item.card_url === card.card_url);
    return existingItem ? existingItem.quantity : 0;
  };

  const currentQuantity = getCurrentQuantity();

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(card);
        }
      }}
      aria-label={`View details for ${card.name}`}
    >
      {/* Card Image */}
      <div className="relative aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gray-100">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            priority={priority}
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="flex items-center justify-center h-full text-gray-400">
                  <svg class="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                  </svg>
                </div>
              `;
            }}
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
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        {/* Card Name */}
        <h3 className="font-semibold text-white text-sm leading-tight h-8 flex items-center group-hover:text-blue-300 transition-colors duration-200">
          <span className="line-clamp-2">{card.name}</span>
        </h3>

        {/* Card Details */}
        <div className="space-y-1 text-xs text-gray-300">
          {card.clean_name && card.clean_name !== card.name && (
            <p className="line-clamp-1">{card.clean_name}</p>
          )}
          
          {showRarity && (
            <p className={`font-medium ${getRarityColor()}`}>
              {/* Rarity would come from card attributes */}
            </p>
          )}
        </div>

        {/* Price */}
        {showPrices && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs">
              <span className="text-gray-400">Price:</span>
              <span className="ml-1 text-white font-medium">
                {formatPrice(card.price)}
              </span>
            </div>
          </div>
        )}

        {/* Print Quantity Display */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-400">Print:</span>
              <span className="ml-1 text-white font-medium">
                {currentQuantity} {currentQuantity === 1 ? 'copy' : 'copies'}
              </span>
            </div>
            <div className="quantity-control">
              <QuantityControl 
                card={card} 
                size="sm"
                context="printList"
              />
            </div>
          </div>
        </div>
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