'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
import { FilterDropdown } from '@/features/search/FilterDropdown';
import { useSessionStore } from '@/stores/sessionStore';

interface DeckBuilderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeckBuilderSettingsModal({ isOpen, onClose }: DeckBuilderSettingsModalProps) {
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
        fetch('/api/cards/attributes/SeriesName?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/CardType?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/PrintType?game=Union Arena', { credentials: 'include' }),
        fetch('/api/cards/attributes/Rarity?game=Union Arena', { credentials: 'include' })
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
      const currentPrintTypes = currentDeck?.preferences?.printTypes || [];
      const currentCardTypes = currentDeck?.preferences?.cardTypes || [];
      const currentRarities = currentDeck?.preferences?.rarities || [];
      
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

      console.log('🃏 Fetched filter options:', {
        series: seriesData.length,
        cardTypes: cardTypeData.length,
        printTypes: printTypeData.length,
        rarities: rarityData.length
      });
    } catch (error) {
      console.error('🃏 Error fetching filter options:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentSeries = currentDeck?.preferences?.series || '';
  
  // Calculate default filter indicators
  const isBasicPrintsOnly = React.useMemo(() => {
    if (!currentDeck || !('preferences' in currentDeck)) return false;
    const printTypes = currentDeck.preferences?.printTypes || [];
    return printTypes.length === 1 && printTypes.includes('Base');
  }, [currentDeck]);

  const isNoActionPoints = React.useMemo(() => {
    if (!currentDeck || !('preferences' in currentDeck)) return false;
    const cardTypes = currentDeck.preferences?.cardTypes || [];
    const hasActionPoint = cardTypes.includes('Action Point');
    const hasCharacter = cardTypes.includes('Character');
    const hasEvent = cardTypes.includes('Event');
    const hasSite = cardTypes.includes('Site');
    return !hasActionPoint && hasCharacter && hasEvent && hasSite;
  }, [currentDeck]);

  const isBaseRarityOnly = React.useMemo(() => {
    if (!currentDeck || !('preferences' in currentDeck)) return false;
    const rarities = currentDeck.preferences?.rarities || [];
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    return baseRarities.every(rarity => rarities.includes(rarity)) && 
           rarities.length === baseRarities.length;
  }, [currentDeck]);
  
  // Handler functions that update sessionStore
  const handlePrintTypeChange = (value: string, checked: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) return;
    
    const currentTypes = currentDeck.preferences?.printTypes || [];
    const newTypes = checked 
      ? [...currentTypes, value]
      : currentTypes.filter((type: string) => type !== value);
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        printTypes: newTypes
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
    
    const currentTypes = currentDeck.preferences?.cardTypes || [];
    const newTypes = checked 
      ? [...currentTypes, value]
      : currentTypes.filter((type: string) => type !== value);
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        cardTypes: newTypes
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
    
    const currentRarities = currentDeck.preferences?.rarities || [];
    const newRarities = checked 
      ? [...currentRarities, value]
      : currentRarities.filter((rarity: string) => rarity !== value);
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        rarities: newRarities
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
    console.log('🃏 handleSeriesChange called with:', series);
    console.log('🃏 currentDeck:', currentDeck);
    
    if (!currentDeck || Object.keys(currentDeck).length === 0 || !('preferences' in currentDeck)) {
      console.log('🃏 handleSeriesChange: Invalid currentDeck, returning');
      return;
    }
    
    const updatedDeck = {
      ...currentDeck,
      preferences: {
        ...currentDeck.preferences,
        series: series
      }
    };
    
    console.log('🃏 handleSeriesChange: Updated deck:', updatedDeck);
    setCurrentDeck(updatedDeck);
    console.log('🃏 handleSeriesChange: setCurrentDeck called');
  };

  const handleDeckVisibilityChange = (visibility: string) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) return;
    
    const updatedDeck = {
      ...currentDeck,
      visibility: visibility as 'private' | 'public' | 'unlisted'
    };
    
    setCurrentDeck(updatedDeck);
  };

  const handleDefaultFilterChange = (filter: string, value: boolean) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) return;
    
    // Apply preset logic
    if (filter === 'basicPrintsOnly' && value) {
      // Apply Basic Prints Only preset - only check "Base", uncheck all others
      collapsiblePrintTypeOptions?.forEach(option => {
        const shouldBeChecked = option.value === 'Base';
        if (option.checked !== shouldBeChecked) {
          handlePrintTypeChange(option.value, shouldBeChecked);
        }
      });
    } else if (filter === 'noActionPoints' && value) {
      // Apply No Action Points preset - uncheck "Action Point", check all others
      collapsibleCardTypeOptions?.forEach(option => {
        const shouldBeChecked = option.value !== 'Action Point';
        if (option.checked !== shouldBeChecked) {
          handleCardTypeChange(option.value, shouldBeChecked);
        }
      });
    } else if (filter === 'baseRarityOnly' && value) {
      // Apply Base Rarity Only preset - only check base rarities
      const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
      rarityOptions?.forEach(option => {
        const shouldBeChecked = baseRarities.includes(option.value);
        if (option.checked !== shouldBeChecked) {
          handleRarityChange(option.value, shouldBeChecked);
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg w-[90vw] max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Deck Settings</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3 text-white/70">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading filter options...</span>
              </div>
            </div>
          )}

          {/* Two Column Layout */}
          {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Deck Configuration */}
            <div className="space-y-6">
              {/* Deck Visibility */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Visibility
                </h3>
                <p className="text-white/70 text-sm mb-4">Control who can see your deck.</p>
                <FilterDropdown
                  label=""
                  value={currentDeck?.visibility || "private"}
                  options={[
                    { value: 'private', label: 'Private - Only you can see this deck' },
                    { value: 'public', label: 'Public - Anyone can see this deck' },
                    { value: 'unlisted', label: 'Unlisted - Only people with the link can see it' }
                  ]}
                  onChange={handleDeckVisibilityChange}
                  placeholder="Select visibility"
                />
              </div>

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
                <FilterDropdown
                  label=""
                  value={currentSeries}
                  options={seriesOptions}
                  onChange={handleSeriesChange}
                  placeholder="All Series"
                />
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
        </div>

      </div>
    </div>
  );
}