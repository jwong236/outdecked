'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/types/card';
// Removed analyzeDeck import - validation now handled by backend
// Removed useAuth import - now using sessionStore
import { PageTitle } from '@/components/shared/PageTitle';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { CreateDeckModal } from '@/components/shared/modals/CreateDeckModal';
import { useSeriesValues } from '@/lib/hooks';
import { useSessionStore } from '@/stores/sessionStore';
import { fetchDecksBatch } from '@/lib/deckUtils';
import { apiConfig } from '../../../lib/apiConfig';
import Link from 'next/link';

export function DeckListPage() {
  const router = useRouter();
  const { user, sessionState } = useSessionStore();
  const authLoading = !sessionState.isInitialized;
  const { deckBuilder, setDeckList, setCurrentDeck } = useSessionStore();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showCoverSelectionModal, setShowCoverSelectionModal] = useState(false);
  const [deckForCoverChange, setDeckForCoverChange] = useState<Deck | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'series' | 'color' | 'most_recent'>('most_recent');

  // Load series data
  const { data: seriesData } = useSeriesValues();
  
  // Search store for setting default series and filters
  const { setSeries, addFilter } = useSessionStore();

  // Handle edit deck - just redirect to deck builder page
  const handleEditDeck = (deckId: string) => {
    // Just redirect to deck builder page - DeckBuilderContent will handle loading the deck data
    router.push(`/deckbuilder?deckId=${deckId}`);
  };

  useEffect(() => {
    // Check authentication first
    if (!authLoading && !user) {
      setShowSignInModal(true);
      return;
    }
    
    loadDecks();
  }, [authLoading, user, router, deckBuilder.deckList]);

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


  const loadDecks = async () => {
    if (deckBuilder.deckList.length === 0) {
      setDecks([]);
      setIsLoading(false);
      return;
    }

    try {
      const fullDecks = await fetchDecksBatch(deckBuilder.deckList);
      
      // Debug: Check if timestamps are now available
      console.log('Deck timestamps after fix:', fullDecks.map(deck => ({
        name: deck.name,
        updated_at: deck.updated_at,
        created_at: deck.created_at,
        last_modified: deck.last_modified
      })));
      
      setDecks(fullDecks);
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
      try {
        // Update deck via API
        const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deck.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: newName.trim(),
            updatedAt: new Date().toISOString()
          }),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Failed to rename deck: ${responseData.error || 'Unknown error'}`);
        }

        console.log('✅ Deck renamed successfully');
        // The UI will automatically update when loadDecks() is called due to the useEffect dependency
      } catch (error) {
        console.error('Error renaming deck:', error);
      }
    }
  };

  const handleDuplicateDeck = async (deck: Deck) => {
    try {
      // Create a new deck with the same data
      const newDeckName = `${deck.name} (Copy)`;
      const deckData = {
        name: newDeckName,
        game: deck.game,
        description: deck.description || '',
        visibility: deck.visibility || 'private',
        cards: deck.cards || [],
        cover: deck.cover || '',
        preferences: deck.preferences || {}
      };
      
      const response = await fetch(apiConfig.getApiUrl('/api/user/decks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(deckData)
      });

      if (response.ok) {
        const data = await response.json();
        // Add new deck ID to session store
        setDeckList([...deckBuilder.deckList, data.deck.id]);
        // Reload decks to show the duplicate
        await loadDecks();
      } else {
        const errorData = await response.json();
        alert(`Failed to duplicate deck: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error duplicating deck:', error);
      alert('Error duplicating deck');
    }
  };

  const handleChangeCover = (deck: Deck) => {
    setDeckForCoverChange(deck);
    setShowCoverSelectionModal(true);
  };

  const handleCoverSelection = async (cardImageUrl: string) => {
    if (!deckForCoverChange) return;
    
    try {
      // Update deck cover via API
      const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckForCoverChange.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cover: cardImageUrl,
          updatedAt: new Date().toISOString()
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Failed to update deck cover: ${responseData.error || 'Unknown error'}`);
      }

      console.log('✅ Deck cover updated successfully');
      // The UI will automatically update when loadDecks() is called due to the useEffect dependency
    } catch (error) {
      console.error('Error updating deck cover:', error);
    }
    setShowCoverSelectionModal(false);
    setDeckForCoverChange(null);
  };

  const confirmDelete = async () => {
    if (deckToDelete) {
      try {
        // Delete from database via API
        const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckToDelete.id}`), { 
          method: 'DELETE',
          credentials: 'include',
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`API delete failed: ${response.status} - ${responseData.error || 'Unknown error'}`);
        }
        
        // Update sessionStore to remove the deck ID
        const updatedDeckIds = deckBuilder.deckList.filter(id => id !== deckToDelete.id);
        setDeckList(updatedDeckIds);
        
      } catch (error) {
        console.error('Error deleting deck:', error);
        
        // If we get a 404, the deck doesn't exist in the database anyway
        // So we should remove it from the sessionStore regardless
        if (error instanceof Error && error.message.includes('404')) {
          const updatedDeckIds = deckBuilder.deckList.filter(id => id !== deckToDelete.id);
          setDeckList(updatedDeckIds);
          console.log('✅ Deck removed from sessionStore (was already deleted from database)');
        }
      }
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

  // Sort decks based on selected criteria
  const sortedDecks = useMemo(() => {
    if (!decks.length) return [];
    
    return [...decks].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'series':
          const seriesA = a.preferences?.filters?.find((f: any) => f.field === 'series')?.value || 'All Series';
          const seriesB = b.preferences?.filters?.find((f: any) => f.field === 'series')?.value || 'All Series';
          return seriesA.localeCompare(seriesB);
        case 'color':
          // For now, we'll sort by the first card's color if available
          // This would need to be enhanced based on your color data structure
          return 0; // Placeholder - would need actual color data
        case 'most_recent':
          // Sort by most recently updated/created - only use actual timestamps
          const getTimestamp = (deck: Deck) => {
            // Only use updated_at or created_at, no fallbacks
            const timestamp = deck.updated_at || deck.created_at;
            if (!timestamp) return 0;
            
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          };
          
          const timestampA = getTimestamp(a);
          const timestampB = getTimestamp(b);
          
          return timestampB - timestampA; // Descending order (most recent first)
        default:
          return 0;
      }
    });
  }, [decks, sortBy]);

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
          {/* Sort Dropdown */}
          <div className="mb-6 flex justify-end">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'series' | 'color' | 'most_recent')}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8"
              >
                <option value="most_recent" className="bg-gray-800 text-white">Most Recent</option>
                <option value="name" className="bg-gray-800 text-white">Sort by Name</option>
                <option value="series" className="bg-gray-800 text-white">Sort by Series</option>
                <option value="color" className="bg-gray-800 text-white">Sort by Color</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : decks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedDecks.map((deck) => (
              <div
                key={deck.id}
                className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all duration-300 p-4"
              >
                <div className="flex gap-4">
                  {/* Left Column - Deck Cover Image */}
                  <div className="flex-shrink-0 relative">
                    {deck.cover ? (
                      <img
                        src={deck.cover}
                        alt={`${deck.name} cover`}
                        className="w-40 h-auto rounded-lg border border-white/20"
                        onError={(e) => {
                          console.error('🖼️ Failed to load deck cover:', deck.cover, 'for deck:', deck.name);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
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
                    {/* Header with name, validation status, and delete button */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-lg leading-tight h-10 flex items-center">
                          {deck.name}
                        </h3>
                        {/* Validation Status - Inline with name */}
                        {(() => {
                          // Use backend validation if available, fallback to frontend validation
                          if (deck.is_legal !== undefined) {
                            // Backend validation available
                            if (deck.is_legal) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded text-xs">
                                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-green-400 font-medium">Valid</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 rounded text-xs">
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
                              card_id: cardRef.card_id,
                              quantity: cardRef.quantity,
                              Trigger: '',
                              name: 'Unknown Card'
                            } as any));
                            // Use backend validation status if available, otherwise show as valid
                            const hasExcessCards = deck.is_legal === false;
                            
                            if (hasExcessCards) {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 rounded text-xs">
                                  <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  <span className="text-red-400 font-medium">Invalid</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded text-xs">
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
                        <button
                          onClick={() => {
                            document.getElementById(`deck-menu-${deck.id}`)?.classList.add('hidden');
                            handleDuplicateDeck(deck);
                          }}
                          className="w-full px-3 py-2 text-left text-white hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Duplicate Deck
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


                    {/* Deck Information */}
                    <div className="space-y-2 text-sm text-white mb-4">
                      <div className="flex justify-between">
                        <span>Cards:</span>
                        <span className="text-white">
                          {deck.cards.reduce((sum, c) => sum + c.quantity, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span className="text-white">
                          {formatDate(deck.created_at || deck.created_date || '')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Visibility:</span>
                        <span className={`capitalize ${
                          deck.visibility === 'public' ? 'text-green-400' :
                          deck.visibility === 'unlisted' ? 'text-yellow-400' :
                          'text-white'
                        }`}>
                          {deck.visibility || 'private'}
                        </span>
                      </div>
        </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleEditDeck(deck.id)}
                      className="w-full px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm transition-colors text-center block mt-auto"
                    >
                      Edit Deck
                    </button>
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
      <CreateDeckModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

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
                // CardRef only has card_id and quantity, so we'll show a placeholder
                return (
                  <button
                    key={index}
                    onClick={() => handleCoverSelection('')}
                    className="relative group"
                  >
                    <div className="w-full h-32 bg-gray-700 rounded-lg border-2 border-transparent group-hover:border-indigo-400 transition-colors flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Card {deckCard.card_id}</span>
                    </div>
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