'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSeriesValues } from '@/lib/hooks';
import { useSessionStore } from '@/stores/sessionStore';
import { apiConfig } from '@/lib/apiConfig';
import { WarningModal } from './BaseModal';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeckCreated?: (deckId: string) => void; // Optional callback when deck is created
}

export function CreateDeckModal({ isOpen, onClose, onDeckCreated }: CreateDeckModalProps) {
  const router = useRouter();
  const { deckBuilder, setDeckList } = useSessionStore();
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckGame, setNewDeckGame] = useState('Union Arena');
  const [newDeckSeries, setNewDeckSeries] = useState('');
  const [newDeckVisibility, setNewDeckVisibility] = useState<'private' | 'public' | 'unlisted'>('private');
  const [availableGames, setAvailableGames] = useState<Array<{name: string, display: string}>>([]);

  // Load series data
  const { data: seriesData } = useSeriesValues();
  
  // Search store for setting default series and filters
  const { setSeries, addFilter } = useSessionStore();

  // Load available games
  useEffect(() => {
    if (isOpen) {
      loadAvailableGames();
    }
  }, [isOpen]);

  const loadAvailableGames = async () => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/games'));
      if (response.ok) {
        const games = await response.json();
        // Filter to only show Union Arena for now (only supported game)
        const supportedGames = games.filter((game: {name: string, display: string}) => 
          game.name.toLowerCase().includes('union arena') || 
          game.display.toLowerCase().includes('union arena')
        );
        setAvailableGames(supportedGames);
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const confirmCreateDeck = async () => {
    if (newDeckName.trim()) {
      try {
        // Create deck with unified SearchParams structure
        const defaultPreferences = {
          query: '',
          sort: 'name_asc',
          page: 1,
          per_page: 25,
          filters: [
            // Default filters for new decks
            { type: 'or' as const, field: 'print_type', value: 'Base', displayText: 'Basic Prints Only' },
            { type: 'or' as const, field: 'print_type', value: 'Starter Deck', displayText: 'Basic Prints Only' },
            { type: 'not' as const, field: 'card_type', value: 'Action Point', displayText: 'No Action Points' },
            { type: 'or' as const, field: 'rarity', value: 'Common', displayText: 'Base Rarity Only' },
            { type: 'or' as const, field: 'rarity', value: 'Uncommon', displayText: 'Base Rarity Only' },
            { type: 'or' as const, field: 'rarity', value: 'Rare', displayText: 'Base Rarity Only' },
            { type: 'or' as const, field: 'rarity', value: 'Super Rare', displayText: 'Base Rarity Only' },
            { type: 'or' as const, field: 'rarity', value: 'Action Point', displayText: 'Base Rarity Only' }
          ]
        };
        
        // Create deck via API
        const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: newDeckName.trim(),
            game: newDeckGame,
            description: '',
            visibility: newDeckVisibility,
            preferences: {
              ...defaultPreferences,
              // Add series filter if selected
              filters: newDeckSeries ? [
                ...defaultPreferences.filters,
                { type: 'and' as const, field: 'series', value: newDeckSeries, displayText: `Series: ${newDeckSeries}` }
              ] : defaultPreferences.filters
            }
          }),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Failed to create deck: ${responseData.error || 'Unknown error'}`);
        }

        const newDeck = responseData.deck;
        
        // Update sessionStore to include the new deck ID
        const updatedDeckIds = [...deckBuilder.deckList, newDeck.id];
        setDeckList(updatedDeckIds);
        
        onClose();
        
        // Use callback if provided, otherwise navigate to the new deck
        if (onDeckCreated) {
          onDeckCreated(newDeck.id);
        } else {
          router.push(`/deckbuilder?deckId=${newDeck.id}`);
        }
        
      } catch (error) {
        console.error('Error creating deck:', error);
        // You could add error handling here if needed
      }
    }
  };

  const cancelCreateDeck = () => {
    onClose();
    setNewDeckName('');
    setNewDeckGame('Union Arena');
    setNewDeckSeries('');
    setNewDeckVisibility('private');
  };

  const plusIcon = (
    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );

  return (
    <WarningModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Deck"
      icon={plusIcon}
      size="sm"
    >
      <div className="text-center mb-6">
        <p className="text-white/70">
          Set up your new deck with a name, game, and visibility settings.
        </p>
      </div>

        <div className="space-y-4">
          {/* Deck Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Deck Name *
            </label>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Enter deck name..."
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div>

          {/* Game Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Game
            </label>
            <select
              value={newDeckGame}
              onChange={(e) => setNewDeckGame(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {availableGames.map((game) => (
                <option key={game.name} value={game.name} className="bg-gray-800">
                  {game.display}
                </option>
              ))}
            </select>
          </div>

          {/* Series Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Default Series Filter
            </label>
            <select
              value={newDeckSeries}
              onChange={(e) => setNewDeckSeries(e.target.value)}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="" className="bg-gray-800">No default series</option>
              {seriesData?.map((series) => (
                <option key={series} value={series} className="bg-gray-800">
                  {series}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Visibility
            </label>
            <select
              value={newDeckVisibility}
              onChange={(e) => setNewDeckVisibility(e.target.value as 'private' | 'public' | 'unlisted')}
              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="private" className="bg-gray-800">Private - Only you can see this deck</option>
              <option value="public" className="bg-gray-800">Public - Anyone can see this deck</option>
              <option value="unlisted" className="bg-gray-800">Unlisted - Only people with the link can see it</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={cancelCreateDeck}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmCreateDeck}
            disabled={!newDeckName.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Create Deck
          </button>
        </div>
    </WarningModal>
  );
}