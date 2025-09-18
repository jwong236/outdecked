'use client';

interface QuickFiltersProps {
  onAddAndFilter: (filter: { type: 'and'; field: string; value: string; displayText: string }) => void;
  onAddOrFilter: (filter: { type: 'or'; field: string; value: string; displayText: string }) => void;
  onAddNotFilter: (filter: { type: 'not'; field: string; value: string; displayText: string }) => void;
  currentFilters: {
    and_filters: Array<{ field: string; value: string; displayText: string }>;
    or_filters: Array<{ field: string; value: string; displayText: string }>;
    not_filters: Array<{ field: string; value: string; displayText: string }>;
  };
  className?: string;
}

export function QuickFilters({ onAddAndFilter, onAddOrFilter, onAddNotFilter, currentFilters, className = '' }: QuickFiltersProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-medium text-white">Quick Filters</h3>
      
      <div className="flex flex-wrap gap-2">
        {/* Base Print Only */}
        <button
          onClick={() => {
            const filterExists = currentFilters.and_filters.some(f => 
              f.field === 'PrintType' && f.value === 'Base'
            );
            if (!filterExists) {
              const filter = {
                type: 'and' as const,
                field: 'PrintType',
                value: 'Base',
                displayText: 'PrintType: Base',
              };
              onAddAndFilter(filter);
            }
          }}
          className="px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium border border-blue-400"
        >
          Base Print Only
        </button>

        {/* Action Point */}
        <button
          onClick={() => {
            const filterExists = currentFilters.not_filters.some(f => 
              f.field === 'CardType' && f.value === 'Action Point'
            );
            if (!filterExists) {
              const filter = {
                type: 'not' as const,
                field: 'CardType',
                value: 'Action Point',
                displayText: 'CardType: Action Point',
              };
              onAddNotFilter(filter);
            }
          }}
          className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium border border-red-400"
        >
          Action Point
        </button>

        {/* Base Rarity Only */}
        <button
          onClick={() => {
            const baseRarityValues = [
              'Common 1-Star',
              'Rare 1-Star', 
              'Rare 2-Star',
              'Super Rare 1-Star',
              'Super Rare 2-Star',
              'Super Rare 3-Star',
              'Uncommon 1-Star',
              'Union Rare'
            ];
            
            // Check if any of these filters already exist
            const hasExistingFilters = baseRarityValues.some(value => 
              currentFilters.not_filters.some(f => f.field === 'Rarity' && f.value === value)
            );
            
            if (!hasExistingFilters) {
              // Add all 8 NOT Rarity filters
              baseRarityValues.forEach(value => {
                const filter = {
                  type: 'not' as const,
                  field: 'Rarity',
                  value: value,
                  displayText: 'Rarity: ' + value,
                };
                onAddNotFilter(filter);
              });
            }
          }}
          className="px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium border border-red-400"
        >
          Base Rarity Only
        </button>
      </div>
    </div>
  );
}
