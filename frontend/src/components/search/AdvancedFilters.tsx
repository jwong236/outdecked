'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { FilterOption } from '@/types/card';
import { FilterDropdown } from './FilterDropdown';
import { useFilterValues } from '@/lib/hooks';

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
  className = '',
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newFilter, setNewFilter] = useState({
    field: '',
    value: '',
    type: 'and' as 'and' | 'or' | 'not',
  });

  const fieldOptions = availableFields
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

    setNewFilter({ field: '', value: '', type: 'and' });
  };


  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg shadow-md ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors duration-150"
      >
        <h3 className="text-lg font-medium text-white">More Filters</h3>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-6">
          {/* Add New Filter */}
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <FilterDropdown
                label="Field"
                value={newFilter.field}
                options={finalFieldOptions}
                onChange={(value) => setNewFilter(prev => ({ ...prev, field: value }))}
                placeholder="Select field"
              />

              <div className="flex gap-2">
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
                <div className="flex items-end">
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

          {/* Quick Filters */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">Quick Filters</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const filter: FilterOption = {
                    type: 'not',
                    field: 'CardType',
                    value: 'Action Point',
                    displayText: 'CardType: Action Point',
                  };
                  onAddNotFilter(filter);
                }}
                className="px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors duration-150 text-sm"
              >
                CardType: Action Point
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
