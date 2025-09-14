'use client';

import { Card } from '@/types/card';
import { SearchCard } from './SearchCard';

export interface SearchResultsProps {
  cards: Card[];
  isLoading: boolean;
  error: Error | null;
  onCardClick: (card: Card) => void;
  className?: string;
  variant?: 'grid' | 'list';
  showPrices?: boolean;
  showRarity?: boolean;
}

export function SearchResults({
  cards,
  isLoading,
  error,
  onCardClick,
  className = '',
  variant = 'grid',
  showPrices = true,
  showRarity = true,
}: SearchResultsProps) {
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading cards</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md overflow-hidden animate-pulse"
            >
              <div className="aspect-[3/4] bg-gray-300" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-300 rounded w-3/4" />
                <div className="h-3 bg-gray-300 rounded w-1/2" />
                <div className="h-3 bg-gray-300 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className={`p-12 text-center ${className}`}>
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-2">No cards found</h3>
        <p className="text-gray-300">
          Try adjusting your search criteria or filters to find more cards.
        </p>
      </div>
    );
  }

  const gridClasses = variant === 'grid' 
    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
    : 'space-y-4';

  return (
    <div className={`${gridClasses} ${className}`}>
      {cards.map((card, index) => (
        <SearchCard
          key={card.id}
          card={card}
          onClick={onCardClick}
          showPrices={showPrices}
          showRarity={showRarity}
          variant={variant === 'list' ? 'compact' : 'default'}
          priority={index === 0}
        />
      ))}
    </div>
  );
}
