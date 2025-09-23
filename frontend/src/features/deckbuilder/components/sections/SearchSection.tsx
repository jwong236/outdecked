'use client';

import React from 'react';
import { DeckBuilderSearchGrid } from '../grids/DeckBuilderSearchGrid';
import { CompactFilterSection } from '../filters/CompactFilterSection';
import { useSessionStore } from '@/stores/sessionStore';

interface SearchSectionProps {
  searchCache: Record<string, any>;
  setSearchCache: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onCardClick?: (card: any) => void;
  fetchMissingCardData?: (cardIds: string[]) => Promise<void>;
  onSearchResultsChange?: (results: any[]) => void;
  onQuantityChange?: (card: any, change: number) => void;
}

export const SearchSection = React.memo(function SearchSection({ searchCache, setSearchCache, onCardClick, fetchMissingCardData, onSearchResultsChange, onQuantityChange }: SearchSectionProps) {
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // State for search results and local search state
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(24);
  const [currentSort, setCurrentSort] = React.useState('name_asc');
  const [currentColor, setCurrentColor] = React.useState(currentDeck?.preferences?.color || '');
  const [colorOptions, setColorOptions] = React.useState<Array<{value: string, label: string}>>([]);
  
  // Search filters based on currentDeck preferences
  const filters = { 
    query: searchQuery, 
    series: currentDeck?.preferences?.series || '', 
    color: currentColor, 
    cardType: '', 
    sort: currentSort 
  };
  
  // Fetch colors for the current series
  React.useEffect(() => {
    fetchColorsForSeries();
  }, [currentDeck?.preferences?.series]);


  const fetchColorsForSeries = async () => {
    const currentSeries = currentDeck?.preferences?.series;
    
    if (currentSeries) {
      try {
        const response = await fetch(`/api/cards/colors/${encodeURIComponent(currentSeries)}?game=Union Arena`, {
          credentials: 'include'
        });
        const colors = await response.json();
        
        setColorOptions([
          { value: '', label: 'All Colors' },
          ...colors.map((color: string) => ({ value: color, label: color }))
        ]);
        
        console.log('🃏 Fetched colors for series:', currentSeries, colors);
      } catch (error) {
        console.error('🃏 Error fetching colors for series:', error);
        // Fallback to all colors
        setColorOptions([
          { value: '', label: 'All Colors' },
          { value: 'Red', label: 'Red' },
          { value: 'Blue', label: 'Blue' },
          { value: 'Green', label: 'Green' },
          { value: 'Yellow', label: 'Yellow' },
          { value: 'Purple', label: 'Purple' }
        ]);
      }
    } else {
      // No series selected, show all colors
      setColorOptions([
        { value: '', label: 'All Colors' },
        { value: 'Red', label: 'Red' },
        { value: 'Blue', label: 'Blue' },
        { value: 'Green', label: 'Green' },
        { value: 'Yellow', label: 'Yellow' },
        { value: 'Purple', label: 'Purple' }
      ]);
    }
  };

  // Helper function to get card from cache
  const getCardFromCache = (cardId: string) => {
    return searchCache[cardId];
  };

  // Helper function to add card to deck (will be used by quantity control)
  const addCardToDeck = (cardId: string, quantity: number) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) {
      return;
    }
    
    // Get full card data from cache
    const fullCardData = searchCache[cardId];
    if (!fullCardData) {
      return;
    }
    
    const existingCardIndex = currentDeck.cards?.findIndex((card: any) => card.card_id === parseInt(cardId)) ?? -1;
    
    let updatedCards;
    if (existingCardIndex >= 0) {
      // Update existing card quantity
      updatedCards = [...(currentDeck.cards || [])];
      updatedCards[existingCardIndex] = { 
        card_id: parseInt(cardId), 
        quantity 
      };
    } else {
      // Add new card to deck with minimal data (only card_id and quantity)
      const newCard = { 
        card_id: parseInt(cardId), 
        quantity 
      };
      updatedCards = [...(currentDeck.cards || []), newCard];
    }
    
    // Update sessionStore
    const updatedDeck = { ...currentDeck, cards: updatedCards };
    setCurrentDeck(updatedDeck);
  };

  // Use the passed onQuantityChange handler instead of our own
  const handleQuantityChange = onQuantityChange || ((card: any, change: number) => {
    console.log('SearchSection fallback handleQuantityChange called with:', card.id, change);
    // Fallback implementation if no handler is provided
  });

  // Helper function to remove card from deck
  const removeCardFromDeck = (cardId: string) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) return;
    
    const updatedCards = (currentDeck.cards || []).filter((card: any) => card.card_id !== parseInt(cardId));
    const updatedDeck = { ...currentDeck, cards: updatedCards };
    setCurrentDeck(updatedDeck);
  };
  
  const fetchCards = React.useCallback(async () => {
    setSearchLoading(true);
    try {
      const searchParams = new URLSearchParams({
        game: 'Union Arena',
        page: currentPage.toString(),
        per_page: itemsPerPage.toString(),
        sort: currentSort
      });
      
      // Add search query if it exists
      if (searchQuery.trim()) {
        searchParams.append('q', searchQuery.trim());
      }
      
      // Add series filter if it exists
      if (currentDeck?.preferences?.series) {
        searchParams.append('series', currentDeck.preferences.series);
      }
      
      // Add color filter if it exists
      if (currentColor) {
        searchParams.append('color', currentColor);
      }
      
      // Add card types filter if it exists (API uses 'CardType' parameter, multiple values)
      if (currentDeck?.preferences?.cardTypes && currentDeck.preferences.cardTypes.length > 0) {
        currentDeck.preferences.cardTypes.forEach(cardType => {
          searchParams.append('CardType', cardType);
        });
      }
      
      // Add print types filter if it exists (API uses 'PrintType' parameter, multiple values)
      if (currentDeck?.preferences?.printTypes && currentDeck.preferences.printTypes.length > 0) {
        currentDeck.preferences.printTypes.forEach(printType => {
          searchParams.append('PrintType', printType);
        });
      }
      
      // Add rarities filter if it exists (API uses field name 'Rarity', multiple values)
      if (currentDeck?.preferences?.rarities && currentDeck.preferences.rarities.length > 0) {
        currentDeck.preferences.rarities.forEach(rarity => {
          searchParams.append('Rarity', rarity);
        });
      }
      
      console.log('🃏 Fetching cards with params:', searchParams.toString());
      const response = await fetch(`/api/cards?${searchParams}`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      console.log('🃏 Cards API response:', data);
      if (data.cards) {
        setSearchResults(data.cards);
        
        // Notify parent component of search results change
        if (onSearchResultsChange) {
          onSearchResultsChange(data.cards);
        }
        
        // Cache the cards by product_id for fast deck building
        setSearchCache(prev => {
          const newCache = { ...prev };
          data.cards.forEach(card => {
            newCache[card.id] = card; // Cache by product_id
          });
          return newCache;
        });
        
      } else {
        console.log('🃏 No cards in response or API error');
      }
    } catch (error) {
      console.error('🃏 Error fetching cards:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [currentPage, itemsPerPage, currentSort, searchQuery, currentDeck?.preferences?.series, currentColor]);
  
  // Initial fetch when component mounts or deck changes
  React.useEffect(() => {
    if (currentDeck && Object.keys(currentDeck).length > 0) {
      fetchCards();
    }
  }, [currentDeck?.id, currentDeck?.preferences?.series, currentSort, currentPage, itemsPerPage, searchQuery, currentColor]); // Run when any search parameter changes
  
  // Merge search results with deck quantities
  const searchResultsWithQuantities = searchResults.map(card => {
    const deckCard = currentDeck?.cards?.find((deckCard: any) => deckCard.id === card.id);
    return {
      ...card,
      quantity: deckCard?.quantity || 0
    };
  });
  
  // Basic options for dropdowns
  const cardTypeOptions = [
    { value: 'Character', label: 'Character' },
    { value: 'Event', label: 'Event' },
    { value: 'Stage', label: 'Stage' }
  ];
  const sortOptions = [
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'required_energy_asc', label: 'Energy Cost Low-High' },
    { value: 'required_energy_desc', label: 'Energy Cost High-Low' },
    { value: 'rarity_asc', label: 'Rarity Low-High' },
    { value: 'rarity_desc', label: 'Rarity High-Low' },
    { value: 'number_asc', label: 'Number Low-High' },
    { value: 'number_desc', label: 'Number High-Low' },
    { value: 'price_asc', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' }
  ];
  const hasActiveAdvancedFilters = false;
  const currentSeries = currentDeck?.preferences?.series || '';
  const currentCardType = '';
  
  // Handler functions
  const handleQueryChange = (query: string) => {
    setSearchQuery(query);
  };
  
  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
  };
  
  const handleSearchColorChange = (color: string) => {
    setCurrentColor(color);
    setCurrentPage(1); // Reset to first page when changing filters
    // Note: We don't update currentDeck here to avoid infinite loops
    // The color filter is handled locally in this component
  };
  
  const handleSortChange = (sort: string) => {
    setCurrentSort(sort);
    setCurrentPage(1); // Reset to first page when changing sort
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
  
  // Mock pagination data (should come from API response)
  const pagination = { 
    total_cards: searchResults.length, 
    total_pages: Math.ceil(searchResults.length / itemsPerPage),
    current_page: currentPage,
    per_page: itemsPerPage,
    has_prev: currentPage > 1,
    has_next: currentPage < Math.ceil(searchResults.length / itemsPerPage)
  };
  // TODO: Implement these functions or remove if not needed
  // const { deckCards } = useDeckBuilderSelectors();
  // const { setShowAdvancedFiltersModal, setSelectedCard, setModalOpen } = useDeckBuilderActions();

  const handleCardClick = (card: any) => {
    onCardClick?.(card);
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
              <label className="text-sm font-medium text-white">Color:</label>
              <select
                value={currentColor || ''}
                onChange={(e) => handleSearchColorChange(e.target.value)}
                className="px-3 py-1 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {colorOptions?.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800">
                    {option.label}
                  </option>
                )) || (
                  <option value="" className="bg-gray-800">Loading...</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white">Sort by:</label>
              <select
                value={currentSort || 'name_asc'}
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
          query={searchQuery || ''}
          onQueryChange={handleQueryChange}
          onSearch={handleSearch}
          onAdvancedFilters={() => (window as any).openDeckSettingsModal?.()}
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
            deckCards={currentDeck?.cards || []}
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
      {pagination && pagination.total_cards > 0 && (
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
              <option value={24}>24 per page</option>
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
});
