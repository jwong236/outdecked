'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  Squares2X2Icon, 
  PrinterIcon,
  HandRaisedIcon,
  CogIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface Stats {
  cards: number;
  series: number;
  attributes: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ cards: 0, series: 0, attributes: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            cards: data.cards || 0,
            series: data.series || 0,
            attributes: data.attributes || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-white mb-4">
          OutDecked
        </h1>
        <p className="text-xl text-gray-200 mb-8">
          Your complete Union Arena card database and deck building platform
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <MagnifyingGlassIcon className="h-12 w-12 text-blue-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Search Cards</h3>
          <p className="text-gray-200">
            Find cards by name, series, color, rarity, and more with advanced filtering options.
          </p>
          <Link href="/search" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
            Search Now →
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <Squares2X2Icon className="h-12 w-12 text-purple-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Deck Builder</h3>
          <p className="text-gray-200">
            Build and manage your Union Arena decks with our intuitive deck builder.
          </p>
          <Link href="/deckbuilder" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
            Build Deck →
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <PrinterIcon className="h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Proxy Printer</h3>
          <p className="text-gray-200">
            Print high-quality proxies of your cards for testing and play.
          </p>
          <Link href="/proxy-printer" className="text-green-400 hover:text-green-300 mt-4 inline-block">
            Print Proxies →
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <HandRaisedIcon className="h-12 w-12 text-yellow-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Check Hand</h3>
          <p className="text-gray-200">
            Review your selected cards and manage your collection.
          </p>
          <Link href="/cart" className="text-yellow-400 hover:text-yellow-300 mt-4 inline-block">
            View Hand →
          </Link>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <CogIcon className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">More Features</h3>
          <p className="text-gray-200">
            Additional features and tools are coming soon to enhance your deck building experience.
          </p>
          <div className="text-red-400 mt-4 inline-block">
            Coming Soon →
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <ArrowDownTrayIcon className="h-12 w-12 text-indigo-400 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">More Tools</h3>
          <p className="text-gray-200">
            Advanced tools and utilities are in development to provide even more functionality.
          </p>
          <div className="text-indigo-400 mt-4 inline-block">
            Coming Soon →
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-16 text-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl font-bold text-white">
              {isLoading ? '...' : stats.cards.toLocaleString()}
            </div>
            <div className="text-gray-200">Union Arena Cards</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white">
              {isLoading ? '...' : stats.series.toLocaleString()}
            </div>
            <div className="text-gray-200">Series Available</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-white">
              {isLoading ? '...' : stats.attributes.toLocaleString()}
            </div>
            <div className="text-gray-200">Card Attributes</div>
          </div>
        </div>
      </div>
    </div>
  );
}