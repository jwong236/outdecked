# OutDecked Component Architecture

> **See Also**: 
> - [API Endpoints Documentation](API_ENDPOINTS.md) for backend API reference
> - [Database Schema Documentation](DATABASE_SCHEMA_NOTES.md) for database structure

## Overview

OutDecked uses a feature-based architecture with Next.js 14, TypeScript, and modern React patterns. The application is structured around reusable components, centralized state management, and clear separation of concerns.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (persistent store)
- **Data Fetching**: React Query (@tanstack/react-query)
- **Icons**: @heroicons/react
- **Fonts**: Geist Sans & Geist Mono

---

## Directory Structure

```
frontend/src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   ├── admin/            
│   ├── auth/
│   ├── cart/
│   ├── deckbuilder/
│   ├── proxy-printer/
│   ├── scraping/
│   ├── search/
│   └── settings/
│
├── components/            # Shared components
│   ├── app/              # Core app components
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   └── Navigation.tsx # Top navigation bar
│   ├── shared/           # Reusable shared components
│   │   ├── filters/      # Filter components
│   │   ├── grids/        # Grid layouts
│   │   ├── layout/       # Layout helpers
│   │   ├── modals/       # Modal dialogs
│   │   ├── ui/           # UI primitives
│   │   ├── BackgroundContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── PageTitle.tsx
│   └── providers.tsx     # React Query & context providers
│
├── features/             # Feature-based modules
│   ├── admin/           # Admin panel
│   ├── auth/            # Authentication
│   ├── cart/            # Shopping cart
│   ├── deckbuilder/     # Deck building
│   ├── proxy-printer/   # Proxy printing
│   ├── scraping/        # Admin scraping
│   ├── search/          # Card search
│   └── settings/        # User settings
│
├── hooks/               # Custom React hooks
│   ├── useCardGridNavigation.ts
│   ├── useDeckValidation.ts
│   └── useSessionInitialization.ts
│
├── lib/                 # Utility libraries
│   ├── api.ts          # API client
│   ├── apiConfig.ts    # API configuration
│   ├── cardTransform.ts # Data transformations
│   ├── hooks.ts        # React Query hooks
│   └── ...
│
├── stores/             # Zustand stores
│   └── sessionStore.ts # Centralized session state
│
└── types/              # TypeScript types
    └── card.ts         # Card types
```

---

## Architecture Layers

### 1. App Layer (`app/`)
Next.js 14 App Router pages that define routes and layouts.

**Key Files:**
- `layout.tsx` - Root layout with Providers, Layout wrapper
- `page.tsx` - Home page
- Feature-specific directories (`deckbuilder/`, `search/`, etc.)

### 2. Component Layer

#### Core App Components (`components/app/`)
Application-wide components that wrap the entire app.

##### `Layout.tsx`
Main layout wrapper that provides:
- Dynamic background images
- Overlay for readability
- Navigation bar
- Main content area

```tsx
<Layout>
  <Navigation />
  <main>{children}</main>
</Layout>
```

##### `Navigation.tsx`
Top navigation bar with:
- Logo and app name
- Page links (Home, Search, Deck Builder, Proxy Printer)
- Cart indicator with item count
- User authentication state
- Profile dropdown (My Decks, Settings, Admin Panel, Sign Out)
- Mobile responsive menu

**State Integration:**
- Uses `useSessionStore` for user and cart data
- Client-side hydration handling
- Portal-based dropdown for proper z-index

#### Shared Components (`components/shared/`)

##### Context Providers

**BackgroundContext.tsx**
- Manages dynamic background images
- Provides `useBackground()` hook
- Persists user's background preference

**NotificationContext.tsx**
- Toast-style notifications
- Success/error/info messages
- Auto-dismiss functionality

##### UI Primitives (`components/shared/ui/`)

**CardContainer.tsx**
Unified card display component with multiple variants:

