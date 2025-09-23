'use client';

import React from 'react';

interface DeckBuilderHeaderProps {
  onShowDeckSettings: () => void;
  onShowCoverModal: () => void;
  deckOperations: any; // TODO: Type this properly
}

export function DeckBuilderHeader({ onShowDeckSettings, onShowCoverModal, deckOperations }: DeckBuilderHeaderProps) {
  const { 
    deckName, 
    hasUnsavedNameChanges, 
    saveDeckName, 
    handleDeckNameChange,
    backToDeckList,
    moveCardsFromHand,
    handlePrintToProxy,
    generateDecklistImage,
    setShowPrintConfirmModal
  } = deckOperations;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={backToDeckList}
              className="p-2 text-white/70 hover:text-white transition-colors"
              title="Back to Deck List"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Deck Builder
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={deckName}
              onChange={(e) => handleDeckNameChange(e.target.value)}
              className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter deck name..."
            />
            {hasUnsavedNameChanges && (
              <button
                onClick={saveDeckName}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save
              </button>
            )}
            <button
              onClick={onShowCoverModal}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Change Cover
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={moveCardsFromHand}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            Add from Hand
          </button>
          
          <button
            onClick={generateDecklistImage}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Decklist to Image
          </button>
          
          <button
            onClick={handlePrintToProxy}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Proxy Printer
          </button>
          
          <button
            onClick={() => {
              console.log('🔧 Deck settings button clicked');
              onShowDeckSettings();
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
