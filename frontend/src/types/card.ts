// Card data types based on your Flask API structure

export interface Card {
  id: number;
  product_id: number;
  name: string;
  clean_name: string | null;
  image_url: string | null;
  card_url: string | null;
  game: string;
  category_id: number;
  group_id: number;
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

// Union Arena specific types
export type SeriesName = 
  | 'BLEACH'
  | 'CODE GEASS'
  | 'HUNTER X HUNTER'
  | 'Jujutsu Kaisen'
  | 'Demon Slayer'
  | 'Attack on Titan'
  | 'Black Clover'
  | 'FULLMETAL ALCHEMIST'
  | 'One Punch Man'
  | 'Sword Art Online'
  | 'Rurouni Kenshin'
  | 'Kaiju No. 8'
  | 'NIKKE'
  | 'Yu Yu Hakusho'
  | 'Union Arena Promotion Cards';

export type ActivationEnergy = 'Blue' | 'Green' | 'Purple' | 'Red' | 'Yellow';

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Super Rare' | 'Ultra Rare' | 'Secret Rare';

export type CardType = 'Character' | 'Event' | 'Base' | 'Leader';
