# TCGCSV Reference Data

## Essential Endpoints & URLs

### TCGCSV API Endpoints
- **Groups**: `https://tcgcsv.com/tcgplayer/81/groups` (47 Union Arena groups)
- **Products**: `https://tcgcsv.com/tcgplayer/81/{groupId}/products` 
- **Prices**: `https://tcgcsv.com/tcgplayer/81/{groupId}/prices`
- **Last Updated**: `https://tcgcsv.com/last-updated.txt`

### TCGPlayer URLs
- **Product Page**: `https://www.tcgplayer.com/product/{productId}?Language=English`
- **Product Image**: `https://tcgplayer-cdn.tcgplayer.com/product/{productId}_200w.jpg`

### Key IDs
- **Union Arena Category**: 81
- **Union Arena Groups**: 47 total groups
- **Current Cards**: 3,065 individual cards

## Database Schema & Mappings

### Field Name Mapping (Frontend → Database)
```python
FIELD_NAME_MAPPING = {
    "series": "SeriesName",        # card_attributes table
    "color": "ActivationEnergy",   # card_attributes table  
    "rarity": "Rarity",           # card_attributes table
    "card_type": "CardType",      # card_attributes table
    "required_energy": "RequiredEnergy",  # card_attributes table
    "trigger": "Trigger",         # card_attributes table
}
```

### Available Attributes (Counts)
- **Rarity**: 3,065 cards
- **Number**: 3,065 cards  
- **CardType**: 3,057 cards
- **RequiredEnergy**: 2,944 cards
- **ActionPointCost**: 2,944 cards
- **ActivationEnergy**: 2,938 cards (Blue, Green, Purple, Red, Yellow)
- **Description**: 2,607 cards
- **GeneratedEnergy**: 2,559 cards
- **BattlePointBP**: 2,476 cards
- **Trigger**: 1,940 cards
- **Affinities**: 1,759 cards
- **SeriesName**: 3,065 cards

### Query Logic
- **Direct Card Fields**: `name`, `clean_name`, `game` from `cards` table
- **All Other Fields**: `card_attributes` table using `name` field matching
- **Search Function**: Uses `SeriesName` attributes (not `group_name`)

## Series Names (Standardized)
- **BLEACH**: 435 cards
- **CODE GEASS**: 393 cards  
- **HUNTER X HUNTER**: 270 cards
- **Jujutsu Kaisen**: 444 cards
- **Demon Slayer**: 268 cards
- **Attack on Titan**: 247 cards
- **Black Clover**: 247 cards
- **FULLMETAL ALCHEMIST**: 249 cards
- **One Punch Man**: 252 cards
- **Sword Art Online**: 250 cards
- **Rurouni Kenshin**: 1 card
- **Kaiju No. 8**: 2 cards
- **NIKKE**: 2 cards
- **Yu Yu Hakusho**: 1 card
- **Union Arena Promotion Cards**: 4 cards

### Series Name Processing
- **Source**: `extendedData.SeriesName` from TCGCSV
- **Processing**: `to_title_case()` function converts to proper case
- **Storage**: `card_attributes` table with `name='SeriesName'`

## Database Schema

### Main Tables
```sql
-- Core card information
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    clean_name TEXT,
    image_url TEXT,               -- Large image (1000x1000)
    image_url_small TEXT,         -- Small image (400x400)
    card_url TEXT,
    game TEXT NOT NULL,
    category_id INTEGER,
    group_id INTEGER,
    group_name TEXT,              -- Group name (e.g., "Attack On Titan")
    image_count INTEGER,
    is_presale BOOLEAN,
    released_on TEXT,
    presale_note TEXT,
    modified_on TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dynamic card attributes (TCGCSV extendedData)
CREATE TABLE card_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    name TEXT NOT NULL,           -- Field name (e.g., "ActionPointCost", "Rarity")
    display_name TEXT,            -- Display name (e.g., "Action Point Cost", "Rarity")
    value TEXT NOT NULL,          -- Field value (e.g., "1", "Common", "Blue")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards (id),
    UNIQUE(card_id, name)
);

-- Price information
CREATE TABLE card_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    market_price REAL,
    low_price REAL,
    mid_price REAL,
    high_price REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards (id),
    UNIQUE(card_id)
);

-- Category information
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT,
    display_name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group information
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    category_id INTEGER,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

```

