import { Card } from '@/types/card';

/**
 * Extracts the set code from a card's group abbreviation
 * Example: "UEX05BT" -> "UEX05BT"
 */
export function extractSetCode(groupAbbreviation: string): string {
  if (!groupAbbreviation) return '';
  
  // The abbreviation field already contains the set code
  return groupAbbreviation.trim();
}

/**
 * URL encodes a string for TCGPlayer mass entry
 */
export function urlEncodeForTCGPlayer(text: string): string {
  return encodeURIComponent(text)
    .replace(/%20/g, '%20')  // Space
    .replace(/%5B/g, '%5B')  // [
    .replace(/%5D/g, '%5D')  // ]
    .replace(/%7C%7C/g, '%7C%7C'); // ||
}

/**
 * Generates a TCGPlayer mass entry URL for a deck
 */
export function generateTCGPlayerURL(cards: Card[]): string {
  if (!cards || cards.length === 0) {
    return '';
  }

  const baseURL = 'https://www.tcgplayer.com/massentry?productline=Union%20Arena&c=';
  
  // Group cards by name and set code to combine quantities
  const cardMap = new Map<string, { quantity: number; setCode: string; name: string }>();
  
  cards.forEach(card => {
    // Debug: log the card data to see what we're working with
    console.log('Card data:', {
      name: card.name,
      group_abbreviation: card.group_abbreviation,
      group_name: card.group_name,
      SeriesName: card.SeriesName
    });
    
    const setCode = extractSetCode(card.group_abbreviation || '');
    console.log('Extracted set code:', setCode);
    
    const key = `${card.name}|${setCode}`;
    
    if (cardMap.has(key)) {
      cardMap.get(key)!.quantity += card.quantity || 1; // Use the card's actual quantity
    } else {
      cardMap.set(key, {
        quantity: card.quantity || 1, // Use the card's actual quantity
        setCode,
        name: card.name
      });
    }
  });

  // Build the card list string
  const cardEntries: string[] = [];
  
  cardMap.forEach(({ quantity, setCode, name }) => {
    console.log('Building entry:', { quantity, setCode, name });
    if (setCode) {
      // Format: {quantity} {card_name} [{set_code}]
      const entry = `${quantity} ${name} [${setCode}]`;
      cardEntries.push(entry);
      console.log('Added entry with set code:', entry);
    } else {
      // If no set code, just use name
      const entry = `${quantity} ${name}`;
      cardEntries.push(entry);
      console.log('Added entry without set code:', entry);
    }
  });

  // Join with || and URL encode
  const cardListString = cardEntries.join('||');
  console.log('Final card list string:', cardListString);
  const encodedCardList = urlEncodeForTCGPlayer(cardListString);
  const finalURL = baseURL + encodedCardList;
  console.log('Final TCGPlayer URL:', finalURL);
  
  return finalURL;
}

/**
 * Opens TCGPlayer mass entry in a new tab
 */
export function openTCGPlayerDeck(cards: Card[]): void {
  const url = generateTCGPlayerURL(cards);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
