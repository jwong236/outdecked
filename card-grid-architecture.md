# Card Grid Architecture Documentation

## Overview
This document outlines the data flow for all card grids in the project, identifying inconsistencies and proposing a unified approach.

## Grid Components Analysis

### 1. **SearchResults** (Main Search Page)
- **Input Type**: `Card[]` (no quantity)
- **Data Displayed**: Search results from API
- **Modal Data**: `transformedCards` (Card[] with quantity: 0)
- **Navigation Array**: `transformedCards` (search results)
- **Location**: `frontend/src/features/search/SearchResults.tsx`

### 2. **DeckBuilderSearchGrid** (Deck Builder Search Section)
- **Input Type**: `ExpandedCard[]` (inherits from BaseCardGrid)
- **Data Displayed**: Search results in deck builder context
- **Modal Data**: `currentSearchResults` (Card[])
- **Navigation Array**: `currentSearchResults` (search results)
- **Location**: `frontend/src/features/deckbuilder/components/grids/DeckBuilderSearchGrid.tsx`

### 3. **GroupedDeckGrid** (Deck Builder Deck Section)
- **Input Type**: `ExpandedCard[]` (with quantity)
- **Data Displayed**: Deck cards grouped by card type
- **Modal Data**: `currentDeck.cards` mapped to `ExpandedCard[]`
- **Navigation Array**: `currentDeck.cards` (deck cards)
- **Location**: `frontend/src/features/deckbuilder/components/grids/GroupedDeckGrid.tsx`

### 4. **CartGrid** (Hand Cart)
- **Input Type**: `ExpandedCard[]` (with quantity)
- **Data Displayed**: Hand cart cards
- **Modal Data**: `hand.filter(item => item && item.name)` (ExpandedCard[])
- **Navigation Array**: `hand` (cart cards)
- **Location**: `frontend/src/features/cart/CartGrid.tsx`

### 5. **ProxyGrid** (Proxy Printer)
- **Input Type**: `Card[]` (no quantity, view-only)
- **Data Displayed**: Cards for proxy printing
- **Modal Data**: `expandedCards` (ExpandedCard[] with minimal data)
- **Navigation Array**: `expandedCards` (proxy cards)
- **Location**: `frontend/src/features/proxy-printer/ProxyGrid.tsx`

## Current Inconsistencies

### 🔴 **Type Inconsistencies**
1. **SearchResults**: Uses `Card[]` but adds `quantity: 0` for modal
2. **DeckBuilderSearchGrid**: Uses `ExpandedCard[]` but passes `Card[]` to modal
3. **GroupedDeckGrid**: Uses `ExpandedCard[]` but maps from `CardRef[]` in session
4. **CartGrid**: Uses `ExpandedCard[]` consistently
5. **ProxyGrid**: Uses `Card[]` but converts to `ExpandedCard[]` for modal

### 🔴 **Navigation Array Inconsistencies**
1. **SearchResults**: Uses `transformedCards` (search results)
2. **DeckBuilderSearchGrid**: Uses `currentSearchResults` (search results)
3. **GroupedDeckGrid**: Uses `currentDeck.cards` (deck cards) - **BROKEN**
4. **CartGrid**: Uses `hand` (cart cards)
5. **ProxyGrid**: Uses `expandedCards` (proxy cards)

### 🔴 **Modal Data Inconsistencies**
1. **SearchResults**: Passes `transformedCards` (Card[] with quantity: 0)
2. **DeckBuilderSearchGrid**: Passes `currentSearchResults` (Card[])
3. **GroupedDeckGrid**: Passes mapped `currentDeck.cards` (ExpandedCard[])
4. **CartGrid**: Passes `hand.filter(...)` (ExpandedCard[])
5. **ProxyGrid**: Passes `expandedCards` (ExpandedCard[] with minimal data)

## Proposed Unified Architecture

### 🎯 **Core Principle**
**One source of truth per context**: Each grid should maintain its own sorted, filtered card array that serves as the single source of truth for both display and navigation.

### 🎯 **Unified Data Flow**
```
Context Data → Sorted Array → Grid Display → Modal Navigation
     ↓              ↓             ↓              ↓
Search Results → Card[] → SearchGrid → Modal uses Card[]
Deck Cards → ExpandedCard[] → DeckGrid → Modal uses ExpandedCard[]
Hand Cart → ExpandedCard[] → CartGrid → Modal uses ExpandedCard[]
Proxy Cards → Card[] → ProxyGrid → Modal uses Card[]
```

### 🎯 **Implementation Strategy**

#### **1. Standardize Input Types**
- **Search Grids**: Always use `Card[]` (no quantity needed)
- **Deck/Cart Grids**: Always use `ExpandedCard[]` (with quantity)
- **Proxy Grids**: Always use `Card[]` (view-only)

#### **2. Standardize Navigation Arrays**
- **Search Context**: Use the search results array
- **Deck Context**: Use the deck cards array (properly sorted)
- **Cart Context**: Use the hand cart array
- **Proxy Context**: Use the proxy cards array

#### **3. Standardize Modal Data**
- **Search/Proxy**: Pass `Card[]` arrays
- **Deck/Cart**: Pass `ExpandedCard[]` arrays
- **Modal**: Handle both types gracefully

### 🎯 **Key Changes Needed**

#### **1. Fix Deck Builder Navigation**
- Store properly sorted `ExpandedCard[]` in session
- Apply card type separation to the session array
- Use session array for both display and navigation

#### **2. Standardize Modal Interface**
- Make `CardDetailModal` accept both `Card[]` and `ExpandedCard[]`
- Ensure navigation works with any array type
- Handle quantity display appropriately

#### **3. Implement Consistent Sorting**
- Each context maintains its own sorted array
- Sort changes update the context array
- Grid and modal automatically reflect changes

## Benefits of Unified Approach

### ✅ **Consistency**
- All grids follow the same pattern
- Navigation always works correctly
- Modal data is always consistent

### ✅ **Maintainability**
- Single source of truth per context
- Clear data flow
- Easy to debug and extend

### ✅ **User Experience**
- Navigation arrows always work as expected
- Sort changes are immediately reflected
- No broken navigation between contexts

## Next Steps

1. **Fix Deck Builder**: Implement proper deck array management
2. **Standardize Modal**: Make CardDetailModal work with both types
3. **Test All Grids**: Ensure navigation works in all contexts
4. **Document Patterns**: Create reusable patterns for future grids

---

*This architecture ensures that each card grid has a clear, consistent data flow while maintaining the flexibility needed for different use cases.*
