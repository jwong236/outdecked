# OutDecked Frontend

Modern React frontend for the Union Arena card database, built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Next.js 14** (App Router) - React framework with SSR/SSG
- **React 18** - Latest React with concurrent features
- **TypeScript** - Type safety for complex card data structures
- **Tailwind CSS** - Utility-first CSS framework
- **Headless UI** - Accessible interactive components
- **Zustand** - Lightweight state management
- **React Query** - API calls and caching
- **Heroicons** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Flask backend running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL to your Flask server URL

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js 14 app router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home/search page
│   │   └── providers.tsx # React Query provider
│   ├── components/       # Reusable React components
│   │   ├── Card.tsx      # Individual card display
│   │   ├── CardGrid.tsx  # Grid of cards
│   │   ├── Pagination.tsx # Pagination controls
│   │   └── SearchFilters.tsx # Search and filter controls
│   ├── stores/           # Zustand state stores
│   │   └── searchStore.ts # Search state management
│   ├── types/            # TypeScript type definitions
│   │   └── card.ts       # Card and API types
│   └── lib/              # Utilities and API client
│       ├── api.ts        # API client for Flask backend
│       ├── hooks.ts      # React Query hooks
│       └── queryClient.ts # Query client configuration
├── package.json
└── tailwind.config.js
```

## Features

### ✅ Completed
- **Search Page** - Full search functionality with filters
- **Card Display** - Responsive card grid with images
- **Filtering** - Series, color, and sort filters
- **Pagination** - Full pagination support
- **State Management** - Zustand for search state
- **API Integration** - React Query for data fetching
- **TypeScript** - Full type safety
- **Responsive Design** - Mobile-friendly layout

### 🚧 In Progress
- **Card Modal** - Detailed card view (basic version complete)
- **Advanced Filters** - AND/OR/NOT filter combinations

### 📋 TODO
- **Deck Builder** - Build and manage decks
- **Admin Panel** - Scraping controls and monitoring
- **User Authentication** - Login/signup system
- **Favorites** - Save favorite cards
- **Deployment** - Google Cloud setup

## API Integration

The frontend connects to the Flask backend via these endpoints:

- `GET /api/search` - Search cards with filters and pagination
- `GET /api/anime-values` - Get available series names
- `GET /api/color-values` - Get available colors
- `GET /api/filter-values/{game}/{field}` - Get metadata field values
- `GET /api/metadata-fields/{game}` - Get available metadata fields

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type check
npm run type-check
```

## Deployment

The app is designed to be deployed alongside the Flask backend on Google Cloud:

1. **Cloud Run** - For containerized deployment
2. **App Engine** - For serverless deployment
3. **Static Hosting** - For static export (if using static generation)

## Contributing

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Write reusable components
4. Add proper TypeScript types
5. Test with the Flask backend running locally