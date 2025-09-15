'use client';

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SearchGrid } from '@/components/features/search/SearchGrid';
import { DeckGrid } from '@/components/features/deckbuilder/DeckGrid';
import { CardDetailModal } from '@/components/features/search/CardDetailModal';
import { dataManager, Deck, HandItem, CardReference } from '@/lib/dataManager';
import { Card } from '@/types/card';
import { DeckValidation } from '@/lib/deckValidation';
import { openTCGPlayerDeck } from '@/lib/tcgplayerUtils';

export default function DeckBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deckName, setDeckName] = useState('New Deck');
  const [originalDeckName, setOriginalDeckName] = useState('New Deck');
  const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [moveMessage, setMoveMessage] = useState('');
  const [showGoToSearch, setShowGoToSearch] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showDecklistModal, setShowDecklistModal] = useState(false);
  const [showCoverSelectionModal, setShowCoverSelectionModal] = useState(false);

  // Create memoized search results with correct quantities from deck
  const searchResultsWithQuantities = useMemo(() => {
    return searchResults.map(card => {
      // Find quantity directly from currentDeck to avoid intermediate memoization
      const deckQuantity = currentDeck?.cards.find(c => c.card_url === card.card_url)?.quantity || 0;
      return {
        ...card,
        quantity: deckQuantity
      };
    });
  }, [searchResults, currentDeck?.cards]);

  // Load deck or create new one
  useEffect(() => {
    if (deckId === 'new') {
      // Check if there's a current deck being worked on
      const currentDeck = dataManager.getCurrentDeck();
      if (currentDeck) {
        // Redirect to the current deck being edited
        router.replace(`/deckbuilder/${currentDeck.id}`);
        return;
      }
      createNewDeck();
    } else {
      loadDeck(deckId);
    }
    loadFilterOptions();
    // Load some initial cards
    handleSearch();
  }, [deckId]);

  // Auto-search when filters change
  useEffect(() => {
    if (selectedSeries || selectedColor || sortBy) {
      handleSearch();
    }
  }, [selectedSeries, selectedColor, sortBy]);

  // Update deckCards when currentDeck changes
  useEffect(() => {
    if (currentDeck) {
      // Convert deck cards to Card format for display
      const deckCardData: Card[] = currentDeck.cards.map(deckItem => ({
        id: deckItem.id || 0,
        product_id: deckItem.product_id || 0,
        name: deckItem.name ?? '',
        clean_name: deckItem.clean_name || null,
        image_url: deckItem.image_url ?? null,
        card_url: deckItem.card_url,
        game: deckItem.game ?? '',
        category_id: deckItem.category_id || 0,
        group_id: deckItem.group_id || 0,
        group_name: deckItem.group_name,
        group_abbreviation: deckItem.group_abbreviation,
        image_count: deckItem.image_count || 0,
        is_presale: deckItem.is_presale || false,
        released_on: deckItem.released_on || '',
        presale_note: deckItem.presale_note || '',
        modified_on: deckItem.modified_on || '',
        price: deckItem.price || 0,
        low_price: deckItem.low_price || null,
        mid_price: deckItem.mid_price || null,
        high_price: deckItem.high_price || null,
        created_at: deckItem.created_at || '',
        // Dynamic attributes
        SeriesName: deckItem.SeriesName,
        Rarity: deckItem.Rarity,
        Number: deckItem.Number,
        CardType: deckItem.CardType,
        RequiredEnergy: deckItem.RequiredEnergy,
        ActionPointCost: deckItem.ActionPointCost,
        ActivationEnergy: deckItem.ActivationEnergy,
        Description: deckItem.Description,
        GeneratedEnergy: deckItem.GeneratedEnergy,
        BattlePointBP: deckItem.BattlePointBP,
        Trigger: deckItem.Trigger,
        Affinities: deckItem.Affinities,
        quantity: deckItem.quantity
      }));
      setDeckCards(deckCardData);
    }
  }, [currentDeck]);

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      // Load series options
      const seriesResponse = await fetch('/api/metadata-values/Union Arena/SeriesName');
      if (seriesResponse.ok) {
        const series = await seriesResponse.json();
        setSeriesOptions(series);
      }

      // Load color options
      const colorResponse = await fetch('/api/color-values?game=Union Arena');
      if (colorResponse.ok) {
        const colors = await colorResponse.json();
        setColorOptions(colors);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const createNewDeck = () => {
    const newDeck: Deck = {
      id: `deck-${Date.now()}`,
      name: 'New Deck',
      game: 'Union Arena',
      visibility: 'private',
      cards: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setCurrentDeck(newDeck);
    setDeckName('New Deck');
    setOriginalDeckName('New Deck');
    setDeckCards([]);
    setHasUnsavedNameChanges(false);
    
    // Save this as the current deck being worked on
    dataManager.setCurrentDeck(newDeck);
  };

  const loadDeck = async (id: string) => {
    const deck = dataManager.getDeck(id);
    if (deck) {
      setCurrentDeck(deck);
      setDeckName(deck.name);
      setOriginalDeckName(deck.name);
      setHasUnsavedNameChanges(false);
      
      // Save this as the current deck being worked on
      dataManager.setCurrentDeck(deck);
      
      // Load search results to ensure we have card data for the deck
      await handleSearch();
      
      // Set default cover if no cover is set
      if (!deck.cover) {
        setDefaultCover();
      }
    } else {
      // Deck not found, redirect to deck list
      router.push('/deckbuilder');
    }
  };

  const handleCardClick = (card: Card) => {
    // Check if this is a deck card or search result card
    const isDeckCard = deckCards.some(deckCard => deckCard.card_url === card.card_url);
    
    if (isDeckCard) {
      // For deck cards, find index in deckCards
      const index = deckCards.findIndex(c => c.card_url === card.card_url);
      setSelectedCard(card);
      setSelectedCardIndex(index >= 0 ? index : 0);
      setIsModalOpen(true);
    } else {
      // For search result cards, find index in searchResults
      const index = searchResults.findIndex(c => c.card_url === card.card_url);
      setSelectedCard(card);
      setSelectedCardIndex(index >= 0 ? index : 0);
      setIsModalOpen(true);
    }
  };

  const handleNavigate = (index: number) => {
    // Check if we're currently viewing a deck card or search result
    const isDeckCard = selectedCard && deckCards.some(deckCard => deckCard.card_url === selectedCard.card_url);
    
    if (isDeckCard && deckCards[index]) {
      setSelectedCard(deckCards[index]);
      setSelectedCardIndex(index);
    } else if (searchResults[index]) {
      setSelectedCard(searchResults[index]);
      setSelectedCardIndex(index);
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
    setIsModalOpen(false);
  };

  const handleQuantityChange = useCallback((card: Card, change: number) => {
    if (!card.card_url) return; // Skip if no card_url
    
    console.log('handleQuantityChange - card data:', {
      name: card.name,
      group_abbreviation: card.group_abbreviation,
      group_name: card.group_name,
      card_url: card.card_url
    });

    // Use startTransition to batch the state update and prevent re-render storms
    startTransition(() => {
      setCurrentDeck(prevDeck => {
        if (!prevDeck) return null;

        const existingCard = prevDeck.cards.find(c => c.card_url === card.card_url);
        const currentQuantity = existingCard?.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity + change);

        if (newQuantity === 0) {
          // Remove card from deck
          const updatedCards = prevDeck.cards.filter(c => c.card_url !== card.card_url);
          const updatedDeck: Deck = {
            ...prevDeck,
            cards: updatedCards,
            updatedAt: new Date()
          };
          dataManager.updateDeck(updatedDeck);
          return updatedDeck;
        } else {
          // Update or add card
          const updatedCards = existingCard
            ? prevDeck.cards.map(c => 
                c.card_url === card.card_url 
                  ? { ...c, quantity: newQuantity }
                  : c
              )
            : [...prevDeck.cards, { 
                card_url: card.card_url!, 
                quantity: newQuantity,
                name: card.name,
                image_url: card.image_url,
                price: card.price,
                // Store all card attributes for complete data
                id: card.id,
                product_id: card.product_id,
                clean_name: card.clean_name,
                game: card.game,
                category_id: card.category_id,
                group_id: card.group_id,
                group_name: card.group_name,
                group_abbreviation: card.group_abbreviation,
                image_count: card.image_count,
                is_presale: card.is_presale,
                released_on: card.released_on,
                presale_note: card.presale_note,
                modified_on: card.modified_on,
                low_price: card.low_price,
                mid_price: card.mid_price,
                high_price: card.high_price,
                created_at: card.created_at,
                // Dynamic attributes
                SeriesName: card.SeriesName,
                Rarity: card.Rarity,
                Number: card.Number,
                CardType: card.CardType,
                RequiredEnergy: card.RequiredEnergy,
                ActionPointCost: card.ActionPointCost,
                ActivationEnergy: card.ActivationEnergy,
                Description: card.Description,
                GeneratedEnergy: card.GeneratedEnergy,
                BattlePointBP: card.BattlePointBP,
                Trigger: card.Trigger,
                Affinities: card.Affinities
              } as CardReference];

          const updatedDeck: Deck = {
            ...prevDeck,
            cards: updatedCards,
            updatedAt: new Date()
          };
          console.log('Saving deck with card data:', {
            name: card.name,
            group_abbreviation: card.group_abbreviation,
            group_name: card.group_name,
            storedCard: updatedCards.find(c => c.card_url === card.card_url)
          });
          
          dataManager.updateDeck(updatedDeck);
          
          // Set default cover if no cover is set and we have cards
          if (!updatedDeck.cover && updatedCards.length > 0) {
            // Find the most expensive card in the updated deck
            let mostExpensiveCard: any = null;
            let highestPrice = 0;
            
            updatedCards.forEach(deckCard => {
              if (deckCard.price && deckCard.price > highestPrice) {
                highestPrice = deckCard.price;
                mostExpensiveCard = deckCard;
              }
            });
            
            if (mostExpensiveCard && mostExpensiveCard.image_url) {
              updatedDeck.cover = mostExpensiveCard.image_url;
              dataManager.updateDeck(updatedDeck);
            }
          }
          
          return updatedDeck;
        }
      });
    });
  }, []);

  const updateDeckCardsDisplay = async () => {
    if (!currentDeck) return;

    console.log('Loading deck data:', {
      deckId: currentDeck.id,
      cardCount: currentDeck.cards.length,
      firstCard: currentDeck.cards[0] ? {
        name: currentDeck.cards[0].name,
        group_abbreviation: currentDeck.cards[0].group_abbreviation,
        group_name: currentDeck.cards[0].group_name
      } : null
    });

    const deckCardData: Card[] = [];
    
    for (const deckItem of currentDeck.cards) {
      // Find the card in search results first
      const searchCard = searchResults.find(card => card.card_url === deckItem.card_url);
      if (searchCard) {
        deckCardData.push({ ...searchCard, quantity: deckItem.quantity });
      } else {
        // Use stored card data from deck (this is the primary solution, not a fallback)
        // The deck stores complete card data when cards are added
        // Check if we have complete data (has at least some key fields)
        const hasCompleteData = deckItem.name && deckItem.image_url && 
          (deckItem.SeriesName || deckItem.Rarity || deckItem.CardType || deckItem.Number);
        
        if (hasCompleteData) {
          const storedCard: Card = {
            id: deckItem.id || 0,
            product_id: deckItem.product_id || 0,
            name: deckItem.name ?? '',
            clean_name: deckItem.clean_name || null,
            image_url: deckItem.image_url ?? null,
            card_url: deckItem.card_url,
            game: deckItem.game ?? '',
            category_id: deckItem.category_id || 0,
            group_id: deckItem.group_id || 0,
            group_name: deckItem.group_name,
            group_abbreviation: deckItem.group_abbreviation || undefined,
            image_count: deckItem.image_count || 0,
            is_presale: deckItem.is_presale || false,
            released_on: deckItem.released_on || '',
            presale_note: deckItem.presale_note || '',
            modified_on: deckItem.modified_on || '',
            price: deckItem.price || 0,
            low_price: deckItem.low_price || null,
            mid_price: deckItem.mid_price || null,
            high_price: deckItem.high_price || null,
            created_at: deckItem.created_at || '',
            // Dynamic attributes
            SeriesName: deckItem.SeriesName || undefined,
            Rarity: deckItem.Rarity || undefined,
            Number: deckItem.Number || undefined,
            CardType: deckItem.CardType || undefined,
            RequiredEnergy: deckItem.RequiredEnergy || undefined,
            ActionPointCost: deckItem.ActionPointCost || undefined,
            ActivationEnergy: deckItem.ActivationEnergy || undefined,
            Description: deckItem.Description || undefined,
            GeneratedEnergy: deckItem.GeneratedEnergy || undefined,
            BattlePointBP: deckItem.BattlePointBP || undefined,
            Trigger: deckItem.Trigger || undefined,
            Affinities: deckItem.Affinities || undefined,
          };
          deckCardData.push({ ...storedCard, quantity: deckItem.quantity });
        } else {
          // Fallback: try to fetch complete card data from API
          try {
            const response = await fetch(`/api/card-by-url?url=${encodeURIComponent(deckItem.card_url)}`);
            if (response.ok) {
              const completeCard = await response.json();
              deckCardData.push({ ...completeCard, quantity: deckItem.quantity });
              
              // Update the stored deck data with complete information for future loads
              if (currentDeck) {
                const updatedCards = currentDeck.cards.map(card => 
                  card.card_url === deckItem.card_url 
                    ? { ...card, ...completeCard, quantity: deckItem.quantity }
                    : card
                );
                const updatedDeck = { ...currentDeck, cards: updatedCards };
                dataManager.updateDeck(updatedDeck);
              }
            } else {
              console.error('Failed to fetch complete card data for:', deckItem.card_url);
            }
          } catch (error) {
            console.error('Error fetching card data:', error);
          }
        }
      }
    }
    
    setDeckCards(deckCardData);
  };

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      // Build search parameters
      const params = new URLSearchParams();
      
      // Add game parameter directly
      params.append('game', 'Union Arena');
      
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      
      if (selectedSeries) {
        params.append('anime', selectedSeries); // API uses 'anime' parameter for series
      }
      
      if (selectedColor) {
        params.append('color', selectedColor);
      }
      
      if (sortBy) {
        params.append('sort', sortBy);
      }

      const searchUrl = `/api/search?${params.toString()}`;
      console.log('Search URL:', searchUrl);
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      console.log('Search response:', data);
      
      if (data.cards) {
        setSearchResults(data.cards);
        console.log('Found cards:', data.cards.length);
      } else {
        setSearchResults([]);
        console.log('No cards found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDeckName = () => {
    if (!currentDeck) return;
    
    const updatedDeck = {
      ...currentDeck,
      name: deckName,
      updatedAt: new Date()
    };
    
    setCurrentDeck(updatedDeck);
    dataManager.updateDeck(updatedDeck);
    setOriginalDeckName(deckName);
    setHasUnsavedNameChanges(false);
  };

  const handleDeckNameChange = (newName: string) => {
    setDeckName(newName);
    setHasUnsavedNameChanges(newName !== originalDeckName);
  };

  const moveCardsFromHand = () => {
    const hand = dataManager.getHand();
    if (hand.length === 0) {
      setMoveMessage('No cards in hand to move');
      setShowGoToSearch(true);
      setShowMoveConfirmModal(true);
      return;
    }

    if (!currentDeck) {
      createNewDeck();
    }

    // Add all hand cards to current deck
    const updatedCards = [...(currentDeck?.cards || [])];
    
    hand.forEach(handItem => {
      if (!handItem.card_url) return; // Skip items without card_url
      const existingCard = updatedCards.find(c => c.card_url === handItem.card_url);
      if (existingCard) {
        existingCard.quantity += handItem.quantity;
      } else {
        updatedCards.push({ card_url: handItem.card_url, quantity: handItem.quantity });
      }
    });

    const updatedDeck = {
      ...currentDeck!,
      cards: updatedCards,
    };

    setCurrentDeck(updatedDeck);
    dataManager.updateDeck(updatedDeck);
    updateDeckCardsDisplay();

    setMoveMessage(`Moved ${hand.length} card types from hand to deck!`);
    setShowMoveConfirmModal(true);
  };

  const handlePrintToProxy = () => {
    if (!currentDeck) return;
    
    // Add all deck cards to print list
    const printList = dataManager.getPrintList();
    const updatedPrintList = [...printList];
    
    currentDeck.cards.forEach(deckCard => {
      const existingItem = updatedPrintList.find(item => item.card_url === deckCard.card_url);
      if (existingItem) {
        existingItem.quantity += deckCard.quantity;
      } else {
        updatedPrintList.push({
          card_url: deckCard.card_url,
          quantity: deckCard.quantity,
          name: deckCard.name,
          image_url: deckCard.image_url,
          price: deckCard.price
        });
      }
    });
    
    dataManager.setPrintList(updatedPrintList);
    
    // Dispatch event to update proxy printer page
    window.dispatchEvent(new CustomEvent('printListUpdated'));
    
    setShowPrintConfirmModal(false);
    
    // Navigate to proxy printer
    router.push('/proxy-printer');
  };

  const setDefaultCover = () => {
    if (!currentDeck || currentDeck.cards.length === 0) return;
    
    // Find the most expensive card in the deck
    let mostExpensiveCard: any = null;
    let highestPrice = 0;
    
    currentDeck.cards.forEach(deckCard => {
      if (deckCard.price && deckCard.price > highestPrice) {
        highestPrice = deckCard.price;
        mostExpensiveCard = deckCard;
      }
    });
    
    if (mostExpensiveCard && mostExpensiveCard.image_url) {
      const updatedDeck = {
        ...currentDeck,
        cover: mostExpensiveCard.image_url
      };
      setCurrentDeck(updatedDeck);
      dataManager.updateDeck(updatedDeck);
    }
  };

  const handleCoverSelection = (cardImageUrl: string) => {
    if (!currentDeck) return;
    
    const updatedDeck = {
      ...currentDeck,
      cover: cardImageUrl
    };
    setCurrentDeck(updatedDeck);
    dataManager.updateDeck(updatedDeck);
    setShowCoverSelectionModal(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Hide background switcher on this page */}
      <style jsx global>{`
        .fixed.top-20.right-4 {
          display: none !important;
        }
      `}</style>
        {/* Top Header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    dataManager.clearCurrentDeck();
                    router.push('/deckbuilder');
                  }}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                  title="Back to Deck List"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Deck Builder
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => handleDeckNameChange(e.target.value)}
                  className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter deck name..."
                />
                {hasUnsavedNameChanges && (
                  <button
                    onClick={saveDeckName}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Save
                  </button>
                )}
                <button
                  onClick={() => setShowCoverModal(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Cover
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={moveCardsFromHand}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Add from Hand
              </button>
              
              <button
                onClick={() => setShowPrintConfirmModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Proxy Printer
              </button>
              
              <button
                onClick={() => openTCGPlayerDeck(deckCards)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center"
                disabled={deckCards.length === 0}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                Buy Deck
              </button>
              
              <button
                onClick={() => setShowDecklistModal(true)}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Decklist to Image
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Side - Search Cards */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Cards
              </h2>
              
              {/* Search Form */}
              <div className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search for cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSeries('');
                      setSelectedColor('');
                      setSortBy('');
                      handleSearch();
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Load All
                  </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Series Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Series</label>
                    <select
                      value={selectedSeries}
                      onChange={(e) => setSelectedSeries(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Series</option>
                      {seriesOptions.map((series) => (
                        <option key={series} value={series} className="bg-gray-800">
                          {series}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Color Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Color</label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Colors</option>
                      {colorOptions.map((color) => (
                        <option key={color} value={color} className="bg-gray-800">
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Name (A-Z)</option>
                      <option value="price_desc" className="bg-gray-800">Price (High to Low)</option>
                      <option value="price_asc" className="bg-gray-800">Price (Low to High)</option>
                      <option value="rarity_desc" className="bg-gray-800">Rarity (High to Low)</option>
                      <option value="rarity_asc" className="bg-gray-800">Rarity (Low to High)</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedSeries || selectedColor || sortBy) && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedSeries('');
                        setSelectedColor('');
                        setSortBy('');
                      }}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <SearchGrid
                  cards={searchResultsWithQuantities}
                  onCardClick={handleCardClick}
                  showPrices={true}
                  showRarity={true}
                  customGridClasses="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  onAddToDeck={(card) => handleQuantityChange(card, 1)}
                  onQuantityChange={handleQuantityChange}
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-white/70">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>No cards found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Current Deck */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Current Deck
                {currentDeck && (
                  <span className="ml-2 text-sm font-normal text-white/70">
                    ({currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0)} cards)
                  </span>
                )}
              </h2>
              
              {/* Deck Validation */}
              <DeckValidation cards={deckCards} />
            </div>

            {/* Deck Cards */}
            <div className="flex-1 overflow-auto">
              {deckCards.length > 0 ? (
                <DeckGrid
                  cards={deckCards}
                  onCardClick={handleCardClick}
                  onQuantityChange={handleQuantityChange}
                  showPrices={true}
                  showRarity={true}
                  customGridClasses="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5"
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-white/70">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>No cards in deck yet</p>
                    <p className="text-sm">Search and add cards to build your deck</p>
                  </div>
                </div>
              )}
        </div>
      </div>
        </div>

        {/* Card Detail Modal */}
        <CardDetailModal
          card={selectedCard}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          allCards={selectedCard && deckCards.some(deckCard => deckCard.card_url === selectedCard.card_url) ? deckCards : searchResults}
          currentIndex={selectedCardIndex}
          onNavigate={handleNavigate}
          hasNextPage={false}
          hasPrevPage={false}
        />

        {/* Move Confirmation Modal */}
        {showMoveConfirmModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Move from Hand</h3>
                <p className="text-gray-300 mb-6">{moveMessage}</p>
                <div className="space-y-3">
                  {showGoToSearch && (
                    <button
                      onClick={() => {
                        setShowMoveConfirmModal(false);
                        setShowGoToSearch(false);
                        router.push('/search');
                      }}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search for Cards
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMoveConfirmModal(false);
                      setShowGoToSearch(false);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Confirmation Modal */}
        {showPrintConfirmModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-cyan-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Print to Proxy</h3>
                <p className="text-gray-300 mb-6">Adding all cards to Proxy Printer?</p>
                <div className="space-y-3">
                  <button
                    onClick={handlePrintToProxy}
                    className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Yes, Print
                  </button>
                  <button
                    onClick={() => setShowPrintConfirmModal(false)}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Cover Modal */}
        {showCoverModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">Change Deck Cover</h3>
                  <button
                    onClick={() => setShowCoverModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Current Cover Preview */}
                {currentDeck?.cover && (
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm mb-2">Current Cover:</p>
                    <div className="flex justify-center">
                      <img
                        src={currentDeck.cover}
                        alt="Current deck cover"
                        className="w-auto h-auto max-w-full rounded-lg border border-white/20"
                      />
                    </div>
                  </div>
                )}
                
                <p className="text-gray-300 mb-6">Choose a card from your deck to use as the cover image.</p>
                <button
                  onClick={() => {
                    setShowCoverModal(false);
                    setShowCoverSelectionModal(true);
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  Change Card
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decklist to Image Modal */}
        {showDecklistModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-pink-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Decklist to Image</h3>
                <p className="text-gray-300 mb-6">This feature is not implemented yet.</p>
                <button
                  onClick={() => setShowDecklistModal(false)}
                  className="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cover Selection Modal */}
        {showCoverSelectionModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="text-center flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Choose Deck Cover</h3>
                  <p className="text-gray-300">Select a card from your deck to use as the cover image</p>
                </div>
                <button
                  onClick={() => setShowCoverSelectionModal(false)}
                  className="text-gray-400 hover:text-white transition-colors ml-4"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                {currentDeck?.cards.map((deckCard, index) => {
                  const card = deckCards.find(c => c.card_url === deckCard.card_url);
                  if (!card || !card.image_url) return null;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleCoverSelection(card.image_url!)}
                      className="relative group"
                    >
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-full h-auto rounded-lg border-2 border-transparent group-hover:border-indigo-400 transition-colors"
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
                  onClick={() => setShowCoverSelectionModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
