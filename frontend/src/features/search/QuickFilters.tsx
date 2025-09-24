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

  // Helper function to add or remove a filter
  const toggleFilter = (field: string, value: string, displayText: string, enabled: boolean) => {
    if (enabled) {
      addFilter({ type: 'and', field, value, displayText });
    } else {
      // Find and remove the filter
      const filterIndex = searchPreferences.filters.findIndex(f => f.field === field && f.value === value);
      if (filterIndex !== -1) {
        removeFilter(filterIndex);
      }
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
            checked={hasFilter('print_type', 'Basic')}
            onChange={(e) => toggleFilter('print_type', 'Basic', 'Basic Prints Only', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Basic Prints Only</span>
        </label>
        
        {/* No Action Points */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasFilter('ActionPointCost', '0')}
            onChange={(e) => toggleFilter('ActionPointCost', '0', 'No Action Points', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">No Action Points</span>
        </label>
        
        {/* Base Rarity Only */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasFilter('Rarity', 'Base')}
            onChange={(e) => toggleFilter('Rarity', 'Base', 'Base Rarity Only', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Base Rarity Only</span>
        </label>
      </div>
    </div>
  );
}
