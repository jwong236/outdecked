'use client';

import { useSessionStore } from '@/stores/sessionStore';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function Pagination({ currentPage, totalPages, hasNext, hasPrev }: PaginationProps) {
  const { setPage } = useSessionStore();

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
    <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
      <div className="flex items-center justify-between">
        {/* Mobile view */}
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setPage(currentPage - 1)}
            disabled={!hasPrev}
            className="relative inline-flex items-center rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
          >
            Previous
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/80">Page</span>
            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-semibold shadow-lg border border-white/30">
              {currentPage}
            </span>
            <span className="text-sm text-white/80">of {totalPages}</span>
          </div>
          <button
            onClick={() => setPage(currentPage + 1)}
            disabled={!hasNext}
            className="relative inline-flex items-center rounded-lg border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
          >
            Next
          </button>
        </div>
        
        {/* Desktop view */}
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-white/80">Page</span>
            <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-lg text-sm font-semibold shadow-lg border border-white/30">
              {currentPage}
            </span>
            <span className="text-sm text-white/80">of {totalPages}</span>
          </div>
          
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-lg shadow-lg" aria-label="Pagination">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={!hasPrev}
                className="relative inline-flex items-center rounded-l-lg px-3 py-2 text-white/70 border border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border border-white/30 backdrop-blur-sm transition-all duration-200 shadow-md ${
                    page === currentPage
                      ? 'z-10 bg-white/25 backdrop-blur-md text-white border-white/40 shadow-xl transform scale-105'
                      : 'text-white bg-white/10 hover:bg-white/20 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={!hasNext}
                className="relative inline-flex items-center rounded-r-lg px-3 py-2 text-white/70 border border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md"
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
