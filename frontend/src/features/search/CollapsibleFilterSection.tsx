'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

export interface FilterCheckboxOption {
  value: string;
  label: string;
  checked: boolean;
}

export interface CollapsibleFilterSectionProps {
  title: string;
  options: FilterCheckboxOption[];
  onOptionChange: (value: string, checked: boolean) => void;
  className?: string;
}

export function CollapsibleFilterSection({
  title,
  options,
  onOptionChange,
  className = ''
}: CollapsibleFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const checkedCount = options.filter(option => option.checked).length;
  const hasCheckedOptions = checkedCount > 0;

  return (
    <div className={`border border-white/20 rounded-lg ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors duration-150"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 text-white" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-white" />
          )}
          <span className="text-white font-medium">{title}</span>
          {hasCheckedOptions && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {checkedCount}
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/10">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-3 cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-colors duration-150"
            >
              <input
                type="checkbox"
                checked={option.checked}
                onChange={(e) => onOptionChange(option.value, e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-white text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
