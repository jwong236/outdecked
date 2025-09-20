'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
import { FilterDropdown } from '@/features/search/FilterDropdown';
import { useDeckOperations } from '../../hooks/useDeckOperations';
import { useSearchLogic } from '../../hooks/useSearchLogic';
import { useDeckBuilderSelectors, useDeckBuilderActions } from '../../DeckBuilderContext';
import { dataManager } from '@/lib/dataManager';

export function DeckBuilderSettingsModal() {
  const { currentDeck, modals } = useDeckBuilderSelectors();
  const { setShowAdvancedFiltersModal } = useDeckBuilderActions();
  
  const { 
    seriesOptions,
    collapsiblePrintTypeOptions,
    collapsibleCardTypeOptions,
    rarityOptions,
    collapsibleColorOptions,
    colorOptionsData,
    currentSeries,
    handlePrintTypeChange,
    handleCardTypeChange,
    handleRarityChange,
    handleColorChange,
    handleSeriesChange,
    isBasicPrintsOnlyPreset,
    isNoActionPointsPreset,
    isBaseRarityOnlyPreset,
  } = useSearchLogic();

  // Direct handlers that apply changes immediately
  const handleDeckVisibilityChange = (visibility: string) => {
    if (currentDeck) {
      const updatedDeck = {
        ...currentDeck,
        visibility: visibility as 'private' | 'public' | 'unlisted'
      };
      // Save to database immediately
      dataManager.updateDeck(updatedDeck);
    }
  };

  const handleDefaultFilterChange = (filter: string, value: boolean) => {
    if (currentDeck) {
      const updatedFilters = {
        basicPrintsOnly: currentDeck.defaultFilters?.basicPrintsOnly || false,
        noActionPoints: currentDeck.defaultFilters?.noActionPoints || false,
        baseRarityOnly: currentDeck.defaultFilters?.baseRarityOnly || false,
        ...currentDeck.defaultFilters,
        [filter]: value
      };
      
      // Update the deck with new default filters
      const updatedDeck = {
        ...currentDeck,
        defaultFilters: updatedFilters
      };
      
      // Save to database immediately
      dataManager.updateDeck(updatedDeck);
      
      // Apply the preset to the corresponding dropdown
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
    }
  };


  if (!modals.showAdvancedFiltersModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg w-[90vw] max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Deck Settings</h2>
            <button
              onClick={() => setShowAdvancedFiltersModal(false)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Two Column Layout */}
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
                      checked={isBasicPrintsOnlyPreset}
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
                      checked={isNoActionPointsPreset}
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
                      checked={isBaseRarityOnlyPreset}
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

              {/* Color Filter */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <FilterDropdown
                  label="Color Filter"
                  value={currentDeck?.savedDefaultFilters?.colors?.[0] || ''}
                  options={[
                    { value: '', label: 'All Colors' },
                    ...(colorOptionsData?.map(color => ({ value: color, label: color })) || [])
                  ]}
                  onChange={(color) => {
                    // Handle color selection - single color only
                    console.log('🎨 Color filter changed to:', color);
                    if (currentDeck) {
                      const updatedDeck = {
                        ...currentDeck,
                        savedDefaultFilters: {
                          printTypes: currentDeck.savedDefaultFilters?.printTypes || [],
                          cardTypes: currentDeck.savedDefaultFilters?.cardTypes || [],
                          rarities: currentDeck.savedDefaultFilters?.rarities || [],
                          colors: color ? [color] : [] // Single color or empty array
                        }
                      };
                      
                      console.log('🎨 Updated deck with colors:', updatedDeck.savedDefaultFilters.colors);
                      
                      // Save to database immediately
                      dataManager.updateDeck(updatedDeck);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}