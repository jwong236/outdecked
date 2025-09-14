'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckIcon, ChevronUpDownIcon, PhotoIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';

interface BackgroundOption {
  id: string;
  name: string;
  url: string;
}

const backgroundOptions: BackgroundOption[] = [
  {
    id: 'anime-landscape',
    name: 'Anime Landscape',
    url: '/backgrounds/background-1.jpg',
  },
  {
    id: 'anime-aesthetic-1',
    name: 'Anime Aesthetic 1',
    url: '/backgrounds/background-2.jpg',
  },
  {
    id: 'anime-aesthetic-2',
    name: 'Anime Aesthetic 2',
    url: '/backgrounds/background-3.jpg',
  },
  {
    id: 'anime-hd',
    name: 'Anime HD Background',
    url: '/backgrounds/background-4.jpg',
  },
  {
    id: 'anime-boy',
    name: 'Anime Boy 4K',
    url: '/backgrounds/background-5.jpg',
  },
  {
    id: 'digital-art',
    name: 'Digital Art',
    url: '/backgrounds/background-6.jpg',
  },
];

interface BackgroundSwitcherProps {
  currentBackground: string;
  onBackgroundChange: (background: string) => void;
}

export function BackgroundSwitcher({ currentBackground, onBackgroundChange }: BackgroundSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedBackground = backgroundOptions.find(bg => bg.url === currentBackground) || backgroundOptions[0];

  const handleBackgroundChange = (background: BackgroundOption) => {
    console.log('Changing background to:', background.url);
    onBackgroundChange(background.url);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    console.log('Button clicked, isOpen:', isOpen);
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        console.log('Clicking outside, closing dropdown');
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors border border-white/20"
        onClick={handleButtonClick}
      >
        <PhotoIcon className="h-4 w-4 mr-2" />
        Background
        <ChevronUpDownIcon className="h-4 w-4 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
          {backgroundOptions.map((background) => (
            <button
              key={background.id}
              className={`w-full text-left relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-blue-100 hover:text-blue-900 text-gray-900 ${
                selectedBackground.id === background.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                console.log('Button clicked for:', background.name);
                handleBackgroundChange(background);
              }}
            >
              <div className="flex items-center">
                <div className="w-8 h-6 rounded mr-3 border border-gray-300 flex-shrink-0 overflow-hidden">
                  <Image
                    src={background.url}
                    alt={background.name}
                    width={32}
                    height={24}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.log('Preview image failed to load:', background.url);
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.style.background = '#f3f4f6';
                    }}
                  />
                </div>
                <span className={`block truncate ${selectedBackground.id === background.id ? 'font-semibold' : 'font-normal'}`}>
                  {background.name}
                </span>
                {selectedBackground.id === background.id ? (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