### Current Data Status
- **Total Cards**: 3,065 Union Arena cards
- **Total Attributes**: 32,415 card attributes
- **Total Prices**: 3,047 card prices
- **Total Categories**: 89 categories (from TCGCSV API)
- **Total Groups**: 47 groups (from TCGCSV API)
- **Series Names**: 14 unique series (standardized, no duplicates)

### Schema Notes
- **cards table**: Has `group_name` and `image_url_small` columns for enhanced functionality
- **card_prices table**: Missing `direct_low_price` and `sub_type_name` columns (not needed)
- **card_attributes table**: Dynamic key-value pairs for all card attributes (12 unique fields)
- **attributes_fields table**: Removed - field definitions derived from card_attributes
- **categories table**: 89 categories from TCGCSV API (Magic, YuGiOh, Pokemon, Union Arena, etc.)
- **groups table**: 47 groups from TCGCSV API (Union Arena sets like "UE10BT: Attack on Titan")
- **Foreign keys**: Disabled in SQLite (but relationships are valid)
- **sqlite_sequence table**: SQLite internal table for auto-increment sequences

## TCGCSV API Integration

### Categories and Groups Lookup
- **Categories API**: `https://tcgcsv.com/tcgplayer/categories` - 89 total categories
- **Groups API**: `https://tcgcsv.com/tcgplayer/{category_id}/groups` - 47 groups for Union Arena (category 81)
- **Purpose**: Convert category_id and group_id to readable names
- **Data Source**: TCGCSV API provides official TCGPlayer category and group information
- **Integration**: Populated via `tests/test_tcgcsv_api.py` script

### Field Definitions
- **Source**: Derived from `card_attributes` table (12 unique fields)
- **Removed Table**: `attributes_fields` was redundant and has been removed
- **Available Fields**: ActionPointCost, Rarity, SeriesName, CardType, etc.

## Scraping Configuration

### TCGCSV Data Processing
- **Individual Card Detection**: Products with non-empty `extendedData` = individual cards
- **Expected Count**: 3,065 individual Union Arena cards
- **Data Source**: TCGCSV API endpoints only (no Selenium needed)
- **Attributes Storage**: All `extendedData` fields stored in `card_attributes` table

### Series Name Processing Function
```python
def to_title_case(text):
    """Convert text to title case with special handling for Union Arena series"""
    if not text:
        return text
    
    # Special cases for Union Arena series
    special_cases = {
        'HUNTER X HUNTER': 'Hunter X Hunter',
        'CODE GEASS': 'Code Geass', 
        'FULLMETAL ALCHEMIST': 'Fullmetal Alchemist',
        'BLEACH': 'Bleach',
        'NIKKE': 'NIKKE'  # Keep as-is
    }
    
    if text.upper() in special_cases:
        return special_cases[text.upper()]
    
    return text.title()
```

### Database Skip Fields
```python
skip_fields = [
    "name", "displayName", "value",  # These are the table columns, not data fields
    "imageUrl", "url", "modifiedOn", "imageCount", "presaleInfo"  # Already stored in cards table
]
# Note: "series" was removed from skip_fields to enable SeriesName saving
```

## Frontend Tech Stack

### Core Framework
- **Next.js 14** (App Router) - Modern React framework with SSR/SSG
- **React 18** - Latest React with concurrent features
- **TypeScript** - Type safety for complex card data structures

### Styling
- **Tailwind CSS** - Utility-first CSS framework (replaces Bootstrap)
- **Headless UI** - Accessible interactive components (modals, dropdowns)
- **Heroicons** - Icon library for UI elements

### State Management
- **Zustand** - Lightweight state management for search filters, pagination, modal state
- **React Query (@tanstack/react-query)** - API calls and caching for `/api/search`, `/api/series-values` endpoints

### Project Structure
```
frontend/
├── src/
│   ├── app/           # Next.js 14 app router pages
│   ├── components/    # Reusable React components
│   ├── stores/        # Zustand state stores
│   ├── types/         # TypeScript type definitions
│   ├── lib/           # Utilities, API client, hooks
│   └── ...
├── package.json
└── tailwind.config.js
```

