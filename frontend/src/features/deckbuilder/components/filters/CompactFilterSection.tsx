'use client';

import { AdvancedFiltersButton } from '../../../search/AdvancedFiltersButton';

interface CompactFilterSectionProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onAdvancedFilters: () => void;
  hasActiveFilters: boolean;
  className?: string;
}

export function CompactFilterSection({
  query,
  onQueryChange,
  onSearch,
  onAdvancedFilters,
  hasActiveFilters,
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
    </div>
  );
}
