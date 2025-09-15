'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface BackgroundContextType {
  background: string;
  setBackground: (background: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const { user, preferences, updatePreferences } = useAuth();
  // Set "Anime Aesthetic 2" (background-3.jpg) as the default
  const [background, setBackground] = useState('/backgrounds/background-3.jpg');

  // Load background from user preferences when user logs in or preferences change
  useEffect(() => {
    if (user && preferences.background) {
      setBackground(preferences.background);
    } else if (!user) {
      // Reset to default when user logs out
      setBackground('/backgrounds/background-3.jpg');
    }
  }, [user, preferences.background]);

  const handleSetBackground = async (newBackground: string) => {
    setBackground(newBackground);
    
    // If user is logged in, save to their profile
    if (user) {
      await updatePreferences({ background: newBackground });
    }
  };

  return (
    <BackgroundContext.Provider value={{ background, setBackground: handleSetBackground }}>
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
