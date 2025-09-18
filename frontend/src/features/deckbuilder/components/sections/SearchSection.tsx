'use client';

import React from 'react';
import { DeckBuilderSearchGrid } from '../grids/DeckBuilderSearchGrid';
import { CompactFilterSection } from '../filters/CompactFilterSection';
import { useSearchLogic } from '../../hooks/useSearchLogic';
import { useDeckOperations } from '../../hooks/useDeckOperations';
import { useDeckBuilderSelectors, useDeckBuilderActions } from '../../DeckBuilderContext';

export function SearchSection() {
  const { 
    filters,
    searchResultsWithQuantities,
    searchLoading,
    seriesOptions,
    colorOptions,
    cardTypeOptions,
    sortOptions,
    hasActiveAdvancedFilters,
    currentSeries,
    currentColor,
    currentCardType,
    handleSeriesChange,
    handleSortChange,
    handleQueryChange,
    handleSearch,
    // Pagination
    currentPage,
    itemsPerPage,
    pagination,
    handlePageChange,
    handleItemsPerPageChange
  } = useSearchLogic();

  const { handleQuantityChange } = useDeckOperations();
  const { deckCards } = useDeckBuilderSelectors();
  const { setShowAdvancedFiltersModal, setSelectedCard, setModalOpen } = useDeckBuilderActions();

  const handleCardClick = (card: any) => {
    // Find the correct index of the clicked card in the search results
    const cardIndex = searchResultsWithQuantities.findIndex(c => c.id === card.id);
    setSelectedCard(card, cardIndex >= 0 ? cardIndex : 0);
    setModalOpen(true); // Open the card detail modal
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 flex flex-col">
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Cards
            {searchResultsWithQuantities.length > 0 && (
              <span className="ml-2 text-sm font-normal text-white/70">
                ({searchResultsWithQuantities.length} results)
              </span>
            )}
          </h2>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white">Sort by:</label>
              <select
                value={filters.sort || 'required_energy_desc'}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-1 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <CompactFilterSection
          query={filters.query || ''}
          onQueryChange={handleQueryChange}
          onSearch={handleSearch}
          onAdvancedFilters={() => setShowAdvancedFiltersModal(true)}
          hasActiveFilters={hasActiveAdvancedFilters}
        />
      </div>

      <div className="flex-1 overflow-auto">
        {searchLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : searchResultsWithQuantities.length > 0 ? (
          <DeckBuilderSearchGrid
            cards={searchResultsWithQuantities}
            onCardClick={handleCardClick}
            onAddToDeck={(card) => handleQuantityChange(card, 1)}
            onQuantityChange={handleQuantityChange}
            showRarity={true}
            deckCards={deckCards}
            customGridClasses="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          />
        ) : (
          <div className="flex items-center justify-center h-32 text-white/70">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>No cards found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
          <div className="flex items-center space-x-4">
            <span className="text-white/70 text-sm">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total_cards)} of {pagination.total_cards} cards
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm [&>option]:bg-gray-800 [&>option]:text-white"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_prev}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded transition-colors text-sm"
            >
              Previous
            </button>
            
            <span className="text-white/70 text-sm px-2">
              Page {currentPage} of {pagination.total_pages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded transition-colors text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
