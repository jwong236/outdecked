'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/card';
import { ProxyGrid } from '@/features/proxy-printer/ProxyGrid';
import { CardDetailModal } from '@/features/search/CardDetailModal';
import { SignInModal } from '@/components/shared/modals/SignInModal';
import { dataManager, PrintListItem } from '../../lib/dataManager';
import { useAuth } from '@/features/auth/AuthContext';
import { apiConfig } from '../../lib/apiConfig';
import jsPDF from 'jspdf';

export function ProxyPrinterPage() {
  const { user } = useAuth();
  const [printList, setPrintList] = useState<PrintListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCopyFromDeckModal, setShowCopyFromDeckModal] = useState(false);
  
  // PDF generation settings
  const [marginTop, setMarginTop] = useState(0.5); // inches
  const [marginBottom, setMarginBottom] = useState(0.5);
  const [marginLeft, setMarginLeft] = useState(0.5);
  const [marginRight, setMarginRight] = useState(0.5);
  const [cardGap, setCardGap] = useState(0.1); // Gap between cards in inches
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const loadPrintList = () => {
      const printData = dataManager.getPrintList();
      setPrintList(printData);
      setIsLoading(false);
    };

    loadPrintList();
    
    // Listen for print list updates
    const handlePrintListUpdate = () => {
      loadPrintList();
    };
    
    window.addEventListener('printListUpdated', handlePrintListUpdate);
    
    return () => {
      window.removeEventListener('printListUpdated', handlePrintListUpdate);
    };
  }, []);

  // Handle margin changes - zero sum positioning
  const handleVerticalMarginChange = (value: number) => {
    // value represents top margin, bottom margin compensates
    setMarginTop(value);
    setMarginBottom(1.0 - value); // Total margin space is 1.0
  };

  const handleHorizontalMarginChange = (value: number) => {
    // value represents left margin, right margin compensates  
    setMarginLeft(value);
    setMarginRight(1.0 - value); // Total margin space is 1.0
  };

  const clearPrintList = () => {
    dataManager.clearPrintList();
    setPrintList([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleCardClick = (card: Card) => {
    const index = printList.findIndex(c => c.card_url === card.card_url);
    setSelectedCard(card);
    setSelectedCardIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
    setSelectedCardIndex(0);
  };

  const handleNavigate = (index: number) => {
    if (printList[index]) {
      const printItem = printList[index];
      const card: Card = {
        id: 0,
        product_id: 0,
        name: printItem.name || '',
        clean_name: null,
        image_url: printItem.image_url || null,
        card_url: printItem.card_url,
        game: 'Union Arena',
        category_id: 0,
        group_id: 0,
        image_count: 0,
        is_presale: false,
        released_on: '',
        presale_note: '',
        modified_on: '',
        price: printItem.price ?? null,
        low_price: null,
        mid_price: null,
        high_price: null,
        created_at: '',
      };
      setSelectedCard(card);
      setSelectedCardIndex(index);
    }
  };

  const totalItems = dataManager.getPrintListTotalItems();

  // Helper function to load image as base64 using backend proxy
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      // Fetch through our backend proxy for highest quality
      const proxyUrl = `${apiConfig.getApiUrl('/api/images')}?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.status}`);
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
      console.error('Failed to load image via proxy:', error);
      throw new Error(`Failed to load image: ${error.message}`);
    }
  };

  const generatePDF = async () => {
    if (printList.length === 0) {
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
      const availableWidth = 11 - marginLeft - marginRight;
      const availableHeight = 8.5 - marginTop - marginBottom;
      const cardsPerRow = Math.floor(availableWidth / cardWidth);
      const cardsPerColumn = Math.floor(availableHeight / cardHeight);
      const cardsPerPage = cardsPerRow * cardsPerColumn;
      
      // Calculate total pages needed
      const totalPages = Math.ceil(totalItems / cardsPerPage);
      
      // Create expanded list with individual cards based on quantity
      const expandedCards: PrintListItem[] = [];
      printList.forEach(card => {
        for (let i = 0; i < card.quantity; i++) {
          expandedCards.push({ ...card, quantity: 1 }); // Each individual card has quantity 1
        }
      });
      
      let cardIndex = 0;
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate the actual grid dimensions
        const gridWidth = (cardsPerRow * cardWidth) + ((cardsPerRow - 1) * cardGap);
        const gridHeight = (cardsPerColumn * cardHeight) + ((cardsPerColumn - 1) * cardGap);
        
        // Calculate centering offsets
        const centerOffsetX = (availableWidth - gridWidth) / 2;
        const centerOffsetY = (availableHeight - gridHeight) / 2;
        
        // Calculate effective margins (base margins + centering offsets)
        const effectiveMarginLeft = marginLeft + centerOffsetX;
        const effectiveMarginRight = marginRight + centerOffsetX;
        const effectiveMarginTop = marginTop + centerOffsetY;
        const effectiveMarginBottom = marginBottom + centerOffsetY;
        
        // Add cards to this page
        for (let row = 0; row < cardsPerColumn && cardIndex < expandedCards.length; row++) {
          for (let col = 0; col < cardsPerRow && cardIndex < expandedCards.length; col++) {
            const card = expandedCards[cardIndex];
            
            // Calculate position with proper centering
            const x = effectiveMarginLeft + (col * (cardWidth + cardGap));
            const y = effectiveMarginTop + (row * (cardHeight + cardGap));
            
            // Add card image if available
            if (card.image_url) {
              try {
                // Use proxy method to get base64 image
                const base64Image = await loadImageAsBase64(card.image_url);
                
                // Add image to PDF
                pdf.addImage(
                  base64Image,
                  'JPEG',
                  x,
                  y,
                  cardWidth,
                  cardHeight
                );
              } catch (error) {
                // Add placeholder rectangle if image fails
                pdf.setFillColor(200, 200, 200);
                pdf.rect(x, y, cardWidth, cardHeight, 'F');
                
                // Add card name as text
                pdf.setFontSize(8);
                pdf.setTextColor(0, 0, 0);
                pdf.text(card.name || 'Unknown Card', x + 0.1, y + cardHeight / 2);
              }
            } else {
              // Add placeholder rectangle if no image
              pdf.setFillColor(200, 200, 200);
              pdf.rect(x, y, cardWidth, cardHeight, 'F');
              
              // Add card name as text
              pdf.setFontSize(8);
              pdf.setTextColor(0, 0, 0);
              pdf.text(card.name || 'Unknown Card', x + 0.1, y + cardHeight / 2);
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
    setShowPreview(!showPreview);
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

      {printList.length === 0 ? (
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
              cards={printList.map(item => ({
                id: 0,
                product_id: 0,
                name: item.name || '',
                clean_name: null,
                image_url: item.image_url || null,
                card_url: item.card_url,
                game: 'Union Arena',
                category_id: 0,
                group_id: 0,
                image_count: 0,
                is_presale: false,
                released_on: '',
                presale_note: '',
                modified_on: '',
                price: item.price ?? null,
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
                  value={marginTop}
                  onChange={(e) => handleVerticalMarginChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">
                  Top: {marginTop.toFixed(1)}" | Bottom: {marginBottom.toFixed(1)}"
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
                  value={marginLeft}
                  onChange={(e) => handleHorizontalMarginChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">
                  Left: {marginLeft.toFixed(1)}" | Right: {marginRight.toFixed(1)}"
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
                  value={cardGap}
                  onChange={(e) => setCardGap(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-white mt-1 font-medium">{cardGap.toFixed(2)}"</div>
              </div>
            </div>
          </div>

          {/* Print Preview */}
          {showPreview && (
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
                const availableWidth = paperWidth - marginLeft - marginRight;
                const availableHeight = paperHeight - marginTop - marginBottom;
                
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
                              const availableWidth = 11 - marginLeft - marginRight;
                              const availableHeight = 8.5 - marginTop - marginBottom;
                              const cardsPerRow = Math.floor(availableWidth / 2.5);
                              const cardsPerColumn = Math.floor(availableHeight / 3.5);
                              const gridWidth = (cardsPerRow * 2.5) + ((cardsPerRow - 1) * cardGap);
                              const gridHeight = (cardsPerColumn * 3.5) + ((cardsPerColumn - 1) * cardGap);
                              const centerOffsetX = (availableWidth - gridWidth) / 2;
                              const centerOffsetY = (availableHeight - gridHeight) / 2;
                              
                              const effectiveTop = marginTop + centerOffsetY;
                              const effectiveBottom = marginBottom + centerOffsetY;
                              const effectiveLeft = marginLeft + centerOffsetX;
                              const effectiveRight = marginRight + centerOffsetX;
                              
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
                            <p><strong>Card gap:</strong> {cardGap.toFixed(2)}"</p>
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
                              left: `${(marginLeft / paperWidth) * 100}%`,
                              top: `${(marginTop / paperHeight) * 100}%`,
                              width: `${(availableWidth / paperWidth) * 100}%`,
                              height: `${(availableHeight / paperHeight) * 100}%`
                            }}
                          >
                            {/* Show card grid - 2 rows of 4 columns */}
                            <div 
                              className="w-full h-full grid grid-cols-4 grid-rows-2 p-1"
                              style={{ gap: `${cardGap * 4}px` }}
                            >
                              {Array.from({ length: Math.min(8, cardsPerPage) }, (_, i) => {
                                const card = printList[i];
                                if (!card) {
                                  return (
                                    <div key={`empty-${i}`} className="bg-gray-100 border border-gray-300 rounded-sm flex items-center justify-center">
                                      <div className="text-gray-400 text-xs">Empty</div>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={card.card_url} className="bg-gray-100 border border-gray-300 rounded-sm overflow-hidden relative">
                                    {card.image_url ? (
                                      <img
                                        src={card.image_url}
                                        alt={card.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          target.parentElement!.innerHTML = `
                                            <div class="flex items-center justify-center h-full text-gray-400">
                                              <div class="text-xs text-center p-1">
                                                <div class="text-xs">${card.name}</div>
                                              </div>
                                            </div>
                                          `;
                                        }}
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-gray-400">
                                        <div className="text-xs text-center p-1">
                                          <div className="text-xs">{card.name}</div>
                                        </div>
                                      </div>
                                    )}
                                    
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
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
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

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={handleCloseModal}
        allCards={printList.map(item => ({
          id: 0,
          product_id: 0,
          name: item.name || '',
          clean_name: null,
          image_url: item.image_url || null,
          card_url: item.card_url,
          game: 'Union Arena',
          category_id: 0,
          group_id: 0,
          image_count: 0,
          is_presale: false,
          released_on: '',
          presale_note: '',
          modified_on: '',
          price: item.price ?? null,
          low_price: null,
          mid_price: null,
          high_price: null,
          created_at: '',
        }))}
        currentIndex={selectedCardIndex}
        onNavigate={handleNavigate}
        hasNextPage={false}
        hasPrevPage={false}
      />

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
