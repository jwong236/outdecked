'use client';

import { useSearchStore } from '@/stores/searchStore';
import { useSeriesValues, useColorValues } from '@/lib/hooks';
import { FilterDropdown } from './search/FilterDropdown';

export function SearchFilters() {
  const { 
    filters, 
    setQuery, 
    setSeries, 
    setColor, 
    setSort 
  } = useSearchStore();

  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();

  const sortOptions = [
    { value: '', label: 'Default' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'price', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' },
    { value: 'rarity', label: 'Rarity' },
    { value: 'number', label: 'Card Number' },
  ];

  // Prepare dropdown options
  const seriesOptions = [
    { value: '', label: 'All Series' },
    ...(seriesData || []).map(series => ({ value: series, label: series }))
  ];

  const colorOptions = [
    { value: '', label: 'All Colors' },
    ...(colorData || []).map(color => ({ value: color, label: color }))
  ];

  return (
    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Query */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-white mb-2">
            Search Cards
          </label>
          <input
            id="search"
            type="text"
            value={filters.query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter card name..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 px-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200"
          />
        </div>

        {/* Series Filter */}
        <FilterDropdown
          label="Series"
          value={filters.series || ''}
          options={seriesOptions}
          onChange={setSeries}
          placeholder="All Series"
        />

        {/* Color Filter */}
        <FilterDropdown
          label="Color"
          value={filters.color || ''}
          options={colorOptions}
          onChange={setColor}
          placeholder="All Colors"
        />

        {/* Sort Filter */}
        <FilterDropdown
          label="Sort By"
          value={filters.sort || ''}
          options={sortOptions}
          onChange={setSort}
          placeholder="Default"
        />
      </div>
    </div>
  );
}