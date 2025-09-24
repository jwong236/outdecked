'use client';

import { useState, useEffect } from 'react';
import { generateDecklistImage } from '@/lib/decklistPdfGenerator';
import { CardRef, ExpandedCard } from '@/types/card';
import { Modal } from '@/components/shared/modals/Modal';

interface DecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckName: string;
  cards: ExpandedCard[];
}

export function DecklistModal({ isOpen, onClose, deckName, cards }: DecklistModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    if (isOpen && cards.length > 0) {
      generateImage();
    }
  }, [isOpen, cards, deckName]);

  const generateImage = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Convert ExpandedCard[] to DeckCard[] for the generator
      const deckCards = cards.map(card => ({
        name: card.name,
        card_url: card.card_url,
        quantity: card.quantity,
        CardType: card.attributes.find(attr => attr.name === 'CardType')?.value || 'Unknown',
        RequiredEnergy: card.attributes.find(attr => attr.name === 'RequiredEnergy')?.value || '0',
      }));

      const imageBlob = await generateDecklistImage({
        deckName,
        cards: deckCards
      });
      
      setPdfBlob(imageBlob);
      
      // Create preview URL
      const url = URL.createObjectURL(imageBlob);
      setPreviewUrl(url);
      
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate decklist image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${deckName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_decklist.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPdfBlob(null);
    setError(null);
    setShowPdfViewer(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Decklist to Image"
    >
      <p className="text-gray-300 mb-6">{deckName}</p>
      
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Generating decklist image...</p>
            </>
          ) : error ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 bg-red-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={generateImage}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </>
          ) : pdfBlob ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 bg-green-600/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white mb-6">Image generated successfully!</p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PNG
                </button>
                
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
    </Modal>
  );
}
