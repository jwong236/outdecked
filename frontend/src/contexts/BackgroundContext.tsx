'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface BackgroundContextType {
  background: string;
  setBackground: (background: string) => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  // Set "Anime Aesthetic 2" (background-3.jpg) as the default
  const [background, setBackground] = useState('/backgrounds/background-3.jpg');

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
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
