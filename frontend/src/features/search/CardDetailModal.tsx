'use client';

import { useState, useEffect } from 'react';
// Custom modal implementation without scroll lock
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Card } from '@/types/card';
import { QuantityControl } from '@/components/shared/ui/QuantityControl';
import { formatTriggerWithIcons } from '@/lib/triggerIcons';

export interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  allCards?: Card[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  className?: string;
}

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  allCards = [],
  currentIndex = 0,
  onNavigate,
  hasNextPage = false,
  hasPrevPage = false,
  className = '',
}: CardDetailModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (card) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [card]);

  const handlePrevious = () => {
    if (onNavigate) {
      if (currentIndex > 0) {
        // Navigate to previous card on current page
        onNavigate(currentIndex - 1);
      } else if (hasPrevPage) {
        // Navigate to previous page (will show last card of previous page)
        onNavigate(-1);
      }
    }
  };

  const handleNext = () => {
    if (onNavigate) {
      if (currentIndex < allCards.length - 1) {
        // Navigate to next card on current page
        onNavigate(currentIndex + 1);
      } else if (hasNextPage) {
        // Navigate to next page (will show first card of next page)
        onNavigate(allCards.length);
      }
    }
  };

  const handleDownloadImage = async () => {
    if (!card?.image_url) return;
    
    try {
      const response = await fetch(card.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${card.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      // Safe removal with check
      if (link.parentNode === document.body) {
        document.body.removeChild(link);
      }
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };


  if (!card) return null;

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || price === 0) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Navigation Arrows - Outside Modal - only show if navigation props are provided */}
      {onNavigate && allCards.length > 0 && (
        <>
          {(currentIndex > 0 || hasPrevPage) && (
            <button
              onClick={handlePrevious}
              className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50 bg-white/10 backdrop-blur-sm hover:bg-white/20 px-4 py-3 shadow-xl border border-white/20 transition-all duration-200 rounded-lg text-white"
              aria-label="Previous card"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}
          
          {(currentIndex < allCards.length - 1 || hasNextPage) && (
            <button
              onClick={handleNext}
              className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 bg-white/10 backdrop-blur-sm hover:bg-white/20 px-4 py-3 shadow-xl border border-white/20 transition-all duration-200 rounded-lg text-white"
              aria-label="Next card"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
        </>
      )}

      {/* Modal Content */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                    {card.clean_name && card.clean_name !== card.name && (
                      <span className="text-sm text-gray-300">({card.clean_name})</span>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Card Image */}
                    <div className="space-y-4">
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800/50 border border-white/10">
                        {card.image_url && !imageError ? (
                          <>
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                              </div>
                            )}
                            <Image
                              src={card.image_url}
                              alt={card.name}
                              fill
                              className={`object-contain transition-opacity duration-300 ${
                                imageLoading ? 'opacity-0' : 'opacity-100'
                              }`}
                              sizes="(max-width: 1024px) 100vw, 50vw"
                              onLoad={() => setImageLoading(false)}
                              onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                              }}
                              unoptimized={true}
                            />
                          </>
                        ) : imageError ? (
                          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 p-8">
                            <svg className="w-24 h-24 mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-200 mb-2">Image Coming Soon</div>
                              <div className="text-sm text-gray-400">This card is not yet released</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      

                    </div>

                    {/* Card Details */}
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Card Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-300">Product ID:</span>
                            <span className="ml-2 text-white">{card.product_id || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Game:</span>
                            <span className="ml-2 text-white">{card.game}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Series:</span>
                            <span className="ml-2 text-white">{card.SeriesName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Rarity:</span>
                            <span className="ml-2 text-white">{card.Rarity || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Card Type:</span>
                            <span className="ml-2 text-white">{card.CardType || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Number:</span>
                            <span className="ml-2 text-white">{card.Number || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Activation Energy:</span>
                            <span className="ml-2 text-white">{card.ActivationEnergy || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Required Energy:</span>
                            <span className="ml-2 text-white">{card.RequiredEnergy || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Action Point Cost:</span>
                            <span className="ml-2 text-white">{card.ActionPointCost || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-300">Battle Point BP:</span>
                            <span className="ml-2 text-white">{card.BattlePointBP || 'N/A'}</span>
                          </div>
                        </div>
                        
                        {/* Trigger */}
                        {card.Trigger && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-300">Trigger:</span>
                            <div className="mt-1 text-sm text-gray-200 leading-relaxed">{formatTriggerWithIcons(card.Trigger)}</div>
                          </div>
                        )}
                        
                        {/* Description */}
                        {card.Description && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-300">Description:</span>
                            <p className="mt-1 text-sm text-gray-200">{card.Description}</p>
                          </div>
                        )}
                      </div>


                      {/* External Links */}
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          {card.card_url && (
                            <a
                              href={card.card_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                            >
                              <span className="font-semibold">{formatPrice(card.price)}</span>
                              <span className="text-sm">TCGP</span>
                              <Image
                                src="/tcg_icon.png"
                                alt="TCGPlayer"
                                width={16}
                                height={16}
                                className="w-4 h-4"
                              />
                            </a>
                          )}
                          <div className="flex-1">
                            <QuantityControl 
                              card={card} 
                              variant="button"
                              context="hand"
                              buttonLayout="auto"
                              size="md" 
                              className="w-full justify-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

      </div>
    </div>
  );
}
