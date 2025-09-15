'use client';

import { useState, useEffect } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields } from '@/lib/hooks';
import { useUrlState } from '@/lib/useUrlState';
import { Card } from '@/types/card';
import { SearchResponse } from '@/lib/api';
import { FilterDropdown } from './FilterDropdown';
import { ActiveFilters } from './ActiveFilters';
import { AdvancedFilters } from './AdvancedFilters';
import { SearchGrid } from './SearchGrid';
import { Pagination } from '@/components/shared/layout/Pagination';
import { CardDetailModal } from './CardDetailModal';

export interface SearchLayoutProps {
  className?: string;
  showAdvancedFilters?: boolean;
  resultsPerPage?: number;
}

export function SearchLayout({ 
  className = '',
  showAdvancedFilters = true,
  resultsPerPage = 24
}: SearchLayoutProps) {
  const { 
    filters, 
    setQuery, 
    setSeries, 
    setColor, 
    setSort,
    setPage,
    addAndFilter,
    addOrFilter,
    addNotFilter,
    removeAndFilter,
    removeOrFilter,
    removeNotFilter,
    clearAllFilters,
    setPerPage,
    initializeFromUrl
  } = useSearchStore();

  const { getFiltersFromUrl, syncFiltersToUrl } = useUrlState();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [isNavigatingPages, setIsNavigatingPages] = useState<boolean>(false);

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlFilters = getFiltersFromUrl();
    if (Object.keys(urlFilters).length > 0) {
      initializeFromUrl(urlFilters);
    }
  }, [getFiltersFromUrl, initializeFromUrl]);

  // Set results per page
  useEffect(() => {
    setPerPage(resultsPerPage);
  }, [resultsPerPage, setPerPage]);

  // Sync filters to URL whenever they change
  useEffect(() => {
    syncFiltersToUrl(filters);
  }, [filters, syncFiltersToUrl]);

  const { data: searchData, isLoading, error } = useSearchCards(filters);
  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: filterFields } = useFilterFields();

  const searchResponse = searchData as unknown as SearchResponse;

  // Handle cross-page navigation - select appropriate card when page changes
  useEffect(() => {
    if (searchResponse?.cards && searchResponse.cards.length > 0 && isNavigatingPages) {
      // If we're navigating to next page, select first card
      if (selectedCardIndex >= searchResponse.cards.length) {
        setSelectedCard(searchResponse.cards[0]);
        setSelectedCardIndex(0);
        setIsNavigatingPages(false);
      }
      // If we're navigating to previous page, select last card
      else if (selectedCardIndex < 0) {
        const lastIndex = searchResponse.cards.length - 1;
        setSelectedCard(searchResponse.cards[lastIndex]);
        setSelectedCardIndex(lastIndex);
        setIsNavigatingPages(false);
      }
      // If we're navigating to next page and selectedCardIndex is 0, select first card
      else if (selectedCardIndex === 0) {
        setSelectedCard(searchResponse.cards[0]);
        setIsNavigatingPages(false);
      }
    }
  }, [searchResponse, selectedCardIndex, isNavigatingPages]);

  const handleCardClick = (card: Card) => {
    const index = searchResponse?.cards.findIndex(c => c.id === card.id) || 0;
    setSelectedCard(card);
    setSelectedCardIndex(index);
  };


  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setIsNavigatingPages(false);
  };

  const handleNavigate = (index: number) => {
    if (searchResponse?.cards[index]) {
      setSelectedCard(searchResponse.cards[index]);
      setSelectedCardIndex(index);
      setIsNavigatingPages(false);
    } else if (index >= searchResponse?.cards.length && searchResponse?.pagination.has_next) {
      // Navigate to next page - will show first card of next page
      setIsNavigatingPages(true);
      setPage(filters.page + 1);
      setSelectedCardIndex(0); // Will be first card of next page
    } else if (index < 0 && searchResponse?.pagination.has_prev) {
      // Navigate to previous page - will show last card of previous page
      setIsNavigatingPages(true);
      setPage(filters.page - 1);
      setSelectedCardIndex(-1); // Will be set to last card when data loads
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
      case 'sort':
        setSort('');
        break;
      case 'and':
        // Find and remove the specific AND filter
        const andIndex = filters.and_filters.findIndex(f => 
          value ? f.displayText === value : false
        );
        if (andIndex !== -1) removeAndFilter(andIndex);
        break;
      case 'or':
        // Find and remove the specific OR filter
        const orIndex = filters.or_filters.findIndex(f => 
          value ? f.displayText === value : false
        );
        if (orIndex !== -1) removeOrFilter(orIndex);
        break;
      case 'not':
        // Find and remove the specific NOT filter
        const notIndex = filters.not_filters.findIndex(f => 
          value ? f.displayText === value : false
        );
        if (notIndex !== -1) removeNotFilter(notIndex);
        break;
    }
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

  const sortOptions = [
    { value: '', label: 'Default' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'price_asc', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' },
    { value: 'rarity_asc', label: 'Rarity Low-High' },
    { value: 'rarity_desc', label: 'Rarity High-Low' },
    { value: 'number_asc', label: 'Card Number Low-High' },
    { value: 'number_desc', label: 'Card Number High-Low' },
    { value: 'required_energy_asc', label: 'Required Energy Low-High' },
    { value: 'required_energy_desc', label: 'Required Energy High-Low' },
  ];



  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Search Cards
        </h1>
        <p className="text-gray-200">
          Find and browse Union Arena trading cards
        </p>
      </div>

      {/* Search Filters */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Query */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-white mb-2">
              Search Cards
            </label>
            <input
              id="search"
              type="text"
              value={filters.query || ''}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter card name..."
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200"
            />
          </div>

          {/* Series Filter */}
          <FilterDropdown
            label="Series"
            value={filters.series || ''}
            options={seriesOptions}
            onChange={setSeries}
            placeholder="All Series"
          />

          {/* Color Filter */}
          <FilterDropdown
            label="Color"
            value={filters.color || ''}
            options={colorOptions}
            onChange={setColor}
            placeholder="All Colors"
          />


          {/* Sort Filter */}
          <FilterDropdown
            label="Sort By"
            value={filters.sort || ''}
            options={sortOptions}
            onChange={setSort}
            placeholder="Default"
          />
        </div>
      </div>

      {/* Active Filters */}
      <ActiveFilters
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <AdvancedFilters
          andFilters={filters.and_filters}
          orFilters={filters.or_filters}
          notFilters={filters.not_filters}
          onAddAndFilter={addAndFilter}
          onAddOrFilter={addOrFilter}
          onAddNotFilter={addNotFilter}
          onRemoveAndFilter={removeAndFilter}
          onRemoveOrFilter={removeOrFilter}
          onRemoveNotFilter={removeNotFilter}
          availableFields={filterFields || []}
          game={filters.game}
          className="mb-6"
        />
      )}

      {/* Results Summary */}
      {searchResponse && (
        <div className="mb-4 text-sm text-gray-200">
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

      {/* Search Results */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
        <SearchGrid
          cards={searchResponse?.cards || []}
          isLoading={isLoading}
          error={error}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Pagination */}
      {searchResponse && searchResponse.pagination.total_pages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={searchResponse.pagination.current_page}
            totalPages={searchResponse.pagination.total_pages}
            hasNext={searchResponse.pagination.has_next}
            hasPrev={searchResponse.pagination.has_prev}
          />
        </div>
      )}

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={searchResponse?.cards || []}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={searchResponse?.pagination.has_next || false}
        hasPrevPage={searchResponse?.pagination.has_prev || false}
      />
    </div>
  );
}
