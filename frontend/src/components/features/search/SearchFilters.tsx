'use client';

import { useSearchStore } from '@/stores/searchStore';
import { useSeriesValues, useColorValues } from '@/lib/hooks';
import { FilterDropdown } from './FilterDropdown';

export function SearchFilters() {
  const { 
    filters, 
    setQuery, 
    setSeries, 
    setColor, 
    setSort,
    addAndFilter,
    removeAndFilter
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

  const printTypeOptions = [
    { value: '', label: 'All Prints' },
    { value: 'Base', label: 'Base' },
    { value: 'Pre-Release', label: 'Pre-Release' },
    { value: 'Starter Deck', label: 'Starter Deck' },
    { value: 'Pre-Release Starter', label: 'Pre-Release Starter' },
    { value: 'Promotion', label: 'Promotion' },
  ];

  // Check if Base Print filter is active
  const basePrintFilter = filters.and_filters.find(f => f.field === 'PrintType' && f.value === 'Base');
  const currentPrintType = basePrintFilter ? 'Base' : '';

  const handlePrintTypeChange = (value: string) => {
    // Remove existing Base Print filter if it exists
    if (basePrintFilter) {
      const index = filters.and_filters.findIndex(f => f.field === 'PrintType' && f.value === 'Base');
      if (index !== -1) {
        removeAndFilter(index);
      }
    }
    
    // Add new filter if a value is selected
    if (value) {
      addAndFilter({
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
            value={filters.query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter card name..."
            className="w-full rounded-lg border border-gray-300 bg-white py-3 px-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 sm:text-sm transition-colors duration-200"
          />
        </div>

        {/* Series Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Series"
            value={filters.series || ''}
            options={seriesOptions}
            onChange={setSeries}
            placeholder="All Series"
          />
        </div>

        {/* Color Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Color"
            value={filters.color || ''}
            options={colorOptions}
            onChange={setColor}
            placeholder="All Colors"
          />
        </div>

        {/* Sort Filter */}
        <div className="w-full">
          <FilterDropdown
            label="Sort By"
            value={filters.sort || ''}
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