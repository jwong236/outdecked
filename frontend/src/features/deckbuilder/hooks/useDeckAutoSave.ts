import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { apiConfig } from '@/lib/apiConfig';
import { Deck } from '@/types/card';

/**
 * Custom hook to handle automatic deck saving on page exit/unmount
 * Manages beforeunload and unmount save logic
 */
export function useDeckAutoSave(currentDeck: Deck | Record<string, never> | null) {
  const { user, clearCurrentDeck } = useSessionStore();
  
  // Use refs to capture current state at unmount time
  const currentDeckRef = useRef(currentDeck);
  const isSavingRef = useRef(false);
  
  // Update the ref whenever currentDeck changes
  useEffect(() => {
    currentDeckRef.current = currentDeck;
  }, [currentDeck]);

  // Save currentDeck to database when user leaves the page or unmounts
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      const deckToSave = currentDeckRef.current;
      
      if (deckToSave && Object.keys(deckToSave).length > 0 && 'id' in deckToSave && deckToSave.id && !isSavingRef.current) {
        isSavingRef.current = true;
        // Use fetch for reliable saving on page unload
        const data = JSON.stringify(deckToSave);
        
        // Use fetch to trigger browser notification
        event.preventDefault();
        event.returnValue = 'Your deck changes are being saved automatically.';
        
        try {
          const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${(deckToSave as any).id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: data,
          });
          
          if (!response.ok) {
            console.error('Failed to save deck:', response.status);
          }
        } catch (error) {
          console.error('Error saving deck on unload:', error);
        }
      }
    };

    // Save when component unmounts (navigation within app)
    const handleUnmount = async () => {
      const deckToSave = currentDeckRef.current;
      
      if (deckToSave && Object.keys(deckToSave).length > 0 && 'id' in deckToSave && deckToSave.id && !isSavingRef.current) {
        // Check if user is still authenticated before attempting save
        if (!user.id) {
          clearCurrentDeck();
          return;
        }
        
        isSavingRef.current = true;
        try {
          const deckId = (deckToSave as any).id;
          const response = await fetch(apiConfig.getApiUrl(`/api/user/decks/${deckId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(deckToSave),
          });
          
          if (!response.ok) {
            let errorText = '';
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = 'Could not read response body';
            }
            console.error('Failed to save deck on unmount:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
          }
          
          clearCurrentDeck();
        } catch (error) {
          console.error('Error saving deck on unmount:', error);
          clearCurrentDeck();
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleUnmount();
    };
  }, []); // Run only on mount/unmount - clearCurrentDeck is stable
}

