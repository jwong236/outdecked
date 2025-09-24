'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields } from '@/lib/hooks';
import { useUrlState } from '@/lib/useUrlState';
import { Card } from '@/types/card';
import { SearchResponse } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { FilterSection } from './FilterSection';
import { QuickFilters } from './QuickFilters';
import { AdvancedFiltersButton } from './AdvancedFiltersButton';
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
  const { user } = useAuth();
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

  // Override getQuery to use local state
  const getQuery = () => query;

  const { getFiltersFromUrl, syncFiltersToUrl } = useUrlState();

  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [isNavigatingPages, setIsNavigatingPages] = useState<boolean>(false);
  const [showAdvancedFiltersModal, setShowAdvancedFiltersModal] = useState(false);
  const [query, setQuery] = useState<string>(''); // Temporary UI state

  // Search preferences are automatically loaded by sessionStore

  // Initialize filters from URL on mount (only once)
  useEffect(() => {
    const urlFilters = getFiltersFromUrl();
    if (Object.keys(urlFilters).length > 0) {
      // Apply URL filters to searchPreferences
      if (urlFilters.query) {
        // TODO: Implement setQuery if needed
      }
      if (urlFilters.sort) setSort(urlFilters.sort);
      if (urlFilters.page) setPage(urlFilters.page);
      if (urlFilters.per_page) {
        // Note: per_page is handled by the resultsPerPage useEffect below
      }
      
      // Apply filters from unified filter system
      if (urlFilters.filters && Array.isArray(urlFilters.filters)) {
        urlFilters.filters.forEach(filter => {
          if (filter.field === 'SeriesName') setSeries(filter.value);
          if (filter.field === 'ActivationEnergy') setColor(filter.value);
          if (filter.field === 'CardType') setCardType(filter.value);
        });
      }
    }
  }, []); // Empty dependency array - only run once on mount

  // Set results per page
  useEffect(() => {
    if (searchPreferences.per_page !== resultsPerPage) {
      setSearchPreferences({ ...searchPreferences, per_page: resultsPerPage });
    }
  }, [resultsPerPage, setSearchPreferences, searchPreferences]);

  // Sync filters to URL whenever they change
  useEffect(() => {
    syncFiltersToUrl(getFiltersForAPI());
  }, [searchPreferences, syncFiltersToUrl, getFiltersForAPI]);

  const { data: searchData, isLoading, error } = useSearchCards(getFiltersForAPI());
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
      setPage(searchPreferences.page + 1);
      setSelectedCardIndex(0); // Will be first card of next page
    } else if (index < 0 && searchResponse?.pagination.has_prev) {
      // Navigate to previous page - will show last card of previous page
      setIsNavigatingPages(true);
      setPage(searchPreferences.page - 1);
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
      case 'cardType':
        setCardType('');
        break;
      case 'sort':
        setSort('name_asc'); // Reset to default sort
        break;
      case 'and':
      case 'or':
      case 'not':
        // Find and remove the specific filter
        const filterIndex = searchPreferences.filters.findIndex(filter => {
          return value ? filter.displayText === value : false;
        });
        if (filterIndex !== -1) removeFilter(filterIndex);
        break;
    }
  };

  const handleRemoveMultipleFilters = (filterType: string, values: string[]) => {
    // Remove filters in reverse order to avoid index shifting issues
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
    { value: 'name_asc', label: 'Default' },
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

  const hasActiveAdvancedFilters = searchPreferences.filters.length > 0;

  return (
    <div className={`min-h-screen ${className}`}>
      {/* Main Content - Two Column Layout */}
      <div className="flex">
        {/* Left Side - Filters */}
        <div className="w-80 bg-white/10 backdrop-blur-sm border-r border-white/20">
          <div className="p-4 pt-6 space-y-6">
            {/* Main Filters */}
            <FilterSection
              series={getSeries()}
              onSeriesChange={setSeries}
              color={getColor()}
              onColorChange={setColor}
              cardType={getCardType()}
              onCardTypeChange={setCardType}
              sort={searchPreferences.sort}
              onSortChange={setSort}
              seriesOptions={seriesOptions}
              colorOptions={colorOptions}
              cardTypeOptions={cardTypeOptions}
              sortOptions={sortOptions}
            />

            {/* Default Filters */}
            <QuickFilters />

            {/* Advanced Filters Button */}
            <AdvancedFiltersButton
              onOpen={() => setShowAdvancedFiltersModal(true)}
              hasActiveFilters={hasActiveAdvancedFilters}
              variant="advanced-filters"
              className="w-full"
            />

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
                value={getQuery()}
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
              cards={(() => {
                console.log('🔍 SearchLayout: searchResponse:', searchResponse);
                console.log('🔍 SearchLayout: searchResponse?.cards:', searchResponse?.cards);
                console.log('🔍 SearchLayout: isLoading:', isLoading);
                console.log('🔍 SearchLayout: error:', error);
                
                const cards = searchResponse?.cards || [];
                console.log('🔍 SearchLayout: cards array:', cards);
                console.log('🔍 SearchLayout: cards length:', cards.length);
                
                const expandedCards = cards.map(card => ({ ...card, quantity: 0 }));
                console.log('🔍 SearchLayout: expandedCards:', expandedCards);
                
                return expandedCards;
              })()}
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

      {/* Advanced Filters Modal */}
      {showAdvancedFiltersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 p-8 w-[50vw] max-w-none mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
              <button
                onClick={() => setShowAdvancedFiltersModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh]">
              <AdvancedFilters
                andFilters={searchPreferences.filters.filter(f => f.type === 'and')}
                orFilters={searchPreferences.filters.filter(f => f.type === 'or')}
                notFilters={searchPreferences.filters.filter(f => f.type === 'not')}
                onAddAndFilter={(filter) => addFilter(filter)}
                onAddOrFilter={(filter) => addFilter(filter)}
                onAddNotFilter={(filter) => addFilter(filter)}
                onRemoveAndFilter={(index) => {
                  const andFilters = searchPreferences.filters.filter(f => f.type === 'and');
                  const globalIndex = searchPreferences.filters.findIndex(f => f === andFilters[index]);
                  if (globalIndex !== -1) removeFilter(globalIndex);
                }}
                onRemoveOrFilter={(index) => {
                  const orFilters = searchPreferences.filters.filter(f => f.type === 'or');
                  const globalIndex = searchPreferences.filters.findIndex(f => f === orFilters[index]);
                  if (globalIndex !== -1) removeFilter(globalIndex);
                }}
                onRemoveNotFilter={(index) => {
                  const notFilters = searchPreferences.filters.filter(f => f.type === 'not');
                  const globalIndex = searchPreferences.filters.findIndex(f => f === notFilters[index]);
                  if (globalIndex !== -1) removeFilter(globalIndex);
                }}
                availableFields={filterFields || []}
                game={searchPreferences.filters.find(f => f.field === 'game')?.value || ''}
              />
            </div>
          </div>
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
