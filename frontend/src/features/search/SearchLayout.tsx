'use client';

import React, { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields } from '@/lib/hooks';
import { Card, SearchResponse } from '@/types/card';
import { transformRawCardsToCards } from '@/lib/cardTransform';
import { FilterSection } from './FilterSection';
import { DefaultFilters } from './DefaultFilters';
import { SearchSettingsModal } from './SearchSettingsModal';
import { ActiveFilters } from './ActiveFilters';
import { SearchGrid } from './SearchGrid';
import { Pagination } from '@/components/shared/layout/Pagination';
import { CardDetailModal } from './CardDetailModal';

export interface SearchLayoutProps {
  className?: string;
  resultsPerPage?: number;
}

export function SearchLayout({ 
  className = '',
  resultsPerPage = 24
}: SearchLayoutProps) {
  const { 
    searchPreferences,
    setSearchPreferences,
    addFilter,
    removeFilter,
    clearAllFilters,
    setPage,
    setSort,
    setSeries,
    setCardType,
    setColor,
    getSeries,
    getCardType,
    getColor,
    getFiltersForAPI,
  } = useSessionStore();

  // Local state
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [isNavigatingPages, setIsNavigatingPages] = useState<boolean>(false);
  const [showSearchSettingsModal, setShowSearchSettingsModal] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Set client flag after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Set results per page
  useEffect(() => {
    if (searchPreferences.per_page !== resultsPerPage) {
      setSearchPreferences({ ...searchPreferences, per_page: resultsPerPage });
    }
  }, [resultsPerPage, setSearchPreferences, searchPreferences]);

  // Search parameters for API
  const searchParams = React.useMemo(() => {
    const apiFilters = getFiltersForAPI();
    return {
      ...apiFilters,
      query: debouncedQuery
    };
  }, [searchPreferences, debouncedQuery, getFiltersForAPI]);
  
  const { data: searchData, isLoading, error } = useSearchCards(searchParams);
  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: filterFields } = useFilterFields();

  const searchResponse = searchData as unknown as SearchResponse;
  
  // Transform raw API data to clean Card objects
  const transformedCards = React.useMemo(() => {
    if (!searchResponse?.cards) return [];
    return transformRawCardsToCards(searchResponse.cards);
  }, [searchResponse?.cards]);

  // Handle cross-page navigation
  useEffect(() => {
    if (transformedCards && transformedCards.length > 0 && isNavigatingPages) {
      if (selectedCardIndex >= transformedCards.length) {
        setSelectedCard(transformedCards[0]);
        setSelectedCardIndex(0);
        setIsNavigatingPages(false);
      } else if (selectedCardIndex < 0) {
        const lastIndex = transformedCards.length - 1;
        setSelectedCard(transformedCards[lastIndex]);
        setSelectedCardIndex(lastIndex);
        setIsNavigatingPages(false);
      } else if (selectedCardIndex === 0) {
        setSelectedCard(transformedCards[0]);
        setIsNavigatingPages(false);
      }
    }
  }, [transformedCards, selectedCardIndex, isNavigatingPages]);

  const handleCardClick = (card: Card) => {
    const index = transformedCards.findIndex(c => c.id === card.id) || 0;
    setSelectedCard(card);
    setSelectedCardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setIsNavigatingPages(false);
  };

  const handleNavigate = (index: number) => {
    if (transformedCards[index]) {
      setSelectedCard(transformedCards[index]);
      setSelectedCardIndex(index);
      setIsNavigatingPages(false);
    } else if (index >= transformedCards.length && searchResponse?.pagination.has_next) {
      setIsNavigatingPages(true);
      setPage(searchPreferences.page + 1);
      setSelectedCardIndex(0);
    } else if (index < 0 && searchResponse?.pagination.has_prev) {
      setIsNavigatingPages(true);
      setPage(searchPreferences.page - 1);
      setSelectedCardIndex(-1);
    }
  };

  const handleRemoveFilter = (filterType: string, value?: string) => {
    switch (filterType) {
      case 'query':
        setQuery('');
        break;
      case 'series':
        setSeries('');
        break;
      case 'color':
        setColor('');
        break;
      case 'cardType':
        setCardType('');
        break;
      case 'sort':
        setSort('name_asc');
        break;
      case 'and':
      case 'or':
      case 'not':
        const filterIndex = searchPreferences.filters.findIndex(filter => {
          return value ? filter.displayText === value : false;
        });
        if (filterIndex !== -1) removeFilter(filterIndex);
        break;
    }
  };

  const handleRemoveMultipleFilters = (filterType: string, values: string[]) => {
    const sortedValues = [...values].reverse();
    sortedValues.forEach(value => {
      handleRemoveFilter(filterType, value);
    });
  };

  const handleClearAllFilters = () => {
    clearAllFilters();
  };

  // Prepare dropdown options
  const seriesOptions = [
    { value: '', label: 'All Series' },
    ...(seriesData || []).map(series => ({ value: series, label: series }))
  ];

  const colorOptions = [
    { value: '', label: 'All Colors' },
    ...(colorData || []).map(color => ({ value: color, label: color }))
  ];

  const cardTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'Character', label: 'Character' },
    { value: 'Event', label: 'Event' },
    { value: 'Action Point', label: 'Action Point' },
    { value: 'Site', label: 'Site' },
  ];

  const sortOptions = [
    { value: 'recent_series_rarity_desc', label: 'Series' },
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'required_energy_asc', label: 'Required Energy Low-High' },
    { value: 'required_energy_desc', label: 'Required Energy High-Low' },
    { value: 'price_asc', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' },
    { value: 'rarity_asc', label: 'Rarity Low-High' },
    { value: 'rarity_desc', label: 'Rarity High-Low' },
    { value: 'number_asc', label: 'Card Number Low-High' },
    { value: 'number_desc', label: 'Card Number High-Low' },
  ];

  return (
    <div className={`min-h-screen ${className}`}>
      {/* Main Content - Two Column Layout */}
      <div className="flex">
        {/* Left Side - Filters */}
        <div className="w-80 bg-white/10 backdrop-blur-sm border-r border-white/20">
          <div className="p-4 pt-6 space-y-6">
            {/* Main Filters */}
            <FilterSection
              series={isClient ? (getSeries() || '') : ''}
              onSeriesChange={setSeries}
              color={isClient ? (getColor() || '') : ''}
              onColorChange={setColor}
              cardType={isClient ? (getCardType() || '') : ''}
              onCardTypeChange={setCardType}
              sort={searchPreferences.sort}
              onSortChange={setSort}
              seriesOptions={seriesOptions}
              colorOptions={colorOptions}
              cardTypeOptions={cardTypeOptions}
              sortOptions={sortOptions}
            />

            {/* Default Filters */}
            <DefaultFilters />

            {/* Search Settings Button */}
            <button
              onClick={() => setShowSearchSettingsModal(true)}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Search Settings
            </button>

            {/* Active Filters */}
            <ActiveFilters
              onRemoveFilter={handleRemoveFilter}
              onRemoveMultipleFilters={handleRemoveMultipleFilters}
              onClearAll={handleClearAllFilters}
            />
          </div>
        </div>

        {/* Right Side - Cards */}
        <div className="flex-1">
          {/* Title */}
          <div className="px-4 py-4 border-b border-white/20">
            <h1 className="text-2xl font-bold text-white flex items-center mb-4">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Cards
            </h1>
            
            {/* Search Input */}
            <div>
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter card name..."
                className="w-full rounded-lg border border-white/30 bg-white/20 py-2 px-3 text-white placeholder-white/70 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="p-4">
            {/* Results Summary */}
            {searchResponse && (
              <div className="mb-4 text-sm text-gray-300">
                {searchResponse.pagination.total_cards > 0 ? (
                  <>
                    Showing {((searchResponse.pagination.current_page - 1) * searchResponse.pagination.per_page) + 1} to{' '}
                    {Math.min(searchResponse.pagination.current_page * searchResponse.pagination.per_page, searchResponse.pagination.total_cards)} of{' '}
                    {searchResponse.pagination.total_cards} cards
                  </>
                ) : (
                  'No cards found'
                )}
              </div>
            )}
            
            <SearchGrid
              cards={transformedCards.map((card: Card) => ({ ...card, quantity: 0 }))}
              isLoading={isLoading}
              error={error}
              onCardClick={handleCardClick}
            />
          </div>

          {/* Pagination */}
          {searchResponse && searchResponse.pagination.total_pages > 1 && (
            <div className="border-t border-white/20 p-4">
              <Pagination
                currentPage={searchResponse.pagination.current_page}
                totalPages={searchResponse.pagination.total_pages}
                hasNext={searchResponse.pagination.has_next}
                hasPrev={searchResponse.pagination.has_prev}
              />
            </div>
          )}
        </div>
      </div>

      {/* Search Settings Modal */}
      <SearchSettingsModal
        isOpen={showSearchSettingsModal}
        onClose={() => setShowSearchSettingsModal(false)}
      />

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={transformedCards}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={searchResponse?.pagination.has_next || false}
        hasPrevPage={searchResponse?.pagination.has_prev || false}
      />
    </div>
  );
}