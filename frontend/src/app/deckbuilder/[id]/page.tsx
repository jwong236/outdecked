'use client';

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { SearchGrid } from '@/components/features/search/SearchGrid';
import { GroupedDeckGrid } from '@/components/features/deckbuilder/GroupedDeckGrid';
import { CardDetailModal } from '@/components/features/search/CardDetailModal';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { CompactFilterSection } from '@/components/features/deckbuilder/CompactFilterSection';
import { AdvancedFilters } from '@/components/features/search/AdvancedFilters';
import { DecklistModal } from '@/components/features/deckbuilder/DecklistModal';
import { dataManager, Deck, HandItem, CardReference } from '@/lib/dataManager';
import { Card } from '@/types/card';
import { DeckValidation } from '@/lib/deckValidation';
import { openTCGPlayerDeck } from '@/lib/tcgplayerUtils';
import { useSearchStore, getCurrentSeries, getCurrentColor, getCurrentCardType } from '@/stores/searchStore';
import { useSearchCards, useSeriesValues, useColorValues, useFilterFields } from '@/lib/hooks';
import { useAuth } from '@/contexts/AuthContext';

export default function DeckBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const deckId = params.id as string;
  
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deckName, setDeckName] = useState('New Deck');
  const [originalDeckName, setOriginalDeckName] = useState('New Deck');
  const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);
  const [deckSortBy, setDeckSortBy] = useState('required_energy');
  const [showMoveConfirmModal, setShowMoveConfirmModal] = useState(false);
  const [moveMessage, setMoveMessage] = useState('');
  const [showGoToSearch, setShowGoToSearch] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showDecklistModal, setShowDecklistModal] = useState(false);
  const [showCoverSelectionModal, setShowCoverSelectionModal] = useState(false);
  const [showAdvancedFiltersModal, setShowAdvancedFiltersModal] = useState(false);
  const [showClearDeckModal, setShowClearDeckModal] = useState(false);

  // Search store for unified search functionality
  const {
    filters,
    setQuery,
    setSeries,
    setColor,
    setCardType,
    setSort,
    addAndFilter,
    addOrFilter,
    addNotFilter,
    removeAndFilter,
    removeOrFilter,
    removeNotFilter,
    clearAllFilters,
  } = useSearchStore();

  // Search hooks
  const { data: searchData, isLoading: searchLoading } = useSearchCards(filters);
  const { data: seriesData } = useSeriesValues();
  const { data: colorData } = useColorValues();
  const { data: filterFields } = useFilterFields();

  // Create options for dropdowns
  const seriesOptions = useMemo(() => [
    { value: '', label: 'All Series' },
    ...(seriesData || []).map(series => ({ value: series, label: series }))
  ], [seriesData]);

  const colorOptions = useMemo(() => [
    { value: '', label: 'All Colors' },
    ...(colorData || []).map(color => ({ value: color, label: color }))
  ], [colorData]);

  const cardTypeOptions = useMemo(() => [
    { value: '', label: 'All Types' },
    { value: 'Character', label: 'Character' },
    { value: 'Event', label: 'Event' },
    { value: 'Action Point', label: 'Action Point' },
    { value: 'Site', label: 'Site' },
  ], []);

  const sortOptions = useMemo(() => [
    { value: '', label: 'Name (A-Z)' },
    { value: 'price_desc', label: 'Price (High to Low)' },
    { value: 'price_asc', label: 'Price (Low to High)' },
    { value: 'rarity_desc', label: 'Rarity (High to Low)' },
    { value: 'rarity_asc', label: 'Rarity (Low to High)' },
    { value: 'required_energy_asc', label: 'Required Energy (Low to High)' },
    { value: 'required_energy_desc', label: 'Required Energy (High to Low)' },
  ], []);

  // Handler functions for filters
  const handleRemoveFilter = useCallback((filterType: string, value?: string) => {
    if (filterType === 'and') {
      // Find the index of the filter with matching displayText
      const index = filters.and_filters.findIndex(f => f.displayText === value);
      if (index !== -1) {
        removeAndFilter(index);
      }
    } else if (filterType === 'or') {
      // Find the index of the filter with matching displayText
      const index = filters.or_filters.findIndex(f => f.displayText === value);
      if (index !== -1) {
        removeOrFilter(index);
      }
    } else if (filterType === 'not') {
      // Find the index of the filter with matching displayText
      const index = filters.not_filters.findIndex(f => f.displayText === value);
      if (index !== -1) {
        removeNotFilter(index);
      }
    } else if (filterType === 'query') {
      setQuery('');
    } else if (filterType === 'series') {
      setSeries('');
    } else if (filterType === 'color') {
      setColor('');
    } else if (filterType === 'cardType') {
      setCardType('');
    }
  }, [removeAndFilter, removeOrFilter, removeNotFilter, setQuery, setSeries, setColor, setCardType, filters]);

  const handleRemoveMultipleFilters = useCallback((filterType: string, values: string[]) => {
    if (filterType === 'not') {
      // For base rarity filters, we need to find and remove them by their actual values
      const baseRarityValues = [
        'Common 1-Star',
        'Rare 1-Star', 
        'Rare 2-Star',
        'Super Rare 1-Star',
        'Super Rare 2-Star',
        'Super Rare 3-Star',
        'Uncommon 1-Star',
        'Union Rare'
      ];
      
      // Find indices of base rarity filters and remove them in reverse order
      const indicesToRemove: number[] = [];
      filters.not_filters.forEach((filter, index) => {
        if (filter.field === 'Rarity' && baseRarityValues.includes(filter.value)) {
          indicesToRemove.push(index);
        }
      });
      
      // Remove in reverse order to avoid index shifting
      indicesToRemove.reverse().forEach(index => {
        removeNotFilter(index);
      });
    }
  }, [removeNotFilter, filters]);

  const hasActiveAdvancedFilters = filters.and_filters.length > 0 || filters.or_filters.length > 0 || filters.not_filters.length > 0;

  // Create memoized search results with correct quantities from deck
  const searchResultsWithQuantities = useMemo(() => {
    const cards = searchData?.cards || [];
    return cards.map(card => {
      // Find quantity directly from currentDeck to avoid intermediate memoization
      const deckQuantity = currentDeck?.cards.find(c => c.card_url === card.card_url)?.quantity || 0;
      return {
        ...card,
        quantity: deckQuantity
      };
    });
  }, [searchData?.cards, currentDeck?.cards]);

  // Prepare deck cards for PDF generation
  const deckCardsForPdf = useMemo(() => {
    if (!currentDeck || !deckCards.length) return [];
    
    return currentDeck.cards.map(deckCard => {
      const cardData = deckCards.find(c => c.card_url === deckCard.card_url);
      if (!cardData) return null;
      
      return {
        name: cardData.name,
        image_url: cardData.image_url || '',
        quantity: deckCard.quantity,
        CardType: cardData.CardType || 'Unknown',
        RequiredEnergy: cardData.RequiredEnergy || '0'
      };
    }).filter(Boolean);
  }, [currentDeck, deckCards]);

  // Initialize series from URL parameters (only if deck doesn't have defaultSeries)
  useEffect(() => {
    const seriesFromUrl = searchParams.get('series');
    if (seriesFromUrl && (!currentDeck || !currentDeck.defaultSeries)) {
      setSeries(seriesFromUrl);
    }
  }, [searchParams, setSeries, currentDeck]);

  // Load deck or create new one
  useEffect(() => {
    // Check authentication first
    if (!authLoading && !user) {
      setShowSignInModal(true);
      return;
    }
    
    // Only proceed if user is authenticated
    if (!user) {
      return;
    }
    
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
    // Load some initial cards
    handleSearch();
  }, [deckId, authLoading, user, router]);

  // Auto-search when filters change
  useEffect(() => {
    if (user && (filters.series || filters.color || filters.cardType || filters.sort)) {
      handleSearch();
    }
  }, [filters.series, filters.color, filters.cardType, filters.sort, user]);

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
      
      // Set series from deck's defaultSeries if available
      if (deck.defaultSeries) {
        setSeries(deck.defaultSeries);
      }
      
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

  // Handle series change and save to deck
  const handleSeriesChange = (newSeries: string) => {
    setSeries(newSeries);
    
    // Update the deck's defaultSeries
    if (currentDeck) {
      const updatedDeck = { ...currentDeck, defaultSeries: newSeries };
      dataManager.updateDeck(updatedDeck);
      setCurrentDeck(updatedDeck);
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
      const searchCards = searchData?.cards || [];
      const index = searchCards.findIndex(c => c.card_url === card.card_url);
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
    } else if (searchCards[index]) {
      setSelectedCard(searchCards[index]);
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
      const searchCards = searchData?.cards || [];
      const searchCard = searchCards.find(card => card.card_url === deckItem.card_url);
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

  const handleSearch = () => {
    // Search is now handled automatically by the search store and useSearchCards hook
    // This function is kept for compatibility with the CompactFilterSection
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

  // Show loading state while checking authentication
  if (authLoading) {
    return null; // Don't show anything while checking auth
  }


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
                onClick={() => setShowDecklistModal(true)}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Decklist to Image
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
                onClick={() => setShowPrintConfirmModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Proxy Printer
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
              
              {/* Compact Filter Section */}
              <CompactFilterSection
                query={filters.query || ''}
                onQueryChange={setQuery}
                series={getCurrentSeries()}
                onSeriesChange={handleSeriesChange}
                color={getCurrentColor()}
                onColorChange={setColor}
                cardType={getCurrentCardType()}
                onCardTypeChange={setCardType}
                sort={filters.sort || ''}
                onSortChange={setSort}
                seriesOptions={seriesOptions}
                colorOptions={colorOptions}
                cardTypeOptions={cardTypeOptions}
                sortOptions={sortOptions}
                onSearch={handleSearch}
                onAdvancedFilters={() => setShowAdvancedFiltersModal(true)}
                hasActiveFilters={hasActiveAdvancedFilters}
                onAddAndFilter={addAndFilter}
                onAddNotFilter={addNotFilter}
                currentFilters={filters}
                onRemoveFilter={handleRemoveFilter}
                onRemoveMultipleFilters={handleRemoveMultipleFilters}
                onClearAllFilters={clearAllFilters}
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-auto">
              {searchLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : searchResultsWithQuantities.length > 0 ? (
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
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
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
                
                {/* Deck Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-white">Sort by:</label>
                    <select
                      value={deckSortBy}
                      onChange={(e) => setDeckSortBy(e.target.value)}
                      className="px-3 py-1 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="name" className="bg-gray-800">Name (A-Z)</option>
                      <option value="required_energy" className="bg-gray-800">Required Energy</option>
                      <option value="rarity" className="bg-gray-800">Rarity</option>
                    </select>
                  </div>
                  
                  {/* Clear Deck Button */}
                  <button
                    onClick={() => setShowClearDeckModal(true)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    disabled={!currentDeck || currentDeck.cards.length === 0}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Deck
                  </button>
                </div>
              </div>
              
              {/* Deck Validation */}
              <DeckValidation cards={deckCards} />
            </div>

            {/* Deck Cards */}
            <div className="flex-1 overflow-auto">
              {deckCards.length > 0 ? (
                <GroupedDeckGrid
                  cards={deckCards}
                  onCardClick={handleCardClick}
                  onQuantityChange={handleQuantityChange}
                  sortBy={deckSortBy}
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
          allCards={selectedCard && deckCards.some(deckCard => deckCard.card_url === selectedCard.card_url) ? deckCards : (searchData?.cards || [])}
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

        {/* Decklist Modal */}
        <DecklistModal
          isOpen={showDecklistModal}
          onClose={() => setShowDecklistModal(false)}
          deckName={deckName}
          cards={deckCardsForPdf}
        />

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

        {/* Clear Deck Modal */}
        {showClearDeckModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 p-6 max-w-md mx-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-red-600/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Clear Deck</h3>
                <p className="text-gray-300 mb-6">Are you sure you want to remove all cards from this deck? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowClearDeckModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (currentDeck) {
                        const clearedDeck = { ...currentDeck, cards: [], updatedAt: new Date() };
                        setCurrentDeck(clearedDeck);
                        dataManager.updateDeck(clearedDeck);
                        setDeckCards([]);
                        setShowClearDeckModal(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Clear Deck
                  </button>
                </div>
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

      {/* Advanced Filters Modal */}
      {showAdvancedFiltersModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg w-[60vw] max-w-none max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Settings</h2>
                <button
                  onClick={() => setShowAdvancedFiltersModal(false)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <AdvancedFilters
                andFilters={filters.and_filters}
                orFilters={filters.or_filters}
                notFilters={filters.not_filters}
                onAddAndFilter={addAndFilter}
                onAddOrFilter={addOrFilter}
                onAddNotFilter={addNotFilter}
                onRemoveAndFilter={(index) => removeAndFilter(filters.and_filters[index]?.value || '')}
                onRemoveOrFilter={(index) => removeOrFilter(filters.or_filters[index]?.value || '')}
                onRemoveNotFilter={(index) => removeNotFilter(filters.not_filters[index]?.value || '')}
                availableFields={filterFields || []}
                game="Union Arena"
                series={getCurrentSeries()}
                onSeriesChange={handleSeriesChange}
                color={getCurrentColor()}
                onColorChange={setColor}
                cardType={getCurrentCardType()}
                onCardTypeChange={setCardType}
                sort={filters.sort || ''}
                onSortChange={setSort}
                seriesOptions={seriesOptions}
                colorOptions={colorOptions}
                cardTypeOptions={cardTypeOptions}
                sortOptions={sortOptions}
                currentFilters={filters}
                deckVisibility={currentDeck?.visibility || 'private'}
                onDeckVisibilityChange={(visibility) => {
                  if (currentDeck) {
                    const updatedDeck = { ...currentDeck, visibility: visibility as 'private' | 'public' | 'unlisted', updatedAt: new Date() };
                    setCurrentDeck(updatedDeck);
                    dataManager.updateDeck(updatedDeck);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