| Variant | Use Case | Features |
|---------|----------|----------|
| `search` | Search results | Shows prices, rarity, click to view details |
| `deck-search` | Deck builder search | Shows prices, add to deck button |
| `deck-display` | Deck list view | Compact display, quantity controls |
| `cart` | Shopping cart | Shows prices, quantity controls, remove button |
| `proxy` | Proxy printer | Shows clean names, no prices |
| `basic` | General use | Minimal display |

**Props:**
```tsx
{
  card: ExpandedCard;
  variant: CardContainerVariant;
  onClick?: (card: ExpandedCard) => void;
  onAddToDeck?: (card: ExpandedCard) => void;
  onQuantityChange?: (card: ExpandedCard, change: number) => void;
  showPrices?: boolean;
  showRarity?: boolean;
  isInDeck?: boolean;
  quantity?: number;
}
```

**QuantityControl.tsx**
Reusable quantity adjustment buttons:
- Increment/decrement buttons
- Visual feedback
- Configurable callbacks

**TriggerIcon.tsx**
Displays Union Arena trigger icons:
- Maps trigger types to icons
- Cached icon loading
- Fallback handling

##### Modal Components (`components/shared/modals/`)

**BaseModal.tsx** / **Modal.tsx**
- Reusable modal container
- Overlay with click-outside to close
- Escape key handling
- Scroll lock when open

**CreateDeckModal.tsx**
- Create new deck dialog
- Validation
- Integration with sessionStore

**SignInModal.tsx**
- Authentication prompt
- Used when anonymous users try restricted actions

##### Layout Components (`components/shared/layout/`)

**Pagination.tsx**
Reusable pagination control:
- First/prev/next/last buttons
- Page numbers with ellipsis
- Current page highlighting
- Customizable styles

##### Grid Components (`components/shared/grids/`)

**BaseCardGrid.tsx**
Base grid layout for card displays:
- Responsive columns
- Loading states
- Empty states
- Grid gap configuration

##### Filter Components (`components/shared/filters/`)

**DefaultFilters.tsx**
Common filter presets:
- Basic Prints Only (Base OR Starter Deck)
- No Action Points (NOT Action Point)
- Base Rarity Only (Common, Uncommon, Rare, Super Rare)

### 3. Feature Layer (`features/`)

Each feature is self-contained with its own components, hooks, and logic.

#### Search Feature (`features/search/`)

**Components:**
- `SearchLayout.tsx` - Main search page orchestrator
- `SearchGrid.tsx` - Card grid display
- `SearchResults.tsx` - Results container
- `SearchFilters.tsx` - Filter sidebar
- `FilterSection.tsx` - Collapsible filter sections
- `QuickFilters.tsx` - One-click filter buttons
- `ActiveFilters.tsx` - Active filter pills
- `SearchCard.tsx` - Individual card in search results
- `CardDetailModal.tsx` - Card detail modal with navigation
- `SearchSettingsModal.tsx` - Settings dialog

**Pattern:**
1. User interacts with filters/search
2. State updates in `sessionStore`
3. React Query fetches data
4. Results display in grid
5. Click card → open detail modal
6. Navigate between cards with arrow keys

#### Deck Builder Feature (`features/deckbuilder/`)

**Structure:**
```
deckbuilder/
├── DeckBuilderContent.tsx    # Main orchestrator
├── DeckBuilderHeader.tsx      # Top bar with deck controls
├── components/
│   ├── cards/                # Card display variants
│   ├── filters/              # Deck builder filters
│   ├── grids/                # Grid layouts
│   ├── modals/               # Dialogs
│   └── sections/             # Major sections
│       ├── SearchSection.tsx  # Card search area
│       └── DeckSection.tsx    # Deck display area
├── hooks/
│   ├── useDeckOperations.ts   # Deck CRUD operations
│   ├── useDeckValidation.ts   # Validation logic
│   └── useSearchLogic.ts      # Search state
└── pages/
    └── DeckListPage.tsx       # Deck library view
```

**Key Components:**

**DeckBuilderContent.tsx**
Main component that orchestrates:
- Dual-pane layout (Search + Deck)
- Card cache management
- Deck loading and saving
- Modal states
- Keyboard navigation

