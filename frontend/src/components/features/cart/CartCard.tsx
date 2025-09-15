'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/types/card';
import { QuantityControl } from '@/components/shared/grids/QuantityControl';

export interface CartCardProps {
  card: Card;
  onClick?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  className?: string;
  showPrices?: boolean;
  showRarity?: boolean;
  priority?: boolean;
}

export function CartCard({ 
  card, 
  onClick, 
  onQuantityChange,
  className = '',
  showPrices = true,
  showRarity = true,
  priority = false
}: CartCardProps) {
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

  const variantClasses = {
    default: 'p-4',
    compact: 'p-3',
    detailed: 'p-6',
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses.default} ${className}`}
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
              // Replace with "Coming Soon" placeholder for locked images
              const target = e.target as HTMLImageElement;
              if (target.parentElement) {
                target.parentElement.innerHTML = `
                  <div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 p-4">
                    <svg class="w-16 h-16 mb-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                    </svg>
                    <div class="text-center">
                      <div class="text-sm font-medium text-gray-200 mb-1">Image Coming Soon</div>
                      <div class="text-xs text-gray-400">Card not yet released</div>
                    </div>
                  </div>
                `;
              }
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
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        {/* Card Name */}
        <h3 className="font-semibold text-white text-sm leading-tight h-8 flex items-center group-hover:text-blue-300 transition-colors duration-200">
          <span className="line-clamp-2">{card.name}</span>
        </h3>


        {/* Price and TCGP Button Row */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            {showPrices && (
              <div className="text-xs">
                <span className="text-gray-400">Price:</span>
                <span className="ml-1 text-white font-medium">
                  {card.price ? `$${card.price.toFixed(2)}` : 'N/A'}
                </span>
              </div>
            )}
            {card.card_url && (
              <a 
                href={card.card_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors duration-150"
                title={card.price ? `$${card.price.toFixed(2)}` : 'View on TCGPlayer'}
              >
                <Image
                  src="/tcg_icon.png"
                  alt="TCGPlayer"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
              </a>
            )}
          </div>
        </div>

        {/* Quantity Control */}
        <div className="pt-2">
          <QuantityControl 
            card={card} 
            size="sm" 
          />
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
