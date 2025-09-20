'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields, useFilterValues } from '@/lib/hooks';
import { useDeckBuilderSelectors, useDeckBuilderActions } from '../DeckBuilderContext';
import { dataManager } from '@/lib/dataManager';

export function useSearchLogic() {
  const { currentDeck } = useDeckBuilderSelectors();
  
  // Pagination state - use search store for consistency
  const { setPage, setPerPage } = useSearchStore();

  // Dynamic filter options from API
  const { data: cardTypeOptionsData } = useFilterValues('CardType');
  const { data: rarityOptionsData } = useFilterValues('Rarity');
  const { data: colorOptionsData } = useFilterValues('ActivationEnergy');
  const { data: printTypeOptionsData } = useFilterValues('PrintType');

  // Initialize filter states dynamically based on API data
  const [cardTypeFilters, setCardTypeFilters] = useState<Record<string, boolean>>({});
  const [rarityFilters, setRarityFilters] = useState<Record<string, boolean>>({});
  const [colorFilters, setColorFilters] = useState<Record<string, boolean>>({});
  const [printTypeFilters, setPrintTypeFilters] = useState<Record<string, boolean>>({});

  // Initialize filter states when API data is available and apply default filters
  React.useEffect(() => {
    if (cardTypeOptionsData) {
      const initialCardTypeFilters: Record<string, boolean> = {};
      cardTypeOptionsData.forEach(option => {
        // Apply "No Action Points" default filter if enabled
        if (currentDeck?.defaultFilters?.noActionPoints && option === 'Action Point') {
          initialCardTypeFilters[option] = false; // Uncheck Action Points
        } else {
          initialCardTypeFilters[option] = true; // Check all others
        }
      });
      setCardTypeFilters(initialCardTypeFilters);
    }
  }, [cardTypeOptionsData, currentDeck?.defaultFilters?.noActionPoints, currentDeck?.savedDefaultFilters?.cardTypes]);

  React.useEffect(() => {
    if (rarityOptionsData) {
      const initialRarityFilters: Record<string, boolean> = {};
      
      rarityOptionsData.forEach(option => {
        // Apply "Base Rarity Only" default filter if enabled
        if (currentDeck?.defaultFilters?.baseRarityOnly) {
          // Only check base rarities (without numbers), uncheck all special rarities
          const isBaseRarity = option === 'Common' || option === 'Uncommon' || option === 'Rare' || option === 'Super Rare';
          initialRarityFilters[option] = isBaseRarity;
        } else {
          // Check all rarities if base rarity filter is disabled
          initialRarityFilters[option] = true;
        }
      });
      setRarityFilters(initialRarityFilters);
    }
  }, [rarityOptionsData, currentDeck?.defaultFilters?.baseRarityOnly, currentDeck?.savedDefaultFilters?.rarities]);

  React.useEffect(() => {
    if (colorOptionsData) {
      const initialColorFilters: Record<string, boolean> = {};
      colorOptionsData.forEach(option => {
        initialColorFilters[option] = true; // All checked by default
      });
      setColorFilters(initialColorFilters);
    }
  }, [colorOptionsData]);

  React.useEffect(() => {
    if (printTypeOptionsData) {
      const initialPrintTypeFilters: Record<string, boolean> = {};
      printTypeOptionsData.forEach(option => {
        // Apply "Basic Prints Only" default filter if enabled
        if (currentDeck?.defaultFilters?.basicPrintsOnly && option !== 'Base') {
          initialPrintTypeFilters[option] = false; // Uncheck non-base prints
        } else {
          initialPrintTypeFilters[option] = true; // Check all if basic prints filter is disabled
        }
      });
      setPrintTypeFilters(initialPrintTypeFilters);
    }
  }, [printTypeOptionsData, currentDeck?.defaultFilters?.basicPrintsOnly, currentDeck?.savedDefaultFilters?.printTypes]);

  // Search store (keep for search functionality)
  const {
    filters,
    setQuery,
    setSeries,
    setColor,
    setCardType,
    setSort,
  } = useSearchStore();

  // Get current pagination values
  const currentPage = filters.page;
  const itemsPerPage = filters.per_page;

  // Load series from deck's defaultSeries when deck is loaded
  React.useEffect(() => {
    if (currentDeck?.defaultSeries) {
      setSeries(currentDeck.defaultSeries);
    } else {
      // Clear series if no deck or no default series
      setSeries('');
    }
  }, [currentDeck?.defaultSeries, setSeries]);

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

  // Build color and card type filters from deck settings
  const deckColorFilters = useMemo(() => {
    const savedColors = currentDeck?.savedDefaultFilters?.colors || [];
    
    // Only apply color filters if there are actually colors selected
    // Empty array means "show all colors" (no filtering)
    const filters = savedColors.length > 0 ? savedColors.map(color => ({
      type: 'and' as const,
      field: 'ActivationEnergy',
      value: color,
      displayText: `Color: ${color}`
    })) : [];
    
    return filters;
  }, [currentDeck?.savedDefaultFilters?.colors]);

  const deckCardTypeFilters = useMemo(() => {
    const savedCardTypes = currentDeck?.savedDefaultFilters?.cardTypes || [];
    // Only apply card type exclusions if there are actually card types to exclude
    return savedCardTypes.length > 0 ? savedCardTypes.map(cardType => ({
      type: 'not' as const,
      field: 'CardType',
      value: cardType,
      displayText: `CardType: ${cardType}`
    })) : [];
  }, [currentDeck?.savedDefaultFilters?.cardTypes]);

  // Filters for actual search (includes default filter exclusions)
  const searchFilters = {
    query: filters.query || '', // Use query from search store
    game: 'Union Arena',
    series: filters.series, // Use series from search store (set by useEffect)
    color: '',
    cardType: '',
    sort: filters.sort,
    page: filters.page,
    per_page: filters.per_page,
    and_filters: deckColorFilters, // Include color filters from deck settings
    or_filters: [],
    not_filters: [...internalNotFilters, ...deckCardTypeFilters] // Include card type exclusions
  };

  

  // Filters for UI display (no default filter pills)
  const uiFilters = {
    query: filters.query || '', // Show actual query in UI
    game: 'Union Arena',
    series: currentDeck?.defaultSeries || '',
    color: '',
    cardType: '',
    sort: filters.sort,
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
          defaultFilters: {
            basicPrintsOnly: matchesPreset,
            noActionPoints: currentDeck.defaultFilters?.noActionPoints || false,
            baseRarityOnly: currentDeck.defaultFilters?.baseRarityOnly || false
          },
          // Save current filter states
          savedDefaultFilters: {
            printTypes: Object.keys(newFilters).filter(key => newFilters[key]),
            cardTypes: currentDeck.savedDefaultFilters?.cardTypes || [],
            rarities: currentDeck.savedDefaultFilters?.rarities || [],
            colors: currentDeck.savedDefaultFilters?.colors || []
          }
        };
        
        // Save to database immediately
        dataManager.updateDeck(updatedDeck).catch(console.error);
        // Don't update context state during render - let the deck loading handle this
      }
      
      return newFilters;
    });
  }, [currentDeck, printTypeOptionsData]);

  const handleCardTypeChange = useCallback((value: string, checked: boolean) => {
    setCardTypeFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Check if this change makes it match the No Action Points preset
      const actionPointUnchecked = !newFilters['Action Point'];
      const othersChecked = cardTypeOptionsData?.filter(opt => opt !== 'Action Point').every(opt => newFilters[opt]) ?? true;
      const matchesPreset = actionPointUnchecked && othersChecked;
      
      // Update deck's default filter if needed
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          defaultFilters: {
            basicPrintsOnly: currentDeck.defaultFilters?.basicPrintsOnly || false,
            noActionPoints: matchesPreset,
            baseRarityOnly: currentDeck.defaultFilters?.baseRarityOnly || false
          },
          // Save current filter states
          savedDefaultFilters: {
            printTypes: currentDeck.savedDefaultFilters?.printTypes || [],
            cardTypes: Object.keys(newFilters).filter(key => newFilters[key]),
            rarities: currentDeck.savedDefaultFilters?.rarities || [],
            colors: currentDeck.savedDefaultFilters?.colors || []
          }
        };
        
        // Save to database immediately
        dataManager.updateDeck(updatedDeck).catch(console.error);
        // Don't update context state during render - let the deck loading handle this
      }
      
      return newFilters;
    });
  }, [currentDeck, cardTypeOptionsData]);

  const handleRarityChange = useCallback((value: string, checked: boolean) => {
    setRarityFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Check if this change makes it match the Base Rarity Only preset
      const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
      const baseRaritiesChecked = baseRarities.every(baseRarity => 
        rarityOptionsData?.some(opt => opt.startsWith(baseRarity) && !opt.includes('1-Star') && !opt.includes('2-Star') && !opt.includes('3-Star') && !opt.includes('Ultra Rare') && !opt.includes('Union Rare') && newFilters[opt])
      ) ?? false;
      const specialRaritiesUnchecked = rarityOptionsData?.filter(opt => 
        opt.includes('1-Star') || opt.includes('2-Star') || opt.includes('3-Star') || opt.includes('Ultra Rare') || opt.includes('Union Rare')
      ).every(opt => !newFilters[opt]) ?? true;
      const matchesPreset = baseRaritiesChecked && specialRaritiesUnchecked;
      
      // Update deck's default filter if needed
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          defaultFilters: {
            basicPrintsOnly: currentDeck.defaultFilters?.basicPrintsOnly || false,
            noActionPoints: currentDeck.defaultFilters?.noActionPoints || false,
            baseRarityOnly: matchesPreset
          },
          // Save current filter states
          savedDefaultFilters: {
            printTypes: currentDeck.savedDefaultFilters?.printTypes || [],
            cardTypes: currentDeck.savedDefaultFilters?.cardTypes || [],
            rarities: Object.keys(newFilters).filter(key => newFilters[key]),
            colors: currentDeck.savedDefaultFilters?.colors || []
          }
        };
        
        // Save to database immediately
        dataManager.updateDeck(updatedDeck).catch(console.error);
        // Don't update context state during render - let the deck loading handle this
      }
      
      return newFilters;
    });
  }, [currentDeck, rarityOptionsData]);

  const handleColorChange = useCallback((value: string, checked: boolean) => {
    setColorFilters(prev => {
      const newFilters = { ...prev, [value]: checked };
      
      // Save current filter states to deck
      if (currentDeck) {
        const updatedDeck = {
          ...currentDeck,
          savedDefaultFilters: {
            printTypes: currentDeck.savedDefaultFilters?.printTypes || [],
            cardTypes: currentDeck.savedDefaultFilters?.cardTypes || [],
            rarities: currentDeck.savedDefaultFilters?.rarities || [],
            colors: Object.keys(newFilters).filter(key => newFilters[key])
          }
        };
        
        // Save to database immediately
        dataManager.updateDeck(updatedDeck).catch(console.error);
        // Don't update context state during render - let the deck loading handle this
      }
      
      return newFilters;
    });
  }, [currentDeck]);

  const handleSeriesChange = useCallback((series: string) => {
    console.log('🔄 handleSeriesChange called with series:', series);
    setSeries(series);
    
    // Also update the deck's defaultSeries if we have a current deck
    if (currentDeck) {
      console.log('🔄 Updating deck defaultSeries from', currentDeck.defaultSeries, 'to', series);
      const updatedDeck = {
        ...currentDeck,
        defaultSeries: series
      };
      
      // Save to database immediately
      dataManager.updateDeck(updatedDeck);
      
      // Don't update context state during render - let the deck loading handle this
    }
  }, [setSeries, currentDeck]);

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

  // Search hooks - use empty filters (no filtering applied)
  const { data: searchData, isLoading: searchLoading, error } = useSearchCards(searchFilters);
  
  
  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: filterFields } = useFilterFields();

  // Create options for dropdowns
  const seriesOptions = useMemo(() => [
    { value: '', label: 'All Series' },
    ...(seriesData || []).map(series => ({ value: series, label: series }))
  ], [seriesData]);

  const colorOptions = useMemo(() => [
    { value: '', label: 'All Colors' },
    ...(colorData || []).map(color => ({ value: color, label: color }))
  ], [colorData]);

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
    return rarityOptionsData.map(option => ({
      value: option,
      label: option,
      checked: rarityFilters[option] || false
    }));
  }, [rarityOptionsData, rarityFilters]);

  const collapsibleColorOptions = useMemo(() => {
    if (!colorOptionsData) return [];
    return colorOptionsData.map(option => ({
      value: option,
      label: option,
      checked: colorFilters[option] || false
    }));
  }, [colorOptionsData, colorFilters]);

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
      const deckCard = currentDeck?.cards?.find(deckCard => deckCard.card_url === card.card_url);
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
    console.log('Search triggered with query:', filters.query);
  }, [filters.query]);

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
    sortOptions,
    
    // Current values
    currentSeries: filters.series || '',
    currentColor: '',
    currentCardType: '',
    currentSort: 'name',
    
    // Handlers
    handlePrintTypeChange,
    handleCardTypeChange,
    handleRarityChange,
    handleColorChange,
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