'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Deck, Card, ExpandedCard, CardCache } from '@/types/card';
import { useSessionStore } from '@/stores/sessionStore';
import { fetchDeck } from '@/lib/deckUtils';
import { transformRawCardsToCards } from '@/lib/cardTransform';
import { getProductImageCard } from '@/lib/imageUtils';

export function useDeckOperations(searchCache: CardCache, setSearchCache: (updater: (prev: CardCache) => CardCache) => void, sortBy: string = 'name') {
  const router = useRouter();
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const { setSeries } = useSessionStore();
  
  // Get current deck from sessionStore
  const currentDeck = deckBuilder.currentDeck;
  
  // Helper function to check if currentDeck is a valid deck
  const isValidDeck = (deck: any): deck is Deck => {
    return deck && typeof deck === 'object' && 'id' in deck;
  };
  
  // Local state for deck name management
  const [originalDeckName, setOriginalDeckName] = useState((currentDeck as any)?.name || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Track if we're already fetching to prevent infinite loops
  const fetchingRef = useRef(false);

  // Update originalDeckName when currentDeck changes
  useEffect(() => {
    if ((currentDeck as any)?.name) {
      setOriginalDeckName((currentDeck as any).name);
    }
  }, [(currentDeck as any)?.name]);

  // First effect: Create expandedCards from current CardRef[] + searchCache (READ-ONLY)
  const expandedCards = useMemo(() => {
    if (!isValidDeck(currentDeck) || !currentDeck.cards || currentDeck.cards.length === 0) {
      return [];
    }

    console.log('🃏 useDeckOperations: Creating expanded cards array');
    console.log('🃏 useDeckOperations: deck cards:', currentDeck.cards);
    console.log('🃏 useDeckOperations: searchCache keys:', Object.keys(searchCache));

    // Filter out invalid cards
    const validCards = currentDeck.cards.filter(card => 
      card && typeof card === 'object' && card.card_id && card.quantity
    );

    if (validCards.length === 0) {
      return [];
    }

    // Create ExpandedCard[] array
    const cards = validCards.map(deckCard => {
      const fullCardData = searchCache[deckCard.card_id];
      
      if (fullCardData) {
        return {
          ...fullCardData,
          quantity: deckCard.quantity
        } as ExpandedCard;
      } else {
        // Fallback for missing cache data
        return {
          id: deckCard.card_id,
          product_id: deckCard.card_id,
          quantity: deckCard.quantity,
          name: `Card ${deckCard.card_id}`,
          clean_name: null,
          card_url: '',
          game: 'Union Arena',
          category_id: 0,
          group_id: 0,
          image_count: 0,
          is_presale: false,
          released_on: '',
          presale_note: '',
          modified_on: '',
          price: null,
          low_price: null,
          mid_price: null,
          high_price: null,
          created_at: '',
          attributes: [],
        } as ExpandedCard;
      }
    }).filter(Boolean);

    // Apply the same sorting and grouping logic as GroupedDeckGrid
    // Group cards by CardType
    const groups: Record<string, ExpandedCard[]> = {};
    
    cards.forEach(card => {
      const cardType = card.attributes?.find(attr => attr.name === 'CardType')?.value || 'Unknown';
      if (!groups[cardType]) {
        groups[cardType] = [];
      }
      groups[cardType].push(card);
    });
    
    // Sort cards within each group based on sortBy parameter
    Object.keys(groups).forEach(cardType => {
      groups[cardType].sort((a, b) => {
        switch (sortBy) {
          case 'required_energy_asc':
            // Sort by RequiredEnergy (ascending)
            const energyA = parseInt(a.attributes?.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            const energyB = parseInt(b.attributes?.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            return energyA - energyB;
          case 'required_energy_desc':
            // Sort by RequiredEnergy (descending)
            const energyA_desc = parseInt(a.attributes?.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            const energyB_desc = parseInt(b.attributes?.find(attr => attr.name === 'RequiredEnergy')?.value || '0') || 0;
            return energyB_desc - energyA_desc;
          case 'rarity_asc':
            // Sort by rarity (ascending - lower rarity first)
            const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'];
            const rarityA_asc = rarityOrder.indexOf(a.attributes?.find(attr => attr.name === 'Rarity')?.value || 'Common');
            const rarityB_asc = rarityOrder.indexOf(b.attributes?.find(attr => attr.name === 'Rarity')?.value || 'Common');
            return rarityA_asc - rarityB_asc;
          case 'rarity_desc':
            // Sort by rarity (descending - higher rarity first)
            const rarityOrder_desc = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare'];
            const rarityA_desc = rarityOrder_desc.indexOf(a.attributes?.find(attr => attr.name === 'Rarity')?.value || 'Common');
            const rarityB_desc = rarityOrder_desc.indexOf(b.attributes?.find(attr => attr.name === 'Rarity')?.value || 'Common');
            return rarityB_desc - rarityA_desc;
          case 'name_desc':
            // Sort by name (descending)
            return b.name.localeCompare(a.name);
          default:
            // Sort by name (ascending)
            return a.name.localeCompare(b.name);
        }
      });
    });
    
    // Flatten back to array in the same order as GroupedDeckGrid displays
    const cardTypeOrder = ['Character', 'Event', 'Action Point', 'Site'];
    const sortedCards: ExpandedCard[] = [];
    
    cardTypeOrder.forEach(cardType => {
      if (groups[cardType]) {
        sortedCards.push(...groups[cardType]);
      }
    });

    console.log('🃏 useDeckOperations: Created and sorted expanded cards:', sortedCards.length);
    return sortedCards;
  }, [currentDeck?.cards, searchCache, sortBy]);

  // Second effect: Fetch missing card data when expandedCards has cards not in cache (WRITES TO CACHE)
  useEffect(() => {
    if (!expandedCards || expandedCards.length === 0) {
      return;
    }

    // Check which cards need to be fetched
    const missingCardIds = expandedCards
      .map(card => card.product_id)
      .filter(cardId => !searchCache[cardId]);

    // Fetch missing cards if any
    if (missingCardIds.length > 0 && !fetchingRef.current) {
      console.log('🃏 useDeckOperations: Missing cards, fetching:', missingCardIds);
      fetchingRef.current = true;
      
      // Fetch missing cards
      fetch('/api/cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: missingCardIds }),
      })
      .then(response => response.json())
      .then(rawCards => {
        const cleanCards = transformRawCardsToCards(rawCards);
        setSearchCache(prev => {
          const newCache = { ...prev };
          cleanCards.forEach(card => {
            newCache[card.product_id] = card;
          });
          return newCache;
        });
        fetchingRef.current = false;
      })
      .catch(error => {
        console.error('❌ useDeckOperations: Error fetching card data:', error);
        fetchingRef.current = false;
      });
    }
  }, [expandedCards, setSearchCache]);

  // Update currentDeck in sessionStore
  const createSession = useCallback((deck: Deck) => {
    console.log('🃏 Setting currentDeck in sessionStore:', deck);
    setCurrentDeck(deck);
    console.log('🃏 Updated currentDeck to:', deck.name);
  }, [setCurrentDeck]);

  // Create new deck (save to database via API)
  const createNewDeck = useCallback(async (series?: string) => {
    try {
      // Create deck via API with default filter settings
      const filterSettings = {
        preferences: {
          visibility: 'private',
          defaultSeries: series || '',
          defaultColorFilter: '',
          printTypes: ['Base'], // Only Base checked = "Basic Prints Only" toggle ON
          cardTypes: ['Action Point'], // Action Point excluded = "No Action Points" toggle ON
          rarities: ['Common', 'Uncommon', 'Rare', 'Super Rare'] // Only base rarities = "Base Rarity Only" toggle ON
        }
      };
      
      const response = await fetch('/api/user/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: 'New Deck',
          game: 'Union Arena',
          visibility: 'private',
          description: '',
          preferences: filterSettings.preferences
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create deck');
      }
      
      const data = await response.json();
      const newDeck = data.deck;
      
      // Navigate to the new deck URL to prevent re-creation
      router.replace(`/deckbuilder?deckId=${newDeck.id}`);
      
      // Create session (single source of truth) - series will be loaded by useSearchLogic
      createSession(newDeck);
    } catch (error) {
      console.error('Error creating new deck:', error);
      // Just show error, don't create fake session
    }
  }, [router, setSeries, createSession]);

  // Load deck
  const loadDeck = useCallback(async (id: string) => {
    try {
      console.log('🃏 Loading deck:', id);
      // Load specific deck from API using new utility
      const deck = await fetchDeck(id);
      console.log('🃏 Fetched deck:', deck);
      if (deck) {
        // Update currentDeck in sessionStore
        console.log('🃏 Updating currentDeck for deck:', deck.name);
        createSession(deck);
        console.log('🃏 currentDeck updated in sessionStore');
        
      } else {
        // Deck not found, redirect to deck list
        router.push('/deckbuilder');
      }
    } catch (error) {
      console.error('Error loading deck:', error);
      router.push('/deckbuilder');
    }
  }, [setSeries, createSession, router]);

  // Save deck name
  const saveDeckName = useCallback(async () => {
    if (!isValidDeck(currentDeck)) return;
    
    try {
      const response = await fetch(`/api/user/decks/${currentDeck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(currentDeck),
      });
      
      if (response.ok) {
        setOriginalDeckName(currentDeck.name);
        setHasUnsavedChanges(false);
      } else {
        console.error('Failed to save deck name');
      }
    } catch (error) {
      console.error('Error saving deck name:', error);
    }
  }, [currentDeck, setOriginalDeckName, isValidDeck]);

  // Handle deck name change
  const handleDeckNameChange = useCallback((newName: string) => {
    if (!isValidDeck(currentDeck)) return;
    
    const updatedDeck = {
      ...currentDeck,
      name: newName
    };
    
    setCurrentDeck(updatedDeck);
    setHasUnsavedChanges(newName !== originalDeckName);
  }, [currentDeck, setCurrentDeck, originalDeckName, isValidDeck]);

  // Handle quantity change
  const handleQuantityChange = useCallback((card: ExpandedCard, change: number) => {
    if (!isValidDeck(currentDeck)) return;
    
    console.log('🃏 handleQuantityChange called with:', card.name, 'current quantity:', card.quantity, 'change:', change);
    console.log('🃏 currentDeck.cards:', currentDeck.cards);
    console.log('🃏 card.product_id:', card.product_id);
    
    const updatedCards = [...(currentDeck.cards || [])];
    const existingCardIndex = updatedCards.findIndex(deckCard => deckCard.card_id === card.product_id);
    
    console.log('🃏 existingCardIndex:', existingCardIndex);
    console.log('🃏 existing card if found:', existingCardIndex >= 0 ? updatedCards[existingCardIndex] : 'not found');
    
    // Get the actual current quantity from the deck, not from the card prop
    const currentQuantity = existingCardIndex >= 0 ? updatedCards[existingCardIndex].quantity : 0;
    const newQuantity = currentQuantity + change;
    console.log('🃏 actual current quantity from deck:', currentQuantity, 'newQuantity will be:', newQuantity);
    
    if (newQuantity <= 0) {
      // Remove card from deck
      const filteredCards = updatedCards.filter(deckCard => deckCard.card_id !== card.product_id);
      const updatedDeck = { ...currentDeck, cards: filteredCards };
      setCurrentDeck(updatedDeck);
    } else {
      // Update card quantity in deck
      if (existingCardIndex >= 0) {
        updatedCards[existingCardIndex] = { ...updatedCards[existingCardIndex], quantity: newQuantity };
      } else {
        // Add new card to deck (session format only)
        updatedCards.push({
          card_id: card.product_id,
          quantity: newQuantity
        });
        
        // Ensure the card is in the search cache for deck display/validation
        console.log('🃏 useDeckOperations: Adding card to cache with product_id:', card.product_id, 'type:', typeof card.product_id);
        
        // Card should already be clean and transformed - cache directly
        setSearchCache(prev => ({
          ...prev,
          [card.product_id]: card
        }));
      }
      const updatedDeck = { ...currentDeck, cards: updatedCards };
      setCurrentDeck(updatedDeck);
    }
  }, [currentDeck, setCurrentDeck, isValidDeck]);

  // Save deck to database (call when user is done making changes)
  const saveDeck = useCallback(async (updateSession: boolean = true) => {
    if (!isValidDeck(currentDeck)) return;
    
    try {
      const response = await fetch(`/api/user/decks/${currentDeck.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(currentDeck),
      });
      
      if (response.ok) {
        console.log('Deck saved to database');
        
        // Clear session immediately after saving to database
        if (updateSession) {
          setCurrentDeck(null);
        }
      } else {
        console.error('Failed to save deck');
      }
    } catch (error) {
      console.error('Error saving deck:', error);
    }
  }, [currentDeck, setCurrentDeck, isValidDeck]);

  // Copy cards from hand to deck
  const moveCardsFromHand = useCallback(async () => {
    const { handCart } = useSessionStore.getState();
    const handItems = handCart.handItems;
    
    if (handItems.length === 0) {
      console.log('No cards in hand to copy');
      return;
    }

    if (!isValidDeck(currentDeck)) {
      console.log('No current deck to copy cards to');
      return;
    }

    // Get product IDs that need card data
    const productIds = handItems.map(handItem => handItem.card_id);
    
    // Check which cards are missing from searchCache
    const missingCardIds = productIds.filter(id => !searchCache || !searchCache[id]);
    
    // Fetch missing card data if needed
    if (missingCardIds.length > 0) {
      try {
        console.log('🃏 Fetching missing card data for hand items:', missingCardIds);
        const response = await fetch('/api/cards/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_ids: missingCardIds }),
        });
        
        if (response.ok) {
          const rawCards = await response.json();
          const cleanCards = transformRawCardsToCards(rawCards);
          setSearchCache(prev => {
            const newCache = { ...prev };
            cleanCards.forEach(card => {
              newCache[card.product_id] = card;
            });
            return newCache;
          });
          console.log('✅ Fetched card data for hand items');
        } else {
          console.error('❌ Failed to fetch card data for hand items');
        }
      } catch (error) {
        console.error('❌ Error fetching card data for hand items:', error);
      }
    }

    // Convert hand items to session format {card_id, quantity}
    const handCards = handItems.map(handItem => ({
      card_id: handItem.card_id,
      quantity: handItem.quantity
    }));

    // Merge with existing deck cards
    const existingCards = currentDeck.cards || [];
    const updatedCards = [...existingCards];
    
    handCards.forEach(handCard => {
      const existingIndex = updatedCards.findIndex(deckCard => deckCard.card_id === handCard.card_id);
      if (existingIndex >= 0) {
        // Add to existing quantity
        updatedCards[existingIndex].quantity += handCard.quantity;
      } else {
        // Add new card
        updatedCards.push(handCard);
      }
    });

    // Update the deck
    const updatedDeck = {
      ...currentDeck,
      cards: updatedCards
    };
    
    setCurrentDeck(updatedDeck);
    
    // Don't clear the hand - this is a copy operation
    console.log(`Copied ${handItems.length} card types from hand to deck!`);
  }, [currentDeck, setCurrentDeck, searchCache, setSearchCache]);

  // Print to proxy
  const handlePrintToProxy = useCallback(() => {
    console.log('🖨️ handlePrintToProxy called!');
    if (!isValidDeck(currentDeck)) {
      console.log('❌ No valid deck to print');
      return;
    }
    
    // Convert deck cards to print list items
    const printItems = currentDeck.cards.map(deckCard => ({
      card_id: deckCard.card_id,
      quantity: deckCard.quantity
    }));
    
    console.log('🖨️ Print items:', printItems);
    
    // Add to print list in sessionStore
    const { setPrintList } = useSessionStore.getState();
    setPrintList(printItems);
    
    console.log(`✅ Added ${printItems.length} card types to print list!`);
    
    // Dispatch event to update proxy printer page
    window.dispatchEvent(new CustomEvent('printListUpdated'));
    
    // Navigate to proxy printer
    router.push('/proxy-printer');
  }, [currentDeck, router]);

  // Set default cover
  const setDefaultCover = useCallback(async () => {
    if (!isValidDeck(currentDeck) || !currentDeck.cards || currentDeck.cards.length === 0) return;
    
    // Set the first card as the cover (simplified approach)
    const firstCard = currentDeck.cards[0];
    // Note: image_url would need to be retrieved from searchCache
    if (firstCard) {
      const updatedDeck = {
        ...currentDeck,
        cover: '' // TODO: Get image_url from searchCache using firstCard.card_id
      } as any;
      // Save to database immediately
      try {
        const response = await fetch(`/api/user/decks/${currentDeck.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(updatedDeck),
        });
        
        if (response.ok) {
          console.log('Deck cover updated successfully');
        } else {
          console.error('Failed to update deck cover');
        }
      } catch (error) {
        console.error('Error updating deck cover:', error);
      }
    }
  }, [currentDeck]);

  // Handle cover selection
  const handleCoverSelection = useCallback(async (cardImageUrl: string) => {
    if (!isValidDeck(currentDeck)) return;
    
    console.log('🖼️ handleCoverSelection called with:', cardImageUrl);
    console.log('🖼️ Current deck before update:', currentDeck.name, 'current cover:', (currentDeck as any).cover);
    
    // Save to database immediately
    try {
      const response = await fetch(`/api/user/decks/${currentDeck.id}`, {
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
      
      if (response.ok) {
        console.log('Deck cover updated successfully');
        
        // Update the session store with the new cover
        const updatedDeck = {
          ...currentDeck,
          cover: cardImageUrl
        } as any;
        
        setCurrentDeck(updatedDeck);
        console.log('🖼️ Updated deck with cover:', updatedDeck.cover);
      } else {
        console.error('Failed to update deck cover');
      }
    } catch (error) {
      console.error('Error updating deck cover:', error);
    }
  }, [currentDeck, setCurrentDeck]);

  // Clear deck
  const handleClearDeck = useCallback(() => {
    if (!isValidDeck(currentDeck)) return;
    
    const updatedDeck = {
      ...currentDeck,
      cards: []
    };
    
    setCurrentDeck(updatedDeck);
    setHasUnsavedChanges(true);
  }, [currentDeck, setCurrentDeck]);

  // Back to deck list
  const backToDeckList = useCallback(async () => {
    // Save current deck to database before clearing session
    if (isValidDeck(currentDeck)) {
      try {
        const response = await fetch(`/api/user/decks/${currentDeck.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(currentDeck),
        });
        
        if (response.ok) {
          console.log('Deck saved before navigating away');
        } else {
          console.error('Failed to save deck before navigating');
        }
      } catch (error) {
        console.error('Error saving deck before navigating:', error);
      }
      setCurrentDeck(null);
      setOriginalDeckName('');
      setHasUnsavedChanges(false);
      router.push('/deckbuilder');
    } else {
      // Clear React state
      // Clear React state as well
      setCurrentDeck(null);
      // TODO: Remove - no longer using these functions
      // setDeckName('');
      // setOriginalDeckName('');
      // setDeckCards([]);
      // setHasUnsavedChanges(false);
      // Navigate immediately
      router.push('/deckbuilder');
    }
  }, [router, currentDeck, setCurrentDeck]);

  // Prepare deck cards for PDF generation
  const deckCardsForPdf = useMemo(() => {
    if (!isValidDeck(currentDeck) || !currentDeck.cards) {
      return [];
    }
    
    // Return deck cards formatted for PDF generation
    // Note: currentDeck.cards is now always in session format {card_id, quantity}
    return currentDeck.cards.map(deckCard => ({
      id: deckCard.card_id.toString(),
      quantity: deckCard.quantity,
      // Note: Full card data (name, image_url, etc.) should be retrieved from searchCache
      // when actually generating the PDF, not stored in the deck
    }));
  }, [currentDeck]);

  // Modal state management (handled by parent components)
  const setShowCoverModal = useCallback((show: boolean) => {
    // Modal state is managed by parent components
    console.log('Cover modal state managed by parent component');
  }, []);

  const setShowDecklistModal = useCallback((show: boolean) => {
    // Modal state is managed by parent components
    console.log('Decklist modal state managed by parent component');
  }, []);

  const setShowPrintConfirmModal = useCallback((show: boolean) => {
    // Modal state is managed by parent components
    console.log('Print confirm modal state managed by parent component');
  }, []);

  const setShowDeckSettingsModal = useCallback((show: boolean) => {
    // Modal state is managed by parent components
    console.log('Deck settings modal state managed by parent component');
  }, []);

  // Generate decklist image
  const generateDecklistImage = useCallback(async () => {
    console.log('🖼️ generateDecklistImage called!');
    console.log('🖼️ currentDeck:', currentDeck);
    console.log('🖼️ isValidDeck:', isValidDeck(currentDeck));
    console.log('🖼️ cards length:', (currentDeck as any).cards?.length || 0);
    
    if (!isValidDeck(currentDeck) || !(currentDeck as any).cards || (currentDeck as any).cards.length === 0) {
      console.log('❌ No cards in deck to generate image');
      return;
    }
    
    try {
      // Import the generateDecklistImage function
      const { generateDecklistImage: generateImage } = await import('@/lib/decklistPdfGenerator');
      
      // Check cache first, fetch only missing cards
      const cardIds = (currentDeck as any).cards.map((deckCard: any) => deckCard.card_id);
      const missingCardIds = cardIds.filter((id: number) => !searchCache[id]);
      
      console.log('🖼️ Card IDs in deck:', cardIds);
      console.log('🖼️ Missing from cache:', missingCardIds);
      
      // Fetch missing card data if needed
      if (missingCardIds.length > 0) {
        console.log('🖼️ Fetching missing card data for:', missingCardIds);
        const response = await fetch('/api/cards/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_ids: missingCardIds }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch card data: ${response.status}`);
        }
        
        const rawCards = await response.json();
        const cleanCards = transformRawCardsToCards(rawCards);
        console.log('🖼️ Fetched missing card data:', cleanCards);
        
        // Update cache with new cards
        setSearchCache(prev => {
          const newCache = { ...prev };
          cleanCards.forEach(card => {
            newCache[card.product_id] = card;
          });
          return newCache;
        });
      }
      
      // Map deck cards to full card data using cache
      const deckCardsWithFullData = (currentDeck as any).cards.map((deckCard: any) => {
        const fullCardData = searchCache[deckCard.card_id];
        if (fullCardData) {
          console.log(`🖼️ Card ${fullCardData.name}: product_id = ${fullCardData.product_id}`);
          return {
            name: fullCardData.name,
            product_id: fullCardData.product_id,
            quantity: deckCard.quantity,
            CardType: fullCardData.attributes?.find(attr => attr.name === 'CardType')?.value || 'Unknown',
            RequiredEnergy: fullCardData.attributes?.find(attr => attr.name === 'RequiredEnergy')?.value || '0'
          };
        } else {
          console.log(`🖼️ Card data not found in cache for ${deckCard.card_id}`);
          return {
            name: `Card ${deckCard.card_id}`,
            product_id: deckCard.card_id, // Use card_id as fallback product_id
            quantity: deckCard.quantity,
            CardType: 'Unknown',
            RequiredEnergy: '0'
          };
        }
      });
      
      console.log(`🖼️ Generating decklist image for ${deckCardsWithFullData.length} card types`);
      
      // Generate the image
      const imageBlob = await generateImage({
        deckName: currentDeck.name || 'My Deck',
        cards: deckCardsWithFullData
      });
      
      // Create download link
      const url = URL.createObjectURL(imageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDeck.name || 'deck'}-decklist.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Decklist image generated and downloaded!');
      
    } catch (error) {
      console.error('❌ Error generating decklist image:', error);
    }
  }, [currentDeck, searchCache]);

  return {
    // State
    currentDeck,
    originalDeckName,
    hasUnsavedChanges,
    deckName: isValidDeck(currentDeck) ? currentDeck.name : '',
    hasUnsavedNameChanges: hasUnsavedChanges,
    // Expanded cards (single source of truth for display and navigation)
    expandedCards: expandedCards,
    deckCardsForPdf,
    
    // Actions
    createNewDeck,
    loadDeck,
    saveDeck,
    saveDeckName,
    handleDeckNameChange,
    handleQuantityChange,
    moveCardsFromHand,
    handlePrintToProxy,
    setDefaultCover,
    handleCoverSelection,
    handleClearDeck,
    backToDeckList,
    
    // Modal actions
    setShowCoverModal,
    setShowDecklistModal,
    setShowPrintConfirmModal,
    setShowDeckSettingsModal,
    
    // Additional actions
    generateDecklistImage,
  };
}
