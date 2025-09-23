'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/types/card';
import { Card } from '@/types/card';
import { useSessionStore } from '@/stores/sessionStore';
import { useSearchStore } from '@/stores/searchStore';
import { fetchDeck } from '@/lib/deckUtils';

export function useDeckOperations(searchCache: Record<string, any>, setSearchCache: (updater: (prev: Record<string, any>) => Record<string, any>) => void) {
  const router = useRouter();
  const { deckBuilder, setCurrentDeck } = useSessionStore();
  const { setSeries } = useSearchStore();
  
  // Get current deck from sessionStore
  const currentDeck = deckBuilder.currentDeck;
  
  // Helper function to check if currentDeck is a valid deck
  const isValidDeck = (deck: any): deck is Deck => {
    return deck && typeof deck === 'object' && 'id' in deck;
  };
  
  // Local state for deck name management
  const [originalDeckName, setOriginalDeckName] = useState((currentDeck as any)?.name || '');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update originalDeckName when currentDeck changes
  useEffect(() => {
    if ((currentDeck as any)?.name) {
      setOriginalDeckName((currentDeck as any).name);
    }
  }, [(currentDeck as any)?.name]);

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
  const handleQuantityChange = useCallback((card: Card, change: number) => {
    if (!isValidDeck(currentDeck)) return;
    
    console.log('🃏 handleQuantityChange called with:', card.name, 'current quantity:', card.quantity, 'change:', change);
    const newQuantity = (card.quantity || 0) + change;
    console.log('🃏 newQuantity will be:', newQuantity);
    const updatedCards = [...(currentDeck.cards || [])];
    
    const existingCardIndex = updatedCards.findIndex(deckCard => deckCard.card_id === card.product_id);
    
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
          setCurrentDeck({});
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
    const productIds = handItems.map(handItem => handItem.product_id);
    
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
          const cards = await response.json();
          setSearchCache(prev => {
            const newCache = { ...prev };
            cards.forEach((card: any) => {
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
      card_id: handItem.product_id,
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
      product_id: deckCard.card_id,
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
    
    const updatedDeck = {
      ...currentDeck,
      cover: cardImageUrl
    } as any;
    console.log('🖼️ Updated deck with cover:', updatedDeck.cover);
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
    // TODO: Implement with sessionStore
    // setShowCoverSelectionModal(false);
  }, [currentDeck]);

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
      setCurrentDeck({});
      setOriginalDeckName('');
      setHasUnsavedChanges(false);
      router.push('/deckbuilder');
    } else {
      // Clear React state
      // Clear React state as well
      setCurrentDeck({});
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
      const cardIds = (currentDeck as any).cards.map((deckCard: any) => deckCard.card_id.toString());
      const missingCardIds = cardIds.filter((id: string) => !searchCache[id]);
      
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
        
        const cards = await response.json();
        console.log('🖼️ Fetched missing card data:', cards);
        
        // Update cache with new cards
        setSearchCache(prev => {
          const newCache = { ...prev };
          cards.forEach((card: any) => {
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
            image_url_small: `https://tcgplayer-cdn.tcgplayer.com/product/${fullCardData.product_id}_in_400x400.jpg`,
            image_url_large: `https://tcgplayer-cdn.tcgplayer.com/product/${fullCardData.product_id}_in_1000x1000.jpg`,
            quantity: deckCard.quantity,
            CardType: fullCardData.CardType,
            RequiredEnergy: fullCardData.RequiredEnergy
          };
        } else {
          console.log(`🖼️ Card data not found in cache for ${deckCard.card_id}`);
          return {
            name: `Card ${deckCard.card_id}`,
            image_url_small: '',
            image_url_large: '',
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
    // TODO: Implement deckCards with sessionStore
    // deckCards,
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
