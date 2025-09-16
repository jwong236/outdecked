'use client';

import { FilterDropdown } from './FilterDropdown';

interface FilterSectionProps {
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
  className?: string;
}

export function FilterSection({
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
  className = ''
}: FilterSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Series Filter */}
      <FilterDropdown
        label="Series"
        value={series}
        options={seriesOptions}
        onChange={onSeriesChange}
        placeholder="All Series"
      />

      {/* Color Filter */}
      <FilterDropdown
        label="Color"
        value={color}
        options={colorOptions}
        onChange={onColorChange}
        placeholder="All Colors"
      />

      {/* Card Type Filter */}
      <FilterDropdown
        label="Card Type"
        value={cardType}
        options={cardTypeOptions}
        onChange={onCardTypeChange}
        placeholder="All Types"
      />

      {/* Sort Filter */}
      <FilterDropdown
        label="Sort By"
        value={sort}
        options={sortOptions}
        onChange={onSortChange}
        placeholder="Default"
      />
    </div>
  );
}
