'use client';

interface AdvancedFiltersButtonProps {
  onOpen: () => void;
  hasActiveFilters: boolean;
  variant?: 'advanced-filters' | 'settings';
  className?: string;
}

export function AdvancedFiltersButton({ onOpen, hasActiveFilters, variant = 'advanced-filters', className = '' }: AdvancedFiltersButtonProps) {
  const buttonText = variant === 'settings' ? 'Settings' : 'Advanced Filters';
  
  return (
    <button
      onClick={onOpen}
      className={`px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
      {buttonText}
    </button>
  );
}
