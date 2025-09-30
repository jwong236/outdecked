'use client';

import React, { useState } from 'react';
import { CollapsibleFilterSection } from '@/features/search/CollapsibleFilterSection';
import { FilterDropdown } from '@/features/search/FilterDropdown';
import { useSessionStore } from '@/stores/sessionStore';
import { StandardModal } from '@/components/shared/modals/BaseModal';
import { CogIcon, EyeIcon } from '@heroicons/react/24/outline';

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

  const settingsIcon = <CogIcon className="w-5 h-5 text-white" />;

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Deck Settings"
      icon={settingsIcon}
      size="full"
      className="w-[90vw] max-w-6xl max-h-[90vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        {/* Single Column Layout - Only Visibility */}
        <div className="max-w-md mx-auto">
          {/* Deck Visibility */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <EyeIcon className="w-5 h-5 mr-2" />
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
    </StandardModal>
  );
}