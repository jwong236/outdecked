'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/types/card';
import { QuantityControl } from '@/components/shared/ui/QuantityControl';
import { apiConfig } from '../../lib/apiConfig';
import { useSessionStore } from '@/stores/sessionStore';

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
    default: 'p-3',
    compact: 'p-2',
    detailed: 'p-4',
  };

  // Handle card click to show full-size image
  const handleCardClick = () => {
    if (onClick) {
      onClick(card);
    }
  };

  // Get current quantity from sessionStore print list
  const { proxyPrinter } = useSessionStore();
  const getCurrentQuantity = () => {
    const existingItem = proxyPrinter.printList.find(item => item.product_id === card.product_id);
    return existingItem ? existingItem.quantity : 0;
  };

  const currentQuantity = getCurrentQuantity();

  // Helper function to get proxied image URL
  const getProxiedImageUrl = (imageUrl: string) => {
    if (!imageUrl) return '/placeholder-card.png';
    
    // Extract product_id from TCGPlayer URL
    const tcgplayerMatch = imageUrl.match(/tcgplayer-cdn\.tcgplayer\.com\/product\/(\d+)/);
    if (tcgplayerMatch) {
      const productId = tcgplayerMatch[1];
      return `/api/images/product/${productId}?size=1000x1000`;
    }
    
    // Fallback to direct URL (shouldn't happen for TCGPlayer images)
    return imageUrl;
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={handleCardClick}
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
        
        {/* No quantity badge - quantity is shown in the control below */}
      </div>

      {/* Quantity Control */}
      <div className="flex items-center justify-center pt-2">
        <QuantityControl 
          card={card} 
          variant="button"
          context="printList"
          buttonLayout="auto"
          size="sm"
        />
      </div>
    </div>
  );
}