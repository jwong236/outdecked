'use client';

import { SearchFilters } from '@/types/card';
import { FilterPill } from './FilterPill';

export interface ActiveFiltersProps {
  filters: SearchFilters;
  onRemoveFilter: (filterType: string, value?: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({ 
  filters, 
  onRemoveFilter, 
  onClearAll, 
  className = '' 
}: ActiveFiltersProps) {
  const hasActiveFilters = 
    filters.query || 
    filters.series || 
    filters.color || 
    filters.and_filters.length > 0 ||
    filters.or_filters.length > 0 ||
    filters.not_filters.length > 0;

  // Always show the component, even when empty

  const getFilterLabel = (type: string, value: string) => {
    switch (type) {
      case 'query':
        return `Search: "${value}"`;
      case 'series':
        return `Series: ${value}`;
      case 'color':
        return `Color: ${value}`;
      case 'sort':
        const sortLabels: Record<string, string> = {
          'name': 'Name A-Z',
          'name_desc': 'Name Z-A',
          'price_asc': 'Price Low-High',
          'price_desc': 'Price High-Low',
          'rarity_asc': 'Rarity Low-High',
          'rarity_desc': 'Rarity High-Low',
          'number_asc': 'Card Number Low-High',
          'number_desc': 'Card Number High-Low',
          'required_energy_asc': 'Required Energy Low-High',
          'required_energy_desc': 'Required Energy High-Low',
        };
        return `Sort: ${sortLabels[value] || value}`;
      case 'and':
        return value;
      case 'or':
        return value;
      case 'not':
        return value;
      default:
        return `${type}: ${value}`;
    }
  };

  const renderFilterChip = (type: string, value: string, index?: number) => {
    const isAdvancedFilter = ['and', 'or', 'not'].includes(type);
    const filterType = isAdvancedFilter ? type.toUpperCase() as 'AND' | 'OR' | 'NOT' : 'AND';
    const displayValue = isAdvancedFilter ? value : getFilterLabel(type, value);
    
    return (
      <FilterPill
        key={`${type}-${value}-${index || 0}`}
        type={filterType}
        value={displayValue}
        onRemove={() => onRemoveFilter(type, value)}
      />
    );
  };

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Active Filters</h3>
        <button
          onClick={onClearAll}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-150 cursor-pointer"
        >
          Clear All
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {hasActiveFilters ? (
          <>
            {/* Priority Order: OR Filters → AND Filters (including basic) → NOT Filters */}
            
            {/* 1. OR Filters (highest priority - any one must match) */}
            {filters.or_filters.map((filter, index) => 
              renderFilterChip('or', filter.displayText, index)
            )}
            
            {/* 2. AND Filters (all must match) */}
            {filters.and_filters.map((filter, index) => 
              renderFilterChip('and', filter.displayText, index)
            )}
            
            {/* Basic filters are also AND filters */}
            {filters.query && renderFilterChip('query', filters.query)}
            {filters.series && renderFilterChip('series', filters.series)}
            {filters.color && renderFilterChip('color', filters.color)}
            
            {/* 3. NOT Filters (must NOT match) */}
            {filters.not_filters.map((filter, index) => 
              renderFilterChip('not', filter.displayText, index)
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">No filters applied</p>
        )}
      </div>
    </div>
  );
}