### Key Dependencies
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "@headlessui/react": "^1.x",
    "@heroicons/react": "^2.x"
  }
}
```

### Deployment
- **Google Cloud** - Cloud Run or App Engine (matches current infrastructure)
- **Hybrid approach** - Keep Flask API backend, add Next.js frontend
- **Environment**: `NEXT_PUBLIC_API_URL` for Flask API connection

## Project Architecture

### Current Hybrid Architecture (2025-09-10)

#### **Two-Server Setup:**
```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              React Frontend (localhost:3000)               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Next.js 14 + TypeScript + Tailwind CSS                 ││
│  │ • Search page with filters and pagination              ││
│  │ • Card display with images                             ││
│  │ • Zustand state management                             ││
│  │ • React Query for API calls                            ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP API calls
┌─────────────────────▼───────────────────────────────────────┐
│              Flask Backend (localhost:5000)                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Flask API + SQLite Database                            ││
│  │ • /api/search - Card search with filters               ││
│  │ • /api/anime-values - Series dropdown data             ││
│  │ • /api/color-values - Color dropdown data              ││
│  │ • /api/filter-values - Metadata field values           ││
│  │ • CORS enabled for localhost:3000                      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                SQLite Database                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ • cards table (3,065 Union Arena cards)                ││
│  │ • card_attributes table (29,354 attributes)            ││
│  │ • card_prices table (price data)                       ││
│  │ • categories & groups tables                           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### **File Structure:**
```
outdecked/
├── backend/                    # Flask application
│   ├── outdecked.py           # Main Flask app with CORS
│   ├── search.py              # Search API endpoints
│   ├── database.py            # Database operations
│   ├── scraper.py             # TCGCSV data scraping
│   ├── models.py              # Data models
│   ├── requirements.txt       # Python dependencies
│   └── templates/             # Old HTML templates (legacy)
│       ├── search.html        # Old search page
│       ├── deckbuilder.html   # Old deck builder
│       └── admin.html         # Old admin page
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── app/               # Next.js 14 App Router
│   │   │   ├── page.tsx       # Main search page (localhost:3000)
│   │   │   ├── layout.tsx     # Root layout with providers
│   │   │   └── providers.tsx  # React Query provider
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Card.tsx       # Individual card display
│   │   │   ├── CardGrid.tsx   # Card grid layout
│   │   │   ├── SearchFilters.tsx # Filter controls
│   │   │   └── Pagination.tsx # Pagination controls
│   │   ├── stores/            # State management
│   │   │   └── searchStore.ts # Zustand search state
│   │   ├── lib/               # Utilities
│   │   │   ├── api.ts         # API client for Flask
│   │   │   └── hooks.ts       # React Query hooks
│   │   └── types/             # TypeScript types
│   │       └── card.ts        # Card data types
│   ├── package.json           # Node.js dependencies
│   ├── next.config.js         # Next.js config (image domains)
│   └── README.md              # Frontend documentation
│
└── notes_scraping.md          # This documentation file
```

#### **Migration Status:**
- ✅ **Search Page**: Migrated to React (localhost:3000)
- 🚧 **Deck Builder**: Still in Flask templates (localhost:5000/deckbuilder)
- 🚧 **Admin Panel**: Still in Flask templates (localhost:5000/admin)
- 🚧 **Other Pages**: Still in Flask templates

#### **API Endpoints (Flask Backend):**
- `GET /api/search` - Search cards with filters and pagination
- `GET /api/filter-fields` - Get all available filter fields (excluding Description)
- `GET /api/filter-values/{field}` - Get unique values for a specific field
- `GET /api/card/{id}` - Get individual card details
- `GET /games` - Get all available games from categories table (89 games)

#### **New Filter API Architecture:**
- **`/api/filter-fields`** - Returns all available filter fields with display names
  - Excludes "Description" field (not useful for filtering)
  - Returns: `[{"name": "Rarity", "display": "Rarity"}, ...]`
- **`/api/filter-values/{field}`** - Returns unique values for a specific field
  - Special handling for "Affinities" field (splits on " / ")
  - Examples: `/api/filter-values/SeriesName`, `/api/filter-values/Affinities`

#### **Multi-Game Support:**
- **Dynamic Fields**: All filter fields are automatically available for any game
- **Game-Specific Data**: Filter values are automatically filtered by game when cards exist
- **Scalable**: Will automatically support new games as they're added to the database

#### **Development Workflow:**
1. **Start Flask Backend**: `python outdecked.py` (port 5000)
2. **Start React Frontend**: `cd frontend && npm run dev` (port 3000)
3. **Access Application**: http://localhost:3000 (React frontend)
4. **Legacy Access**: http://localhost:5000 (Flask templates)
5. **Test API Endpoints**: `python tests/test_api_endpoints.py`

