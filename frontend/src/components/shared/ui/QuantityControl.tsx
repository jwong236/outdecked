'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/types/card';
import { useSessionStore } from '@/stores/sessionStore';

interface QuantityControlProps {
  card: Card;
  variant: 'button' | 'control';
  context: 'hand' | 'printList' | 'deck';
  buttonLayout?: '2-button' | '4-button' | '5-button' | 'auto';
  quantity?: number;
  onQuantityChange?: (card: Card, change: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QuantityControl({ 
  card, 
  variant = 'button',
  context = 'hand',
  buttonLayout = 'auto',
  quantity,
  onQuantityChange,
  size = 'md',
  className = ''
}: QuantityControlProps) {
  const [localQuantity, setLocalQuantity] = useState(0);
  
  // Determine effective quantity
  const effectiveQuantity = quantity !== undefined ? quantity : localQuantity;
  
  // Auto-select button layout based on context if not specified
  const resolvedButtonLayout = buttonLayout === 'auto' 
    ? (context === 'deck' ? '4-button' : '2-button')
    : buttonLayout;

  // Get sessionStore functions for hand and printList contexts
  const { handCart, addToHand, updateHandQuantity, removeFromHand, proxyPrinter, setPrintList } = useSessionStore();

  // Get current quantity for this specific card
  const getCurrentQuantity = () => {
    if (context === 'printList') {
      const existingItem = proxyPrinter.printList.find(item => item.product_id === card.product_id);
      return existingItem ? existingItem.quantity : 0;
    } else if (context === 'deck') {
      // For deck context, use the quantity from the card prop or local state
      return card.quantity || localQuantity;
    } else {
      // Hand context - use sessionStore
      const existingItem = handCart.handItems.find(item => item.product_id === card.product_id);
      return existingItem ? existingItem.quantity : 0;
    }
  };

  // Update quantity using appropriate method
  const updateQuantity = (change: number) => {
    if (context === 'printList') {
      const currentPrintList = [...proxyPrinter.printList];
      const existingIndex = currentPrintList.findIndex(item => item.product_id === card.product_id);
      
      if (existingIndex >= 0) {
        const newQuantity = currentPrintList[existingIndex].quantity + change;
        if (newQuantity <= 0) {
          // Remove from print list
          const updatedList = currentPrintList.filter(item => item.product_id !== card.product_id);
          setPrintList(updatedList);
        } else {
          // Update quantity
          currentPrintList[existingIndex].quantity = newQuantity;
          setPrintList(currentPrintList);
        }
      } else if (change > 0) {
        // Adding new card to print list
        currentPrintList.push({ product_id: card.product_id, quantity: change });
        setPrintList(currentPrintList);
      }
    } else if (context === 'deck') {
      // For deck context, use the callback function
      if (onQuantityChange) {
        onQuantityChange(card, change);
      }
    } else {
      // Hand context - use sessionStore
      console.log('🛒 QuantityControl: Updating hand quantity for', card.name, 'change:', change, 'effectiveQuantity:', effectiveQuantity);
      if (effectiveQuantity === 0 && change > 0) {
        // Adding new card to hand
        console.log('🛒 QuantityControl: Adding new card to hand:', card.name);
        addToHand(card.product_id, change);
      } else {
        // Updating existing card quantity
        console.log('🛒 QuantityControl: Updating existing card quantity:', card.name);
        const newQuantity = effectiveQuantity + change;
        if (newQuantity <= 0) {
          removeFromHand(card.product_id);
        } else {
          updateHandQuantity(card.product_id, newQuantity);
        }
      }
    }
    
    // Update local state for non-deck contexts
    if (context !== 'deck') {
      // For hand context, calculate the new quantity directly since we know the change
      if (context === 'hand') {
        const newQuantity = effectiveQuantity + change;
        setLocalQuantity(Math.max(0, newQuantity)); // Ensure it doesn't go below 0
      } else {
        // For other contexts, get from the data source
        const newQuantity = getCurrentQuantity();
        setLocalQuantity(newQuantity);
      }
    }
  };

  // Load initial quantity and update when card prop changes
  useEffect(() => {
    if (context === 'deck') {
      // For deck context, use card.quantity if available
      const newQuantity = card.quantity || 0;
      setLocalQuantity(newQuantity);
    } else {
      setLocalQuantity(getCurrentQuantity());
      
      // Listen for updates
      const handleUpdate = () => {
        setLocalQuantity(getCurrentQuantity());
      };
      
      if (context === 'printList') {
        // For printList context, we don't need event listeners since we're using sessionStore directly
        // The component will re-render when proxyPrinter.printList changes
        return;
      } else {
        window.addEventListener('cartUpdated', handleUpdate);
        return () => {
          window.removeEventListener('cartUpdated', handleUpdate);
        };
      }
    }
  }, [card.quantity, context]);

  // Sync local state when sessionStore changes (for hand context)
  useEffect(() => {
    if (context === 'hand') {
      setLocalQuantity(getCurrentQuantity());
    }
  }, [handCart.handItems, context]);

  const sizeClasses = {
    sm: {
      button: 'px-2 py-1.5 text-xs h-8',
      icon: 'w-3 h-3',
      text: 'text-xs',
      container: 'gap-0'
    },
    md: {
      button: 'px-3 py-2 text-sm h-10',
      icon: 'w-4 h-4',
      text: 'text-sm',
      container: 'gap-0'
    },
    lg: {
      button: 'px-4 py-3 text-base h-12',
      icon: 'w-5 h-5',
      text: 'text-base',
      container: 'gap-0'
    }
  };

  // Determine button text based on context
  const getButtonText = () => {
    switch (context) {
      case 'deck':
        return 'Add to Deck';
      case 'printList':
        return 'Add to Print';
      case 'hand':
      default:
        return 'Add to Hand';
    }
  };

  // Show "Add" button when variant is "button" and quantity is 0
  if (variant === 'button' && effectiveQuantity === 0) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateQuantity(1);
        }}
        className={`${sizeClasses[size].button} bg-blue-600 hover:bg-blue-700 border-blue-500 text-white rounded-md transition-colors duration-150 font-medium flex items-center justify-center gap-2 border shadow-sm ${className}`}
      >
        {/* Hand icon */}
        <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
        </svg>
        <span>{getButtonText()}</span>
      </button>
    );
  }

  // Show quantity control based on button layout
  if (resolvedButtonLayout === '2-button') {
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
        
        {/* Show quantity display for printList and hand contexts */}
        {(context === 'printList' || context === 'hand') && (
          <div className={`${sizeClasses[size].text} text-white font-medium px-2 min-w-[2rem] text-center`}>
            {effectiveQuantity}
          </div>
        )}
        
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

  // Show 4-button layout (trash, -1, +1, +4)
  if (resolvedButtonLayout === '4-button') {
    return (
      <div className={`flex items-stretch bg-white/10 backdrop-blur-sm rounded-lg shadow-sm overflow-hidden gap-0 ${className}`}>
        {/* Trash button - removes card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Remove card by setting quantity to negative of current quantity
            updateQuantity(-effectiveQuantity);
          }}
          className={`${sizeClasses[size].button} text-red-400 hover:bg-red-500/20 transition-colors duration-150 flex items-center justify-center`}
          title="Remove from deck"
        >
          <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
        {/* Minus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(-1);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
        >
          <span className={`${sizeClasses[size].text} font-bold`}>-1</span>
        </button>
        
        
        {/* Plus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(1);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
        >
          <span className={`${sizeClasses[size].text} font-bold`}>+1</span>
        </button>
        
        {/* Plus 4 button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Set quantity directly to 4 instead of adding 4
            const currentQuantity = effectiveQuantity;
            const change = 4 - currentQuantity; // Calculate difference to reach 4
            updateQuantity(change);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
          title="Set quantity to 4"
        >
          <span className={`${sizeClasses[size].text} font-bold`}>4</span>
        </button>
      </div>
    );
  }

  // Show 5-button layout (trash, -1, quantity, +1, +4)
  if (resolvedButtonLayout === '5-button') {
    return (
      <div className={`flex items-stretch bg-white/10 backdrop-blur-sm rounded-lg shadow-sm overflow-hidden gap-0 ${className}`}>
        {/* Trash button - removes card */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Remove card by setting quantity to negative of current quantity
            updateQuantity(-effectiveQuantity);
          }}
          className={`${sizeClasses[size].button} text-red-400 hover:bg-red-500/20 transition-colors duration-150 flex items-center justify-center`}
          title="Remove from deck"
        >
          <svg className={sizeClasses[size].icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        
        {/* Minus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(-1);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
        >
          <span className={`${sizeClasses[size].text} font-bold`}>-1</span>
        </button>
        
        
        {/* Plus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(1);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
        >
          <span className={`${sizeClasses[size].text} font-bold`}>+1</span>
        </button>
        
        {/* Plus 4 button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Set quantity directly to 4 instead of adding 4
            const currentQuantity = effectiveQuantity;
            const change = 4 - currentQuantity; // Calculate difference to reach 4
            updateQuantity(change);
          }}
          className={`${sizeClasses[size].button} text-white hover:bg-white/20 transition-colors duration-150 flex items-center justify-center`}
          title="Set quantity to 4"
        >
          <span className={`${sizeClasses[size].text} font-bold`}>4</span>
        </button>
      </div>
    );
  }

  // Fallback to 2-button layout
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
