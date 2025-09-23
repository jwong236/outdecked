'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '@/types/card';
import { ProxyGrid } from '@/features/proxy-printer/ProxyGrid';
// No longer need CardDetailModal - proxy printer is view-only
import { SignInModal } from '@/components/shared/modals/SignInModal';
// No longer need dataManager or PrintListItem - using compact format with sessionStore
import { useAuth } from '@/features/auth/AuthContext';
import { useSessionStore } from '@/stores/sessionStore';
import { apiConfig } from '../../lib/apiConfig';
import { getProductImageCard, getProductImageIcon } from '@/lib/imageUtils';
import jsPDF from 'jspdf';

export function ProxyPrinterPage() {
  const { user } = useAuth();
  const { proxyPrinter, setPrintList, setPrintSettings } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCopyFromDeckModal, setShowCopyFromDeckModal] = useState(false);

  useEffect(() => {
    // No need to fetch card data - just use compact items directly
    setIsLoading(false);
  }, [proxyPrinter.printList]);

  // Handle margin changes - zero sum positioning
  const handleVerticalMarginChange = (value: number) => {
    // value represents top margin, bottom margin compensates
    setPrintSettings({
      marginTop: value,
      marginBottom: 1.0 - value, // Total margin space is 1.0
    });
  };

  const handleHorizontalMarginChange = (value: number) => {
    // value represents left margin, right margin compensates  
    setPrintSettings({
      marginLeft: value,
      marginRight: 1.0 - value, // Total margin space is 1.0
    });
  };

  const clearPrintList = () => {
    setPrintList([]); // Clear compact print list in sessionStore
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  // Handle keyboard navigation for modal
  useEffect(() => {
    if (!selectedCard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard]);

  const totalItems = proxyPrinter.printList.reduce((total, item) => total + item.quantity, 0);

  // Helper function to load image as base64 using our image endpoint
  const loadImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      // The imageUrl is already in the correct format: /api/images/product/123?size=1000x1000
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        // If it's a 400 error, the image is likely not released yet
        if (response.status === 400) {
          console.warn(`Image not available (likely unreleased): ${imageUrl}`);
          return null; // Return null to indicate no image available
        }
        throw new Error(`Image fetch failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = () => {
          reject(new Error('Failed to convert blob to base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to load image:', error);
      return null; // Return null instead of throwing for unreleased images
    }
  };

  const generatePDF = async () => {
    if (proxyPrinter.printList.length === 0) {
      alert('No cards in print list!');
      return;
    }

    try {
      // Show loading message
      const loadingMessage = document.createElement('div');
      loadingMessage.innerHTML = 'Generating PDF... Please wait while images are processed.';
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(loadingMessage);

      // Create PDF in landscape orientation (11" x 8.5")
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [11, 8.5]
      });

      // Standard playing card size: 2.5" × 3.5"
      const cardWidth = 2.5;
      const cardHeight = 3.5;
      
      // Calculate how many cards fit per page
      const availableWidth = 11 - proxyPrinter.printSettings.marginLeft - proxyPrinter.printSettings.marginRight;
      const availableHeight = 8.5 - proxyPrinter.printSettings.marginTop - proxyPrinter.printSettings.marginBottom;
      const cardsPerRow = Math.floor(availableWidth / cardWidth);
      const cardsPerColumn = Math.floor(availableHeight / cardHeight);
      const cardsPerPage = cardsPerRow * cardsPerColumn;
      
      // Calculate total pages needed
      const totalPages = Math.ceil(totalItems / cardsPerPage);
      
      // Create expanded list with individual cards based on quantity
      const expandedCards: {product_id: number, quantity: number}[] = [];
      proxyPrinter.printList.forEach(card => {
        for (let i = 0; i < card.quantity; i++) {
          expandedCards.push({ product_id: card.product_id, quantity: 1 }); // Each individual card has quantity 1
        }
      });
      
      let cardIndex = 0;
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate the actual grid dimensions
        const gridWidth = (cardsPerRow * cardWidth) + ((cardsPerRow - 1) * proxyPrinter.printSettings.cardGap);
        const gridHeight = (cardsPerColumn * cardHeight) + ((cardsPerColumn - 1) * proxyPrinter.printSettings.cardGap);
        
        // Calculate centering offsets
        const centerOffsetX = (availableWidth - gridWidth) / 2;
        const centerOffsetY = (availableHeight - gridHeight) / 2;
        
        // Calculate effective margins (base margins + centering offsets)
        const effectiveMarginLeft = proxyPrinter.printSettings.marginLeft + centerOffsetX;
        const effectiveMarginRight = proxyPrinter.printSettings.marginRight + centerOffsetX;
        const effectiveMarginTop = proxyPrinter.printSettings.marginTop + centerOffsetY;
        const effectiveMarginBottom = proxyPrinter.printSettings.marginBottom + centerOffsetY;
        
        // Add cards to this page
        for (let row = 0; row < cardsPerColumn && cardIndex < expandedCards.length; row++) {
          for (let col = 0; col < cardsPerRow && cardIndex < expandedCards.length; col++) {
            const card = expandedCards[cardIndex];
            
            // Calculate position with proper centering
            const x = effectiveMarginLeft + (col * (cardWidth + proxyPrinter.printSettings.cardGap));
            const y = effectiveMarginTop + (row * (cardHeight + proxyPrinter.printSettings.cardGap));
            
            // Add card image using product_id
            const imageUrl = getProductImageCard(card.product_id);
            const base64Image = await loadImageAsBase64(imageUrl);
            
            if (base64Image) {
              // Add image to PDF if available
              pdf.addImage(
                base64Image,
                'JPEG',
                x,
                y,
                cardWidth,
                cardHeight
              );
            } else {
              // Add placeholder rectangle for unreleased cards
              pdf.setFillColor(200, 200, 200);
              pdf.rect(x, y, cardWidth, cardHeight, 'F');
              
              // Add border
              pdf.setDrawColor(100, 100, 100);
              pdf.rect(x, y, cardWidth, cardHeight);
              
              // Add "Coming Soon" text
              pdf.setFontSize(10);
              pdf.setTextColor(100, 100, 100);
              pdf.text('Coming Soon', x + cardWidth/2 - 0.3, y + cardHeight/2 - 0.1);
              pdf.text(`Card ${card.product_id}`, x + cardWidth/2 - 0.3, y + cardHeight/2 + 0.1);
            }
            
            cardIndex++;
          }
        }
      }
      
      // Remove loading message safely
      if (loadingMessage.parentNode === document.body) {
        document.body.removeChild(loadingMessage);
      }
      
      // Save the PDF
      const fileName = `proxy-cards-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      
      // Remove loading message if it exists
      const loadingMessage = document.querySelector('div[style*="position: fixed"]');
      if (loadingMessage && loadingMessage.parentNode === document.body) {
        document.body.removeChild(loadingMessage);
      }
    }
  };

  const togglePreview = () => {
    setPrintSettings({ showPreview: !proxyPrinter.printSettings.showPreview });
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Proxy Printer
        </h1>
        <p className="text-gray-200">
          Create high-quality proxy cards for printing
        </p>
      </div>

      {proxyPrinter.printList.length === 0 ? (
        <div className="text-center py-12">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No cards to print</h3>
            <p className="text-gray-300 mb-6">Add cards from your hand or copy from your decks to create proxy cards.</p>
            <div className="flex gap-3 justify-center">
              <a 
                href="/cart" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                Check Hand
              </a>
              <button
                onClick={() => {
                  if (!user) {
                    setShowCopyFromDeckModal(true);
                  } else {
                    // TODO: Implement copy from deck functionality
                    alert('Copy from deck functionality coming soon!');
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-150"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Copy from Deck
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Print List */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <ProxyGrid
              cards={proxyPrinter.printList.map(item => ({
                id: 0,
                product_id: item.product_id,
                name: `Card ${item.product_id}`, // Placeholder name
                clean_name: null,
                image_url: getProductImageIcon(item.product_id),
                card_url: '',
                game: 'Union Arena',
                category_id: 0,
                group_id: 0,
                image_count: 0,
                is_presale: false,
                released_on: '',
                presale_note: '',
                modified_on: '',
                price: null,
                low_price: null,
                mid_price: null,
                high_price: null,
                created_at: '',
              }))}
              onCardClick={handleCardClick}
            />
          </div>

          {/* Print Settings */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Print Settings</h3>
            
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Vertical Position */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Vertical Position
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={proxyPrinter.printSettings.marginTop}
                  onChange={(e) => handleVerticalMarginChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">
                  Top: {proxyPrinter.printSettings.marginTop.toFixed(1)}" | Bottom: {proxyPrinter.printSettings.marginBottom.toFixed(1)}"
                </div>
              </div>

              {/* Horizontal Position */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Horizontal Position
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={proxyPrinter.printSettings.marginLeft}
                  onChange={(e) => handleHorizontalMarginChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">
                  Left: {proxyPrinter.printSettings.marginLeft.toFixed(1)}" | Right: {proxyPrinter.printSettings.marginRight.toFixed(1)}"
                </div>
              </div>

              {/* Card Gap Control */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Card Gap
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={proxyPrinter.printSettings.cardGap}
                  onChange={(e) => setPrintSettings({ cardGap: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">{proxyPrinter.printSettings.cardGap.toFixed(2)}"</div>
              </div>
            </div>
          </div>

          {/* Print Preview */}
          {proxyPrinter.printSettings.showPreview && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Print Preview</h3>
              
              {/* Calculate realistic card layout */}
              {(() => {
                // Standard playing card size: 2.5" × 3.5" (63.5mm × 88.9mm)
                const cardWidth = 2.5; // inches
                const cardHeight = 3.5; // inches
                
                // Paper dimensions (landscape)
                const paperWidth = 11; // inches
                const paperHeight = 8.5; // inches
                
                // Available space after margins
                const availableWidth = paperWidth - proxyPrinter.printSettings.marginLeft - proxyPrinter.printSettings.marginRight;
                const availableHeight = paperHeight - proxyPrinter.printSettings.marginTop - proxyPrinter.printSettings.marginBottom;
                
                // Calculate how many cards fit
                const cardsPerRow = Math.floor(availableWidth / cardWidth);
                const cardsPerColumn = Math.floor(availableHeight / cardHeight);
                const cardsPerPage = cardsPerRow * cardsPerColumn;
                const totalPages = Math.ceil(totalItems / cardsPerPage);
                
                return (
                  <div className="bg-white rounded-lg p-4 shadow-lg">
                    <div className="flex gap-6">
                      {/* Left side - Information */}
                      <div className="w-64 space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Paper Settings</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Size:</strong> 8.5" × 11" (Landscape)</p>
                            <p><strong>Effective Margins:</strong></p>
                            {(() => {
                              // Calculate effective margins for preview
                              const availableWidth = 11 - proxyPrinter.printSettings.marginLeft - proxyPrinter.printSettings.marginRight;
                              const availableHeight = 8.5 - proxyPrinter.printSettings.marginTop - proxyPrinter.printSettings.marginBottom;
                              const cardsPerRow = Math.floor(availableWidth / 2.5);
                              const cardsPerColumn = Math.floor(availableHeight / 3.5);
                              const gridWidth = (cardsPerRow * 2.5) + ((cardsPerRow - 1) * proxyPrinter.printSettings.cardGap);
                              const gridHeight = (cardsPerColumn * 3.5) + ((cardsPerColumn - 1) * proxyPrinter.printSettings.cardGap);
                              const centerOffsetX = (availableWidth - gridWidth) / 2;
                              const centerOffsetY = (availableHeight - gridHeight) / 2;
                              
                              const effectiveTop = proxyPrinter.printSettings.marginTop + centerOffsetY;
                              const effectiveBottom = proxyPrinter.printSettings.marginBottom + centerOffsetY;
                              const effectiveLeft = proxyPrinter.printSettings.marginLeft + centerOffsetX;
                              const effectiveRight = proxyPrinter.printSettings.marginRight + centerOffsetX;
                              
                              return (
                                <>
                                  <p className="ml-2">• Top: {effectiveTop.toFixed(1)}"</p>
                                  <p className="ml-2">• Bottom: {effectiveBottom.toFixed(1)}"</p>
                                  <p className="ml-2">• Left: {effectiveLeft.toFixed(1)}"</p>
                                  <p className="ml-2">• Right: {effectiveRight.toFixed(1)}"</p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Layout</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Available space:</strong> {availableWidth.toFixed(1)}" × {availableHeight.toFixed(1)}"</p>
                            <p><strong>Card gap:</strong> {proxyPrinter.printSettings.cardGap.toFixed(2)}"</p>
                            <p><strong>Cards per page:</strong> {cardsPerRow} × {cardsPerColumn} = {cardsPerPage}</p>
                            <p><strong>Total pages:</strong> {totalPages}</p>
                          </div>
                        </div>
                        
                        {/* Show warning if cards don't fit well */}
                        {cardsPerPage < 6 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-xs text-yellow-800">
                                Only {cardsPerPage} cards fit per page. Consider reducing margins for better space utilization.
                              </span>
                            </div>
                          </div>
                        )}
                        
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Summary</h4>
                          <div className="text-sm text-gray-600">
                            <p>{totalItems} cards will be arranged across {totalPages} page{totalPages !== 1 ? 's' : ''}</p>
                            {totalItems > cardsPerPage && (
                              <p className="text-xs mt-1">Showing first {cardsPerPage} cards on this page</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side - Preview */}
                      <div className="flex-1 flex justify-center">
                        <div 
                          className="bg-gray-50 border-2 border-gray-300 relative"
                          style={{
                            width: '500px', // Larger preview
                            height: '375px'  // Larger preview
                          }}
                        >
                          {/* Show available print area */}
                          <div 
                            className="bg-white border border-gray-200 absolute"
                            style={{
                              left: `${(proxyPrinter.printSettings.marginLeft / paperWidth) * 100}%`,
                              top: `${(proxyPrinter.printSettings.marginTop / paperHeight) * 100}%`,
                              width: `${(availableWidth / paperWidth) * 100}%`,
                              height: `${(availableHeight / paperHeight) * 100}%`
                            }}
                          >
                            {/* Show card grid - 2 rows of 4 columns */}
                            <div 
                              className="w-full h-full grid grid-cols-4 grid-rows-2 p-1"
                              style={{ gap: `${proxyPrinter.printSettings.cardGap * 4}px` }}
                            >
                              {Array.from({ length: Math.min(8, cardsPerPage) }, (_, i) => {
                                const card = proxyPrinter.printList[i];
                                if (!card) {
                                  return (
                                    <div key={`empty-${i}`} className="bg-gray-100 border border-gray-300 rounded-sm flex items-center justify-center">
                                      <div className="text-gray-400 text-xs">Empty</div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={card.product_id} className="bg-gray-100 border border-gray-300 rounded-sm overflow-hidden relative">
                                    <img
                                      src={getProductImageIcon(card.product_id)}
                                      alt={`Card ${card.product_id}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement!.innerHTML = `
                                          <div class="flex items-center justify-center h-full text-gray-400">
                                            <div class="text-xs text-center p-1">
                                              <div class="text-xs">Card ${card.product_id}</div>
                                            </div>
                                          </div>
                                        `;
                                      }}
                                    />
                                    
                                    {/* Quantity indicator */}
                                    {card.quantity > 1 && (
                                      <div className="absolute top-0 right-0 bg-black/70 text-white text-xs px-1 rounded-bl">
                                        ×{card.quantity}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Print Actions */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Total Cards: {totalItems}</h3>
              <div className="flex gap-3">
                <button 
                  onClick={togglePreview}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {proxyPrinter.printSettings.showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button 
                  onClick={generatePDF}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate PDF
                </button>
                <button 
                  onClick={handleClearClick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear Print List
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Full-size Image Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={handleCloseModal}
          />
          
          {/* Modal Content */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10">
            {/* Close button - positioned absolutely */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 rounded-full p-2 text-gray-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content - Just the image */}
            <div className="p-4">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800/50 border border-white/10">
                <Image
                  src={getProductImageCard(selectedCard.product_id)}
                  alt={selectedCard.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                  unoptimized
                  onError={(e) => {
                    // Replace with "Coming Soon" placeholder for unreleased images
                    const target = e.target as HTMLImageElement;
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 p-4">
                          <svg class="w-16 h-16 mb-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                          </svg>
                          <div class="text-center">
                            <div class="text-sm font-medium text-gray-200 mb-1">Image Coming Soon</div>
                            <div class="text-xs text-gray-400">Card not yet released</div>
                          </div>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Print List Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Clear Print List</h3>
            </div>
            
            <p className="text-gray-200 mb-6">
              Are you sure you want to clear your print list? This will remove all {totalItems} cards and cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={clearPrintList}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
              >
                Clear Print List
              </button>
            </div>
        </div>
      </div>
      )}

      {/* Sign In Modal for Copy from Deck */}
      <SignInModal
        isOpen={showCopyFromDeckModal}
        onClose={() => setShowCopyFromDeckModal(false)}
        title="Sign In Required"
        message="You need to be signed in to copy cards from your decks. Sign in to access your personal deck collection and create proxy cards."
      />
    </div>
  );
}
