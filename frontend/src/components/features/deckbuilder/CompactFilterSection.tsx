'use client';

import { FilterDropdown } from '../search/FilterDropdown';
import { AdvancedFiltersButton } from '../search/AdvancedFiltersButton';
import { QuickFilters } from '../search/QuickFilters';
import { ActiveFilters } from '../search/ActiveFilters';
import { SearchFilters } from '@/stores/searchStore';

interface CompactFilterSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  series: string;
  onSeriesChange: (series: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  cardType: string;
  onCardTypeChange: (cardType: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  seriesOptions: Array<{ value: string; label: string }>;
  colorOptions: Array<{ value: string; label: string }>;
  cardTypeOptions: Array<{ value: string; label: string }>;
  sortOptions: Array<{ value: string; label: string }>;
  onSearch: () => void;
  onAdvancedFilters: () => void;
  hasActiveFilters: boolean;
  // QuickFilters props
  onAddAndFilter: (field: string, value: string) => void;
  onAddNotFilter: (field: string, value: string) => void;
  currentFilters: SearchFilters;
  // ActiveFilters props
  onRemoveFilter: (filterType: string, value?: string) => void;
  onRemoveMultipleFilters: (filterType: string, values: string[]) => void;
  onClearAllFilters: () => void;
  className?: string;
}

export function CompactFilterSection({
  query,
  onQueryChange,
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
  onSearch,
  onAdvancedFilters,
  hasActiveFilters,
  onAddAndFilter,
  onAddNotFilter,
  currentFilters,
  onRemoveFilter,
  onRemoveMultipleFilters,
  onClearAllFilters,
  className = ''
}: CompactFilterSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Input and Buttons Row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search for cards..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          onClick={onSearch}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          Search
        </button>
        <AdvancedFiltersButton
          onOpen={onAdvancedFilters}
          hasActiveFilters={hasActiveFilters}
          variant="settings"
          className="px-3 py-2 text-sm"
        />
      </div>

      {/* Active Filters Row */}
      <ActiveFilters
        filters={currentFilters}
        onRemoveFilter={onRemoveFilter}
        onRemoveMultipleFilters={onRemoveMultipleFilters}
        onClearAll={onClearAllFilters}
      />
    </div>
  );
}
