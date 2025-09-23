'use client';

import { useState, useEffect } from 'react';
import { SearchFilters } from '@/types/card';
import { FilterPill } from './FilterPill';
import { useSessionStore } from '@/stores/sessionStore';

export interface ActiveFiltersProps {
  onRemoveFilter: (filterType: string, value?: string) => void;
  onRemoveMultipleFilters: (filterType: string, values: string[]) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilters({ 
  onRemoveFilter, 
  onRemoveMultipleFilters,
  onClearAll, 
  className = '' 
}: ActiveFiltersProps) {
  const { searchPreferences, removeAdvancedFilter, getQuery, getSeries, getCardType } = useSessionStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Only show pills for basic filters and advanced filters from searchPreferences
  const hasActiveFilters = 
    getQuery() || 
    getSeries() ||
    getCardType() ||
    searchPreferences.advancedFilters.length > 0;

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
          'name_asc': 'Name A-Z',
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
        {!isHydrated ? (
          <span className="text-sm text-gray-400 italic">Loading...</span>
        ) : hasActiveFilters ? (
          <>
            {/* Basic filters from searchPreferences - only show if not already in advanced filters */}
            {getQuery() && renderFilterChip('query', getQuery())}
            {getSeries() && !searchPreferences.advancedFilters.some(f => f.startsWith('&SeriesName=')) && renderFilterChip('series', getSeries())}
            {getCardType() && !searchPreferences.advancedFilters.some(f => f.startsWith('&CardType=')) && renderFilterChip('cardType', getCardType())}
            
            {/* Advanced filters from searchPreferences */}
            {searchPreferences.advancedFilters.map((compactFilter, index) => {
              const type = compactFilter[0] as '&' | '|' | '!';
              const [field, value] = compactFilter.slice(1).split('=');
              const filterType = type === '&' ? 'AND' : type === '|' ? 'OR' : 'NOT';
              const displayText = `${field}: ${value}`;
              
              return (
                <FilterPill
                  key={`advanced-${index}`}
                  type={filterType}
                  value={displayText}
                  onRemove={() => {
                    // Remove from advanced filters using the store method
                    removeAdvancedFilter(index);
                  }}
                />
              );
            })}
          </>
        ) : (
          <span className="text-sm text-gray-400 italic">No filters applied</span>
        )}
      </div>
    </div>
  );
}