#### **Key Technologies:**
- **Backend**: Flask + SQLite + TCGCSV API + CORS
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **State**: Zustand + React Query
- **UI**: Headless UI + Heroicons
- **Images**: Next.js Image optimization with TCGPlayer CDN

## React Component Architecture

### **Component Hierarchy & Structure**

```
App Layout (Root)
├── Layout Component
│   ├── Navigation Component
│   ├── BackgroundSwitcher Component (fixed position)
│   └── Page Content (children)
│       ├── HomePage
│       ├── SearchPage
│       │   ├── SearchFilters Component
│       │   ├── CardGrid Component
│       │   │   └── Card Component (multiple)
│       │   ├── CardModal Component
│       │   └── Pagination Component
│       ├── DeckBuilderPage (placeholder)
│       ├── AdminPage (placeholder)
│       └── Other Pages...
```

### **Core Components**

#### **1. Layout Component** (`/components/Layout.tsx`)
- **Purpose**: Root layout wrapper with background management
- **Features**: 
  - Dynamic background switching (gradients/images)
  - Navigation integration
  - Background switcher positioning
- **State**: Uses `BackgroundContext` for global background state
- **Styling**: Full-screen background with overlay for readability

#### **2. Navigation Component** (`/components/Navigation.tsx`)
- **Purpose**: Global navigation bar
- **Features**:
  - Responsive navigation with mobile support
  - Active route highlighting
  - Profile dropdown (placeholder)
  - Check Hand button (right-aligned)
- **Routes**: Home, Search, Deck Builder, Proxy Printer, Cart, Admin, Scraping
- **Styling**: Semi-transparent with backdrop blur

#### **3. BackgroundSwitcher Component** (`/components/BackgroundSwitcher.tsx`)
- **Purpose**: Customizable background selection
- **Features**:
  - Dropdown with preview thumbnails
  - Support for gradients and images
  - Click-outside-to-close functionality
  - Fixed positioning (top-right, below navbar)
- **Options**: 6 custom anime backgrounds + default gradient
- **State**: Integrates with `BackgroundContext`

#### **4. SearchFilters Component** (`/components/SearchFilters.tsx`)
- **Purpose**: Advanced search and filtering controls
- **Features**:
  - Text search input
  - Series dropdown (populated from API)
  - Color dropdown (populated from API)
  - Sort options dropdown
  - Advanced filter management (AND/OR/NOT)
- **State**: Uses `useSearchStore` (Zustand)
- **API Integration**: Fetches dropdown options via React Query

#### **5. CardGrid Component** (`/components/CardGrid.tsx`)
- **Purpose**: Responsive grid layout for card display
- **Features**:
  - Responsive grid (1-6 columns based on screen size)
  - Loading states and error handling
  - Empty state messaging
- **Props**: Cards array, loading state, error state

#### **6. Card Component** (`/components/Card.tsx`)
- **Purpose**: Individual card display
- **Features**:
  - Card image with Next.js optimization
  - Price display (market, low, mid, high)
  - Hover effects and click handling
  - Modal trigger on click
- **Props**: Card data object, click handler

#### **7. CardModal Component** (`/components/CardModal.tsx`)
- **Purpose**: Detailed card view modal
- **Features**:
  - Full card image display
  - Detailed card information
  - Price breakdown
  - Close functionality (ESC key, click outside)
- **State**: Uses Headless UI Dialog for accessibility

#### **8. Pagination Component** (`/components/Pagination.tsx`)
- **Purpose**: Page navigation controls
- **Features**:
  - Previous/Next buttons
  - Page number display
  - Results count
  - Disabled states for boundaries
- **State**: Uses `useSearchStore` for page management

### **State Management Architecture**

#### **1. Zustand Store** (`/stores/searchStore.ts`)
- **Purpose**: Search state management
- **State**:
  - `filters`: SearchFilters object (query, game, series, color, sort, pagination)
  - `isLoading`: Loading state
  - `error`: Error state
- **Actions**:
  - Filter setters (setQuery, setSeries, setColor, etc.)
  - Advanced filter management (addAndFilter, addOrFilter, addNotFilter)
  - Pagination controls (setPage, setPerPage)
  - Reset functionality

#### **2. React Context** (`/contexts/BackgroundContext.tsx`)
- **Purpose**: Global background state
- **State**:
  - `background`: Current background (gradient string or image URL)
  - `setBackground`: Background setter function
