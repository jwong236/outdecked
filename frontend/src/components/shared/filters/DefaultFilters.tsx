'use client';

import { useMemo } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { FilterPill } from '@/features/search/FilterPill';

interface DefaultFiltersProps {
  className?: string;
}

export function DefaultFilters({ className = '' }: DefaultFiltersProps) {
  const { defaultFilters, removeDefaultFilter } = useSearchStore();

  // Group Base Rarity Only filters into a single display
  const processedFilters = useMemo(() => {
    const rarityFilters = defaultFilters.filter(f => f.field === 'Rarity' && f.type === 'not');
    const otherFilters = defaultFilters.filter(f => !(f.field === 'Rarity' && f.type === 'not'));
    
    const hasBaseRarityOnly = rarityFilters.length >= 8; // Check if we have all the base rarity filters
    
    if (hasBaseRarityOnly) {
      // Replace all rarity filters with a single "Base Rarity Only" filter
      return [
        ...otherFilters,
        {
          type: 'not' as const,
          field: 'BaseRarityOnly',
          value: 'Base Rarity Only',
          displayText: 'Base Rarity Only',
          isSpecial: true, // Mark as special filter
          originalFilters: rarityFilters // Keep reference to original filters for removal
        }
      ];
    }
    
    return defaultFilters;
  }, [defaultFilters]);

  const handleRemoveFilter = (filter: any) => {
    if (filter.isSpecial && filter.field === 'BaseRarityOnly') {
      // Remove all the original rarity filters
      filter.originalFilters.forEach((originalFilter: any) => {
        removeDefaultFilter(originalFilter);
      });
    } else {
      removeDefaultFilter(filter);
    }
  };

  if (processedFilters.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-sm font-medium text-white/80 mb-2">Default Filters</h3>
        <p className="text-xs text-white/60">No default filters set</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-sm font-medium text-white/80 mb-2">Default Filters</h3>
      <div className="flex flex-wrap gap-2">
        {processedFilters.map((filter, index) => (
          <FilterPill
            key={`${filter.field}-${filter.value}-${index}`}
            type={filter.type.toUpperCase() as 'AND' | 'OR' | 'NOT' | 'NOT NOT'}
            value={filter.displayText}
            onRemove={() => handleRemoveFilter(filter)}
          />
        ))}
      </div>
    </div>
  );
}
