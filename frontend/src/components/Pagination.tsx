'use client';

import { useSearchStore } from '@/stores/searchStore';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function Pagination({ currentPage, totalPages, hasNext, hasPrev }: PaginationProps) {
  const { setPage } = useSearchStore();

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={!hasPrev}
          className="relative inline-flex items-center rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={!hasNext}
          className="relative ml-3 inline-flex items-center rounded-md border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-white">
            Page <span className="font-medium">{currentPage}</span> of{' '}
            <span className="font-medium">{totalPages}</span>
          </p>
        </div>
        
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={!hasPrev}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-white/70 border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border border-white/20 bg-white/10 backdrop-blur-sm transition-colors duration-150 ${
                  page === currentPage
                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-white hover:bg-white/20 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={!hasNext}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-white/70 border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <span className="sr-only">Next</span>
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
      </div>
    </div>
  );
}
