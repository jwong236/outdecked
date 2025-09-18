# CardContainer Migration Guide

This guide shows how to migrate from the old card container components to the new unified `CardContainer` component.

## Migration Patterns

### 1. Replace SearchCard

**Before:**
```tsx
import { SearchCard } from '@/features/search/SearchCard';

<SearchCard
  card={card}
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="search"
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

### 2. Replace DeckBuilderSearchCard

**Before:**
```tsx
import { DeckBuilderSearchCard } from '@/features/deckbuilder/DeckBuilderSearchCard';

<DeckBuilderSearchCard
  card={card}
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  isInDeck={isInDeck}
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="deck-search"
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  isInDeck={isInDeck}
  priority={false}
/>
```

### 3. Replace DeckBuilderDeckCard

**Before:**
```tsx
import { DeckBuilderDeckCard } from '@/features/deckbuilder/DeckBuilderDeckCard';

<DeckBuilderDeckCard
  card={card}
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showRarity={true}
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="deck-display"
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showRarity={true}
  priority={false}
/>
```

### 4. Replace CartCard

**Before:**
```tsx
import { CartCard } from '@/features/cart/CartCard';

<CartCard
  card={card}
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="cart"
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

### 5. Replace ProxyCard

**Before:**
```tsx
import { ProxyCard } from '@/features/proxy-printer/ProxyCard';

<ProxyCard
  card={card}
  onClick={onCardClick}
  showPrices={true}
  showRarity={true}
  variant="default"
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="proxy"
  onClick={onCardClick}
  showPrices={true}
  showRarity={true}
  showCleanName={true}
  priority={false}
/>
```

### 6. Replace DeckCard

**Before:**
```tsx
import { DeckCard } from '@/features/deckbuilder/DeckCard';

<DeckCard
  card={card}
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="deck-display"
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={true}
  showRarity={true}
  priority={false}
/>
```

### 7. Replace Basic Card

**Before:**
```tsx
import { Card } from '@/components/shared/ui/Card';

<Card
  card={card}
  onClick={onCardClick}
/>
```

**After:**
```tsx
import { CardContainer } from '@/components/shared/ui/CardContainer';

<CardContainer
  card={card}
  variant="basic"
  onClick={onCardClick}
/>
```

## Variant Reference

### `search` Variant
- **Replaces**: `SearchCard`
- **Shows**: Price, rarity, card name, image
- **QuantityControl**: `variant="button"`, `context="hand"`, `buttonLayout="auto"`
- **Features**: "Available" badge, quantity overlay
- **Use Case**: Search page cards

### `deck-search` Variant
- **Replaces**: `DeckBuilderSearchCard`
- **Shows**: Price, rarity, card name, image
- **QuantityControl**: Conditional "Add to Deck" OR `context="deck"`, `buttonLayout="4-button"`
- **Features**: `isInDeck` determines which control to show
- **Use Case**: Deck builder search results

### `deck-display` Variant
- **Replaces**: `DeckBuilderDeckCard`, `DeckCard`
- **Shows**: Card name, image (NO price/rarity)
- **QuantityControl**: Always shows `context="deck"`, `buttonLayout="5-button"`
- **Features**: Always-visible controls
- **Use Case**: Deck builder current deck

### `cart` Variant
- **Replaces**: `CartCard`
- **Shows**: Price, card name, image, TCGPlayer link
- **QuantityControl**: Always shows `context="hand"`, `buttonLayout="2-button"`
- **Features**: TCGPlayer integration, special price layout
- **Use Case**: Shopping cart

### `proxy` Variant
- **Replaces**: `ProxyCard`
- **Shows**: Card name, clean name, image (NO price/rarity)
- **QuantityControl**: Always shows `context="printList"`, `buttonLayout="2-button"`
- **Features**: Minimal layout, clean name when different
- **Use Case**: Proxy printer

### `basic` Variant
- **Replaces**: Basic `Card`
- **Shows**: Card name, image, basic info
- **QuantityControl**: None
- **Features**: Simple display only
- **Use Case**: Basic card display

## Props Mapping

### Common Props
| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `card` | `card` | Same |
| `onClick` | `onClick` | Same |
| `className` | `className` | Same |
| `priority` | `priority` | Same |

### Display Props
| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `showPrices` | `showPrices` | Same, but variant-specific defaults |
| `showRarity` | `showRarity` | Same, but variant-specific defaults |
| `variant` | `variant` | Now refers to card container variant |
| `size` | `size` | New prop: 'sm' \| 'md' \| 'lg' |

### Quantity Control Props
| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `onAddToDeck` | `onAddToDeck` | Same |
| `onQuantityChange` | `onQuantityChange` | Same |
| `isInDeck` | `isInDeck` | Same (deck-search variant) |
| `quantity` | `quantity` | New prop for controlled quantity |

### New Props
| New Prop | Type | Description |
|----------|------|-------------|
| `variant` | `CardContainerVariant` | Required: determines behavior |
| `showCleanName` | `boolean` | Show clean name (proxy variant) |
| `size` | `'sm' \| 'md' \| 'lg'` | Size variant |

## Grid Integration

### SearchGrid
```tsx
// Before
<SearchCard
  card={card}
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={showPrices}
  showRarity={showRarity}
  priority={priority && index === 0}
/>

// After
<CardContainer
  card={card}
  variant="search"
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showPrices={showPrices}
  showRarity={showRarity}
  priority={priority && index === 0}
/>
```

### DeckBuilderSearchGrid
```tsx
// Before
<DeckBuilderSearchCard
  card={card}
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showRarity={showRarity}
  priority={priority && index === 0}
  isInDeck={isInDeck}
/>

// After
<CardContainer
  card={card}
  variant="deck-search"
  onClick={onCardClick}
  onAddToDeck={onAddToDeck}
  onQuantityChange={onQuantityChange}
  showRarity={showRarity}
  priority={priority && index === 0}
  isInDeck={isInDeck}
/>
```

### CartGrid
```tsx
// Before
<CartCard
  card={card}
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={showPrices}
  showRarity={showRarity}
  priority={priority && index === 0}
/>

// After
<CardContainer
  card={card}
  variant="cart"
  onClick={onCardClick}
  onQuantityChange={onQuantityChange}
  showPrices={showPrices}
  showRarity={showRarity}
  priority={priority && index === 0}
/>
```

## Migration Checklist

- [ ] Update imports from old components to `CardContainer`
- [ ] Replace component names with `CardContainer`
- [ ] Add required `variant` prop
- [ ] Map existing props to new interface
- [ ] Test all quantity control interactions
- [ ] Verify visual consistency across all variants
- [ ] Check accessibility features
- [ ] Update grid components to use new CardContainer
- [ ] Remove old component files after migration is complete

## Benefits

1. **Single Component**: Replaces 7+ card container components
2. **Consistent Behavior**: Unified state management and event handling
3. **Better Maintainability**: One place to update card display logic
4. **Flexible Configuration**: Easy to add new variants or contexts
5. **Type Safety**: Full TypeScript support with proper prop validation
6. **Backward Compatible**: Drop-in replacement for existing usage
7. **Performance**: Optimized rendering and event handling
8. **Accessibility**: Built-in accessibility features
