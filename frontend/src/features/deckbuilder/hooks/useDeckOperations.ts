'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { dataManager, Deck, HandItem } from '../../../lib/dataManager';
import { Card } from '@/types/card';
import { useDeckBuilderActions, useDeckBuilderSelectors } from '../DeckBuilderContext';
import { useSearchStore } from '@/stores/searchStore';

export function useDeckOperations() {
  const router = useRouter();
  const { currentDeck, deckCards, deckName, originalDeckName, hasUnsavedNameChanges } = useDeckBuilderSelectors();
  const { setSeries } = useSearchStore();
  const { 
    setCurrentDeck, 
    setDeckCards, 
    setDeckName, 
    setOriginalDeckName, 
    setHasUnsavedChanges,
    setShowMoveConfirmModal,
    setMoveMessage,
    setShowGoToSearch,
    setShowPrintConfirmModal,
    setShowDecklistModal,
    setShowCoverModal,
    setShowCoverSelectionModal,
    setShowClearDeckModal,
    clearDeck,
    updateDeckCardQuantity
  } = useDeckBuilderActions();

  // Create new deck (save to database via API)
  const createNewDeck = useCallback(async (series?: string) => {
    console.log('useDeckOperations.createNewDeck called with series:', series);
    try {
      // Use dataManager.createDeck() which saves to API with default filter settings
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
      
      const newDeck = await dataManager.createDeck('New Deck', 'Union Arena', 'private', series || '', filterSettings);
      console.log('useDeckOperations.createNewDeck completed, got deck:', { id: newDeck.id, name: newDeck.name });
      
      // Set the deck in the UI state
      setCurrentDeck(newDeck);
      setDeckName('New Deck');
      setOriginalDeckName('New Deck');
      setDeckCards([]);
      setHasUnsavedChanges(false);
      
      // Apply default filters to the search
      setTimeout(() => {
        // This will trigger the default filter application in useSearchLogic
        // The combinedFilters will automatically include the default filters
      }, 100);
    } catch (error) {
      console.error('Error creating new deck:', error);
      // Fallback: create a temporary deck in sessionStorage only
      const tempDeck: Deck = {
        id: `deck-${Date.now()}`,
        name: 'New Deck',
        game: 'Union Arena',
        visibility: 'private',
        cards: [],
        defaultSeries: series || '',
        defaultFilters: {
          basicPrintsOnly: true,
          noActionPoints: true,
          baseRarityOnly: true
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setCurrentDeck(tempDeck);
      setDeckName('New Deck');
      setOriginalDeckName('New Deck');
      setDeckCards([]);
      setHasUnsavedChanges(false);
      // Save temp deck to sessionStorage for UI state
      dataManager.setCurrentDeck(tempDeck);
    }
  }, [setCurrentDeck, setDeckName, setOriginalDeckName, setDeckCards, setHasUnsavedChanges]);

  // Load deck
  const loadDeck = useCallback(async (id: string) => {
    try {
      // Load specific deck from API
      const deck = await dataManager.getDeck(id);
      if (deck) {
        setCurrentDeck(deck);
        setDeckName(deck.name);
        setOriginalDeckName(deck.name);
        setHasUnsavedChanges(false);
        
        // Save this as the current deck being worked on in sessionStorage
        dataManager.setCurrentDeck(deck);
        
        // Sync series with search store if deck has a default series
        if (deck.defaultSeries) {
          setSeries(deck.defaultSeries);
        }
        
        // Convert deck cards to Card format for display (optimized)
        const deckCardData: Card[] = deck.cards.map(deckItem => {
          // Use object spread with defaults for better performance
          const baseCard = {
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
            quantity: deckItem.quantity
          };

          // Add dynamic attributes only if they exist (reduces object size)
          const dynamicAttrs: any = {};
          if (deckItem.SeriesName) dynamicAttrs.SeriesName = deckItem.SeriesName;
          if (deckItem.Rarity) dynamicAttrs.Rarity = deckItem.Rarity;
          if (deckItem.Number) dynamicAttrs.Number = deckItem.Number;
          if (deckItem.CardType) dynamicAttrs.CardType = deckItem.CardType;
          if (deckItem.RequiredEnergy) dynamicAttrs.RequiredEnergy = deckItem.RequiredEnergy;
          if (deckItem.ActionPointCost) dynamicAttrs.ActionPointCost = deckItem.ActionPointCost;
          if (deckItem.ActivationEnergy) dynamicAttrs.ActivationEnergy = deckItem.ActivationEnergy;
          if (deckItem.Description) dynamicAttrs.Description = deckItem.Description;
          if (deckItem.GeneratedEnergy) dynamicAttrs.GeneratedEnergy = deckItem.GeneratedEnergy;
          if (deckItem.BattlePointBP) dynamicAttrs.BattlePointBP = deckItem.BattlePointBP;
          if (deckItem.Trigger) dynamicAttrs.Trigger = deckItem.Trigger;
          if (deckItem.Affinities) dynamicAttrs.Affinities = deckItem.Affinities;

          return { ...baseCard, ...dynamicAttrs };
        });
        setDeckCards(deckCardData);
      } else {
        // Deck not found, redirect to deck list
        router.push('/deckbuilder');
      }
    } catch (error) {
      console.error('Error loading deck:', error);
      router.push('/deckbuilder');
    }
  }, [setCurrentDeck, setDeckName, setOriginalDeckName, setHasUnsavedChanges, setDeckCards, router]);

  // Save deck name
  const saveDeckName = useCallback(() => {
    if (!currentDeck) return;
    
    const updatedDeck = {
      ...currentDeck,
      name: deckName,
      updatedAt: new Date()
    };
    
    setCurrentDeck(updatedDeck);
    setOriginalDeckName(deckName);
    setHasUnsavedChanges(false);
  }, [currentDeck, deckName, setCurrentDeck, setOriginalDeckName, setHasUnsavedChanges]);

  // Handle deck name change
  const handleDeckNameChange = useCallback((newName: string) => {
    setDeckName(newName);
    setHasUnsavedChanges(newName !== originalDeckName);
  }, [setDeckName, setHasUnsavedChanges, originalDeckName]);

  // Handle quantity change
  const handleQuantityChange = useCallback((card: Card, change: number) => {
    updateDeckCardQuantity(card, change);
  }, [updateDeckCardQuantity]);

  // Save deck to database (call when user is done making changes)
  const saveDeck = useCallback(async () => {
    if (currentDeck) {
      try {
        await dataManager.updateDeck(currentDeck);
        console.log('Deck saved to database');
      } catch (error) {
        console.error('Error saving deck:', error);
      }
    }
  }, [currentDeck]);

  // Move cards from hand
  const moveCardsFromHand = useCallback(() => {
    const hand = dataManager.getHand();
    if (hand.length === 0) {
      setMoveMessage('No cards in hand to move');
      setShowGoToSearch(true);
      setShowMoveConfirmModal(true);
      return;
    }

    if (!currentDeck) {
      createNewDeck();
      return; // createNewDeck is async, so we'll need to handle this differently
    }

    // Add each card from hand to the deck using the proper updateDeckCardQuantity action
    hand.forEach(handItem => {
      if (!handItem.card_url) return; // Skip items without card_url
      
      // Convert handItem to Card format for the updateDeckCardQuantity action
      const cardToAdd: Card = {
        id: handItem.id || 0,
        product_id: handItem.product_id || 0,
        name: handItem.name ?? '',
        clean_name: handItem.clean_name || null,
        image_url: handItem.image_url ?? null,
        card_url: handItem.card_url,
        game: handItem.game ?? '',
        category_id: handItem.category_id || 0,
        group_id: handItem.group_id || 0,
        group_name: handItem.group_name,
        group_abbreviation: handItem.group_abbreviation,
        image_count: handItem.image_count || 0,
        is_presale: handItem.is_presale || false,
        released_on: handItem.released_on || '',
        presale_note: handItem.presale_note || '',
        modified_on: handItem.modified_on || '',
        price: handItem.price || 0,
        low_price: handItem.low_price || null,
        mid_price: handItem.mid_price || null,
        high_price: handItem.high_price || null,
        created_at: handItem.created_at || '',
        // Dynamic attributes
        SeriesName: handItem.SeriesName,
        Rarity: handItem.Rarity,
        Number: handItem.Number,
        CardType: handItem.CardType,
        RequiredEnergy: handItem.RequiredEnergy,
        ActionPointCost: handItem.ActionPointCost,
        ActivationEnergy: handItem.ActivationEnergy,
        Description: handItem.Description,
        GeneratedEnergy: handItem.GeneratedEnergy,
        BattlePointBP: handItem.BattlePointBP,
        Trigger: handItem.Trigger,
        Affinities: handItem.Affinities
      };
      
      // Use the proper action that updates both currentDeck and deckCards
      updateDeckCardQuantity(cardToAdd, handItem.quantity);
    });

    setMoveMessage(`Moved ${hand.length} card types from hand to deck!`);
    setShowMoveConfirmModal(true);
  }, [currentDeck, createNewDeck, updateDeckCardQuantity, setMoveMessage, setShowGoToSearch, setShowMoveConfirmModal]);

  // Print to proxy
  const handlePrintToProxy = useCallback(() => {
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
  }, [currentDeck, setShowPrintConfirmModal, router]);

  // Set default cover
  const setDefaultCover = useCallback(() => {
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
    }
  }, [currentDeck, setCurrentDeck]);

  // Handle cover selection
  const handleCoverSelection = useCallback((cardImageUrl: string) => {
    if (!currentDeck) return;
    
    console.log('🖼️ handleCoverSelection called with:', cardImageUrl);
    console.log('🖼️ Current deck before update:', currentDeck.name, 'current cover:', currentDeck.cover);
    
    const updatedDeck = {
      ...currentDeck,
      cover: cardImageUrl
    };
    console.log('🖼️ Updated deck with cover:', updatedDeck.cover);
    setCurrentDeck(updatedDeck);
    setShowCoverSelectionModal(false);
  }, [currentDeck, setCurrentDeck, setShowCoverSelectionModal]);

  // Clear deck
  const handleClearDeck = useCallback(() => {
    if (currentDeck) {
      clearDeck();
      setShowClearDeckModal(false);
    }
  }, [currentDeck, clearDeck, setShowClearDeckModal]);

  // Back to deck list
  const backToDeckList = useCallback(() => {
    // Save current deck to database before clearing session
    if (currentDeck) {
      dataManager.updateDeck(currentDeck).then(() => {
        // Clear sessionStorage only after successful save
        dataManager.clearCurrentDeck();
      }).catch(console.error);
    } else {
      // Clear sessionStorage even if no current deck
      dataManager.clearCurrentDeck();
    }
    router.push('/deckbuilder');
  }, [router, currentDeck]);

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
    }).filter((card): card is NonNullable<typeof card> => card !== null);
  }, [currentDeck, deckCards]);

  return {
    // State
    currentDeck,
    deckCards,
    deckName,
    hasUnsavedNameChanges,
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
    setShowMoveConfirmModal,
    setShowPrintConfirmModal,
    setShowDecklistModal,
    setShowCoverModal,
    setShowCoverSelectionModal,
    setShowClearDeckModal,
  };
}
