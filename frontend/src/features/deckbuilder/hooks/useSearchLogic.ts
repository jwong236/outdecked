'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields, useFilterValues, useColorsForSeries } from '@/lib/hooks';
import { Card, SearchParams } from '@/types/card';
import { apiConfig } from '@/lib/apiConfig';

export function useSearchLogic() {
  const { deckBuilder } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // Pagination state - use search store for consistency

  // Dynamic filter options from API
  const { data: cardTypeOptionsData } = useFilterValues('card_type');
  const { data: rarityOptionsData } = useFilterValues('rarity');
  const { data: colorOptionsData } = useFilterValues('activation_energy');
  const { data: printTypeOptionsData } = useFilterValues('print_type');
  
  // Series-specific colors (only when a series is selected)
  const currentSeries = currentDeck?.preferences?.filters?.find(f => f.field === 'series')?.value || '';
  const { data: seriesSpecificColors } = useColorsForSeries(currentSeries, !!currentSeries);

  // Initialize filter states dynamically based on API data
  const [cardTypeFilters, setCardTypeFilters] = useState<Record<string, boolean>>({});
  const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>({});
  const [colorFilters, setColorFilters] = useState<Record<string, boolean>>({});
  const [printTypeFilters, setPrintTypeFilters] = useState<Record<string, boolean>>({});
  
  // Current color selection for search - initialize with deck's saved color filter
  const [currentSearchColor, setCurrentSearchColor] = useState<string>(
    currentDeck?.preferences?.filters?.find(f => f.field === 'activation_energy')?.value || ''
  );

  // Initialize filter states when API data is available and apply saved preferences
  React.useEffect(() => {
    if (cardTypeOptionsData && currentDeck) {
      const initialCardTypeFilters: Record<string, boolean> = {};
      const cardTypeFilters = currentDeck.preferences?.filters?.filter(f => f.field === 'card_type') || [];
      
      cardTypeOptionsData?.forEach(option => {
        // Check if this card type is included (not excluded with NOT filter)
        const isExcluded = cardTypeFilters.some(f => f.value === option && f.type === 'not');
        const isIncluded = cardTypeFilters.some(f => f.value === option && (f.type === 'or' || f.type === 'and'));
        initialCardTypeFilters[option] = isIncluded || (!isExcluded && cardTypeFilters.length === 0);
      });
      setCardTypeFilters(initialCardTypeFilters);
    }
  }, [cardTypeOptionsData, currentDeck?.preferences?.filters, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  React.useEffect(() => {
    if (rarityOptionsData && currentDeck) {
      const initialRarityFilters: Record<string, boolean> = {};
      const rarityFilters = currentDeck.preferences?.filters?.filter(f => f.field === 'rarity') || [];
      
      rarityOptionsData?.forEach(option => {
        // Check if this rarity is included (OR filters)
        const isIncluded = rarityFilters.some(f => f.value === option && (f.type === 'or' || f.type === 'and'));
        initialRarityFilters[option] = isIncluded;
      });
      setRarityFilters(initialRarityFilters);
    }
  }, [rarityOptionsData, currentDeck?.preferences?.filters, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  // Color filters are no longer used - we use defaultColorFilter instead

  React.useEffect(() => {
    if (printTypeOptionsData && currentDeck) {
      
      const initialPrintTypeFilters: Record<string, boolean> = {};
      const printTypeFilters = currentDeck.preferences?.filters?.filter(f => f.field === 'print_type') || [];
      
      printTypeOptionsData?.forEach(option => {
        if (printTypeFilters.length > 0) {
        // Check if this print type is included (OR filters)
        const isIncluded = printTypeFilters.some(f => f.value === option && (f.type === 'or' || f.type === 'and'));
          initialPrintTypeFilters[option] = isIncluded;
        } else {
          // Default: only Base and Starter Deck are checked
          initialPrintTypeFilters[option] = option === 'Base' || option === 'Starter Deck';
        }
      });
      setPrintTypeFilters(initialPrintTypeFilters);
    }
  }, [printTypeOptionsData, currentDeck?.preferences?.filters, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  // Search store (only for pagination and sort)
  const {
    searchPreferences,
    setPage,
    setSort,
  } = useSessionStore();

  // Get current pagination values
  const currentPage = searchPreferences.page;
  const itemsPerPage = searchPreferences.per_page;

  // Load deck preferences to local state only (no global search preferences)
  React.useEffect(() => {
    if (currentDeck) {
      // Load color preference to local state only
      const colorFilter = currentDeck.preferences?.filters?.find(f => f.field === 'activation_energy');
      if (colorFilter) {
        setCurrentSearchColor(colorFilter.value);
      } else {
        setCurrentSearchColor('');
      }
    } else {
      // Clear local preferences if no deck
      setCurrentSearchColor('');
    }
  }, [currentDeck]);

  // Default filters are now handled as positive inclusions in searchParams

  // Helper functions to check if current dropdown state matches presets
  const isBasicPrintsOnlyPreset = useMemo(() => {
    if (!printTypeOptionsData) return false;
    // Check if only "Base" and "Starter Deck" are checked and all others are unchecked
    return printTypeOptionsData.every(option => 
      ((option === 'Base' || option === 'Starter Deck') && printTypeFilters[option]) || 
      (option !== 'Base' && option !== 'Starter Deck' && !printTypeFilters[option])
    );
  }, [printTypeFilters, printTypeOptionsData]);

  const isNoActionPointsPreset = useMemo(() => {
    if (!cardTypeOptionsData) return false;
    // Check if only "Action Point" is unchecked and all others are checked
    return cardTypeOptionsData.every(option => 
      (option === 'Action Point' && !cardTypeFilters[option]) || 
      (option !== 'Action Point' && cardTypeFilters[option])
    );
  }, [cardTypeFilters, cardTypeOptionsData]);

  const isBaseRarityOnlyPreset = useMemo(() => {
    if (!rarityOptionsData) return false;
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    // Check if only base rarities are checked and all special rarities are unchecked
    return rarityOptionsData.every(option => 
      (baseRarities.includes(option) && rarityFilters[option]) || 
      (!baseRarities.includes(option) && !rarityFilters[option])
    );
  }, [rarityFilters, rarityOptionsData]);

  // Build card type filters from deck settings
  const deckCardTypeFilters = useMemo(() => {
    const cardTypeFilters = currentDeck?.preferences?.filters?.filter(f => f.field === 'card_type') || [];
    // Return the actual filters from the deck
    return cardTypeFilters;
  }, [currentDeck?.preferences?.filters]);

  // Local search params built from deck preferences and component state only
  const searchParams: SearchParams = {
    query: '', // Deck builder doesn't use query
    sort: currentDeck?.preferences?.sort || 'name_asc', // Use deck sort preference
    page: currentPage,
    per_page: itemsPerPage,
    filters: [
      // Use deck preferences directly (unified SearchParams structure)
      // This includes the saved color filter from the deck
      ...(currentDeck?.preferences?.filters || [])
    ]
  };

  // Simple checkbox handlers with default filter sync
  const handlePrintTypeChange = useCallback((value: string, checked: boolean) => {
    setPrintTypeFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Check if this change makes it match the Basic Prints Only preset
      const baseChecked = newFilters['Base'];
      const starterDeckChecked = newFilters['Starter Deck'];
      const othersUnchecked = printTypeOptionsData?.filter(opt => opt !== 'Base' && opt !== 'Starter Deck').every(opt => !newFilters[opt]) ?? true;
      const matchesPreset = baseChecked && starterDeckChecked && othersUnchecked;
      
      // Update deck's default filter if needed
      if (currentDeck) {
        // Update the deck's filters array
        const currentFilters = currentDeck.preferences?.filters || [];
        const updatedFilters = currentFilters.filter(f => f.field !== 'print_type');
        
        // Add new print type filters
        Object.keys(newFilters).forEach(value => {
          if (newFilters[value]) {
            updatedFilters.push({
              type: 'or' as const,
              field: 'print_type',
              value: value,
              displayText: `Print Type: ${value}`
            });
          }
        });
        
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            filters: updatedFilters
          }
        };
        
        // Save to database immediately
        fetch(apiConfig.getApiUrl(`/api/user/decks/${currentDeck.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedDeck)
        }).catch(console.error);
        // Don't update context state during render - let the deck loading handle this
      }
      
      return newFilters;
    });
  }, [currentDeck, printTypeOptionsData]);

  const handleCardTypeChange = useCallback((value: string, checked: boolean) => {
    setCardTypeFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Save current filter states to deck preferences
      if (currentDeck) {
        // Update the deck's filters array
        const currentFilters = currentDeck.preferences?.filters || [];
        const updatedFilters = currentFilters.filter(f => f.field !== 'card_type');
        
        // Add new card type filters (excluded ones as NOT filters)
        Object.keys(newFilters).forEach(value => {
          if (!newFilters[value]) {
            updatedFilters.push({
              type: 'not' as const,
              field: 'card_type',
              value: value,
              displayText: `Card Type: ${value}`
            });
          }
        });
        
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            filters: updatedFilters
          }
        };
        
        // Save to database immediately
        fetch(apiConfig.getApiUrl(`/api/user/decks/${updatedDeck.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedDeck),
        }).catch(console.error);
      }
      
      return newFilters;
    });
  }, [currentDeck]);

  const handleRarityChange = useCallback((value: string, checked: boolean) => {
    setRarityFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Save current filter states to deck preferences
      if (currentDeck) {
        // Update the deck's filters array
        const currentFilters = currentDeck.preferences?.filters || [];
        const updatedFilters = currentFilters.filter(f => f.field !== 'rarity');
        
        // Add new rarity filters
        Object.keys(newFilters).forEach(value => {
          if (newFilters[value]) {
            updatedFilters.push({
              type: 'or' as const,
              field: 'rarity',
              value: value,
              displayText: `Rarity: ${value}`
            });
          }
        });
        
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            filters: updatedFilters
          }
        };
        
        // Save to database immediately
        fetch(apiConfig.getApiUrl(`/api/user/decks/${updatedDeck.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedDeck),
        }).catch(console.error);
      }
      
      return newFilters;
    });
  }, [currentDeck]);

  // handleColorChange removed - we use handleSearchColorChange instead

  const handleSeriesChange = useCallback(async (series: string) => {
    // Update the deck's defaultSeries if we have a current deck
    if (currentDeck) {
      // Update series filter in unified SearchParams structure
      const currentFilters = currentDeck.preferences?.filters || [];
      const filteredFilters = currentFilters.filter(f => f.field !== 'series');
      const newFilters = series ? [
        ...filteredFilters,
        { type: 'and' as const, field: 'series', value: series, displayText: `Series: ${series}` }
      ] : filteredFilters;
      
      const updatedDeck = {
        ...currentDeck,
        preferences: {
          ...currentDeck.preferences,
          filters: newFilters
        }
      };
      
      // Save to database immediately
      try {
        const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${updatedDeck.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedDeck),
        });
        
        if (!response.ok) {
          console.error('Failed to save deck preferences');
        }
      } catch (error) {
        console.error('Error saving deck preferences:', error);
      }
      
      // Series change is handled locally through deck preferences
    }
  }, [currentDeck]);

  const handleSearchColorChange = useCallback(async (color: string) => {
    console.log('🎨 Search color changed to:', color);
    setCurrentSearchColor(color);
    
    // Save color filter to deck's preferences
    if (currentDeck) {
      console.log('🎨 Saving color filter to deck:', {
        deckId: currentDeck.id,
        color: color,
        currentPreferences: currentDeck.preferences
      });
      
      // Update the deck's filters array
      const currentFilters = currentDeck.preferences?.filters || [];
      const updatedFilters = currentFilters.filter(f => f.field !== 'activation_energy');
      
      // Add new color filter
      if (color) {
        updatedFilters.push({
          type: 'and' as const,
          field: 'activation_energy',
          value: color,
          displayText: `Color: ${color}`
        });
      }
      
      const updatedDeck = {
        ...currentDeck,
        preferences: {
          ...currentDeck.preferences,
          filters: updatedFilters
        }
      };
      
      // Save to database
      try {
        const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${updatedDeck.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedDeck),
        });
        
        if (response.ok) {
          console.log('🎨 Color filter saved to database');
        } else {
          console.error('Failed to save color filter');
        }
      } catch (error) {
        console.error('Error saving color filter:', error);
      }
    }
  }, [currentDeck]);

  const handleSortChange = useCallback((sort: string) => {
    setSort(sort);
  }, [setSort]);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setPage(page);
  }, [setPage]);

  const handleItemsPerPageChange = useCallback((itemsPerPage: number) => {
    // TODO: Implement per_page change if needed
    // setPerPage(itemsPerPage);
  }, []);

  // Search hooks - only search when deck is loaded and filters are ready
  const isDeckReady = !!(currentDeck && currentDeck.preferences);
  const { data: searchData, isLoading: searchLoading, error } = useSearchCards(searchParams, isDeckReady);
  
  
  // Color loading is now handled in the main deck loading effect above

  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: filterFields } = useFilterFields();

  // Create options for dropdowns
  const seriesOptions = useMemo(() => [
    { value: '', label: 'All Series' },
    ...(seriesData || []).map(series => ({ value: series, label: series }))
  ], [seriesData]);

  const colorOptions = useMemo(() => {
    // Use series-specific colors if available, otherwise use all colors
    const colorsToUse = seriesSpecificColors || colorOptionsData || [];
    return [
      { value: '', label: 'All Colors' },
      ...colorsToUse.map(color => ({ value: color, label: color }))
    ];
  }, [seriesSpecificColors, colorOptionsData]);

  // Note: cardTypeOptions is now loaded dynamically from API

  const sortOptions = useMemo(() => [
    { value: 'required_energy_desc', label: 'Required Energy (High to Low)' },
    { value: 'required_energy_asc', label: 'Required Energy (Low to High)' },
    { value: 'price_desc', label: 'Price (High to Low)' },
    { value: 'price_asc', label: 'Price (Low to High)' },
    { value: 'rarity_desc', label: 'Rarity (High to Low)' },
    { value: 'rarity_asc', label: 'Rarity (Low to High)' },
    { value: 'name_asc', label: 'Name (A to Z)' },
    { value: 'name_desc', label: 'Name (Z to A)' },
  ], []);

  // Create collapsible filter options with current state
  const collapsibleCardTypeOptions = useMemo(() => {
    if (!cardTypeOptionsData) return [];
    return cardTypeOptionsData.map(option => ({
      value: option,
      label: option,
      checked: cardTypeFilters[option] || false
    }));
  }, [cardTypeOptionsData, cardTypeFilters]);

  const collapsibleRarityOptions = useMemo(() => {
    if (!rarityOptionsData) return [];
    
    // Use the API order (already correct)
    return rarityOptionsData.map(option => ({
      value: option,
      label: option,
      checked: rarityFilters[option] || false
    }));
  }, [rarityOptionsData, rarityFilters]);

  const collapsibleColorOptions = useMemo(() => {
    const colorsToUse = seriesSpecificColors || colorOptionsData || [];
    if (!colorsToUse.length) return [];
    return colorsToUse.map(option => ({
      value: option,
      label: option,
      checked: colorFilters[option] || false
    }));
  }, [seriesSpecificColors, colorOptionsData, colorFilters]);

  const collapsiblePrintTypeOptions = useMemo(() => {
    if (!printTypeOptionsData) return [];
    return printTypeOptionsData.map(option => ({
      value: option,
      label: option,
      checked: printTypeFilters[option] || false
    }));
  }, [printTypeOptionsData, printTypeFilters]);

  // Add searchResultsWithQuantities (extract cards from searchData and merge with deck quantities)
  const searchResultsWithQuantities = useMemo(() => {
    const cards = searchData?.cards || [];
    return cards.map((card: Card) => {
      // Find if this card exists in the current deck
      const deckCard = currentDeck?.cards?.find((deckCard: any) => deckCard.card_url === card.card_url);
      return {
        ...card,
        quantity: deckCard?.quantity || 0  // Set quantity property for QuantityControl
      };
    });
  }, [searchData?.cards, currentDeck?.cards]);

  // hasActiveAdvancedFilters is always false since we removed all filter logic
  const hasActiveAdvancedFilters = false;

  // Search handlers
  const handleQueryChange = useCallback((query: string) => {
    // TODO: Implement query change if needed
    // setQuery(query);
  }, []);

  const handleSearch = useCallback(() => {
    // The search is automatically triggered by the useSearchCards hook when filters change
    // This function can be used for additional search logic if needed
    console.log('Search triggered with query:', '');
  }, []);

  return {
    // State
    searchData,
    searchResultsWithQuantities,
    searchLoading,
    
    // Pagination
    currentPage,
    itemsPerPage,
    pagination: searchData?.pagination,
    
    // Options
    seriesOptions,
    colorOptions,
    sortOptions,
    
    // Current values
    currentSeries: currentDeck?.preferences?.filters?.find(f => f.field === 'series')?.value || '',
    currentColor: currentSearchColor,
    currentCardType: '',
    currentSort: 'name',
    
    // Handlers
    handlePrintTypeChange,
    handleCardTypeChange,
    handleRarityChange,
    // handleColorChange removed - we use handleSearchColorChange instead
    handleSearchColorChange,
    handleSeriesChange,
    handleSortChange,
    handlePageChange,
    handleItemsPerPageChange,
    handleQueryChange,
    handleSearch,
    
    // Collapsible filter options
    collapsiblePrintTypeOptions,
    collapsibleCardTypeOptions,
    rarityOptions: collapsibleRarityOptions,
    collapsibleColorOptions,
    
    // Raw options data
    colorOptionsData,
    
    // Additional properties
    hasActiveAdvancedFilters,
    
    // Preset states (computed from current dropdown states)
    isBasicPrintsOnlyPreset,
    isNoActionPointsPreset,
    isBaseRarityOnlyPreset,
  };
}