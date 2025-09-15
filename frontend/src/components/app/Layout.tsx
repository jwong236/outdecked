'use client';

import { Navigation } from './Navigation';
import { BackgroundSwitcher } from './BackgroundSwitcher';
import { useBackground } from '@/contexts/BackgroundContext';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { background, setBackground } = useBackground();
  const pathname = usePathname();
  
  // Only show background switcher on homepage
  const isHomepage = pathname === '/';

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
      
      {/* Background Switcher - only show on homepage */}
      {isHomepage && (
        <div className="fixed top-20 right-4">
          <BackgroundSwitcher 
            currentBackground={background}
            onBackgroundChange={setBackground}
          />
        </div>
      )}
      
      <main className="relative">
        {children}
      </main>
    </>
  );
}