**SearchSection.tsx**
Left pane for card search:
- Search input
- Filters
- Results grid
- Add to deck functionality

**DeckSection.tsx**
Right pane showing current deck:
- Grouped by card type
- Quantity controls
- Deck validation status
- Export/print options

**useDeckOperations.ts**
Custom hook providing:
```tsx
{
  currentDeck: Deck | null;
  expandedCards: ExpandedCard[];
  loadingCards: boolean;
  handleAddCard: (card: Card) => void;
  handleRemoveCard: (cardId: number) => void;
  handleUpdateQuantity: (cardId: number, quantity: number) => void;
  handleSaveDeck: () => Promise<void>;
  handleDeleteDeck: () => Promise<void>;
}
```

#### Cart Feature (`features/cart/`)

**Components:**
- `CartPage.tsx` - Main cart page
- `CartGrid.tsx` - Grid of cart items
- `CartCard.tsx` - Individual cart item with controls

**Features:**
- Persistent cart (database for logged-in, localStorage for anonymous)
- Quantity management
- Price totals
- TCGPlayer Mass Entry export
- Clear cart functionality

#### Proxy Printer Feature (`features/proxy-printer/`)

**Components:**
- `ProxyPrinterPage.tsx` - Main printer page
- `ProxyGrid.tsx` - Print preview grid
- `ProxyCard.tsx` - Printable card component

**Features:**
- Add cards from cart
- Configurable margins
- Print layout optimization
- PDF generation
- Print preview

#### Auth Feature (`features/auth/`)

**AuthPage.tsx**
Handles login and registration:
- Dual-mode (login/register) tabs
- Form validation
- Integration with `sessionStore`
- Redirect after auth

#### Admin Feature (`features/admin/`)

**AdminPage.tsx**
Admin control panel:
- User management
- Role assignment
- User statistics
- Scraping controls
- Database backup/restore

#### Settings Feature (`features/settings/`)

**SettingsPage.tsx**
User preferences:
- Background selection
- Cards per page
- Theme (if implemented)
- Profile settings

---

## State Management

### Zustand Session Store (`stores/sessionStore.ts`)

Centralized state management using Zustand with persistence.

**Store Structure:**
```typescript
{
  // User data
  user: { id, username, email, role, display_name, avatar_url },
  preferences: { background, cards_per_page, theme },
  
  // Feature states
  searchPreferences: { query, sort, page, per_page, filters },
  deckBuilder: { deckList, currentDeck },
  handCart: { handItems },
  proxyPrinter: { printList, printSettings },
  
  // Session management
  sessionState: { isInitialized, lastSync }
}
```

**Key Actions:**

**Authentication:**
- `login(username, password)` - Authenticate user
- `register(username, email, password)` - Create account
- `logout()` - Sign out
- `checkAuthStatus()` - Verify session
- `loadAllUserData()` - Load user's saved data

**Search:**
- `setSearchPreferences(prefs)` - Update search state
- `addFilter(filter)` - Add filter
- `removeFilter(index)` - Remove filter
- `clearAllFilters()` - Reset to defaults

**Deck Builder:**
- `setDeckList(deckIds)` - Update deck list
- `setCurrentDeck(deck)` - Load deck for editing
- `clearCurrentDeck()` - Close current deck

**Cart:**
- `addToHand(productId, quantity)` - Add card to cart
- `removeFromHand(productId)` - Remove card
- `updateHandQuantity(productId, quantity)` - Update quantity
- `clearHand()` - Empty cart
- `syncHandToDatabase()` - Save to backend

**Persistence:**
- Saved to localStorage
- Synced to database for logged-in users
- Automatic debounced sync
- Merge strategy for conflicts

---

## Data Flow

### Card Search Flow

```
User Input → sessionStore → React Query → API Client → Backend
                ↓
          [Cache Layer]
                ↓
          SearchGrid ← TransformCards ← API Response
                ↓
          CardContainer → User Click → CardDetailModal
```

