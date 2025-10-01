'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSessionStore } from '@/stores/sessionStore';

interface BackgroundContextType {
  background: string;
  setBackground: (background: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { user, preferences, updatePreferences } = useSessionStore();
  
  // Always start with default background to prevent hydration mismatch
  const [background, setBackground] = useState('/backgrounds/background-1.jpg');
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration - load from localStorage after component mounts
  useEffect(() => {
    setIsHydrated(true);
    
    // Load from localStorage after hydration
    const savedBackground = localStorage.getItem('background');
    if (savedBackground) {
      setBackground(savedBackground);
    }
  }, []);

  // Load background from user preferences when user logs in or preferences change
  useEffect(() => {
    console.log('🎨 BackgroundContext - Preferences changed:', { user: !!user, background: preferences.background, isHydrated });
    if (user && preferences.background) {
      console.log('✅ Setting background from preferences:', preferences.background);
      setBackground(preferences.background);
      // Also save to localStorage for immediate access on page transitions
      if (isHydrated) {
        localStorage.setItem('background', preferences.background);
      }
    } else if (!user) {
      // Reset to default when user logs out
      console.log('🔄 User logged out, resetting to default background');
      setBackground('/backgrounds/background-1.jpg');
      if (isHydrated) {
        localStorage.setItem('background', '/backgrounds/background-1.jpg');
      }
    } else if (user && !preferences.background) {
      console.log('⚠️ User logged in but no background preference found');
    }
  }, [user, preferences.background, isHydrated]);

  const handleSetBackground = async (newBackground: string) => {
    setBackground(newBackground);
    
    // Save to localStorage immediately for instant access on page transitions
    if (isHydrated) {
      localStorage.setItem('background', newBackground);
    }
    
    // If user is logged in, save to their profile
    if (user) {
      await updatePreferences({ background: newBackground });
    }
  };

  // Use consistent background value to prevent hydration mismatch
  const currentBackground = isHydrated ? background : '/backgrounds/background-1.jpg';
  const currentSetBackground = isHydrated ? handleSetBackground : () => {};

  return (
    <BackgroundContext.Provider value={{ background: currentBackground, setBackground: currentSetBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
}
