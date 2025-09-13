'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dataManager } from '@/lib/dataManager';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  Squares2X2Icon, 
  PrinterIcon,
  HandRaisedIcon,
  UserIcon,
  CogIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export function Navigation() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const updateCartCount = () => {
      const totalItems = dataManager.getHandTotalItems();
      setCartCount(totalItems);
    };

    updateCartCount();
    
    // Listen for cart updates
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  return (
    <nav className="bg-slate-800/95 backdrop-blur-md shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          {/* Left Side Navigation */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-bold text-white">OutDecked</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-3">
              <Link 
                href="/" 
                className={`flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <HomeIcon className="h-4 w-4 mr-1.5" />
                Home
              </Link>
              
              <Link 
                href="/search" 
                className={`flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/search') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-1.5" />
                Search Cards
              </Link>
              
              <Link 
                href="/deckbuilder" 
                className={`flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/deckbuilder') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4 mr-1.5" />
                Deck Builder
              </Link>
              
              <Link 
                href="/proxy-printer" 
                className={`flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive('/proxy-printer') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <PrinterIcon className="h-4 w-4 mr-1.5" />
                Proxy Printer
              </Link>
              
            </div>
          </div>

          {/* Right Side Navigation */}
          <div className="flex items-center space-x-2">
            <Link 
              href="/cart" 
              className={`flex items-center px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/cart') 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <HandRaisedIcon className="h-4 w-4 mr-1.5" />
              Check Hand
              {cartCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center px-2 py-1.5 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <UserIcon className="h-4 w-4 mr-1.5" />
                Profile
                <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <Link 
                    href="/admin" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <CogIcon className="h-4 w-4 mr-3" />
                    Admin Page
                  </Link>
                  <Link 
                    href="/scraping" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-3" />
                    Card Scraping
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
          <Link 
            href="/" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <HomeIcon className="h-4 w-4 inline mr-2" />
            Home
          </Link>
          <Link 
            href="/search" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/search') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MagnifyingGlassIcon className="h-4 w-4 inline mr-2" />
            Search Cards
          </Link>
          <Link 
            href="/deckbuilder" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/deckbuilder') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <Squares2X2Icon className="h-4 w-4 inline mr-2" />
            Deck Builder
          </Link>
          <Link 
            href="/proxy-printer" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/proxy-printer') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <PrinterIcon className="h-4 w-4 inline mr-2" />
            Proxy Printer
          </Link>
          <Link 
            href="/cart" 
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive('/cart') ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <HandRaisedIcon className="h-4 w-4 inline mr-2" />
            Check Hand
          </Link>
        </div>
      </div>
    </nav>
  );
}
