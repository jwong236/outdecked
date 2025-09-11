'use client';

import { useState, useEffect } from 'react';
// Custom modal implementation without scroll lock
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Card } from '@/types/card';

export interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  allCards: Card[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  className?: string;
}

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  allCards,
  currentIndex,
  onNavigate,
  hasNextPage = false,
  hasPrevPage = false,
  className = '',
}: CardDetailModalProps) {
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (card) {
      setImageLoading(true);
    }
  }, [card]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allCards.length - 1) {
      onNavigate(currentIndex + 1);
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
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Navigation Arrows - Outside Modal */}
      {(currentIndex > 0 || hasPrevPage) && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50 bg-white/90 hover:bg-white px-4 py-3 shadow-lg border border-gray-200 transition-all duration-200 rounded-lg"
          aria-label="Previous card"
        >
          <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
      )}
      
      {(currentIndex < allCards.length - 1 || hasNextPage) && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="fixed right-8 top-1/2 transform -translate-y-1/2 z-50 bg-white/90 hover:bg-white px-4 py-3 shadow-lg border border-gray-200 transition-all duration-200 rounded-lg"
          aria-label="Next card"
        >
          <ChevronRightIcon className="h-6 w-6 text-gray-600" />
        </button>
      )}

      {/* Modal Content */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-gray-900">{card.name}</h2>
                    {card.clean_name && card.clean_name !== card.name && (
                      <span className="text-sm text-gray-500">({card.clean_name})</span>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
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
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100">
                        {card.image_url ? (
                          <>
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                                     onError={() => setImageLoading(false)}
                                   />
                          </>
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
                        <h3 className="text-lg font-semibold text-gray-900">Card Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Product ID:</span>
                            <span className="ml-2 text-gray-900">{card.product_id}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Game:</span>
                            <span className="ml-2 text-gray-900">{card.game}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Series:</span>
                            <span className="ml-2 text-gray-900">{card.SeriesName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Rarity:</span>
                            <span className="ml-2 text-gray-900">{card.Rarity || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Card Type:</span>
                            <span className="ml-2 text-gray-900">{card.CardType || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Number:</span>
                            <span className="ml-2 text-gray-900">{card.Number || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Activation Energy:</span>
                            <span className="ml-2 text-gray-900">{card.ActivationEnergy || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Required Energy:</span>
                            <span className="ml-2 text-gray-900">{card.RequiredEnergy || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Action Point Cost:</span>
                            <span className="ml-2 text-gray-900">{card.ActionPointCost || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Battle Point BP:</span>
                            <span className="ml-2 text-gray-900">{card.BattlePointBP || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Trigger:</span>
                            <span className="ml-2 text-gray-900">{card.Trigger || 'N/A'}</span>
                          </div>
                        </div>
                        
                        {/* Description */}
                        {card.Description && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-500">Description:</span>
                            <p className="mt-1 text-sm text-gray-700">{card.Description}</p>
                          </div>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-600 font-medium">Market Price</div>
                          <div className="text-2xl font-bold text-green-700">{formatPrice(card.price)}</div>
                        </div>
                      </div>

                      {/* External Links */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {card.card_url && (
                            <a
                              href={card.card_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
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
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

      </div>
    </div>
  );
}
