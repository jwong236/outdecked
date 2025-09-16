'use client';

import { SearchFilters } from '@/types/card';
import { FilterPill } from './FilterPill';

export interface ActiveFiltersProps {
  filters: SearchFilters;
  onRemoveFilter: (filterType: string, value?: string) => void;
  onRemoveMultipleFilters: (filterType: string, values: string[]) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({ 
  filters, 
  onRemoveFilter, 
  onRemoveMultipleFilters,
  onClearAll, 
  className = '' 
}: ActiveFiltersProps) {
  const hasActiveFilters = 
    filters.query || 
    filters.series ||
    filters.color ||
    filters.cardType ||
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
      case 'cardType':
        return `Card Type: ${value}`;
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
          className="text-sm text-white hover:text-blue-200 transition-colors duration-150 cursor-pointer font-medium"
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
            {filters.cardType && renderFilterChip('cardType', filters.cardType)}
            
            {/* 3. NOT Filters (must NOT match) */}
            {(() => {
              const baseRarityValues = [
                'Common 1-Star',
                'Rare 1-Star', 
                'Rare 2-Star',
                'Super Rare 1-Star',
                'Super Rare 2-Star',
                'Super Rare 3-Star',
                'Uncommon 1-Star',
                'Union Rare'
              ];
              
              // Check if all base rarity filters are present
              const hasAllBaseRarityFilters = baseRarityValues.every(value => 
                filters.not_filters.some(f => f.field === 'Rarity' && f.value === value)
              );
              
              // Get non-base-rarity filters
              const nonBaseRarityFilters = filters.not_filters.filter(filter => 
                !(filter.field === 'Rarity' && baseRarityValues.includes(filter.value))
              );
              
              return (
                <>
                  {/* Show single "Base Rarity" pill if all base rarity filters are present */}
                  {hasAllBaseRarityFilters && (
                    <FilterPill
                      type="NOT NOT"
                      value="Base Rarity"
                      onRemove={() => {
                        // Remove all base rarity filters using the bulk removal function
                        const baseRarityFilters = baseRarityValues.map(value => `Rarity: ${value}`);
                        onRemoveMultipleFilters('not', baseRarityFilters);
                      }}
                    />
                  )}
                  
                  {/* Show individual base rarity filters if not all are present */}
                  {!hasAllBaseRarityFilters && filters.not_filters
                    .filter(filter => filter.field === 'Rarity' && baseRarityValues.includes(filter.value))
                    .map((filter, index) => 
                      renderFilterChip('not', filter.displayText, index)
                    )
                  }
                  
                  {/* Show other NOT filters */}
                  {nonBaseRarityFilters.map((filter, index) => 
                    renderFilterChip('not', filter.displayText, index)
                  )}
                </>
              );
            })()}
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">No filters applied</p>
        )}
      </div>
    </div>
  );
}
