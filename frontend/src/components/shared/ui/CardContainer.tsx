'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/types/card';
import { getProductImageIcon } from '@/lib/imageUtils';
import { QuantityControl } from './QuantityControl';

export type CardContainerVariant = 'search' | 'deck-search' | 'deck-display' | 'cart' | 'proxy' | 'basic';

export interface CardContainerProps {
  card: Card;
  variant: CardContainerVariant;
  onClick?: (card: Card) => void;
  onAddToDeck?: (card: Card) => void;
  onQuantityChange?: (card: Card, change: number) => void;
  
  // Display controls
  showPrices?: boolean;
  showRarity?: boolean;
  showCleanName?: boolean;
  
  // State indicators
  isInDeck?: boolean;
  quantity?: number;
  
  // Layout
  className?: string;
  priority?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CardContainer({ 
  card, 
  variant,
  onClick, 
  onAddToDeck,
  onQuantityChange,
  showPrices,
  showRarity,
  showCleanName = false,
  isInDeck = false,
  quantity,
  className = '',
  priority = false,
  size = 'md'
}: CardContainerProps) {
  
  // Variant-specific defaults
  const getVariantDefaults = () => {
    switch (variant) {
      case 'search':
        return {
          showPrices: showPrices ?? true,
          showRarity: showRarity ?? true,
          showCleanName: false,
        };
      case 'deck-search':
        return {
          showPrices: showPrices ?? true,
          showRarity: showRarity ?? true,
          showCleanName: false,
        };
      case 'deck-display':
        return {
          showPrices: false,
          showRarity: false,
          showCleanName: false,
        };
      case 'cart':
        return {
          showPrices: showPrices ?? true,
          showRarity: false,
          showCleanName: false,
        };
      case 'proxy':
        return {
          showPrices: false,
          showRarity: false,
          showCleanName: showCleanName ?? true,
        };
      case 'basic':
        return {
          showPrices: showPrices ?? true,
          showRarity: false,
          showCleanName: false,
        };
      default:
        return {
          showPrices: showPrices ?? true,
          showRarity: showRarity ?? true,
          showCleanName: false,
        };
    }
  };

  const variantDefaults = getVariantDefaults();
  const effectiveShowPrices = variantDefaults.showPrices;
  const effectiveShowRarity = variantDefaults.showRarity;
  const effectiveShowCleanName = variantDefaults.showCleanName;

  // Size classes
  const sizeClasses = {
    sm: {
      container: 'p-2',
      image: 'mb-2',
      name: 'text-xs',
      price: 'text-xs',
      rarity: 'text-xs',
      cleanName: 'text-xs',
    },
    md: {
      container: 'p-3',
      image: 'mb-3',
      name: 'text-sm',
      price: 'text-xs',
      rarity: 'text-xs',
      cleanName: 'text-xs',
    },
    lg: {
      container: 'p-4',
      image: 'mb-4',
      name: 'text-base',
      price: 'text-sm',
      rarity: 'text-sm',
      cleanName: 'text-sm',
    }
  };

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, a, .quantity-control')) {
      return;
    }
    onClick?.(card);
  };

  // Get effective quantity for display
  const getEffectiveQuantity = () => {
    if (quantity !== undefined) return quantity;
    return card.quantity || 0;
  };

  const effectiveQuantity = getEffectiveQuantity();

  // Render QuantityControl based on variant
  const renderQuantityControl = () => {
    switch (variant) {
      case 'search':
        // Search page context - always show hand controls
        return (
          <QuantityControl 
            card={card} 
            variant="button"
            context="hand"
            buttonLayout="auto"
            size={size}
            className="w-full justify-center"
          />
        );

      case 'deck-search':
        // Deck builder search - conditional based on isInDeck
        if (isInDeck) {
          return (
            <QuantityControl 
              card={card} 
              variant="control"
              context="deck"
              buttonLayout="4-button"
              size={size}
              className="w-full justify-center"
              onQuantityChange={onQuantityChange}
            />
          );
        } else {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToDeck?.(card);
              }}
              className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors duration-150 font-medium"
            >
              Add to Deck
            </button>
          );
        }

      case 'deck-display':
        // Deck builder deck - always show deck controls
        return (
          <QuantityControl 
            card={card} 
            variant="control"
            context="deck"
            buttonLayout="5-button"
            size={size}
            className="w-full justify-center"
            onQuantityChange={onQuantityChange}
          />
        );

      case 'cart':
        // Cart - always show hand controls
        return (
          <QuantityControl 
            card={card} 
            variant="button"
            context="hand"
            buttonLayout="auto"
            size={size}
            className="w-full justify-center"
            onQuantityChange={onQuantityChange}
          />
        );

      case 'proxy':
        // Proxy printer - always show printList controls
        return (
          <div className="quantity-control">
            <QuantityControl 
              card={card} 
              variant="button"
              context="printList"
              buttonLayout="auto"
              size={size}
              className="w-full justify-center"
            />
          </div>
        );

      case 'basic':
        // Basic - no quantity controls
        return null;

      default:
        return null;
    }
  };

  // Render price display
  const renderPrice = () => {
    if (!effectiveShowPrices || !card.price) return null;
    
    if (variant === 'cart') {
      // Cart variant has special price layout
      return (
        <div className="absolute bottom-0 right-0">
          <span className={`${sizeClasses[size].price} text-white/70 font-medium`}>
            {formatPrice(card.price)}
          </span>
        </div>
      );
    }
    
    return (
      <div className="flex justify-end">
        <span className={`${sizeClasses[size].price} text-white/70 font-medium`}>
          {formatPrice(card.price)}
        </span>
      </div>
    );
  };

  // Render rarity display
  const renderRarity = () => {
    if (!effectiveShowRarity || !card.rarity) return null;
    
    return (
      <div className={`${sizeClasses[size].rarity} ${getRarityColor(card.rarity)}`}>
        {card.rarity}
      </div>
    );
  };

  // Render clean name
  const renderCleanName = () => {
    if (!effectiveShowCleanName || !card.clean_name || card.clean_name === card.name) return null;
    
    return (
      <p className={`${sizeClasses[size].cleanName} text-gray-300 line-clamp-1`}>
        {card.clean_name}
      </p>
    );
  };

  // Render TCGPlayer link (cart variant only)
  const renderTCGPlayerLink = () => {
    if (variant !== 'cart' || !card.card_url) return null;
    
    return (
      <div className="pt-1 border-t border-white/10">
        <div className="flex items-center justify-end">
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
        </div>
      </div>
    );
  };

  // Render quantity overlay
  const renderQuantityOverlay = () => {
    if (effectiveQuantity <= 0) return null;
    
    return (
      <div className="absolute top-2 right-2 bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
        {effectiveQuantity}
      </div>
    );
  };

  // Render "Available" badge (search variant only)
  const renderAvailableBadge = () => {
    if (variant !== 'search' || !onAddToDeck || effectiveQuantity > 0) return null;
    
    return (
      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
        Available
      </div>
    );
  };

  // Render click indicator
  const renderClickIndicator = () => {
    if (variant === 'basic') return null;
    
    return (
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`${baseClasses} ${sizeClasses[size].container} ${className}`}
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
      <div className={`relative aspect-[3/4] ${sizeClasses[size].image} rounded-lg overflow-hidden bg-gray-100`}>
        {card.product_id ? (
          <Image
            src={getProductImageIcon(card.product_id)}
            alt={card.name}
            fill
            priority={priority}
            className="object-cover transition-opacity duration-300 group-hover:scale-105 transition-transform duration-300"
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
        
        {/* Overlays */}
        {renderQuantityOverlay()}
        {renderAvailableBadge()}
        {renderClickIndicator()}
      </div>

      {/* Card Info */}
      <div className="space-y-2">
        {/* Card Name and Price Layout */}
        {variant === 'cart' ? (
          // Cart variant has special layout with price in bottom right
          <div className="h-12 relative">
            <div className="absolute inset-0 pr-16">
              <h3 className={`${sizeClasses[size].name} font-semibold text-white leading-tight group-hover:text-blue-300 transition-colors duration-200 line-clamp-2`}>
                {card.name}
              </h3>
            </div>
            {renderPrice()}
          </div>
        ) : (
          // Standard layout
          <div className="h-12 flex flex-col justify-between">
            <h3 className={`${sizeClasses[size].name} font-semibold text-white leading-tight group-hover:text-blue-300 transition-colors duration-200 line-clamp-2`}>
              {card.name}
            </h3>
            {renderPrice()}
          </div>
        )}

        {/* Clean Name (proxy variant) */}
        {renderCleanName()}

        {/* Rarity */}
        {renderRarity()}

        {/* TCGPlayer Link (cart variant) */}
        {renderTCGPlayerLink()}

        {/* Quantity Control */}
        {renderQuantityControl() && (
          <div className="pt-1">
            {renderQuantityControl()}
          </div>
        )}
      </div>
    </div>
  );
}
