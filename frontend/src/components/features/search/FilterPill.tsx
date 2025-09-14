'use client';

import { XMarkIcon } from '@heroicons/react/20/solid';

export interface FilterPillProps {
  type: 'AND' | 'OR' | 'NOT';
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterPill({ type, value, onRemove, className = '' }: FilterPillProps) {
  const getFilterChipStyle = (type: string) => {
    switch (type) {
      case 'AND':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'OR':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'NOT':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border transition-colors duration-150 ${getFilterChipStyle(type)} ${className}`}
    >
      <span className="text-[10px] font-normal leading-none" style={{ transform: 'translateY(-1px)' }}>
        {type}
      </span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-150"
        aria-label={`Remove ${type}: ${value} filter`}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </span>
  );
}
