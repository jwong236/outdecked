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
  attributes: CardAttribute[];
}

export type CardRef = { 
  card_id: number; 
  quantity: number; 
};

export type CardCache = Record<number, Card>;

export type ExpandedCard = Card & { quantity: number };

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

export interface SearchParams {
  query: string;
  sort: string;
  page: number;
  per_page: number;
  filters: FilterOption[];
}

export interface FilterOption {
  type: 'and' | 'or' | 'not';
  field: string;
  value: string;
  displayText: string;
}

export interface Deck {
  id: string;
  name: string; 
  game: string;
  description?: string;
  cards: CardRef[]; 
  visibility: 'private' | 'public' | 'unlisted';
  preferences: SearchParams; // Use unified SearchParams structure
  created_date: string;
  last_modified: string;
  is_legal?: boolean;
  total_cards?: number;
  cover?: string;
}