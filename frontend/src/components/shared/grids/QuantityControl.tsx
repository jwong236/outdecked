'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/card';
import { dataManager } from '@/lib/dataManager';

interface QuantityControlProps {
  card: Card;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  context?: 'hand' | 'printList' | 'deck';
  onQuantityChange?: (card: Card, change: number) => void;
}

export function QuantityControl({ 
  card, 
  className = '',
  size = 'md',
  context = 'hand',
  onQuantityChange
}: QuantityControlProps) {
  const [quantity, setQuantity] = useState(0);
  
  // Use card prop directly for deck context to avoid state sync issues
  const effectiveQuantity = context === 'deck' ? (card.quantity || 0) : quantity;

  // Get current quantity for this specific card
  const getCurrentQuantity = () => {
    if (context === 'printList') {
      const printList = dataManager.getPrintList();
      const existingItem = printList.find(item => item.card_url === card.card_url);
      return existingItem ? existingItem.quantity : 0;
    } else if (context === 'deck') {
      // For deck context, use the quantity from the card prop (which comes from searchResults state)
      return card.quantity || 0;
    } else {
      const hand = dataManager.getHand();
      const existingItem = hand.find(item => item.card_url === card.card_url);
      return existingItem ? existingItem.quantity : 0;
    }
  };

  // Update quantity using DataManager
  const updateQuantity = (change: number) => {
    if (context === 'printList') {
      if (quantity === 0 && change > 0) {
        // Adding new card to print list
        dataManager.addToPrintList([{ ...card, quantity: change }]);
      } else {
        // Update print list quantity
        const printList = dataManager.getPrintList();
        const existingIndex = printList.findIndex(item => item.card_url === card.card_url);
        
        if (existingIndex >= 0) {
          const newQuantity = printList[existingIndex].quantity + change;
          if (newQuantity <= 0) {
            // Remove from print list
            const updatedList = printList.filter(item => item.card_url !== card.card_url);
            dataManager.setPrintList(updatedList);
          } else {
            // Update quantity
            printList[existingIndex].quantity = newQuantity;
            dataManager.setPrintList(printList);
          }
        }
      }
    } else if (context === 'deck') {
      // For deck context, use the callback function
      if (onQuantityChange) {
        onQuantityChange(card, change);
      }
    } else {
      if (quantity === 0 && change > 0) {
        // Adding new card to hand
        dataManager.addToHand(card, change);
      } else {
        // Updating existing card quantity
        dataManager.updateHandQuantity(card.card_url!, change);
      }
    }
    
    // For deck context, don't update local state immediately since it will be updated by the parent
    if (context !== 'deck') {
      const newQuantity = getCurrentQuantity();
      setQuantity(newQuantity);
    }
  };

  // Load initial quantity and update when card prop changes
  useEffect(() => {
    if (context === 'deck') {
      // For deck context, directly use card.quantity and update immediately
      const newQuantity = card.quantity || 0;
      setQuantity(newQuantity);
    } else {
      setQuantity(getCurrentQuantity());
      
      // Listen for cart updates (only for hand and printList contexts)
      const handleCartUpdate = () => {
        setQuantity(getCurrentQuantity());
      };
      
      window.addEventListener('cartUpdated', handleCartUpdate);
      
      return () => {
        window.removeEventListener('cartUpdated', handleCartUpdate);
      };
    }
  }, [card.quantity, context]); // Remove card.card_url from dependencies

  const sizeClasses = {
    sm: {
      button: 'px-3 py-1.5 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs',
      container: 'gap-1'
    },
    md: {
      button: 'px-4 py-2 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm',
      container: 'gap-2'
    },
    lg: {
      button: 'px-6 py-3 text-base',
      icon: 'w-5 h-5',
      text: 'text-base',
      container: 'gap-3'
    }
  };

  if (effectiveQuantity === 0) {
    // Show "Add to Hand" or "Add to Deck" button based on context
    const isDeckContext = context === 'deck';
    
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateQuantity(1);
        }}
        className={`${sizeClasses[size].button} ${isDeckContext ? 'bg-green-600 hover:bg-green-700 border-green-500' : 'bg-blue-600 hover:bg-blue-700 border-blue-500'} text-white rounded-md transition-colors duration-150 font-medium flex items-center justify-center gap-2 border shadow-sm ${className}`}
      >
        {isDeckContext ? (
          // Deck icon
          <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        ) : (
          // Hand icon
          <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
        )}
        <span>{isDeckContext ? 'Add to Deck' : 'Add to Hand'}</span>
      </button>
    );
  }

  // Show quantity control - modern design with better styling
  return (
    <div className={`flex items-center bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 shadow-sm overflow-hidden justify-center ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateQuantity(-1);
        }}
        className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center rounded-l-lg min-w-[2rem]`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      
      <div className={`${sizeClasses[size].button} text-white flex items-center justify-center font-medium border-l border-r border-white/20`}>
        {effectiveQuantity}
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateQuantity(1);
        }}
        className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center rounded-r-lg min-w-[2rem]`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
    </div>
  );
}
