'use client';

import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useSessionStore } from '@/stores/sessionStore';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  Squares2X2Icon, 
  PrinterIcon,
  HandRaisedIcon,
  UserIcon,
  CogIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export function Navigation() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, sessionState, handCart } = useSessionStore();
  const isLoading = !sessionState.isInitialized;

  const isActive = (path: string) => pathname === path;

  const updateButtonPosition = useCallback((el: HTMLButtonElement | null) => {
    if (el && isProfileOpen) {
      const rect = el.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    // Redirect first to trigger deck save on unmount
    router.push('/');
    // Then logout after a brief delay to allow unmount save to complete
    setTimeout(async () => {
      await logout();
    }, 100);
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Close profile dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
    };

    const handleScroll = () => {
      setIsProfileOpen(false);
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isProfileOpen]);

  // Calculate cart count from sessionStore
  const cartCount = handCart.handItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="bg-slate-800/95 backdrop-blur-md shadow-lg">
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
                <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
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
            {!isHydrated || isLoading ? (
              // Show loading state during hydration
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1.5 text-sm font-medium text-gray-400">
                  Loading...
                </div>
              </div>
            ) : user.id ? (
              // Authenticated user - show profile dropdown
              <div className="relative profile-dropdown">
                <button
                  ref={updateButtonPosition}
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center px-2 py-1.5 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <UserIcon className="h-4 w-4 mr-1.5" />
                  {user.display_name || user.username}
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && typeof window !== 'undefined' && createPortal(
                  <div 
                    className="fixed w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 profile-dropdown"
                    style={{
                      top: `${buttonPosition.top}px`,
                      right: `${buttonPosition.right}px`
                    }}
                  >
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user.display_name || user.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <Link 
                      href="/deckbuilder" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      My Decks
                    </Link>
                    <Link 
                      href="/settings" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <CogIcon className="h-4 w-4 mr-3" />
                      Settings
                    </Link>
                    {(user.role === 'admin' || user.role === 'owner') && (
                      <Link 
                        href="/admin" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-3" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              // Not authenticated - show sign in/register buttons
              <div className="flex items-center space-x-2">
                <Link 
                  href="/auth?mode=login" 
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth?mode=register" 
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
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
            <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
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
