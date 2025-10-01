'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { FilterOption } from '@/types/card';
// Removed FilterDropdown import - using native select elements
import { CollapsibleFilterSection, FilterCheckboxOption } from './CollapsibleFilterSection';
import { useFilterValues } from '@/lib/hooks';
import { SearchParams } from '@/types/card';

export interface AdvancedFiltersProps {
  andFilters: FilterOption[];
  orFilters: FilterOption[];
  notFilters: FilterOption[];
  onAddAndFilter: (filter: FilterOption) => void;
  onAddOrFilter: (filter: FilterOption) => void;
  onAddNotFilter: (filter: FilterOption) => void;
  onRemoveAndFilter: (index: number) => void;
  onRemoveOrFilter: (index: number) => void;
  onRemoveNotFilter: (index: number) => void;
  availableFields: Array<{ name: string; display: string }>;
  game: string;
  // Filter dropdowns props (optional for search page)
  series?: string;
  onSeriesChange?: (series: string) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  seriesOptions?: Array<{ value: string; label: string }>;
  sortOptions?: Array<{ value: string; label: string }>;
  // Deck settings props (optional for deck builder)
  deckVisibility?: string;
  onDeckVisibilityChange?: (visibility: string) => void;
  // Default filter toggles
  defaultFilters?: {
    basicPrintsOnly: boolean;
    noActionPoints: boolean;
    baseRarityOnly: boolean;
  };
  onDefaultFilterChange?: (filter: string, value: boolean) => void;
  // Collapsible filter sections
  cardTypeOptions?: FilterCheckboxOption[];
  onCardTypeChange?: (value: string, checked: boolean) => void;
  onCardTypeToggleAll?: (checked: boolean) => void;
  rarityOptions?: FilterCheckboxOption[];
  onRarityChange?: (value: string, checked: boolean) => void;
  onRarityToggleAll?: (checked: boolean) => void;
  colorOptions?: FilterCheckboxOption[];
  onColorChange?: (value: string, checked: boolean) => void;
  onColorToggleAll?: (checked: boolean) => void;
  className?: string;
}

