'use client';

import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/20/solid';
import { FilterOption } from '@/types/card';
import { FilterDropdown } from './FilterDropdown';
import { useFilterValues } from '@/lib/hooks';
import { QuickFilters } from './QuickFilters';
import { SearchFilters } from '@/types/card';

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
  color?: string;
  onColorChange?: (color: string) => void;
  cardType?: string;
  onCardTypeChange?: (cardType: string) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  seriesOptions?: Array<{ value: string; label: string }>;
  colorOptions?: Array<{ value: string; label: string }>;
  cardTypeOptions?: Array<{ value: string; label: string }>;
  sortOptions?: Array<{ value: string; label: string }>;
  // Quick filters props (optional for search page)
  currentFilters?: SearchFilters;
  // Deck settings props (optional for deck builder)
  deckVisibility?: string;
  onDeckVisibilityChange?: (visibility: string) => void;
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
  color,
  onColorChange,
  cardType,
  onCardTypeChange,
  sort,
  onSortChange,
  seriesOptions,
  colorOptions,
  cardTypeOptions,
  sortOptions,
  currentFilters,
  deckVisibility,
  onDeckVisibilityChange,
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
            <div className="grid grid-cols-1 gap-4">
              <FilterDropdown
                label="Deck Visibility"
                value={deckVisibility}
                options={[
                  { value: 'private', label: 'Private - Only you can see this deck' },
                  { value: 'public', label: 'Public - Anyone can see this deck' },
                  { value: 'unlisted', label: 'Unlisted - Only people with the link can see it' }
                ]}
                onChange={onDeckVisibilityChange}
                placeholder="Select visibility"
              />
            </div>
          </div>
        )}

        {/* Filter Dropdowns Section - Only show if props are provided */}
        {series !== undefined && onSeriesChange && seriesOptions && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Filter Options</h3>
            <div className="grid grid-cols-4 gap-4">
              <FilterDropdown
                label="Series"
                value={series}
                options={seriesOptions}
                onChange={onSeriesChange}
                placeholder="All Series"
              />

              <FilterDropdown
                label="Color"
                value={color || ''}
                options={colorOptions || []}
                onChange={onColorChange || (() => {})}
                placeholder="All Colors"
              />

              <FilterDropdown
                label="Card Type"
                value={cardType || ''}
                options={cardTypeOptions || []}
                onChange={onCardTypeChange || (() => {})}
                placeholder="All Types"
              />

              <FilterDropdown
                label="Sort By"
                value={sort || ''}
                options={sortOptions || []}
                onChange={onSortChange || (() => {})}
                placeholder="Default"
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
          <div className="space-y-4">
            
            <div className="flex gap-4 items-end">
              <div className="w-1/4">
                <FilterDropdown
                  label="Filter Type"
                  value={newFilter.type}
                  options={[
                    { value: 'and', label: 'AND' },
                    { value: 'or', label: 'OR' },
                    { value: 'not', label: 'NOT' },
                  ]}
                  onChange={(value) => setNewFilter(prev => ({ ...prev, type: value as 'and' | 'or' | 'not' }))}
                  getOptionClassName={(option) => {
                    switch (option.value) {
                      case 'and':
                        return 'text-blue-600 hover:bg-blue-100 hover:text-blue-900';
                      case 'or':
                        return 'text-green-600 hover:bg-green-100 hover:text-green-900';
                      case 'not':
                        return 'text-red-600 hover:bg-red-100 hover:text-red-900';
                      default:
                        return '';
                    }
                  }}
                  getSelectedValueClassName={(value) => {
                    switch (value) {
                      case 'and':
                        return 'text-blue-600';
                      case 'or':
                        return 'text-green-600';
                      case 'not':
                        return 'text-red-600';
                      default:
                        return 'text-gray-900';
                    }
                  }}
                />
              </div>

              <div className="flex-1">
                <FilterDropdown
                  label="Field"
                  value={newFilter.field}
                  options={finalFieldOptions}
                  onChange={(value) => setNewFilter(prev => ({ ...prev, field: value }))}
                  placeholder="Select field"
                />
              </div>

              <div className="flex-1">
                <FilterDropdown
                  label="Value"
                  value={newFilter.value}
                  options={valueOptions}
                  onChange={(value) => setNewFilter(prev => ({ ...prev, value }))}
                  placeholder="Select value"
                  disabled={!newFilter.field || valueOptions.length === 0}
                />
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

        {/* Quick Filters Section - Only show if currentFilters is provided */}
        {currentFilters && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Filters</h3>
            <QuickFilters
              onAddAndFilter={onAddAndFilter}
              onAddOrFilter={onAddOrFilter}
              onAddNotFilter={onAddNotFilter}
              currentFilters={currentFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
