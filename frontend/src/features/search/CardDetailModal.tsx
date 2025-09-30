'use client';

import { useState, useEffect } from 'react';
// Custom modal implementation without scroll lock
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Card } from '@/types/card';
import { QuantityControl } from '@/components/shared/ui/QuantityControl';
import { getProductImageCard } from '@/lib/imageUtils';
import { CardDetailModal as BaseCardDetailModal } from '@/components/shared/modals/BaseModal';

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

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, currentIndex, allCards.length, hasPrevPage, hasNextPage, onNavigate]);

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
    if (!card?.product_id) return;
    
    try {
      const response = await fetch(getProductImageCard(card.product_id));
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
    <>
      {/* Navigation Arrows - Outside Modal - only show if navigation props are provided */}
      {onNavigate && allCards.length > 0 && (
        <>
          {(currentIndex > 0 || hasPrevPage) && (
            <button
              onClick={handlePrevious}
              className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[9999] bg-black/50 backdrop-blur-sm hover:bg-black/70 px-4 py-3 shadow-2xl border border-white/30 transition-all duration-200 rounded-lg text-white"
              aria-label="Previous card"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )}
          
          {(currentIndex < allCards.length - 1 || hasNextPage) && (
            <button
              onClick={handleNext}
              className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[9999] bg-black/50 backdrop-blur-sm hover:bg-black/70 px-4 py-3 shadow-2xl border border-white/30 transition-all duration-200 rounded-lg text-white"
              aria-label="Next card"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )}
        </>
      )}

      {/* Modal Content */}
      <BaseCardDetailModal isOpen={isOpen} onClose={onClose} size="xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                    {card.clean_name && card.clean_name !== card.name && (
                      <span className="text-sm text-gray-300">({card.clean_name})</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Card Image */}
                    <div className="space-y-4">
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800/50 border border-white/10">
                        {card.product_id && !imageError ? (
                          <>
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                              </div>
                            )}
                            <Image
                              src={getProductImageCard(card.product_id)}
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
                          
                          {/* Key Card Attributes - Specific Order */}
                          {card.attributes.find(attr => attr.name === 'RequiredEnergy')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Required Energy:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'RequiredEnergy')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'ActionPointCost')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Action Point Cost:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'ActionPointCost')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'ActivationEnergy')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Activation Energy:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'ActivationEnergy')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'GeneratedEnergy')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Generated Energy:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'GeneratedEnergy')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'BattlePointBP')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Battle Point (BP):</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'BattlePointBP')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'CardType')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Card Type:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'CardType')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'Rarity')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Rarity:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'Rarity')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'PrintType')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Print Type:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'PrintType')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'SeriesName')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Series Name:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'SeriesName')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'Number')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Number:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'Number')?.value}</span>
                            </div>
                          )}
                          
                          {card.attributes.find(attr => attr.name === 'Affinities')?.value && (
                            <div>
                              <span className="font-medium text-gray-300">Affinities:</span>
                              <span className="ml-2 text-white">{card.attributes.find(attr => attr.name === 'Affinities')?.value}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Description - Full Width */}
                        {card.attributes.find(attr => attr.name === 'Description')?.value && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-300">Description:</span>
                            <p className="mt-1 text-sm text-gray-200 leading-relaxed">{card.attributes.find(attr => attr.name === 'Description')?.value}</p>
                          </div>
                        )}
                        
                        {/* Trigger - Full Width */}
                        {card.attributes.find(attr => attr.name === 'TriggerText')?.value && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-300">Trigger:</span>
                            <p className="mt-1 text-sm text-gray-200 leading-relaxed">{card.attributes.find(attr => attr.name === 'TriggerText')?.value}</p>
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
                              card={{ ...card, quantity: 0 }} 
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

      </BaseCardDetailModal>
    </>
  );
}