- **Default**: Vibrant purple gradient
- **Usage**: Layout component and BackgroundSwitcher

### **API Integration Layer**

#### **1. API Client** (`/lib/api.ts`)
- **Purpose**: Centralized API communication with Flask backend
- **Features**:
  - Type-safe API calls
  - Parameter filtering and URL building
  - Error handling
  - Base URL configuration
- **Endpoints**:
  - `searchCards()`: Main search with filters
  - `getSeriesValues()`: Series dropdown data
  - `getColorValues()`: Color dropdown data
  - `getMetadataValues()`: Dynamic field values
  - `getMetadataFields()`: Available metadata fields

#### **2. React Query Hooks** (`/lib/hooks.ts`)
- **Purpose**: Data fetching with caching and synchronization
- **Features**:
  - Automatic caching (5min stale time, 10min garbage collection)
  - Background refetching
  - Error handling
  - Loading states
- **Hooks**:
  - `useSearchCards()`: Main search query
  - `useSeriesValues()`: Series dropdown data
  - `useColorValues()`: Color dropdown data

### **Type System** (`/types/card.ts`)

#### **Core Types**:
- `Card`: Main card data structure (24 fields)
- `CardAttribute`: Dynamic card metadata
- `SearchResponse`: API response with pagination
- `SearchFilters`: Complete filter state
- `FilterOption`: Individual filter definition

#### **Union Arena Specific Types**:
- `SeriesName`: 15 predefined series names
- `ActivationEnergy`: 5 color types (Blue, Green, Purple, Red, Yellow)
- `Rarity`: 6 rarity levels
- `CardType`: 4 card types (Character, Event, Base, Leader)

### **Page Structure** (`/app/`)

#### **1. Root Layout** (`layout.tsx`)
- **Purpose**: App-wide layout and providers
- **Features**:
  - Providers wrapper (React Query + Background Context)
  - Global styles and metadata
  - Font loading

#### **2. Providers** (`providers.tsx`)
- **Purpose**: Context and query client setup
- **Features**:
  - React Query client configuration
  - Background context provider
  - Development tools integration

#### **3. Page Components**:
- **HomePage** (`page.tsx`): Landing page with feature grid
- **SearchPage** (`search/page.tsx`): Main search interface
- **DeckBuilderPage** (`deckbuilder/page.tsx`): Placeholder for deck building
- **AdminPage** (`admin/page.tsx`): Placeholder for admin functions
- **Other Pages**: Placeholder implementations

### **Styling Architecture**

#### **Tailwind CSS Configuration**:
- **Utility-first approach**: Consistent spacing, colors, typography
- **Responsive design**: Mobile-first breakpoints
- **Custom components**: Reusable UI patterns
- **Dark theme support**: Semi-transparent overlays for readability

#### **Component Styling Patterns**:
- **Glass morphism**: Semi-transparent backgrounds with backdrop blur
- **Hover effects**: Smooth transitions and state changes
- **Loading states**: Skeleton loaders and spinners
- **Error states**: Clear error messaging and retry options

#### **Preferred Design Pattern**:
- **Standard Pattern**: `bg-white/10 backdrop-blur-sm rounded-lg shadow-md`
- **Text Color**: `text-white` for readability on blurred backgrounds
- **Applied To**: All search components (filters, active filters, more filters, card grid, pagination, search cards)
- **Effect**: Creates consistent glass-morphism appearance with excellent readability

#### **Design System Implementation**:
- **Tailwind Component Classes**: Custom classes defined in `tailwind.config.js`
- **Available Classes**:
  - `.glass-panel`: Basic glass panel with white text
  - `.glass-card`: Glass panel with padding for card components
  - `.glass-button`: Glass button with hover effects
  - `.glass-input`: Glass input field with focus states
- **Usage**: Replace manual class combinations with these semantic classes for consistency

### **Development Patterns**

#### **1. Component Composition**:
- Small, focused components with single responsibilities
- Props-based communication
- Context for global state
- Custom hooks for reusable logic

#### **2. Error Handling**:
- Try-catch blocks in API calls
- Error boundaries for component errors
- User-friendly error messages
- Retry mechanisms

#### **3. Performance Optimization**:
- React Query caching for API calls
- Next.js Image optimization
- Lazy loading for large lists
- Memoization for expensive calculations

#### **4. Accessibility**:
- Headless UI components for keyboard navigation
- ARIA labels and roles
- Focus management
- Screen reader support