export function AdvancedFilters({
  andFilters,
  orFilters,
  notFilters,
  onAddAndFilter,
  onAddOrFilter,
  onAddNotFilter,
  onRemoveAndFilter,
  onRemoveOrFilter,
  onRemoveNotFilter,
  availableFields,
  game,
  series,
  onSeriesChange,
  sort,
  onSortChange,
  seriesOptions,
  sortOptions,
  deckVisibility,
  onDeckVisibilityChange,
  defaultFilters,
  onDefaultFilterChange,
  cardTypeOptions,
  onCardTypeChange,
  onCardTypeToggleAll,
  rarityOptions,
  onRarityChange,
  onRarityToggleAll,
  colorOptions,
  onColorChange,
  onColorToggleAll,
  className = '',
}: AdvancedFiltersProps) {
  const [newFilter, setNewFilter] = useState({
    field: '',
    value: '',
    type: 'and' as 'and' | 'or' | 'not',
  });

  const fieldOptions = (availableFields || [])
    .filter(field => field.name !== 'Number') // Remove Number filter from More Filters
    .map(field => ({
      value: field.name,
      label: field.display,
    }));

  // Fetch values for the selected field
  const { data: fieldValues } = useFilterValues(newFilter.field);
  
  const valueOptions = fieldValues ? fieldValues.map(value => ({
    value: value,
    label: value,
  })) : [];

  // Fallback field options if API fails
  const fallbackFields = [
    { name: 'Rarity', display: 'Rarity' },
    { name: 'CardType', display: 'Card Type' },
    { name: 'RequiredEnergy', display: 'Required Energy' },
    { name: 'ActionPointCost', display: 'Action Point Cost' },
    { name: 'ActivationEnergy', display: 'Activation Energy' },
    { name: 'Description', display: 'Description' },
    { name: 'GeneratedEnergy', display: 'Generated Energy' },
    { name: 'BattlePointBP', display: 'Battle Point BP' },
    { name: 'Trigger', display: 'Trigger' },
    { name: 'Affinities', display: 'Affinities' },
    { name: 'SeriesName', display: 'Series Name' },
  ];

  const finalFieldOptions = fieldOptions.length > 0 ? fieldOptions : fallbackFields.map(field => ({
    value: field.name,
    label: field.display,
  }));

  const handleAddFilter = () => {
    if (!newFilter.field || !newFilter.value) return;

    // Use availableFields if it has data, otherwise use fallbackFields
    const fieldSource = availableFields.length > 0 ? availableFields : fallbackFields;
    const fieldDisplay = fieldSource.find(f => f.name === newFilter.field)?.display || newFilter.field;

    const filter: FilterOption = {
      type: newFilter.type,
      field: newFilter.field,
      value: newFilter.value,
      displayText: `${fieldDisplay}: ${newFilter.value}`,
    };

    switch (newFilter.type) {
      case 'and':
        onAddAndFilter(filter);
        break;
      case 'or':
        onAddOrFilter(filter);
        break;
      case 'not':
        onAddNotFilter(filter);
        break;
    }

    setNewFilter({ field: '', value: '', type: newFilter.type });
  };


  return (
    <div className={`${className}`}>
      <div className="px-6 pb-6 space-y-8">
        {/* Deck Settings Section - Only show if deck settings props are provided */}
        {deckVisibility !== undefined && onDeckVisibilityChange && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Deck Settings</h3>
            <div className="space-y-4">
              {/* Deck Visibility and Default Filters on same row */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                {/* Deck Visibility - Left side */}
                <div className="flex-1">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Deck Visibility
                    </label>
                    <select
                      value={deckVisibility}
                      onChange={(e) => onDeckVisibilityChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="private" className="bg-gray-800">Private - Only you can see this deck</option>
                      <option value="public" className="bg-gray-800">Public - Anyone can see this deck</option>
                      <option value="unlisted" className="bg-gray-800">Unlisted - Only people with the link can see it</option>
                    </select>
                  </div>
                </div>
                
                {/* Default Filter Toggles - Right side */}
                {defaultFilters && onDefaultFilterChange && (
                  <div className="flex-1">
                    <h4 className="text-md font-medium text-white mb-2">Default Filters</h4>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={defaultFilters.basicPrintsOnly}
                          onChange={(e) => onDefaultFilterChange('basicPrintsOnly', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-white text-sm">Basic Prints Only</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={defaultFilters.noActionPoints}
                          onChange={(e) => onDefaultFilterChange('noActionPoints', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-white text-sm">No Action Points</span>
                      </label>
                      
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={defaultFilters.baseRarityOnly}
                          onChange={(e) => onDefaultFilterChange('baseRarityOnly', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-white text-sm">Base Rarity Only</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Options Section - Only show if props are provided */}
        {(series !== undefined || cardTypeOptions || rarityOptions || colorOptions) && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Filter Options</h3>
            <div className="space-y-4">
              {/* Series Dropdown */}
              {series !== undefined && onSeriesChange && seriesOptions && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Series
                    </label>
                    <select
                      value={series}
                      onChange={(e) => onSeriesChange(e.target.value)}
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
              )}

              {/* Collapsible Filter Sections */}
              <div className="space-y-3">
                {/* Card Type Section */}
                {cardTypeOptions && onCardTypeChange && (
                  <CollapsibleFilterSection
                    title="Card Type"
                    options={cardTypeOptions}
                    onOptionChange={onCardTypeChange}
                  />
                )}

                {/* Rarity Section */}
                {rarityOptions && onRarityChange && (
                  <CollapsibleFilterSection
                    title="Rarity"
                    options={rarityOptions}
                    onOptionChange={onRarityChange}
                  />
                )}

                {/* Color Section */}
                {colorOptions && onColorChange && (
                  <CollapsibleFilterSection
                    title="Color"
                    options={colorOptions}
                    onOptionChange={onColorChange}
                  />
                )}
              </div>

              {/* Sort Dropdown */}
              {sort !== undefined && onSortChange && sortOptions && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Sort By
                    </label>
                    <select
                      value={sort || ''}
                      onChange={(e) => onSortChange?.(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" className="bg-gray-800">Default</option>
                      {sortOptions?.map((option) => (
                        <option key={option.value} value={option.value} className="bg-gray-800">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Filters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
          <div className="space-y-4">
            
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
                    {finalFieldOptions.map((option) => (
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
    </div>
  );
}