### Deck Building Flow

```
1. Load Deck List
   sessionStore.deckList → API /api/user/decks → Deck IDs

2. Open Deck
   Click Deck → API /api/user/decks/:id → sessionStore.currentDeck

3. Search Cards
   Search Input → API /api/cards → SearchSection Grid

4. Add to Deck
   Click Add → useDeckOperations.handleAddCard → currentDeck.cards[]

5. Save Deck
   Click Save → API PUT /api/user/decks/:id → Database
                                            ↓
                                   sessionStore.currentDeck updated
```

### Authentication Flow

```
1. User Login
   Form Submit → sessionStore.login() → POST /api/auth/login
                                               ↓
                                         Session Cookie Set
                                               ↓
                                    sessionStore.loadAllUserData()
                                               ↓
                          Load [Preferences, Hand, Deck List] in parallel

2. Check Auth Status
   App Mount → useSessionInitialization → sessionStore.checkAuthStatus()
                                                      ↓
                                          GET /api/auth/me → User Data

3. User Logout
   Click Logout → sessionStore.logout() → POST /api/auth/logout
                                                 ↓
                                          Clear sessionStore
```

---

## Custom Hooks

### Data Fetching Hooks (`lib/hooks.ts`)

Built on React Query for efficient data fetching and caching.

**useSearchCards(params)**
- Fetches paginated card search results
- Automatic caching
- Background refetch
- Stale-while-revalidate pattern

**useSeriesValues(game)**
- Fetches available series/sets
- Cached for 5 minutes

**useColorValues(series, game)**
- Fetches colors for specific series
- Dynamic based on series selection

**useFilterFields()**
- Fetches available filter attributes
- Long cache time (rarely changes)

**useFilterValues(field, game)**
- Fetches distinct values for attribute
- Cached per field

### Session Hooks (`hooks/`)

**useSessionInitialization.ts**
- Initializes session on app mount
- Checks authentication status
- Loads user data
- Sets `isInitialized` flag

**useCardGridNavigation.ts**
- Keyboard navigation for card grids
- Arrow keys to navigate
- Enter to select
- Escape to close modal

**useDeckValidation.ts**
- Validates deck against game rules
- Real-time validation feedback
- Card count checks
- Copy limit checks

---

## Utility Libraries (`lib/`)

### API Client (`api.ts`, `apiConfig.ts`)

**ApiClient class:**
```typescript
class ApiClient {
  searchCards(params: SearchParams): Promise<SearchResponse>
  getFilterFields(): Promise<FilterField[]>
  getFilterValues(field: string): Promise<string[]>
  getColorsForSeries(series: string): Promise<string[]>
  getCard(cardId: number): Promise<Card>
  getCardsBatch(cardIds: number[]): Promise<Card[]>
}
```

**apiConfig:**
- Environment-based API URL
- Development: `http://localhost:5000`
- Production: Same-origin (served by Flask)
- Helper: `getApiUrl(endpoint)` - Returns full URL

### Transform Utilities

**cardTransform.ts**
- `transformRawCardsToCards(rawCards)` - Cleans API response
- Normalizes attribute structure
- Ensures consistent types
- Adds computed fields

**deckUtils.ts**
- `sortDeckCards(cards, sortBy)` - Sort deck cards
- `groupCardsByType(cards)` - Group for display
- `calculateDeckStats(cards)` - Deck statistics

**deckValidation.tsx**
- `validateDeck(deck, rules)` - Validate against rules
- Returns: `{ isValid, errors, warnings }`
- Game-specific rule sets

### Image Utilities (`imageUtils.ts`)

**Image URL Generation:**
```typescript
getProductImageIcon(productId: number): string
  // Returns: https://tcgplayer-cdn.tcgplayer.com/product/{id}_in_200x200.jpg

getProductImageCard(productId: number): string
  // Returns: https://tcgplayer-cdn.tcgplayer.com/product/{id}_in_400x400.jpg

getProductImageLarge(productId: number): string
  // Returns: https://tcgplayer-cdn.tcgplayer.com/product/{id}_in_1000x1000.jpg
```

