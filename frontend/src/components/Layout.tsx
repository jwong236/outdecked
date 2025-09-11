'use client';

import { Navigation } from './Navigation';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import { useBackground } from '@/contexts/BackgroundContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { background, setBackground } = useBackground();

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed transition-all duration-500 ease-in-out"
      style={{
        backgroundImage: `url(${background})`,
      }}
    >
      {/* Optional overlay for better text readability */}
      <div className="min-h-screen bg-black/5">
        <Navigation />
        
        {/* Background Switcher - positioned below navbar */}
        <div className="fixed top-20 right-4 z-40">
          <BackgroundSwitcher 
            currentBackground={background}
            onBackgroundChange={setBackground}
          />
        </div>
        
        <main className="relative">
          {children}
        </main>
      </div>
    </div>
  );
}
