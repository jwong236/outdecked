'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
import { FilterDropdown } from '@/features/search/FilterDropdown';
import { useSessionStore } from '@/stores/sessionStore';

interface DeckBuilderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeckBuilderSettingsModal({ isOpen, onClose }: DeckBuilderSettingsModalProps) {
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const currentDeck = deckBuilder.currentDeck;
  


  const handleDeckVisibilityChange = (visibility: string) => {
    if (!currentDeck || Object.keys(currentDeck).length === 0) return;
    
    const updatedDeck = {
      ...currentDeck,
      visibility: visibility as 'private' | 'public' | 'unlisted'
    };
    
    setCurrentDeck(updatedDeck);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg w-[90vw] max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Deck Settings</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Single Column Layout - Only Visibility */}
          <div className="max-w-md mx-auto">
            {/* Deck Visibility */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visibility
              </h3>
              <p className="text-white/70 text-sm mb-4">Control who can see your deck.</p>
              <FilterDropdown
                label=""
                value={currentDeck?.visibility || "private"}
                options={[
                  { value: 'private', label: 'Private - Only you can see this deck' },
                  { value: 'public', label: 'Public - Anyone can see this deck' },
                  { value: 'unlisted', label: 'Unlisted - Only people with the link can see it' }
                ]}
                onChange={handleDeckVisibilityChange}
                placeholder="Select visibility"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}