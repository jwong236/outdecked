'use client';

import { useSessionStore } from '@/stores/sessionStore';

interface QuickFiltersProps {
  className?: string;
}

export function QuickFilters({ className = '' }: QuickFiltersProps) {
  const { searchPreferences, addFilter, removeFilter } = useSessionStore();

  // Helper function to check if a filter exists
  const hasFilter = (field: string, value: string) => {
    return searchPreferences.filters.some(f => f.field === field && f.value === value);
  };

  // Helper function to check if "No Action Points" filter is active
  const hasNoActionPointsFilter = () => {
    return searchPreferences.filters.some(f => f.field === 'CardType' && f.value === 'Action Point' && f.type === 'not');
  };

  // Helper function to check if "Base Rarity Only" filter is active
  const hasBaseRarityOnlyFilter = () => {
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    return baseRarities.every(rarity => 
      searchPreferences.filters.some(f => 
        f.field === 'Rarity' && 
        f.value === rarity && 
        f.type === 'or'
      )
    );
  };

  // Helper function to add or remove a filter
  const toggleFilter = (field: string, value: string, displayText: string, enabled: boolean) => {
    if (enabled) {
      // Special cases for different filter types
      let filterType: 'and' | 'or' | 'not' = 'and';
      if (field === 'CardType' && value === 'Action Point') {
        filterType = 'not';
      }
      addFilter({ type: filterType, field, value, displayText });
    } else {
      // Find and remove the filter (handle all types)
      const filterIndex = searchPreferences.filters.findIndex(f => 
        f.field === field && f.value === value
      );
      if (filterIndex !== -1) {
        removeFilter(filterIndex);
      }
    }
  };

  // Helper function to toggle Base Rarity filter (multiple OR filters)
  const toggleBaseRarityFilter = (enabled: boolean) => {
    const baseRarities = ['Common', 'Uncommon', 'Rare', 'Super Rare'];
    
    if (enabled) {
      // Add all base rarity filters
      baseRarities.forEach(rarity => {
        addFilter({ type: 'or', field: 'Rarity', value: rarity, displayText: 'Base Rarity Only' });
      });
    } else {
      // Remove all base rarity filters
      const filtersToRemove = searchPreferences.filters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => 
          filter.field === 'Rarity' && 
          baseRarities.includes(filter.value) && 
          filter.type === 'or'
        )
        .map(({ index }) => index)
        .reverse(); // Remove in reverse order to avoid index shifting
      
      filtersToRemove.forEach(index => removeFilter(index));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-white">Default Filters</h3>
      
      <div className="space-y-4">
        {/* Basic Prints Only */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasFilter('PrintType', 'Base')}
            onChange={(e) => toggleFilter('PrintType', 'Base', 'Base Prints Only', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Basic Prints Only</span>
        </label>
        
        {/* No Action Points */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasNoActionPointsFilter()}
            onChange={(e) => toggleFilter('CardType', 'Action Point', 'No Action Points', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">No Action Points</span>
        </label>
        
        {/* Base Rarity Only */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasBaseRarityOnlyFilter()}
            onChange={(e) => toggleBaseRarityFilter(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Base Rarity Only</span>
        </label>
      </div>
    </div>
  );
}
