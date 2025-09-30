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

  // Helper function to check if "Basic Prints Only" filter is active (both Base and Starter Deck)
  const hasBasicPrintsOnlyFilter = () => {
    return hasFilter('PrintType', 'Base') && hasFilter('PrintType', 'Starter Deck');
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


  // Helper function to toggle Basic Prints Only filter (both Base and Starter Deck with OR logic)
  const toggleBasicPrintsOnlyFilter = (enabled: boolean) => {
    if (enabled) {
      // Add both Base and Starter Deck filters with OR logic
      addFilter({ type: 'or', field: 'PrintType', value: 'Base', displayText: 'Base Prints Only' });
      addFilter({ type: 'or', field: 'PrintType', value: 'Starter Deck', displayText: 'Base Prints Only' });
    } else {
      // Remove both Base and Starter Deck filters
      const filtersToRemove = searchPreferences.filters
        .map((filter, index) => ({ filter, index }))
        .filter(({ filter }) => 
          filter.field === 'PrintType' && 
          (filter.value === 'Base' || filter.value === 'Starter Deck')
        )
        .map(({ index }) => index)
        .reverse(); // Remove in reverse order to avoid index shifting
      
      filtersToRemove.forEach(index => removeFilter(index));
    }
  };

  // Helper function to toggle Base Rarity filter (multiple OR filters only)
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
          baseRarities.includes(filter.value)
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
        <div className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBasicPrintsOnlyFilter()}
              onChange={(e) => toggleBasicPrintsOnlyFilter(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-white font-medium">Basic Prints Only</span>
          </label>
          <p className="text-xs text-gray-300 ml-7">
            Includes: Base, Starter Deck
          </p>
        </div>
        
        {/* Base Rarity Only */}
        <div className="space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBaseRarityOnlyFilter()}
              onChange={(e) => toggleBaseRarityFilter(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-white font-medium">Base Rarity Only</span>
          </label>
          <p className="text-xs text-gray-300 ml-7">
            Includes: Common, Uncommon, Rare, Super Rare
          </p>
        </div>
      </div>
    </div>
  );
}
