'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dataManager, Deck } from '../../../lib/dataManager';
import { analyzeDeck } from '@/lib/deckValidation';
import { useAuth } from '@/features/auth/AuthContext';
import { PageTitle } from '@/components/shared/PageTitle';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { useSeriesValues } from '@/lib/hooks';
import { useSearchStore } from '@/stores/searchStore';
import { apiConfig } from '../../../lib/apiConfig';
import Link from 'next/link';

export function DeckListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckGame, setNewDeckGame] = useState('Union Arena');
  const [newDeckSeries, setNewDeckSeries] = useState('');
  const [newDeckVisibility, setNewDeckVisibility] = useState<'private' | 'public' | 'unlisted'>('private');
  const [availableGames, setAvailableGames] = useState<Array<{name: string, display: string}>>([]);
  const [showCoverSelectionModal, setShowCoverSelectionModal] = useState(false);
  const [deckForCoverChange, setDeckForCoverChange] = useState<Deck | null>(null);

  // Load series data
  const { data: seriesData } = useSeriesValues();
  
  // Search store for setting default series and filters
  const { setSeries, setDefaultFilters } = useSearchStore();

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !user) {
      setShowSignInModal(true);
      return;
    }
    
    // Check if there's a current deck being worked on
    const currentDeck = dataManager.getCurrentDeck();
    if (currentDeck) {
      // Redirect to the current deck being edited
      router.push(`/deckbuilder/${currentDeck.id}`);
      return;
    }
    
    loadDecks();
    loadAvailableGames();
  }, [authLoading, user, router]);

  // Click-away listener for dropdown menus
  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[id^="deck-menu-"]') && !target.closest('button[title="More Options"]')) {
        document.querySelectorAll('[id^="deck-menu-"]').forEach(menu => {
          menu.classList.add('hidden');
        });
      }
    };

    document.addEventListener('click', handleClickAway);
    return () => document.removeEventListener('click', handleClickAway);
  }, []);

  const loadAvailableGames = async () => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/games'));
      if (response.ok) {
        const games = await response.json();
        console.log('All games from API:', games); // Debug log
        // Filter to only show Union Arena for now (only supported game)
        const supportedGames = games.filter((game: {name: string, display: string}) => 
          game.name.toLowerCase().includes('union arena') || 
          game.display.toLowerCase().includes('union arena')
        );
        console.log('Filtered games:', supportedGames); // Debug log
        setAvailableGames(supportedGames);
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const loadDecks = async () => {
    try {
      console.log('Loading decks...');
      const savedDecks = await dataManager.getDecks();
      console.log('Loaded decks:', savedDecks.length, savedDecks.map(d => ({ id: d.id, name: d.name })));
      setDecks(savedDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
      setDecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (deck: Deck) => {
    setDeckToDelete(deck);
    setShowDeleteModal(true);
  };

  const handleRenameDeck = async (deck: Deck) => {
    const newName = prompt('Enter new deck name:', deck.name);
    if (newName && newName.trim() && newName !== deck.name) {
      const updatedDeck = { ...deck, name: newName.trim(), updatedAt: new Date() };
      try {
        await dataManager.updateDeck(updatedDeck);
        await loadDecks();
      } catch (error) {
        console.error('Error renaming deck:', error);
      }
    }
  };

  const handleChangeCover = (deck: Deck) => {
    setDeckForCoverChange(deck);
    setShowCoverSelectionModal(true);
  };

  const handleCoverSelection = async (cardImageUrl: string) => {
    if (!deckForCoverChange) return;
    
    const updatedDeck = {
      ...deckForCoverChange,
      cover: cardImageUrl,
      updatedAt: new Date()
    };
    try {
      await dataManager.updateDeck(updatedDeck);
      await loadDecks();
    } catch (error) {
      console.error('Error updating deck cover:', error);
    }
    setShowCoverSelectionModal(false);
    setDeckForCoverChange(null);
  };

  const confirmDelete = async () => {
    if (deckToDelete) {
      console.log('Deleting deck:', deckToDelete.id, deckToDelete.name);
      try {
        await dataManager.deleteDeck(deckToDelete.id);
        console.log('Deck deleted successfully, reloading...');
      } catch (error) {
        console.error('Error deleting deck:', error);
        
        // If we get a 404, the deck doesn't exist in the database anyway
        // So we should remove it from the UI regardless
        if (error instanceof Error && error.message.includes('404')) {
          console.log('Deck not found in database (404), removing from UI anyway');
        }
      }
      
      // Always reload the deck list after deletion attempt
      await loadDecks();
    }
    setShowDeleteModal(false);
    setDeckToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeckToDelete(null);
  };

  const handleCreateDeck = () => {
    setShowCreateModal(true);
  };

  const confirmCreateDeck = async () => {
    if (newDeckName.trim()) {
      console.log('DeckListPage.confirmCreateDeck called with:', { name: newDeckName.trim(), game: newDeckGame, visibility: newDeckVisibility, series: newDeckSeries });
      try {
        // Create deck with all settings in one API call
        const filterSettings = {
          defaultFilters: {
            basicPrintsOnly: true,
            noActionPoints: true,
            baseRarityOnly: true
          },
          savedDefaultFilters: {
            printTypes: ['Base'],
            cardTypes: ['Action Point'], // Excluded types
            rarities: [], // Empty array - will fall back to defaultFilters.baseRarityOnly logic
            colors: [] // Don't set series as color - series is handled separately
          }
        };
        
        const newDeck = await dataManager.createDeck(newDeckName.trim(), newDeckGame, newDeckVisibility, newDeckSeries, filterSettings);
        console.log('DeckListPage.confirmCreateDeck completed, got deck:', { id: newDeck.id, name: newDeck.name });
        setShowCreateModal(false);
        
        // Navigate to the new deck
        console.log('Navigating to deck:', `/deckbuilder?deckId=${newDeck.id}`);
        router.push(`/deckbuilder?deckId=${newDeck.id}`);
      
        // Set default filters based on the selected series
      // Always start with base default filters
      const baseFilters = [
        {
          type: 'and' as const,
          field: 'PrintType',
          value: 'Base',
          displayText: 'PrintType: Base',
        },
        {
          type: 'not' as const,
          field: 'CardType',
          value: 'Action Point',
          displayText: 'CardType: Action Point',
        },
        // Base Rarity Only filters - exclude all non-base rarities
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Common 1-Star',
          displayText: 'Rarity: Common 1-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Rare 1-Star',
          displayText: 'Rarity: Rare 1-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Rare 2-Star',
          displayText: 'Rarity: Rare 2-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Super Rare 1-Star',
          displayText: 'Rarity: Super Rare 1-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Super Rare 2-Star',
          displayText: 'Rarity: Super Rare 2-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Super Rare 3-Star',
          displayText: 'Rarity: Super Rare 3-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Uncommon 1-Star',
          displayText: 'Rarity: Uncommon 1-Star',
        },
        {
          type: 'not' as const,
          field: 'Rarity',
          value: 'Union Rare',
          displayText: 'Rarity: Union Rare',
        }
      ];

      // Filter settings are now included in the initial deck creation - no second API call needed
      
      if (newDeckSeries) {
        setSeries(newDeckSeries); // Set series in search store
        setDefaultFilters([
          ...baseFilters,
          {
            type: 'and',
            field: 'SeriesName',
            value: newDeckSeries,
            displayText: `SeriesName: ${newDeckSeries}`,
          }
        ]);
      } else {
        setDefaultFilters(baseFilters);
      }
      
      setNewDeckName('');
      setNewDeckGame('Union Arena');
      setNewDeckSeries('');
      setNewDeckVisibility('private');
      // Clear current deck
      dataManager.clearCurrentDeck();
      } catch (error) {
        console.error('Error creating deck:', error);
        // Still close the modal even if there was an error
        setShowCreateModal(false);
      }
    }
  };

  const cancelCreateDeck = () => {
    setShowCreateModal(false);
    setNewDeckName('');
    setNewDeckGame('Union Arena');
    setNewDeckSeries('');
    setNewDeckVisibility('private');
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return null; // Don't show anything while checking auth
  }

  return (
    <div className="w-full py-8">

      {/* Page Title */}
      <PageTitle
        title="My Decks"
        icon={
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        actions={
          <button
            onClick={handleCreateDeck}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Deck
          </button>
        }
      />

      {/* Deck List */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : decks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 p-4"
              >
                <div className="flex gap-4">
                  {/* Left Column - Deck Cover Image */}
                  <div className="flex-shrink-0 relative">
                    {deck.cover ? (
                      <img
                        src={deck.cover.startsWith('http') ? deck.cover : `/api/images?url=${encodeURIComponent(deck.cover)}`}
                        alt={`${deck.name} cover`}
                        className="w-40 h-auto rounded-lg border border-white/20"
                        onError={(e) => {
                          console.error('🖼️ Failed to load deck cover:', deck.cover, 'for deck:', deck.name);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          console.log('🖼️ Successfully loaded deck cover:', deck.cover, 'for deck:', deck.name);
                        }}
                      />
                    ) : (
                      <div className="w-40 h-56 rounded-lg border border-white/20 bg-white/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    )}
      </div>

                  {/* Right Column - Deck Info and Statistics */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Header with name, validation, and delete button */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg truncate">
                          {deck.name}
                        </h3>
                        {/* Validation Indicator */}
                        {(() => {
                          // Use backend validation if available, fallback to frontend validation
                          if (deck.is_legal !== undefined) {
                            // Backend validation available
                            if (deck.is_legal) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded text-xs flex-shrink-0">
                                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-green-400 font-medium">Valid</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 rounded text-xs flex-shrink-0">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-red-400 font-medium">Invalid</span>
                                </div>
                              );
                            }
                          } else {
                            // Fallback to frontend validation for backwards compatibility
                            const deckCards = deck.cards.map(cardRef => ({
                              ...cardRef,
                              quantity: cardRef.quantity,
                              Trigger: cardRef.Trigger || '',
                              name: cardRef.name || 'Unknown Card'
                            } as any));
                            const validation = analyzeDeck(deckCards);
                            const hasExcessCards = validation.errors.some(error => error.includes('has') && error.includes('copies'));
                            
                            if (hasExcessCards) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 rounded text-xs flex-shrink-0">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-red-400 font-medium">Invalid</span>
                                </div>
                              );
                            } else if (!validation.isValid) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 border border-yellow-500/30 rounded text-xs flex-shrink-0">
                                  <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-yellow-400 font-medium">Issues</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded text-xs flex-shrink-0">
                                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-green-400 font-medium">Valid</span>
                                </div>
                              );
                            }
                          }
                        })()}
        </div>

                      {/* More Options Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Close all other dropdowns first
                          document.querySelectorAll('[id^="deck-menu-"]').forEach(menu => {
                            if (menu.id !== `deck-menu-${deck.id}`) {
                              menu.classList.add('hidden');
                            }
                          });
                          // Toggle this dropdown
                          const dropdown = document.getElementById(`deck-menu-${deck.id}`);
                          if (dropdown) {
                            dropdown.classList.toggle('hidden');
                          }
                        }}
                        className="p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors"
                        title="More Options"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      <div id={`deck-menu-${deck.id}`} className="hidden absolute right-0 top-10 bg-gray-900/95 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-10 min-w-40">
                        <button
                          onClick={() => {
                            document.getElementById(`deck-menu-${deck.id}`)?.classList.add('hidden');
                            handleRenameDeck(deck);
                          }}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            document.getElementById(`deck-menu-${deck.id}`)?.classList.add('hidden');
                            handleChangeCover(deck);
                          }}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Change Cover
                        </button>
                        <div className="border-t border-white/10 my-1"></div>
                        <button
                          onClick={() => {
                            document.getElementById(`deck-menu-${deck.id}`)?.classList.add('hidden');
                            handleDeleteClick(deck);
                          }}
                          className="w-full px-3 py-2 text-left text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Deck
                        </button>
                      </div>
        </div>

                    {/* All Statistics */}
                    <div className="space-y-2 text-sm text-white mb-4">
                      <div className="flex justify-between">
                        <span>Game:</span>
                        <span className="text-white">{deck.game}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cards:</span>
                        <span className="text-white">
                          {deck.cards.reduce((sum, c) => sum + c.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Visibility:</span>
                        <span className={`capitalize ${
                          deck.visibility === 'public' ? 'text-green-400' :
                          deck.visibility === 'unlisted' ? 'text-yellow-400' :
                          'text-white'
                        }`}>
                          {deck.visibility}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated:</span>
                        <span>{formatDate(deck.updatedAt)}</span>
                      </div>
        </div>

                    {/* Edit Button */}
                    <Link
                      href={`/deckbuilder?deckId=${deck.id}`}
                      className="w-full px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm transition-colors text-center block mt-auto"
                      onClick={() => dataManager.clearCurrentDeck()}
                    >
                      Edit Deck
          </Link>
        </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/70 py-12">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No decks yet</h3>
            <p className="mb-4">Create your first deck to get started</p>
            <button
              onClick={handleCreateDeck}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Deck
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Create Deck Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-green-100/20">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-white mb-2">
                Create New Deck
              </h3>
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
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deckToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 mx-auto flex items-center justify-center rounded-full bg-red-100/20">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-white mb-2">
                Delete Deck
              </h3>
              <p className="text-white/70 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">"{deckToDelete.name}"</span>? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Deck
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Selection Modal */}
      {showCoverSelectionModal && deckForCoverChange && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="text-center flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Choose Deck Cover</h3>
                <p className="text-gray-300">Select a card from your deck to use as the cover image</p>
              </div>
              <button
                onClick={() => {
                  setShowCoverSelectionModal(false);
                  setDeckForCoverChange(null);
                }}
                className="text-gray-400 hover:text-white transition-colors ml-4"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
              {deckForCoverChange.cards.map((deckCard, index) => {
                if (!deckCard.image_url) return null;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleCoverSelection(deckCard.image_url!)}
                    className="relative group"
                  >
                    <img
                      src={deckCard.image_url.startsWith('http') ? deckCard.image_url : `/api/images?url=${encodeURIComponent(deckCard.image_url)}`}
                      alt={deckCard.name}
                      className="w-full h-auto rounded-lg border-2 border-transparent group-hover:border-indigo-400 transition-colors"
                      onError={(e) => {
                        console.error('Failed to load card image:', deckCard.image_url);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-medium transition-opacity">
                        Select
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => {
                  setShowCoverSelectionModal(false);
                  setDeckForCoverChange(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => {
          setShowSignInModal(false);
          // Redirect to homepage if user closes modal without signing in
          router.push('/');
        }}
        title="Sign In Required"
        message="You need to be signed in to access the deck builder. Sign in to create, edit, and manage your personal deck collection."
      />

    </div>
  );
}