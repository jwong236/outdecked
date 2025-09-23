'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields, useFilterValues, useColorsForSeries } from '@/lib/hooks';

export function useSearchLogic() {
  const { deckBuilder } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // Pagination state - use search store for consistency
  const { setPage, setPerPage } = useSearchStore();

  // Dynamic filter options from API
  const { data: cardTypeOptionsData } = useFilterValues('CardType');
  const { data: rarityOptionsData } = useFilterValues('Rarity');
  const { data: colorOptionsData } = useFilterValues('ActivationEnergy');
  const { data: printTypeOptionsData } = useFilterValues('PrintType');
  
  // Series-specific colors (only when a series is selected)
  const currentSeries = currentDeck?.preferences?.defaultSeries || '';
  const { data: seriesSpecificColors } = useColorsForSeries(currentSeries, !!currentSeries);

  // Initialize filter states dynamically based on API data
  const [cardTypeFilters, setCardTypeFilters] = useState<Record<string, boolean>>({});
  const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>({});
  const [colorFilters, setColorFilters] = useState<Record<string, boolean>>({});
  const [printTypeFilters, setPrintTypeFilters] = useState<Record<string, boolean>>({});
  
  // Current color selection for search - initialize with deck's saved color filter
  const [currentSearchColor, setCurrentSearchColor] = useState<string>(currentDeck?.preferences?.defaultColorFilter || '');

  // Initialize filter states when API data is available and apply saved preferences
  React.useEffect(() => {
    if (cardTypeOptionsData && currentDeck) {
      console.log('🔄 Initializing card type filters:', {
        deckId: currentDeck.id,
        excludedCardTypes: currentDeck.preferences?.cardTypes,
        cardTypeOptionsData
      });
      
      const initialCardTypeFilters: Record<string, boolean> = {};
      const excludedCardTypes = currentDeck.preferences?.cardTypes || [];
      
      cardTypeOptionsData.forEach(option => {
        // Card types in preferences are EXCLUDED, so we check if NOT in the excluded list
        initialCardTypeFilters[option] = !excludedCardTypes.includes(option);
      });
      setCardTypeFilters(initialCardTypeFilters);
    }
  }, [cardTypeOptionsData, currentDeck?.preferences?.cardTypes, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  React.useEffect(() => {
    if (rarityOptionsData && currentDeck) {
      console.log('🔄 Initializing rarity filters:', {
        deckId: currentDeck.id,
        savedRarities: currentDeck.preferences?.rarities,
        rarityOptionsData
      });
      
      const initialRarityFilters: Record<string, boolean> = {};
      const savedRarities = currentDeck.preferences?.rarities || [];
      
      rarityOptionsData.forEach(option => {
        // Check if this rarity is in the saved preferences
        initialRarityFilters[option] = savedRarities.includes(option);
      });
      setRarityFilters(initialRarityFilters);
    }
  }, [rarityOptionsData, currentDeck?.preferences?.rarities, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  // Color filters are no longer used - we use defaultColorFilter instead

  React.useEffect(() => {
    if (printTypeOptionsData && currentDeck) {
      console.log('🔄 Initializing print type filters:', {
        deckId: currentDeck.id,
        savedPrintTypes: currentDeck.preferences?.printTypes,
        printTypeOptionsData
      });
      
      const initialPrintTypeFilters: Record<string, boolean> = {};
      const savedPrintTypes = currentDeck.preferences?.printTypes || [];
      
      printTypeOptionsData.forEach(option => {
        // Check if this print type is in the saved preferences
        initialPrintTypeFilters[option] = savedPrintTypes.includes(option);
      });
      setPrintTypeFilters(initialPrintTypeFilters);
    }
  }, [printTypeOptionsData, currentDeck?.preferences?.printTypes, currentDeck?.id]); // Only depend on deck ID, not entire deck object

  // Search store (keep for search functionality)
  const {
    searchPreferences,
    page,
    setQuery,
    setSeries,
    setColor,
    setCardType,
    setSort,
  } = useSearchStore();

  // Get current pagination values
  const currentPage = page;
  const itemsPerPage = searchPreferences.per_page;

  // Load all deck preferences when deck is loaded (local to deck builder only)
  React.useEffect(() => {
    if (currentDeck) {
      console.log('🔄 Loading deck preferences:', {
        deckId: currentDeck.id,
        preferences: currentDeck.preferences
      });
      
      // Load series preference
      if (currentDeck.preferences?.defaultSeries) {
        setSeries(currentDeck.preferences.defaultSeries);
      } else {
        setSeries('');
      }
      
      // Load color preference
      if (currentDeck.preferences?.defaultColorFilter) {
        setCurrentSearchColor(currentDeck.preferences.defaultColorFilter);
      } else {
        setCurrentSearchColor('');
      }
      
      // Load other filter preferences will be handled by the existing effects below
    } else {
      // Clear all preferences if no deck
      setSeries('');
      setCurrentSearchColor('');
    }
  }, [currentDeck, setSeries]);

  // Internal filters for search (includes default filter exclusions)
  const internalNotFilters = useMemo(() => {
    const filters: Array<{type: 'not', field: string, value: string, displayText: string}> = [];
    
    // Add unchecked print types to not_filters
    Object.entries(printTypeFilters).forEach(([printType, isChecked]) => {
      if (!isChecked) {
        filters.push({
          type: 'not',
        field: 'PrintType',
          value: printType,
          displayText: printType
        });
      }
    });
    
    // Add unchecked card types to not_filters
    Object.entries(cardTypeFilters).forEach(([cardType, isChecked]) => {
      if (!isChecked) {
        filters.push({
          type: 'not',
        field: 'CardType',
          value: cardType,
          displayText: cardType
        });
      }
    });
    
    // Add unchecked rarities to not_filters
    Object.entries(rarityFilters).forEach(([rarity, isChecked]) => {
      if (!isChecked) {
        filters.push({
          type: 'not',
          field: 'Rarity',
        value: rarity,
          displayText: rarity
        });
      }
    });
    
    // Add unchecked colors to not_filters
    Object.entries(colorFilters).forEach(([color, isChecked]) => {
      if (!isChecked) {
        filters.push({
          type: 'not',
          field: 'ActivationEnergy',
          value: color,
          displayText: color
        });
      }
    });
    
    return filters;
  }, [printTypeFilters, cardTypeFilters, rarityFilters, colorFilters]);

  // Empty not_filters for UI (no active filter pills from default filters)
  const emptyNotFilters: Array<{type: 'not', field: string, value: string, displayText: string}> = [];

  // Helper functions to check if current dropdown state matches presets
  const isBasicPrintsOnlyPreset = useMemo(() => {
    if (!printTypeOptionsData) return false;
    // Check if only "Base" is checked and all others are unchecked
    return printTypeOptionsData.every(option => 
      (option === 'Base' && printTypeFilters[option]) || 
      (option !== 'Base' && !printTypeFilters[option])
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
    const savedCardTypes = currentDeck?.preferences?.cardTypes || [];
    // Only apply card type exclusions if there are actually card types to exclude
    return savedCardTypes.length > 0 ? savedCardTypes.map((cardType: string) => ({
      type: 'not' as const,
      field: 'CardType',
      value: cardType,
      displayText: `CardType: ${cardType}`
    })) : [];
  }, [currentDeck?.preferences?.cardTypes]);

  // Filters for actual search (includes default filter exclusions)
  const searchFilters = {
    query: '', // Deck builder doesn't use query
    game: 'Union Arena',
    series: currentDeck?.preferences?.defaultSeries || '', // Use series from deck preferences
    color: currentSearchColor, // Use current search color selection
    cardType: '',
    sort: 'name_asc', // Default sort
    page: 1, // Default page
    per_page: 24, // Default per page
    and_filters: [], // No color filters from deck settings (using defaultColorFilter instead)
    or_filters: [],
    not_filters: [...internalNotFilters, ...deckCardTypeFilters] // Include card type exclusions
  };

  

  // Filters for UI display (no default filter pills)
  const uiFilters = {
    query: '', // Deck builder doesn't use query
    game: 'Union Arena',
    series: currentDeck?.preferences?.defaultSeries || '',
    color: '',
    cardType: '',
    sort: 'name_asc', // Default sort
    page: currentPage,
    per_page: itemsPerPage,
    and_filters: [],
    or_filters: [],
    not_filters: emptyNotFilters
  };

  // Simple checkbox handlers with default filter sync
  const handlePrintTypeChange = useCallback((value: string, checked: boolean) => {
    setPrintTypeFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Check if this change makes it match the Basic Prints Only preset
      const baseChecked = newFilters['Base'];
      const othersUnchecked = printTypeOptionsData?.filter(opt => opt !== 'Base').every(opt => !newFilters[opt]) ?? true;
      const matchesPreset = baseChecked && othersUnchecked;
      
      // Update deck's default filter if needed
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            visibility: currentDeck.preferences?.visibility || 'private',
            defaultSeries: currentDeck.preferences?.defaultSeries || '',
            defaultColorFilter: currentDeck.preferences?.defaultColorFilter || '',
            printTypes: Object.keys(newFilters).filter(key => newFilters[key]),
            cardTypes: currentDeck.preferences?.cardTypes || [],
            rarities: currentDeck.preferences?.rarities || []
          }
        };
        
        // Save to database immediately
        fetch(`/api/user/decks/${currentDeck.id}`, {
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
        // Card types in preferences are EXCLUDED, so we save the unchecked ones
        const excludedCardTypes = Object.keys(newFilters).filter(key => !newFilters[key]);
        
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            visibility: currentDeck.preferences?.visibility || 'private',
            defaultSeries: currentDeck.preferences?.defaultSeries || '',
            defaultColorFilter: currentDeck.preferences?.defaultColorFilter || '',
            printTypes: currentDeck.preferences?.printTypes || [],
            cardTypes: excludedCardTypes,
            rarities: currentDeck.preferences?.rarities || []
          }
        };
        
        // Save to database immediately
        try {
          const response = await fetch(`/api/user/decks/${updatedDeck.id}`, {
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
      }
      
      return newFilters;
    });
  }, [currentDeck]);

  const handleRarityChange = useCallback((value: string, checked: boolean) => {
    setRarityFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Save current filter states to deck preferences
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          preferences: {
            ...currentDeck.preferences,
            visibility: currentDeck.preferences?.visibility || 'private',
            defaultSeries: currentDeck.preferences?.defaultSeries || '',
            defaultColorFilter: currentDeck.preferences?.defaultColorFilter || '',
            printTypes: currentDeck.preferences?.printTypes || [],
            cardTypes: currentDeck.preferences?.cardTypes || [],
            rarities: Object.keys(newFilters).filter(key => newFilters[key])
          }
        };
        
        // Save to database immediately
        try {
          const response = await fetch(`/api/user/decks/${updatedDeck.id}`, {
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
      }
      
      return newFilters;
    });
  }, [currentDeck]);

  // handleColorChange removed - we use handleSearchColorChange instead

  const handleSeriesChange = useCallback(async (series: string) => {
    console.log('🔄 handleSeriesChange called with series:', series);
    
    // Update the deck's defaultSeries if we have a current deck
    if (currentDeck) {
      console.log('🔄 Updating deck defaultSeries from', currentDeck.preferences?.defaultSeries, 'to', series);
      const updatedDeck = {
        ...currentDeck,
        preferences: {
          ...currentDeck.preferences,
          visibility: currentDeck.preferences?.visibility || 'private',
          defaultSeries: series,
          defaultColorFilter: currentDeck.preferences?.defaultColorFilter || '',
          printTypes: currentDeck.preferences?.printTypes || [],
          cardTypes: currentDeck.preferences?.cardTypes || [],
          rarities: currentDeck.preferences?.rarities || []
        }
      };
      
      // Save to database immediately
      try {
        const response = await fetch(`/api/user/decks/${updatedDeck.id}`, {
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
      
      // Also update the search store for this deck's search context
      setSeries(series);
    }
  }, [setSeries, currentDeck]);

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
      
      const updatedDeck = {
        ...currentDeck,
        preferences: {
          ...currentDeck.preferences,
          visibility: currentDeck.preferences?.visibility || 'private',
          defaultSeries: currentDeck.preferences?.defaultSeries || '',
          defaultColorFilter: color,
          printTypes: currentDeck.preferences?.printTypes || [],
          cardTypes: currentDeck.preferences?.cardTypes || [],
          rarities: currentDeck.preferences?.rarities || []
        }
      };
      
      // Save to database
      try {
        const response = await fetch(`/api/user/decks/${updatedDeck.id}`, {
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
    setPerPage(itemsPerPage);
  }, [setPerPage]);

  // Search hooks - only search when deck is loaded and filters are ready
  const isDeckReady = !!(currentDeck && currentDeck.preferences);
  const { data: searchData, isLoading: searchLoading, error } = useSearchCards(searchFilters, isDeckReady);
  
  
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
    return cards.map(card => {
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
    setQuery(query);
  }, [setQuery]);

  const handleSearch = useCallback(() => {
    // The search is automatically triggered by the useSearchCards hook when filters change
    // This function can be used for additional search logic if needed
    console.log('Search triggered with query:', '');
  }, []);

  return {
    // State
    filters: uiFilters,
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
    currentSeries: currentDeck?.preferences?.defaultSeries || '',
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