'use client';

// Removed FilterDropdown import - using native select elements

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
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Series
        </label>
        <select
          value={series}
          onChange={(e) => onSeriesChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {seriesOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Color Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Color
        </label>
        <select
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {colorOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Card Type Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Card Type
        </label>
        <select
          value={cardType}
          onChange={(e) => onCardTypeChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {cardTypeOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sort Filter */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Sort By
        </label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-800">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