**Proxy Support:**
- `getProxiedImageUrl(productId, size)` - Backend proxy for CORS

### Other Utilities

**handUtils.ts**
- Cart/hand manipulation helpers
- Quantity updates
- Item addition/removal

**printTypeUtils.ts**
- Print type detection
- Print type formatting
- Special print handling

**tcgplayerUtils.ts**
- Generate TCGPlayer Mass Entry URL
- Format card lists for TCGPlayer
- Set code parsing

**triggerIcons.tsx**
- Trigger icon mapping
- Icon component generation
- Fallback handling

**useUrlState.ts**
- URL state management
- Sync filters to URL
- Parse URL parameters
- Browser history integration

---

## Design Patterns

### 1. Feature-Based Architecture

Each feature is self-contained with its own:
- Components
- Hooks
- Utilities
- Types (if feature-specific)

**Benefits:**
- Easy to locate code
- Clear ownership
- Parallel development
- Feature isolation

### 2. Composition over Inheritance

Components are composed from smaller, reusable pieces:
```tsx
<CardContainer variant="search">
  <CardImage />
  <CardInfo showPrices showRarity />
  <CardActions />
</CardContainer>
```

### 3. Centralized State with Zustand

Single source of truth for application state:
- No prop drilling
- Persistent across sessions
- Sync with backend
- DevTools integration

### 4. Smart/Dumb Component Pattern

**Smart Components** (Containers):
- Connect to stores
- Handle business logic
- Data fetching
- Event handling

**Dumb Components** (Presentational):
- Receive props
- Pure rendering
- No side effects
- Reusable

### 5. Custom Hooks for Logic Reuse

Extract complex logic into hooks:
```tsx
// Instead of duplicating logic
function useDeckOperations() {
  // Deck CRUD, validation, sync logic
  return { operations }
}
```

### 6. Optimistic Updates

Update UI immediately, sync to backend:
```tsx
addToCart(card) {
  // Update UI immediately
  updateLocalState(card);
  
  // Sync to backend in background
  syncToDatabase(card);
}
```

### 7. Error Boundaries & Loading States

Graceful degradation:
- Loading spinners
- Skeleton screens
- Error messages
- Retry buttons

---

## Component Communication

### Parent to Child
Props are the primary method:
```tsx
<SearchCard 
  card={card} 
  onClick={handleClick}
  showPrices={true}
/>
```

### Child to Parent
Callback functions:
```tsx
<QuantityControl 
  onChange={(newQuantity) => handleUpdate(card.id, newQuantity)}
/>
```

### Sibling to Sibling
Through shared state (sessionStore):
```tsx
// Component A
sessionStore.addToHand(card);

// Component B (re-renders automatically)
const { handCart } = useSessionStore();
```

### Cross-Feature Communication
Through sessionStore or React Query cache:
```tsx
// Deck Builder adds card
useMutation({ mutationFn: addCardToDeck });

// Cart automatically updates (shared cache)
const { data: cart } = useQuery(['cart']);
```

---

## Styling Approach

### Tailwind CSS Utility Classes

All styles use Tailwind utilities:
```tsx
<div className="bg-white/95 backdrop-blur-md shadow-lg rounded-lg p-4">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
</div>
```

### Design Tokens

**Colors:**
- Primary: Blue (`blue-600`)
- Success: Green (`green-600`)
- Warning: Yellow (`yellow-600`)
- Error: Red (`red-600`)
- Neutral: Gray (`gray-100` to `gray-900`)

**Spacing:**
- Standard: `p-4`, `m-4` (1rem = 16px)
- Tight: `p-2`, `m-2` (0.5rem = 8px)
- Loose: `p-6`, `m-6` (1.5rem = 24px)

**Typography:**
- Heading: `text-2xl font-bold`
- Subheading: `text-lg font-semibold`
- Body: `text-base`
- Small: `text-sm`
- Tiny: `text-xs`

### Responsive Design

