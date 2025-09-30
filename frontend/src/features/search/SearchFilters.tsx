'use client';

import { useState } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useSeriesValues, useColorValues, useFilterValues } from '@/lib/hooks';
import { FilterDropdown } from './FilterDropdown';

export function SearchFilters() {
  const { 
    searchPreferences,
    setSeries, 
    setColor, 
    setSort,
    addFilter,
    removeFilter,
    getSeries,
    getColor
  } = useSessionStore();

  // Local state for query since it's not stored in sessionStore
  const [query, setQuery] = useState('');

  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: printTypeData } = useFilterValues('PrintType');

  const sortOptions = [
    { value: 'recent_series_rarity_desc', label: 'Series' },
    { value: 'name_asc', label: 'Name A-Z' },
    { value: 'name_desc', label: 'Name Z-A' },
    { value: 'price_asc', label: 'Price Low-High' },
    { value: 'price_desc', label: 'Price High-Low' },
    { value: 'rarity_asc', label: 'Rarity Low-High' },
    { value: 'rarity_desc', label: 'Rarity High-Low' },
    { value: 'number_asc', label: 'Card Number Low-High' },
    { value: 'number_desc', label: 'Card Number High-Low' },
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

  const printTypeOptions = [
    { value: '', label: 'All Prints' },
    ...(printTypeData || []).map(printType => ({ value: printType, label: printType }))
  ];

  // Check if Base Print filter is active
  const basePrintFilter = searchPreferences.filters.find(f => f.field === 'PrintType' && f.value === 'Base');
  const currentPrintType = basePrintFilter ? 'Base' : '';

  const handlePrintTypeChange = (value: string) => {
    // Remove existing Base Print filter if it exists
    if (basePrintFilter) {
      const index = searchPreferences.filters.findIndex(f => f.field === 'PrintType' && f.value === 'Base');
      if (index !== -1) {
        removeFilter(index);
      }
    }
    
    // Add new filter if a value is selected
    if (value) {
      addFilter({
        type: 'and',
        field: 'PrintType',
        value: value,
        displayText: `Print Type: ${value}`
      });
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-md mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Search Query */}
        <div className="w-full">
          <label htmlFor="search" className="block text-sm font-medium text-white mb-2">
            Search Cards
          </label>
          <input
            id="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter card name..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 px-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200"
          />
        </div>

        {/* Series Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Series"
            value={getSeries()}
            options={seriesOptions}
            onChange={setSeries}
            placeholder="All Series"
          />
        </div>

        {/* Color Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Color"
            value={getColor()}
            options={colorOptions}
            onChange={setColor}
            placeholder="All Colors"
          />
        </div>

        {/* Sort Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Sort By"
            value={searchPreferences.sort || ''}
            options={sortOptions}
            onChange={setSort}
            placeholder="Default"
          />
        </div>

        {/* Print Type Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Print Type"
            value={currentPrintType}
            options={printTypeOptions}
            onChange={handlePrintTypeChange}
            placeholder="All Prints"
          />
        </div>
      </div>
    </div>
  );
}