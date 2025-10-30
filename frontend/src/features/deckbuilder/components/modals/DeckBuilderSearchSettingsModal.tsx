'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
// Removed FilterDropdown import - using native select elements
import { useSessionStore } from '@/stores/sessionStore';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { StandardModal } from '@/components/shared/modals/BaseModal';
import { apiConfig } from '@/lib/apiConfig';

interface DeckBuilderSearchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeckBuilderSearchSettingsModal({ isOpen, onClose }: DeckBuilderSearchSettingsModalProps) {
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  
  // State for API data
  const [seriesOptions, setSeriesOptions] = React.useState<Array<{value: string, label: string}>>([]);
  const [collapsiblePrintTypeOptions, setCollapsiblePrintTypeOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [collapsibleCardTypeOptions, setCollapsibleCardTypeOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [rarityOptions, setRarityOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [loading, setLoading] = React.useState(false);

  // Fetch filter options from API when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen]);

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      // Fetch all filter options in parallel
      const [seriesRes, cardTypeRes, printTypeRes, rarityRes] = await Promise.all([
        fetch(apiConfig.getApiUrl('/api/cards/attributes/series?game=Union Arena'), { credentials: 'include' }),
        fetch(apiConfig.getApiUrl('/api/cards/attributes/card_type?game=Union Arena'), { credentials: 'include' }),
        fetch(apiConfig.getApiUrl('/api/cards/attributes/print_type?game=Union Arena'), { credentials: 'include' }),
        fetch(apiConfig.getApiUrl('/api/cards/attributes/rarity?game=Union Arena'), { credentials: 'include' })
      ]);

      const [seriesData, cardTypeData, printTypeData, rarityData] = await Promise.all([
        seriesRes.json(),
        cardTypeRes.json(),
        printTypeRes.json(),
        rarityRes.json()
      ]);

      // Convert arrays to option objects
      setSeriesOptions(seriesData.map((value: string) => ({ value, label: value })));
      
      // For collapsible options, check if they're in currentDeck preferences
      // Exclude NOT filters when determining checkbox state
      const currentPrintTypes = currentDeck?.preferences?.filters?.filter(f => f.field === 'print_type' && f.type !== 'not').map(f => f.value) || [];
      const currentCardTypes = currentDeck?.preferences?.filters?.filter(f => f.field === 'card_type' && f.type !== 'not').map(f => f.value) || [];
      const currentRarities = currentDeck?.preferences?.filters?.filter(f => f.field === 'rarity' && f.type !== 'not').map(f => f.value) || [];
      
      setCollapsiblePrintTypeOptions(printTypeData.map((value: string) => ({ 
        value, 
        label: value, 
        checked: currentPrintTypes.includes(value) 
      })));
      
      setCollapsibleCardTypeOptions(cardTypeData.map((value: string) => ({ 
        value, 
        label: value, 
        checked: currentCardTypes.includes(value) 
      })));
      
      setRarityOptions(rarityData.map((value: string) => ({ 
        value, 
        label: value, 
        checked: currentRarities.includes(value) 
      })));

    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSeries = currentDeck?.preferences?.filters?.find(f => f.field === 'series')?.value || '';
  
  // Calculate default filter indicators
  const isBasicPrintsOnly = React.useMemo(() => {
    if (!currentDeck || !('preferences' in currentDeck)) return false;
    const printTypes = currentDeck.preferences?.filters?.filter(f => f.field === 'print_type').map(f => f.value) || [];
    // Basic Prints Only means both Base and Starter Deck are checked, and nothing else
    return printTypes.length === 2 && 
           printTypes.includes('Base') && 
           printTypes.includes('Starter Deck');
  }, [currentDeck]);

  const isBaseRarityOnly = React.useMemo(() => {
    if (!currentDeck || !('preferences' in currentDeck)) return false;
    const rarities = currentDeck.preferences?.filters?.filter(f => f.field === 'rarity').map(f => f.value) || [];
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    return baseRarities.every(rarity => rarities.includes(rarity)) && 
           rarities.length === baseRarities.length;
  }, [currentDeck]);
  
  // Sync collapsible checkbox states with deck filters (exclude NOT filters)
  React.useEffect(() => {
    if (collapsibleCardTypeOptions.length > 0 && currentDeck?.preferences?.filters) {
      const currentCardTypes = currentDeck.preferences.filters
        .filter(f => f.field === 'card_type' && f.type !== 'not')
        .map(f => f.value);
      setCollapsibleCardTypeOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentCardTypes.includes(option.value) 
        }))
      );
    }
  }, [currentDeck?.preferences?.filters, collapsibleCardTypeOptions.length]);

  React.useEffect(() => {
    if (collapsiblePrintTypeOptions.length > 0 && currentDeck?.preferences?.filters) {
      const currentPrintTypes = currentDeck.preferences.filters
        .filter(f => f.field === 'print_type' && f.type !== 'not')
        .map(f => f.value);
      setCollapsiblePrintTypeOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentPrintTypes.includes(option.value) 
        }))
      );
    }
  }, [currentDeck?.preferences?.filters, collapsiblePrintTypeOptions.length]);

  React.useEffect(() => {
    if (rarityOptions.length > 0 && currentDeck?.preferences?.filters) {
      const currentRarities = currentDeck.preferences.filters
        .filter(f => f.field === 'rarity' && f.type !== 'not')
        .map(f => f.value);
      setRarityOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentRarities.includes(option.value) 
        }))
      );
    }
  }, [currentDeck?.preferences?.filters, rarityOptions.length]);
  
  // Handler functions that update sessionStore
  const handlePrintTypeChange = (value: string, checked: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) return;
    
    const currentFilters = currentDeck.preferences?.filters || [];
    let newFilters;
    
    if (checked) {
      // Add filter if not already present
      const exists = currentFilters.some(f => f.field === 'print_type' && f.value === value);
      if (!exists) {
        newFilters = [...currentFilters, {
          type: 'or' as const,
          field: 'print_type',
          value: value,
          displayText: `Print Type: ${value}`
        }];
      } else {
        newFilters = currentFilters;
      }
    } else {
      // Remove filter
      newFilters = currentFilters.filter(f => !(f.field === 'print_type' && f.value === value));
    }
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        filters: newFilters
      }
    };
    
    setCurrentDeck(updatedDeck);
    
    // Update local state to reflect the change
    setCollapsiblePrintTypeOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleCardTypeChange = (value: string, checked: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) return;
    
    const currentFilters = currentDeck.preferences?.filters || [];
    let newFilters;
    
    if (checked) {
      // Add filter if not already present
      const exists = currentFilters.some(f => f.field === 'card_type' && f.value === value);
      if (!exists) {
        newFilters = [...currentFilters, {
          type: 'or' as const,
          field: 'card_type',
          value: value,
          displayText: `Card Type: ${value}`
        }];
      } else {
        newFilters = currentFilters;
      }
    } else {
      // Remove filter
      newFilters = currentFilters.filter(f => !(f.field === 'card_type' && f.value === value));
    }
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        filters: newFilters
      }
    };
    
    setCurrentDeck(updatedDeck);
    
    // Update local state to reflect the change
    setCollapsibleCardTypeOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleRarityChange = (value: string, checked: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) return;
    
    const currentFilters = currentDeck.preferences?.filters || [];
    let newFilters;
    
    if (checked) {
      // Add filter if not already present
      const exists = currentFilters.some(f => f.field === 'rarity' && f.value === value);
      if (!exists) {
        newFilters = [...currentFilters, {
          type: 'or' as const,
          field: 'rarity',
          value: value,
          displayText: `Rarity: ${value}`
        }];
      } else {
        newFilters = currentFilters;
      }
    } else {
      // Remove filter
      newFilters = currentFilters.filter(f => !(f.field === 'rarity' && f.value === value));
    }
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        filters: newFilters
      }
    };
    
    setCurrentDeck(updatedDeck);
    
    // Update local state to reflect the change
    setRarityOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleSeriesChange = (series: string) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) {
      return;
    }
    
    const currentFilters = currentDeck.preferences?.filters || [];
    let newFilters;
    
    if (series) {
      // Remove existing series filter and add new one
      newFilters = currentFilters.filter(f => f.field !== 'series');
      newFilters.push({
        type: 'and' as const,
        field: 'series',
        value: series,
        displayText: `Series: ${series}`
      });
    } else {
      // Remove series filter
      newFilters = currentFilters.filter(f => f.field !== 'series');
    }
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        filters: newFilters
      }
    };
    
    setCurrentDeck(updatedDeck);
  };


  const handleDefaultFilterChange = (filter: string, value: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) return;
    
    // Apply preset logic
    if (filter === 'basicPrintsOnly' && value) {
      // Apply Basic Prints Only preset - check "Base" and "Starter Deck" with OR logic, uncheck all others
      collapsiblePrintTypeOptions?.forEach(option => {
        const shouldBeChecked = option.value === 'Base' || option.value === 'Starter Deck';
        if (option.checked !== shouldBeChecked) {
          handlePrintTypeChange(option.value, shouldBeChecked);
        }
      });
    } else if (filter === 'baseRarityOnly' && value) {
      // Apply Base Rarity Only preset - only check base rarities (4 core rarities, no Action Point)
      const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
      rarityOptions?.forEach(option => {
        const shouldBeChecked = baseRarities.includes(option.value);
        if (option.checked !== shouldBeChecked) {
          handleRarityChange(option.value, shouldBeChecked);
        }
      });
    }
  };

  const filterIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Settings"
      icon={filterIcon}
      size="full"
      className="w-[90vw] max-w-6xl max-h-[90vh] flex flex-col"
    >

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3 text-white/70">
            <ArrowPathIcon className="animate-spin h-5 w-5" />
            <span>Loading filter options...</span>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      {!loading && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Deck Configuration */}
            <div className="space-y-6">
              {/* Default Filter Toggles */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Default Filters
                </h3>
                <p className="text-white/70 text-sm mb-4">Apply these filters automatically when building this deck.</p>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBasicPrintsOnly}
                      onChange={(e) => handleDefaultFilterChange('basicPrintsOnly', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                    />
                    <div>
                      <span className="text-white font-medium">Basic Prints Only</span>
                      <p className="text-white/60 text-sm">Only show base set cards, exclude special prints</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBaseRarityOnly}
                      onChange={(e) => handleDefaultFilterChange('baseRarityOnly', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                    />
                    <div>
                      <span className="text-white font-medium">Base Rarity Only</span>
                      <p className="text-white/60 text-sm">Automatically exclude special rarity cards (Common 1-Star, Rare 1-Star, etc.)</p>
                    </div>
                  </label>
                </div>
              </div>

            </div>

            {/* Right Column - Filter Options */}
            <div className="space-y-6">
              {/* Series Selection */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M4 8h16M4 12h16M4 16h16" />
                  </svg>
                  Series
                </h3>
                <p className="text-white/70 text-sm mb-4">Set the default series filter for this deck.</p>
                <select
                  value={currentSeries}
                  onChange={(e) => handleSeriesChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" className="bg-gray-800">All Series</option>
                  {seriesOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Print Type Filters */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                {collapsiblePrintTypeOptions && (
                  <CollapsibleFilterSection
                    title="Print Types"
                    options={collapsiblePrintTypeOptions}
                    onOptionChange={handlePrintTypeChange}
                    className="border-none"
                  />
                )}
              </div>

              {/* Card Type Filters */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                {collapsibleCardTypeOptions && (
                  <CollapsibleFilterSection
                    title="Card Types"
                    options={collapsibleCardTypeOptions}
                    onOptionChange={handleCardTypeChange}
                    className="border-none"
                  />
                )}
              </div>

              {/* Rarity Filters */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                {rarityOptions && (
                  <CollapsibleFilterSection
                    title="Rarity Filters"
                    options={rarityOptions}
                    onOptionChange={handleRarityChange}
                    className="border-none"
                  />
                )}
              </div>

        </div>
      </div>
      )}
    </StandardModal>
  );
}