Mobile-first approach:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Responsive grid */}
</div>
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Consistent Visual Style

**User Preferences:**
- Blurred backgrounds with overlay
- Drop shadows on cards
- White text for readability
- Smooth transitions

**Example Card:**
```tsx
<div className="bg-white/95 backdrop-blur-md shadow-md hover:shadow-lg transition-shadow rounded-lg">
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

---

## Performance Optimizations

### 1. React Query Caching
- Default stale time: 5 minutes
- GC time: 10 minutes
- Background refetch disabled
- Retry: 1 attempt

### 2. Image Optimization
- Next.js Image component
- Lazy loading
- Blur placeholders
- Responsive sizes

### 3. Code Splitting
- Route-based splitting (automatic with Next.js App Router)
- Dynamic imports for modals
- Feature-based chunks

### 4. Memoization
```tsx
const sortedCards = useMemo(
  () => sortCards(cards, sortBy),
  [cards, sortBy]
);
```

### 5. Debouncing
```tsx
// Search input debounced 300ms
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedQuery(query);
  }, 300);
  return () => clearTimeout(timer);
}, [query]);
```

### 6. Virtual Scrolling (Future)
For very large lists (1000+ items)

---

## Testing Strategy

### Unit Tests
- Utility functions
- Custom hooks
- Pure components

### Integration Tests
- Feature flows
- Component interactions
- API mocking

### E2E Tests
- Critical user paths
- Authentication flow
- Deck building flow
- Checkout flow

---

## Development Workflow

### Running the App
```bash
cd frontend
npm install
npm run dev  # Development server on localhost:3000
```

### Building for Production
```bash
npm run build  # Creates optimized production build
npm run start  # Serves production build
```

### Linting & Formatting
```bash
npm run lint  # Run ESLint
```

---

## Key Conventions

### File Naming
- Components: PascalCase (`SearchCard.tsx`)
- Utilities: camelCase (`cardTransform.ts`)
- Hooks: camelCase with `use` prefix (`useSearchCards.ts`)
- Types: PascalCase (`Card`, `SearchParams`)

### Component Structure
```tsx
'use client';  // If uses client-side features

import React from 'react';
import { /* imports */ } from '/* packages */';
import { /* local imports */ } from '@/';

interface ComponentProps {
  // Props
}

export function ComponentName({ props }: ComponentProps) {
  // Hooks
  // State
  // Effects
  // Handlers
  // Render
  
  return (
    // JSX
  );
}
```

### Import Organization
1. React imports
2. Third-party libraries
3. Components
4. Hooks
5. Utilities
6. Types
7. Styles

### Prop Types
Always use TypeScript interfaces:
```tsx
interface CardProps {
  card: Card;
  onClick?: (card: Card) => void;
  className?: string;
}
```

### Event Handlers
Prefix with `handle`:
```tsx
const handleClick = () => { /* ... */ };
const handleSubmit = (e: FormEvent) => { /* ... */ };
```

### State Variables
Descriptive names:
```tsx
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedCard, setSelectedCard] = useState<Card | null>(null);
```

---

## Future Improvements

### Planned Features
1. **Dark Mode** - Full dark theme support
2. **Accessibility** - WCAG 2.1 AA compliance
3. **Offline Mode** - Service worker for offline access
4. **PWA** - Install as app
5. **Performance** - Virtual scrolling for large lists
6. **i18n** - Multi-language support

### Technical Debt
1. Consolidate modal components
2. Standardize error handling
3. Improve type safety
4. Add comprehensive tests
5. Document component APIs

---

## Troubleshooting

### Common Issues

**Hydration Mismatch**
- Cause: Server/client render difference
- Solution: Use `useEffect` for client-only code

**State Not Persisting**
- Cause: Zustand persist middleware issue
- Solution: Check localStorage, verify `partialize` config

**Images Not Loading**
- Cause: CORS or CDN issues
- Solution: Use backend proxy endpoint

**Filters Not Working**
- Cause: sessionStore not initialized
- Solution: Check `sessionState.isInitialized`

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

