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
    <>
      {/* Fixed background that covers the entire viewport */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 ease-in-out -z-10"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Optional overlay for better text readability */}
      <div className="fixed inset-0 bg-black/5 -z-10" />
      
      <div className="relative z-10">
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
    </>
  );
}
