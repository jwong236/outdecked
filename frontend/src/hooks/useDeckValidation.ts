'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Deck, CardRef, ExpandedCard } from '@/types/card';

export interface DeckValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total_cards: number;
    total_triggers: number;
    color_triggers: number;
    special_triggers: number;
    final_triggers: number;
    card_counts: Record<string, number>;
  };
}

export interface UseDeckValidationReturn {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: DeckValidationResult['stats'];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for validating decks using the backend validation system.
 * Debounces API calls to 500ms to avoid excessive requests.
 */
export function useDeckValidation(deck: Deck | null, expandedCards: ExpandedCard[] = []): UseDeckValidationReturn {
  const [validation, setValidation] = useState<DeckValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateDeck = useCallback(async (deckData: Deck, cards: ExpandedCard[]) => {
    try {
      setIsLoading(true);
      setError(null);

      // Create deck data with full card information for validation
      const deckWithFullCards = {
        ...deckData,
        cards: cards.map(card => ({
          card_id: card.product_id,
          quantity: card.quantity,
          name: card.name,
          card_number: card.attributes?.find(attr => attr.name === 'card_number')?.value || card.name,
          attributes: card.attributes || []
        }))
      };

      const response = await fetch('/api/decks/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deckWithFullCards),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setValidation(result.validation);
      } else {
        throw new Error(result.error || 'Validation failed');
      }
    } catch (err) {
      console.error('Deck validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
      setValidation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced validation effect
  useEffect(() => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Don't validate if no deck or no expanded cards
    if (!deck || !expandedCards || expandedCards.length === 0) {
      setValidation(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Set up debounced validation
    debounceTimeoutRef.current = setTimeout(() => {
      validateDeck(deck, expandedCards);
    }, 500);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [deck, expandedCards, validateDeck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isValid: validation?.is_valid ?? false,
    errors: validation?.errors ?? [],
    warnings: validation?.warnings ?? [],
    stats: validation?.stats ?? {
      total_cards: 0,
      total_triggers: 0,
      color_triggers: 0,
      special_triggers: 0,
      final_triggers: 0,
      card_counts: {},
    },
    isLoading,
    error,
  };
}
