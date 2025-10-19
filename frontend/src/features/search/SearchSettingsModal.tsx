'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
import { useSessionStore } from '@/stores/sessionStore';
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import { StandardModal } from '@/components/shared/modals/BaseModal';
import { useFilterValues } from '@/lib/hooks';
import { FilterOption } from '@/types/card';

interface SearchSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchSettingsModal({ isOpen, onClose }: SearchSettingsModalProps) {
  const { 
    searchPreferences,
    addFilter,
    removeFilter,
    setSeries,
    setColor,
    setCardType,
    getSeries,
    getColor,
    getCardType,
  } = useSessionStore();
  
  // State for API data
  const [seriesOptions, setSeriesOptions] = React.useState<Array<{value: string, label: string}>>([]);
  const [collapsiblePrintTypeOptions, setCollapsiblePrintTypeOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [collapsibleCardTypeOptions, setCollapsibleCardTypeOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [rarityOptions, setRarityOptions] = React.useState<Array<{value: string, label: string, checked: boolean}>>([]);
  const [loading, setLoading] = React.useState(false);

  // Advanced filters state
  const [newFilter, setNewFilter] = useState({
    field: '',
    value: '',
    type: 'and' as 'and' | 'or' | 'not',
  });

  // Fetch filter options from API when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen]);

  // Update collapsible options when searchPreferences change
  React.useEffect(() => {
    if (collapsiblePrintTypeOptions.length > 0) {
      const currentPrintTypes = searchPreferences.filters
        .filter(f => f.field === 'print_type' && f.type === 'or')
        .map(f => f.value);
      setCollapsiblePrintTypeOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentPrintTypes.includes(option.value) 
        }))
      );
    }
  }, [searchPreferences.filters, collapsiblePrintTypeOptions.length]);

  React.useEffect(() => {
    if (collapsibleCardTypeOptions.length > 0) {
      const currentCardTypes = searchPreferences.filters
        .filter(f => f.field === 'card_type' && f.type === 'or')
        .map(f => f.value);
      setCollapsibleCardTypeOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentCardTypes.includes(option.value) 
        }))
      );
    }
  }, [searchPreferences.filters, collapsibleCardTypeOptions.length]);

  React.useEffect(() => {
    if (rarityOptions.length > 0) {
      const currentRarities = searchPreferences.filters
        .filter(f => f.field === 'rarity' && f.type === 'or')
        .map(f => f.value);
      setRarityOptions(prev => 
        prev.map(option => ({ 
          ...option, 
          checked: currentRarities.includes(option.value) 
        }))
      );
    }
  }, [searchPreferences.filters, rarityOptions.length]);

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      // Fetch all filter options in parallel
      const [seriesRes, cardTypeRes, printTypeRes, rarityRes] = await Promise.all([
        fetch('/api/cards/attributes/series?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/card_type?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/print_type?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/rarity?game=Union Arena', { credentials: 'include' })
      ]);

      const [seriesData, cardTypeData, printTypeData, rarityData] = await Promise.all([
        seriesRes.json(),
        cardTypeRes.json(),
        printTypeRes.json(),
        rarityRes.json()
      ]);

      // Convert arrays to option objects
      setSeriesOptions(seriesData.map((value: string) => ({ value, label: value })));
      
      // For collapsible options, check if they're in current search preferences (OR type only)
      const currentPrintTypes = searchPreferences.filters
        .filter(f => f.field === 'print_type' && f.type === 'or')
        .map(f => f.value);
      const currentCardTypes = searchPreferences.filters
        .filter(f => f.field === 'card_type' && f.type === 'or')
        .map(f => f.value);
      const currentRarities = searchPreferences.filters
        .filter(f => f.field === 'rarity' && f.type === 'or')
        .map(f => f.value);
      
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

      console.log('🔍 Fetched filter options:', {
        series: seriesData.length,
        cardTypes: cardTypeData.length,
        printTypes: printTypeData.length,
        rarities: rarityData.length
      });
    } catch (error) {
      console.error('🔍 Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSeries = getSeries() || '';
  
  // Calculate default filter indicators
  const isBasicPrintsOnly = React.useMemo(() => {
    const printTypeFilters = searchPreferences.filters.filter(f => f.field === 'print_type' && f.type === 'or');
    const printTypes = printTypeFilters.map(f => f.value);
    // Basic Prints Only means both Base and Starter Deck are checked, and nothing else
    return printTypes.length === 2 && 
           printTypes.includes('Base') && 
           printTypes.includes('Starter Deck');
  }, [searchPreferences.filters]);

  const isNoActionPoints = React.useMemo(() => {
    // Check if there's a NOT filter for Action Point card type
    return searchPreferences.filters.some(f => 
      f.field === 'card_type' && f.type === 'not' && f.value === 'Action Point'
    );
  }, [searchPreferences.filters]);

  const isBaseRarityOnly = React.useMemo(() => {
    const rarityFilters = searchPreferences.filters.filter(f => f.field === 'rarity' && f.type === 'or');
    const rarities = rarityFilters.map(f => f.value);
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    // Base rarity is active if it has the 4 core base rarities
    // (Action Point may or may not be included depending on no_ap preset)
    return baseRarities.every(rarity => rarities.includes(rarity));
  }, [searchPreferences.filters]);
  
  // Handler functions that update sessionStore
  const handlePrintTypeChange = (value: string, checked: boolean) => {
    if (checked) {
      // Add filter with OR type (for presets)
      const filter: FilterOption = {
        type: 'or',
        field: 'print_type',
        value: value,
        displayText: `Print Type: ${value}`,
      };
      addFilter(filter);
    } else {
      // Remove filter - find all filters with this field and value
      const filtersToRemove = searchPreferences.filters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => 
          filter.field === 'print_type' && filter.value === value
        )
        .map(({ index }) => index)
        .reverse(); // Remove in reverse order to avoid index shifting
      
      filtersToRemove.forEach(index => removeFilter(index));
    }
    
    // Update local state to reflect the change
    setCollapsiblePrintTypeOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleCardTypeChange = (value: string, checked: boolean) => {
    if (checked) {
      // Add filter with OR type
      const filter: FilterOption = {
        type: 'or',
        field: 'card_type',
        value: value,
        displayText: `Card Type: ${value}`,
      };
      addFilter(filter);
    } else {
      // Remove filter - find all filters with this field and value
      const filtersToRemove = searchPreferences.filters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => 
          filter.field === 'card_type' && filter.value === value
        )
        .map(({ index }) => index)
        .reverse(); // Remove in reverse order to avoid index shifting
      
      filtersToRemove.forEach(index => removeFilter(index));
    }
    
    // Update local state to reflect the change
    setCollapsibleCardTypeOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleRarityChange = (value: string, checked: boolean) => {
    if (checked) {
      // Add filter with OR type (for presets)
      const filter: FilterOption = {
        type: 'or',
        field: 'rarity',
        value: value,
        displayText: `Rarity: ${value}`,
      };
      addFilter(filter);
    } else {
      // Remove filter - find all filters with this field and value
      const filtersToRemove = searchPreferences.filters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => 
          filter.field === 'rarity' && filter.value === value
        )
        .map(({ index }) => index)
        .reverse(); // Remove in reverse order to avoid index shifting
      
      filtersToRemove.forEach(index => removeFilter(index));
    }
    
    // Update local state to reflect the change
    setRarityOptions(prev => 
      prev.map(option => 
        option.value === value ? { ...option, checked } : option
      )
    );
  };

  const handleSeriesChange = (series: string) => {
    console.log('🔍 handleSeriesChange called with:', series);
    setSeries(series);
  };

  const handleDefaultFilterChange = (filter: string, value: boolean) => {
    if (filter === 'basicPrintsOnly') {
      if (value) {
        // Apply Basic Prints Only preset - check "Base" and "Starter Deck", uncheck all others
        collapsiblePrintTypeOptions?.forEach(option => {
          const shouldBeChecked = option.value === 'Base' || option.value === 'Starter Deck';
          if (option.checked !== shouldBeChecked) {
            handlePrintTypeChange(option.value, shouldBeChecked);
          }
        });
      } else {
        // Remove Basic Prints Only preset - remove all print type filters
        const printTypeIndices = searchPreferences.filters
          .map((f, index) => f.field === 'print_type' ? index : -1)
          .filter(index => index !== -1)
          .reverse(); // Remove from end to beginning to avoid index shifting
        
        printTypeIndices.forEach(index => {
          removeFilter(index);
        });
        // Update local state
        setCollapsiblePrintTypeOptions(prev => 
          prev.map(option => ({ ...option, checked: false }))
        );
      }
    } else if (filter === 'noActionPoints') {
      if (value) {
        // Apply No Action Points preset - add NOT filter for Action Point card type
        const filter: FilterOption = {
          type: 'not',
          field: 'card_type',
          value: 'Action Point',
          displayText: 'No Action Points',
        };
        addFilter(filter);
      } else {
        // Remove No Action Points preset - remove the NOT filter
        const filterIndex = searchPreferences.filters.findIndex(f => 
          f.field === 'card_type' && f.type === 'not' && f.value === 'Action Point'
        );
        if (filterIndex !== -1) {
          removeFilter(filterIndex);
        }
      }
    } else if (filter === 'baseRarityOnly') {
      if (value) {
        // Apply Base Rarity Only preset - check base rarities
        // Action Point is included if no_ap is not active
        const hasNoAp = isNoActionPoints;
        const baseRarities = hasNoAp 
          ? ['Common', 'Uncommon', 'Rare', 'Super Rare']
          : ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Action Point'];
        
        rarityOptions?.forEach(option => {
          const shouldBeChecked = baseRarities.includes(option.value);
          if (option.checked !== shouldBeChecked) {
            handleRarityChange(option.value, shouldBeChecked);
          }
        });
      } else {
        // Remove Base Rarity Only preset - remove all rarity filters
        const rarityIndices = searchPreferences.filters
          .map((f, index) => f.field === 'rarity' ? index : -1)
          .filter(index => index !== -1)
          .reverse(); // Remove from end to beginning to avoid index shifting
        
        rarityIndices.forEach(index => {
          removeFilter(index);
        });
        // Update local state
        setRarityOptions(prev => 
          prev.map(option => ({ ...option, checked: false }))
        );
      }
    }
  };

  // Advanced filters functionality
  const { data: fieldValues } = useFilterValues(newFilter.field);
  
  const valueOptions = fieldValues ? fieldValues.map(value => ({
    value: value,
    label: value,
  })) : [];

  // Fallback field options if API fails
  const fallbackFields = [
    { name: 'rarity', display: 'Rarity' },
    { name: 'card_type', display: 'Card Type' },
    { name: 'required_energy', display: 'Required Energy' },
    { name: 'action_point_cost', display: 'Action Point Cost' },
    { name: 'activation_energy', display: 'Activation Energy' },
    { name: 'description', display: 'Description' },
    { name: 'generated_energy', display: 'Generated Energy' },
    { name: 'battle_point', display: 'Battle Point BP' },
    { name: 'trigger_type', display: 'Trigger' },
    { name: 'affinities', display: 'Affinities' },
    { name: 'series', display: 'Series Name' },
  ];

  const fieldOptions = fallbackFields.map(field => ({
    value: field.name,
    label: field.display,
  }));

  const handleAddFilter = () => {
    if (!newFilter.field || !newFilter.value) return;

    const fieldDisplay = fallbackFields.find(f => f.name === newFilter.field)?.display || newFilter.field;

    const filter: FilterOption = {
      type: newFilter.type,
      field: newFilter.field,
      value: newFilter.value,
      displayText: `${fieldDisplay}: ${newFilter.value}`,
    };

    addFilter(filter);
    setNewFilter({ field: '', value: '', type: newFilter.type });
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
            {/* Left Column - Default Filters */}
            <div className="space-y-6">
              {/* Default Filter Toggles */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Default Filters
                </h3>
                <p className="text-white/70 text-sm mb-4">Apply these filters automatically when searching.</p>
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
                      checked={isNoActionPoints}
                      onChange={(e) => handleDefaultFilterChange('noActionPoints', e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2 mt-1"
                    />
                    <div>
                      <span className="text-white font-medium">No Action Points</span>
                      <p className="text-white/60 text-sm">Exclude Action Point cards from search results</p>
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

              {/* Series Selection */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M4 8h16M4 12h16M4 16h16" />
                  </svg>
                  Series
                </h3>
                <p className="text-white/70 text-sm mb-4">Set the default series filter for search.</p>
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
            </div>

            {/* Right Column - Filter Options */}
            <div className="space-y-6">
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

              {/* Advanced Filters Section */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Advanced Filters
                </h3>
                <p className="text-white/70 text-sm mb-4">Add custom filters with AND, OR, and NOT logic.</p>
                
                <div className="flex gap-4 items-end">
                  <div className="w-1/4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Filter Type
                      </label>
                      <select
                        value={newFilter.type}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, type: e.target.value as 'and' | 'or' | 'not' }))}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="and" className="bg-gray-800">AND</option>
                        <option value="or" className="bg-gray-800">OR</option>
                        <option value="not" className="bg-gray-800">NOT</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Field
                      </label>
                      <select
                        value={newFilter.field}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, field: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" className="bg-gray-800">Select field</option>
                        {fieldOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-gray-800">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Value
                      </label>
                      <select
                        value={newFilter.value}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
                        disabled={!newFilter.field || valueOptions.length === 0}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="" className="bg-gray-800">Select value</option>
                        {valueOptions.map((option) => (
                          <option key={option.value} value={option.value} className="bg-gray-800">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={handleAddFilter}
                      disabled={!newFilter.field || !newFilter.value}
                      className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-150"
                      aria-label="Add filter"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}
    </StandardModal>
  );
}
