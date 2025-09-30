'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { StandardModal } from '@/components/shared/modals/BaseModal';

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: {
    notCardType: string[];
    printType: string[];
  }) => void;
  currentFilters: {
    notCardType: string[];
    printType: string[];
  };
}

export function AdvancedFiltersModal({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters
}: AdvancedFiltersModalProps) {
  const [notCardType, setNotCardType] = useState<string[]>(currentFilters.notCardType);
  const [printType, setPrintType] = useState<string[]>(currentFilters.printType);

  const handleApply = () => {
    onApplyFilters({
      notCardType,
      printType
    });
    onClose();
  };

  const handleReset = () => {
    setNotCardType(['Action Point']);
    setPrintType(['Base']);
  };

  const toggleNotCardType = (cardType: string) => {
    setNotCardType(prev => 
      prev.includes(cardType) 
        ? prev.filter(type => type !== cardType)
        : [...prev, cardType]
    );
  };

  const togglePrintType = (type: string) => {
    setPrintType(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const filterIcon = (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced Filters"
      icon={filterIcon}
      size="sm"
    >

        <div className="space-y-6">
          {/* NOT Card Type Filters */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Exclude Card Types</h4>
            <div className="space-y-2">
              {['Action Point', 'Character', 'Event', 'Site'].map((cardType) => (
                <label key={cardType} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notCardType.includes(cardType)}
                    onChange={() => toggleNotCardType(cardType)}
                    className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-white">NOT {cardType}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Print Type Filters */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Print Type</h4>
            <div className="space-y-2">
              {['Base', 'Pre-Release', 'Starter Deck', 'Pre-Release Starter', 'Promotion'].map((type) => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={printType.includes(type)}
                    onChange={() => togglePrintType(type)}
                    className="w-4 h-4 text-blue-600 bg-white/20 border-white/30 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="ml-2 text-sm text-white">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Filters */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Quick Filters</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setNotCardType(['Action Point']);
                  setPrintType(['Base']);
                }}
                className="w-full text-left px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-colors text-sm"
              >
                NOT Action Point + Base Print Only
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Apply Filters
          </button>
        </div>
    </StandardModal>
  );
}
