// Card data types based on your Flask API structure

export interface Card {
  id: number;
  product_id: number;
  name: string;
  clean_name: string | null;
  card_url: string | null;
  game: string;
  category_id: number;
  group_id: number;
  group_name?: string;
  group_abbreviation?: string;
  print_type?: string;
  image_count: number;
  is_presale: boolean;
  released_on: string;
  presale_note: string;
  modified_on: string;
  price: number | null;
  low_price: number | null;
  mid_price: number | null;
  high_price: number | null;
  created_at: string;
  // Dynamic attributes from card_attributes table
  SeriesName?: string;
  Rarity?: string;
  Number?: string;
  CardType?: string;
  RequiredEnergy?: string;
  ActionPointCost?: string;
  ActivationEnergy?: string;
  Description?: string;
  GeneratedEnergy?: string;
  BattlePointBP?: string;
  Trigger?: string;
  Affinities?: string;
  [key: string]: any; // Allow for any additional dynamic attributes
}

export interface CardAttribute {
  id: number;
  card_id: number;
  name: string;
  value: string;
  display_name: string;
  created_at: string;
}

export interface SearchResponse {
  cards: Card[];
  pagination: {
    current_page: number;
    per_page: number;
    total_pages: number;
    total_cards: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface FilterOption {
  type: 'and' | 'or' | 'not';
  field: string;
  value: string;
  displayText: string;
}

export interface SearchFilters {
  query: string;
  game: string;
  series: string;
  color: string;
  cardType: string;
  sort: string;
  page: number;
  per_page: number;
  and_filters: FilterOption[];
  or_filters: FilterOption[];
  not_filters: FilterOption[];
}

export interface MetadataField {
  name: string;
  display: string;
}

// ===== CLEAN 3-LAYER ARCHITECTURE =====

// 1. LIGHTWEIGHT REFERENCES (Storage Layer)
export type CardRef = { 
  card_id: number; 
  quantity: number; 
};

// 2. CACHE LAYER
export type CardCache = Record<string, Card>;

// 3. EXPANDED OBJECTS (UI Layer)
export type ExpandedCard = Card & { quantity: number };

// ===== LEGACY UNION TYPES (Now Dynamic Strings) =====
// These are now dynamic strings from scraped data, not hard-coded unions
export type SeriesName = string;
export type ActivationEnergy = string;
export type Rarity = string;
export type CardType = string;

// ===== CLEAN DECK DEFINITION =====
export interface Deck {
  id: string;
  name: string; 
  game: string;
  description?: string;
  cards: CardRef[];              // Always lightweight references
  visibility: 'private' | 'public' | 'unlisted';
  preferences: {
    series: string;
    color: string;
    cardTypes: string[];
    printTypes: string[];
    rarities: string[];
  };
  created_date: string;          // ISO string, not Date
  last_modified: string;
  is_legal?: boolean;
  total_cards?: number;
  cover?: string; // Optional cover field
}

// ===== CLEAN ARCHITECTURE - NO LEGACY INTERFACES =====
// All legacy interfaces have been removed and replaced with clean types
