import React from 'react';
import { CardContainer } from './CardContainer';
import { Card } from '@/types/card';

// Example card data
const exampleCard: Card = {
  id: 1,
  name: 'Monkey D. Luffy - Captain of the Straw Hat Pirates',
  card_url: 'https://example.com/luffy',
  image_url: 'https://example.com/luffy.jpg',
  clean_name: 'Luffy',
  product_id: 12345,
  game: 'One Piece',
  category_id: 1,
  group_id: 1,
  image_count: 1,
  is_presale: false,
  released_on: '2023-01-01',
  presale_note: '',
  modified_on: '2023-01-01',
  price: 15.99,
  low_price: 10.00,
  mid_price: 15.99,
  high_price: 20.00,
  created_at: '2023-01-01T00:00:00Z',
  // Dynamic attributes
  SeriesName: 'Starter Deck',
  Rarity: 'Super Rare',
  Number: '001',
  CardType: 'Character',
  RequiredEnergy: '3',
  ActionPointCost: '2',
  ActivationEnergy: 'Red',
  Description: 'This card has a special effect',
  GeneratedEnergy: '1',
  BattlePointBP: '5000',
  Trigger: 'None',
  Affinities: 'Straw Hat Pirates',
};

const exampleCardInDeck: Card = {
  ...exampleCard,
};

const exampleCardInHand: Card = {
  ...exampleCard,
};

// Example usage patterns
export function CardContainerExamples() {
  const handleCardClick = (card: Card) => {
    console.log(`Card clicked: ${card.name}`);
  };

  const handleAddToDeck = (card: Card) => {
    console.log(`Add to deck: ${card.name}`);
  };

  const handleQuantityChange = (card: Card, change: number) => {
    console.log(`Quantity changed for ${card.name}: ${change}`);
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-white">CardContainer Examples</h1>
      
      {/* Search Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Search Variant (SearchCard replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Quantity = 0 (Shows Add to Hand button)</h3>
            <CardContainer 
              card={exampleCard}
              variant="search"
              onClick={handleCardClick}
              showPrices={true}
              showRarity={true}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Quantity = 3 (Shows quantity control)</h3>
            <CardContainer 
              card={exampleCardInHand}
              variant="search"
              onClick={handleCardClick}
              showPrices={true}
              showRarity={true}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Deck Search Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Deck Search Variant (DeckBuilderSearchCard replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Not in Deck (Shows Add to Deck button)</h3>
            <CardContainer 
              card={exampleCard}
              variant="deck-search"
              onClick={handleCardClick}
              onAddToDeck={handleAddToDeck}
              onQuantityChange={handleQuantityChange}
              showPrices={true}
              showRarity={true}
              isInDeck={false}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">In Deck (Shows 4-button quantity control)</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-search"
              onClick={handleCardClick}
              onAddToDeck={handleAddToDeck}
              onQuantityChange={handleQuantityChange}
              showPrices={true}
              showRarity={true}
              isInDeck={true}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Deck Display Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Deck Display Variant (DeckBuilderDeckCard replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Always shows 5-button quantity control</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-display"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">No price/rarity display</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-display"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Cart Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Cart Variant (CartCard replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Shows TCGPlayer link and special price layout</h3>
            <CardContainer 
              card={exampleCardInHand}
              variant="cart"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              showPrices={true}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Always shows hand quantity control</h3>
            <CardContainer 
              card={exampleCardInHand}
              variant="cart"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              showPrices={true}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Proxy Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Proxy Variant (ProxyCard replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Shows clean name when different</h3>
            <CardContainer 
              card={exampleCard}
              variant="proxy"
              onClick={handleCardClick}
              showCleanName={true}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Always shows printList quantity control</h3>
            <CardContainer 
              card={exampleCard}
              variant="proxy"
              onClick={handleCardClick}
              showCleanName={true}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Basic Variant */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Basic Variant (Card replacement)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Simple display with no quantity controls</h3>
            <CardContainer 
              card={exampleCard}
              variant="basic"
              onClick={handleCardClick}
              showPrices={true}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">No click indicator or quantity controls</h3>
            <CardContainer 
              card={exampleCard}
              variant="basic"
              onClick={handleCardClick}
              showPrices={true}
              size="md"
            />
          </div>
        </div>
      </section>

      {/* Size Variants */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Size Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Small (sm)</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-display"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              size="sm"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Medium (md)</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-display"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Large (lg)</h3>
            <CardContainer 
              card={exampleCardInDeck}
              variant="deck-display"
              onClick={handleCardClick}
              onQuantityChange={handleQuantityChange}
              size="lg"
            />
          </div>
        </div>
      </section>

      {/* Grid Integration Examples */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Grid Integration Examples</h2>
        <div className="space-y-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Search Grid (5 cards per row)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <CardContainer
                  key={index}
                  card={exampleCard}
                  variant="search"
                  onClick={handleCardClick}
                  size="sm"
                />
              ))}
            </div>
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Deck Grid (5 cards per row)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <CardContainer
                  key={index}
                  card={exampleCardInDeck}
                  variant="deck-display"
                  onClick={handleCardClick}
                  onQuantityChange={handleQuantityChange}
                  size="sm"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Conditional Rendering Examples */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Conditional Rendering Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Conditional Price Display</h3>
            <CardContainer 
              card={exampleCard}
              variant="search"
              onClick={handleCardClick}
              showPrices={false}
              showRarity={true}
              size="md"
            />
          </div>
          
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="text-white mb-2">Conditional Rarity Display</h3>
            <CardContainer 
              card={exampleCard}
              variant="search"
              onClick={handleCardClick}
              showPrices={true}
              showRarity={false}
              size="md"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
