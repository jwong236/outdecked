// No need for jsPDF anymore - we'll use canvas for PNG generation
import { getCardImageAsBase64 } from './imageUtils';

export interface DeckCard {
  name: string;
  product_id: number;
  quantity: number;
  CardType: string;
  RequiredEnergy: string;
}

export interface DecklistImageOptions {
  deckName: string;
  cards: DeckCard[];
}

// PDF generation removed - using image generation instead

function groupCardsByType(cards: DeckCard[]): Record<string, DeckCard[]> {
  const grouped: Record<string, DeckCard[]> = {};
  
  // Define card type order
  const typeOrder = ['Character', 'Event', 'Action Point', 'Site'];
  
  // Group cards by type
  cards.forEach(card => {
    const cardType = card.CardType || 'Other';
    if (!grouped[cardType]) {
      grouped[cardType] = [];
    }
    grouped[cardType].push(card);
  });
  
  // Sort cards within each type by required energy (descending)
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => {
      const energyA = parseInt(a.RequiredEnergy || '0') || 0;
      const energyB = parseInt(b.RequiredEnergy || '0') || 0;
      return energyB - energyA; // Descending order
    });
  });
  
  // Return grouped cards in the specified order
  const orderedGroups: Record<string, DeckCard[]> = {};
  typeOrder.forEach(type => {
    if (grouped[type]) {
      orderedGroups[type] = grouped[type];
    }
  });
  
  // Add any remaining types
  Object.keys(grouped).forEach(type => {
    if (!typeOrder.includes(type)) {
      orderedGroups[type] = grouped[type];
    }
  });
  
  return orderedGroups;
}

// Helper function to load image as base64 using backend proxy
const loadImageAsBase64 = async (productId: number): Promise<string | null> => {
  try {
    console.log(`🖼️ Fetching image for product: ${productId}`);
    const base64Image = await getCardImageAsBase64(productId, "1000x1000");
    
    if (!base64Image) {
      console.warn(`Image not available for product ${productId}`);
      return null;
    }
    
    return base64Image;
  } catch (error) {
    console.error(`Failed to load image for product ${productId}:`, error);
    return null;
  }
};

export async function generateDecklistImage(options: DecklistImageOptions): Promise<Blob> {
  const { deckName, cards } = options;
  
  // Set up canvas dimensions - comfortable size for 3 rows of 5 cards
  const cardWidth = 200; // Comfortable card width in pixels
  const cardHeight = 280; // Comfortable card height in pixels (2.5:3.5 ratio)
  const cardSpacing = 10; // Minimal spacing between cards
  const margin = 15; // Very close margins
  
  const canvasWidth = (cardWidth * 5) + (cardSpacing * 4) + (margin * 2);
  const canvasHeight = (cardHeight * 3) + (cardSpacing * 2) + (margin * 2);
  
  // Use higher resolution for better quality
  const scale = 2; // 2x resolution for crisp images
  const scaledCanvasWidth = canvasWidth * scale;
  const scaledCanvasHeight = canvasHeight * scale;
  
  // Fixed layout - 3 rows of 5 cards
  const cardsPerRow = 5;
  const cardsPerColumn = 3;
  
  // Sort all cards by required energy (descending) - no grouping by type
  const sortedCards = [...cards].sort((a, b) => {
    const energyA = parseInt(a.RequiredEnergy || '0') || 0;
    const energyB = parseInt(b.RequiredEnergy || '0') || 0;
    return energyB - energyA; // Descending order
  });
  
  // Limit to exactly 15 cards (5 per row × 3 rows) to fit on one page
  const cardsToShow = sortedCards.slice(0, 15);
  
  // Create canvas with high resolution
  const canvas = document.createElement('canvas');
  canvas.width = scaledCanvasWidth;
  canvas.height = scaledCanvasHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Scale the context to match our desired dimensions
  ctx.scale(scale, scale);
  
  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Add all cards in a simple grid layout - exactly 3 rows of 5 cards
  let cardIndex = 0;
  
  for (let row = 0; row < cardsPerColumn; row++) {
    let currentX = margin;
    
    for (let col = 0; col < cardsPerRow; col++) {
      if (cardIndex >= cardsToShow.length) break;
      
      const card = cardsToShow[cardIndex];
      const currentY = margin + (row * (cardHeight + cardSpacing));
        
      try {
        // Use proxy method to get base64 image
        console.log(`🖼️ Loading image for ${card.name}: product_id ${card.product_id}`);
        if (!card.product_id) {
          throw new Error(`No product_id for ${card.name}`);
        }
        const base64Image = await loadImageAsBase64(card.product_id);
        
        if (!base64Image) {
          throw new Error(`Failed to load image for ${card.name}`);
        }
        
        // Create image element
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = base64Image;
        });
        
        // Draw image to canvas
        ctx.drawImage(img, currentX, currentY, cardWidth, cardHeight);
        
        // Add quantity if more than 1
        if (card.quantity > 1) {
          const quantityRadius = Math.max(15, cardWidth * 0.08); // Scale with card size
          const quantityX = currentX + cardWidth - quantityRadius - 8;
          const quantityY = currentY + quantityRadius + 8;
          
          // Draw black circle for quantity
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(quantityX, quantityY, quantityRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw white text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(12, cardWidth * 0.06)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.quantity.toString(), quantityX, quantityY);
        }
        
      } catch (error) {
        console.warn(`Failed to load image for ${card.name}:`, error);
        
        // Fallback: add placeholder rectangle
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(currentX, currentY, cardWidth, cardHeight);
        
        // Add card name as text
        ctx.fillStyle = '#000000';
        ctx.font = `${Math.max(12, cardWidth * 0.05)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cardName = card.name.length > 15 ? card.name.substring(0, 12) + '...' : card.name;
        ctx.fillText(cardName || 'Unknown Card', currentX + cardWidth/2, currentY + cardHeight/2);
        
        // Add quantity if more than 1
        if (card.quantity > 1) {
          const quantityRadius = Math.max(15, cardWidth * 0.08);
          const quantityX = currentX + cardWidth - quantityRadius - 8;
          const quantityY = currentY + quantityRadius + 8;
          
          // Draw black circle for quantity
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(quantityX, quantityY, quantityRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw white text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(12, cardWidth * 0.06)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.quantity.toString(), quantityX, quantityY);
        }
      }
        
      currentX += cardWidth + cardSpacing;
      cardIndex++;
    }
  }
  
  // Add "Made by OutDecked" text in bottom right corner
  ctx.fillStyle = '#969696'; // Light gray color
  ctx.font = '18px Arial';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const text = "Made by OutDecked";
  ctx.fillText(text, canvasWidth - margin, canvasHeight - margin);
  
  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob'));
      }
    }, 'image/png', 1.0);
  });
}