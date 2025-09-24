'use client';

import { Card, ExpandedCard } from '@/types/card';
import { ReactNode } from 'react';

export type GridSize = 'compact' | 'default' | 'spacious' | 'custom';

export interface BaseCardGridProps {
  cards: ExpandedCard[];
  isLoading?: boolean;
  error?: Error | null;
  gridSize?: GridSize;
  customGridClasses?: string;
  className?: string;
  children: (card: ExpandedCard, index: number) => ReactNode;
}

export function BaseCardGrid({
  cards,
  isLoading = false,
  error = null,
  gridSize = 'default',
  customGridClasses,
  className = '',
  children,
}: BaseCardGridProps) {
  
  const getGridClasses = () => {
    if (customGridClasses) {
      return customGridClasses;
    }

    const baseClasses = 'grid gap-4';
    
    switch (gridSize) {
      case 'compact':
        return `${baseClasses} grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8`;
      case 'default':
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`;
      case 'spacious':
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
      default:
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`;
    }
  };

  // Error state
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

  // Loading state
  if (isLoading) {
    const gridClasses = getGridClasses();
    return (
      <div className={`${gridClasses} ${className}`}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 animate-pulse"
          >
            <div className="aspect-[3/4] bg-white/20 rounded-t-lg"></div>
            <div className="p-3 space-y-2">
              <div className="h-4 bg-white/20 rounded w-3/4"></div>
              <div className="h-3 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (cards.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-white/50 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No cards found</h3>
        <p className="text-white/70">Try adjusting your search or filters</p>
      </div>
    );
  }

  const gridClasses = getGridClasses();

  return (
    <div className={`${gridClasses} ${className}`}>
      {cards.map((card, index) => {
        // Use a more reliable key - card_url is more likely to be unique
        const cardKey = card.card_url || card.id || `card-${index}`;
        
        return (
          <div key={cardKey}>
            {children(card, index)}
          </div>
        );
      })}
    </div>
  );
}
