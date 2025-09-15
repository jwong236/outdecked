'use client';

import { Navigation } from './Navigation';
import { useBackground } from '@/contexts/BackgroundContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { background } = useBackground();

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
      
      <Navigation />
      
      <main className="relative">
        {children}
      </main>
    </>
  );
}
