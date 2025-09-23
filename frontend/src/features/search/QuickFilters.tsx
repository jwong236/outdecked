'use client';

import { useSessionStore } from '@/stores/sessionStore';

interface QuickFiltersProps {
  className?: string;
}

export function QuickFilters({ className = '' }: QuickFiltersProps) {
  const { searchPreferences, setDefaultFilterToggle } = useSessionStore();

  const handleDefaultFilterChange = (filterType: keyof typeof searchPreferences.defaultFilters, enabled: boolean) => {
    setDefaultFilterToggle(filterType, enabled);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-white">Default Filters</h3>
      
      <div className="space-y-4">
        {/* Basic Prints Only */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={searchPreferences.defaultFilters.basicPrintsOnly}
            onChange={(e) => handleDefaultFilterChange('basicPrintsOnly', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Basic Prints Only</span>
        </label>
        
        {/* No Action Points */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={searchPreferences.defaultFilters.noActionPoints}
            onChange={(e) => handleDefaultFilterChange('noActionPoints', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">No Action Points</span>
        </label>
        
        {/* Base Rarity Only */}
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={searchPreferences.defaultFilters.baseRarityOnly}
            onChange={(e) => handleDefaultFilterChange('baseRarityOnly', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span className="text-white font-medium">Base Rarity Only</span>
        </label>
      </div>
    </div>
  );
}
