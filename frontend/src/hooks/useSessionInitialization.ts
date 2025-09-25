import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Hook to verify authentication status when the app starts
 * 
 * This hook:
 * 1. Verifies authentication status with the server
 * 2. Handles authentication state management
 */
export function useSessionInitialization() {
  const { 
    sessionState, 
    checkAuthStatus
  } = useSessionStore();

  // Verify authentication status on app startup
  useEffect(() => {
    if (!sessionState.isInitialized) {
      console.log('🔐 Verifying authentication status...');
      checkAuthStatus();
    }
  }, [sessionState.isInitialized, checkAuthStatus]);

  // Authentication verification is now handled by this hook
}
