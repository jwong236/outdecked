// No need for jsPDF anymore - we'll use canvas for PNG generation

export interface DeckCard {
  name: string;
  image_url: string;
  quantity: number;
  CardType: string;
  RequiredEnergy: string;
}

export interface DecklistImageOptions {
  deckName: string;
  cards: DeckCard[];
}

export async function generateDecklistPdf(options: DecklistPdfOptions): Promise<jsPDF> {
  const { deckName, cards } = options;
  
  // Create PDF document (A4 size)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set up page dimensions
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  // Card dimensions (in mm)
  const cardWidth = 25;
  const cardHeight = 35;
  const cardSpacing = 2;
  const cardsPerRow = Math.floor((contentWidth + cardSpacing) / (cardWidth + cardSpacing));
  
  // Group cards by type and sort by required energy (descending)
  const groupedCards = groupCardsByType(cards);
  
  let currentY = margin + 20; // Start below title
  
  // Add title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(deckName, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;
  
  // Process each card type group
  for (const [cardType, typeCards] of Object.entries(groupedCards)) {
    // Add card type header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${cardType} (${typeCards.length} cards)`, margin, currentY);
    currentY += 8;
    
    // Add cards for this type
    let currentX = margin;
    let rowCount = 0;
    
    for (const card of typeCards) {
      // Check if we need a new page
      if (currentY + cardHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
        currentX = margin;
        rowCount = 0;
      }
      
      // Check if we need a new row
      if (currentX + cardWidth > pageWidth - margin) {
        currentX = margin;
        currentY += cardHeight + cardSpacing;
        rowCount++;
        
        // Check if we need a new page after row break
        if (currentY + cardHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          currentX = margin;
          rowCount = 0;
        }
      }
      
      // Add card image placeholder (rectangle for now)
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(currentX, currentY, cardWidth, cardHeight, 'FD');
      
      // Add card name (truncated if too long)
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const cardName = card.name.length > 20 ? card.name.substring(0, 17) + '...' : card.name;
      pdf.text(cardName, currentX + 1, currentY + cardHeight - 2);
      
      // Add quantity if more than 1
      if (card.quantity > 1) {
        pdf.setFillColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        const quantityBoxSize = 6;
        const quantityX = currentX + cardWidth - quantityBoxSize - 1;
        const quantityY = currentY + 1;
        
        pdf.rect(quantityX, quantityY, quantityBoxSize, quantityBoxSize, 'FD');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(card.quantity.toString(), quantityX + 1.5, quantityY + 4);
        pdf.setTextColor(0, 0, 0); // Reset text color
      }
      
      // Add required energy if available
      if (card.RequiredEnergy) {
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Energy: ${card.RequiredEnergy}`, currentX + 1, currentY + cardHeight - 8);
      }
      
      currentX += cardWidth + cardSpacing;
    }
    
    // Move to next section
    currentY += cardHeight + 10;
  }
  
  return pdf;
}

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

// Helper function to load image as base64 using backend proxy (same as proxy printer)
const loadImageAsBase64 = async (url: string): Promise<string> => {
  try {
    // Try to fetch through our backend proxy
    const proxyUrl = `/api/images?url=${encodeURIComponent(url)}`;
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
    // Fallback to direct method (will likely fail due to CORS)
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Convert to base64
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
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
        const base64Image = await loadImageAsBase64(card.image_url);
        
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