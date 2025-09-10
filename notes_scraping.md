# TCGCSV Data Source Notes

## Overview
Found TCGCSV (https://tcgcsv.com/) as a better data source than direct TCGPlayer scraping.

## Key Information
- **Last Updated**: 2025-09-08T20:07:14+0000 (from https://tcgcsv.com/last-updated.txt)
- **Data Structure**: TCGPlayer has 4 tiers of information

## TCGPlayer Data Architecture

### 1. Categories
- Root level information
- Each category = card game or merchandise collection
- **Example**: `categoryId: 3` = Pokemon

### 2. Groups  
- Each category has Groups
- Each group = set in a card game
- **Example**: `groupId: 3170` = Pokemon's SWSH12: Silver Tempest set

### 3. Products
- Each group has Products
- Products can be: sealed boxes, packs, or individual cards
- Products have nested "extendedData" with card text, rarity, set number
- Products have separate Market Price objects (joined via productId)
- **Example**: `productId: 451396` = Lugia VSTAR

### 4. SKUs
- Products have SKUs (combination of Product, Language, Printing, Condition)
- **Note**: TCGCSV doesn't share SKU information
- **Limitation**: No prices for each condition of a card

## TCGCSV Website Structure
- **Categories Table**: Class `category-table` (not found in initial exploration)
- **Data Access**: Need to explore endpoints for category data

## Product URL Format
- **Format**: `https://www.tcgplayer.com/product/{productId}?Language=English`
- **Example**: `https://www.tcgplayer.com/product/648435?Language=English`
- **Status**: ✅ Accessible and contains all attribute information needed

## Next Steps
1. Explore TCGCSV data endpoints more thoroughly
2. Find the correct way to access category/group/product data
3. Understand the data format (JSON, CSV, etc.)
4. Create data import script for the database
5. Test with Pokemon category (ID: 3) first

## Benefits of TCGCSV Approach
- ✅ No need to scrape search pages
- ✅ Direct product information access
- ✅ All attributes available in one request
- ✅ Product IDs are easily manipulatable
- ✅ More reliable than direct TCGPlayer scraping

## Current Status
- ✅ **Database**: Fully TCGCSV-aligned schema with 3,065 cards
- ✅ **Scraper**: TCGCSV-only, no Selenium needed  
- ✅ **Frontend**: Updated to display TCGCSV attributes correctly
- ✅ **Schema Verification**: All TCGCSV fields properly mapped to database columns
- ✅ **Scraping Complete**: All Union Arena cards successfully processed
- ✅ **Search Functionality**: Fixed all database schema issues
- ✅ **Dropdown Filters**: Series (group_name) and Color (ActivationEnergy) working
- ✅ **Advanced Filters**: All filter types working with correct field mappings
- ✅ **Field Name Mapping**: Complete frontend-to-database field mapping system
- ✅ **All Filter Types**: AND, OR, NOT filters all working with TCGCSV schema
- ✅ **Series Name Standardization**: Fixed inconsistent series names (BLEACH, CODE GEASS, HUNTER X HUNTER)

## Database Field Mappings Discovered

### Available Attributes (from TCGCSV extendedData):
- **Rarity**: 3,065 cards
- **Number**: 3,065 cards  
- **CardType**: 3,057 cards
- **RequiredEnergy**: 2,944 cards
- **ActionPointCost**: 2,944 cards
- **ActivationEnergy**: 2,938 cards (contains colors: Blue, Green, Purple, Red, Yellow)
- **Description**: 2,607 cards
- **GeneratedEnergy**: 2,559 cards
- **BattlePointBP**: 2,476 cards
- **Trigger**: 1,940 cards
- **Affinities**: 1,759 cards

### Frontend Filter Mappings (Updated 2025-09-10):
- **Series Filter**: Maps to `SeriesName` attribute in `card_attributes` table (e.g., "BLEACH", "HUNTER X HUNTER")
- **Color Filter**: Maps to `ActivationEnergy` attribute (Blue, Green, Purple, Red, Yellow)
- **All other filters**: Map to corresponding TCGCSV attribute names in `card_attributes` table

### Complete Field Name Mapping System:
```python
FIELD_NAME_MAPPING = {
    "series": "SeriesName",        # TCGCSV attribute in card_attributes table
    "color": "ActivationEnergy",   # TCGCSV attribute
    "rarity": "Rarity",           # TCGCSV attribute
    "card_type": "CardType",      # TCGCSV attribute
    "required_energy": "RequiredEnergy",  # TCGCSV attribute
    "trigger": "Trigger",         # TCGCSV attribute
}
```

### Database Query Logic:
- **Direct Card Fields**: Only `name`, `clean_name`, `game` are queried directly from `cards` table
- **All Other Fields**: Queried from `card_attributes` table using `name` field matching
- **Search Function**: Updated to use `SeriesName` attributes instead of old `group_name` column

### Filter Types Supported:
- ✅ **AND Filters**: All conditions must match
- ✅ **OR Filters**: Any condition can match
- ✅ **NOT Filters**: Conditions must NOT match
- ✅ **Sorting**: By name, price, rarity, card number, required energy
- ✅ **Dropdown Population**: Dynamic values from database

## Series Name Standardization

### Problem Identified:
- **Inconsistent series names** due to fallback logic in scraper
- **Duplicates with different cases**: "BLEACH" vs "Bleach", "CODE GEASS" vs "Code Geass", etc.
- **Mixed data sources**: Some from TCGCSV group names, some from extendedData

### Solution Implemented:
- ✅ **Simplified approach**: Use `SeriesName` directly from `extendedData` instead of complex group name parsing
- ✅ **Removed `extract_series_name()` method** - no more complex parsing logic needed
- ✅ **Standardized all existing database records** to use consistent naming
- ✅ **Eliminated all duplicates** and inconsistencies

### Key Insight:
The `extendedData` already contains the correct `SeriesName` field for each card, so we should use that directly instead of trying to extract it from the TCGCSV group name. This is much simpler and more reliable.

### Final Fix Applied (2025-09-10):
- ✅ **Root Cause Identified**: Database saving function was skipping `series` field due to `skip_fields` list
- ✅ **Search Function Updated**: Changed from `c.group_name` to `SeriesName` attributes in `card_attributes` table
- ✅ **Old Data Cleaned**: Removed all old `group_name` entries from `cards` table (3,061 entries cleared)
- ✅ **Series Names Standardized**: Updated all `SeriesName` attributes to use consistent casing (3 updates made)
- ✅ **Database Schema Fixed**: Removed `"series"` from `skip_fields` so it gets saved properly
- ✅ **Result**: 14 unique series names with zero duplicates

### Final Standardized Series Names:
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

## TCGCSV Endpoint Structure Discovered

### Working Endpoints:
- ✅ `https://tcgcsv.com/tcgplayer/81/groups` - 47 groups (JSON) - **UNION ARENA**
- ✅ `https://tcgcsv.com/tcgplayer/56/24216/products` - 5 products (JSON) 
- ✅ `https://tcgcsv.com/tcgplayer/56/24216/prices` - 3 prices (JSON)
- ✅ `https://tcgcsv.com/tcgplayer/81/23521/products` - 145 products (JSON) - **UNION ARENA**
- ✅ `https://tcgcsv.com/tcgplayer/81/23521/prices` - 145 prices (JSON) - **UNION ARENA**

### URL Pattern Analysis:
- **Format**: `https://tcgcsv.com/tcgplayer/{categoryId}/{groupId}/{dataType}`
- **Data Types**: `groups`, `products`, `prices`
- **Category 56**: Unknown category (bulk lots)
- **Category 81**: **UNION ARENA** - 47 groups available, focusing on this!

### Product & Image URLs Confirmed:
- **Product Page**: `https://www.tcgplayer.com/product/{productId}?Language=English`
- **Product Image**: `https://tcgplayer-cdn.tcgplayer.com/product/{productId}_in_1000x1000.jpg`
- **Example**: Product 648435 works for both URL and image

## TCGCSV Data Structure Discovered ✅

### API Response Format:
All endpoints return JSON with this structure:
```json
{
  "totalItems": 47,
  "success": true,
  "errors": [],
  "results": [...]
}
```

### Groups Data (`/groups`):
- **Category 81**: 47 groups found
- **Sample**: "UEX05BT: Demon Slayer: Kimetsu no Yaiba Vol.2"
- **Keys**: `groupId`, `name`, `abbreviation`, `isSupplemental`, `publishedOn`, `modifiedOn`, `categoryId`

### Products Data (`/products`):
- **Category 56, Group 24216**: 5 products
- **Category 81, Group 23521**: 145 products  
- **Keys**: `productId`, `name`, `cleanName`, `imageUrl`, `categoryId`, `groupId`, `url`, `modifiedOn`, `imageCount`, `presaleInfo`

### Prices Data (`/prices`):
- **Keys**: `productId`, `lowPrice`, `midPrice`, `highPrice`, `marketPrice`, `directLowPrice`, `subTypeName`

### Product URLs Confirmed:
- **TCGPlayer URL**: `https://www.tcgplayer.com/product/{productId}/...`
- **Image URL**: `https://tcgplayer-cdn.tcgplayer.com/product/{productId}_200w.jpg`

## Union Arena Focus (Category 81)
- **47 Groups Available**: Each group = a Union Arena set
- **Sample Groups**: "UEX05BT: Demon Slayer", "UE14BT: GODDESS OF VICTORY: NIKKE"
- **Rich Product Data**: 145 products in group 23521 alone
- **Complete Pricing**: Market prices available for all products

## Card Metadata Discovery Results

### TCGCSV Data Limitations:
- **Individual Cards Found**: Union Arena has individual cards (e.g., Attack on Titan group with 144 products)
- **Limited Metadata**: TCGCSV `extendedData` only contains: `name`, `displayName`, `value`
- **Missing Card Details**: No rarity, number, type, energy, cost, attack, HP, trigger, etc.

### TCGPlayer Page Structure:
- **Single Page Application**: TCGPlayer uses JavaScript to load card data dynamically
- **Static HTML**: Only contains page shell, no card metadata in initial HTML
- **Dynamic Loading**: Card details loaded via AJAX/API calls after page load

### Available Data Sources:
1. **TCGCSV Basic Info**: Product ID, name, image URL, prices
2. **TCGPlayer Product Pages**: Full card details (but requires JavaScript rendering)
3. **Direct API Calls**: May need to find TCGPlayer's internal API endpoints

## Scraping System Refactored ✅

### Major Code Cleanup (2025-01-09):
- ✅ **Renamed**: `tcgplayer_scraper.py` → `scraper.py` (cleaner naming)
- ✅ **Simplified**: Reduced from 671 lines to ~200 lines of focused code
- ✅ **Removed**: All debugging/retry logic, exception handling, and unnecessary complexity
- ✅ **Streamlined**: Kept only essential functionality - TCGCSV data fetching, Selenium scraping, database saving

### Database Architecture Overhaul:
- ✅ **Created**: New `database.py` with TCGCSV-aligned structure (replaced old database.py)
- ✅ **Added**: Tables for `categories`, `groups`, `card_prices` matching TCGCSV JSON structure
- ✅ **Enhanced**: `cards` table with `product_id`, `category_id`, `group_id` fields
- ✅ **Maintained**: Flexible `card_attributes` table for dynamic fields
- ✅ **Populated**: 89 categories and 47 Union Arena groups from TCGCSV

### Database Updates:
- ✅ Renamed `card_metadata` table to `card_attributes`
- ✅ Renamed `metadata_fields` table to `attributes_fields`
- ✅ Updated all related functions and references
- ✅ Fixed search.py to use `card_attributes` instead of `card_metadata`

### Scraping Infrastructure:
- ✅ Created clean `scraper.py` with streamlined scraping system
- ✅ Created `/scraping` web page with normal Bootstrap container
- ✅ Added scraping link to navbar Profile dropdown
- ✅ Integrated with TCGCSV-aligned database system
- ✅ Implemented Selenium WebDriver for JavaScript rendering
- ✅ Added dynamic 10-second rate limiting with processing time calculation
- ✅ Fixed web interface to display real-time logs and status updates

### TCGPlayer Page Solution:
- ✅ **Selenium WebDriver**: Successfully renders JavaScript and accesses dynamic content
- ✅ **Selectors Working**: `.product__item-details__description` and `.product__item-details__attributes` found
- ✅ **Attribute Extraction**: Successfully extracting 5-9 attributes per Union Arena card
- ✅ **Dynamic Rate Limiting**: Respects 10-second crawl delay with intelligent timing

### Union Arena Card Attributes Successfully Extracted:
- **Rarity**: Common, Rare, Super Rare, etc.
- **Card Number**: UE10BT/AOT-1-100 format
- **Series Name**: Attack on Titan, Demon Slayer, etc.
- **Card Type**: Character, Event, etc.
- **Activation Energy**: Red, Blue, Green, etc.
- **Required Energy**: Numeric energy cost
- **Action Point Cost**: AP cost for abilities
- **Trigger**: Special ability text
- **Description**: Full card text/abilities

### Current Database Schema (Updated 2025-09-10):

#### Main Tables:

**`cards` table** - Core card information:
```sql
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    clean_name TEXT,
    image_url TEXT,
    card_url TEXT,
    game TEXT NOT NULL,
    category_id INTEGER,
    group_id INTEGER,
    image_count INTEGER,
    is_presale BOOLEAN,
    released_on TEXT,
    presale_note TEXT,
    modified_on TEXT,
    price REAL,
    low_price REAL,
    mid_price REAL,
    high_price REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`card_attributes` table** - Dynamic card metadata (TCGCSV extendedData):
```sql
CREATE TABLE card_attributes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    name TEXT NOT NULL,           -- TCGCSV field name (e.g., "SeriesName", "Rarity")
    value TEXT NOT NULL,          -- TCGCSV field value (e.g., "BLEACH", "Common")
    display_name TEXT,            -- TCGCSV display name (e.g., "Series Name", "Rarity")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards (id),
    UNIQUE(card_id, name)
);
```

**`card_prices` table** - Price information:
```sql
CREATE TABLE card_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    market_price REAL,
    low_price REAL,
    mid_price REAL,
    high_price REAL,
    direct_low_price REAL,
    sub_type_name TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards (id),
    UNIQUE(card_id)
);
```

**`categories` table** - Game categories:
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`groups` table** - Card sets/groups:
```sql
CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER UNIQUE NOT NULL,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    abbreviation TEXT,
    is_supplemental BOOLEAN,
    published_on TEXT,
    modified_on TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
);
```

#### Key Schema Changes Made:

1. **Removed `group_name` from `cards` table** - Series information now stored exclusively in `card_attributes` as `SeriesName`
2. **Updated `card_attributes` structure** - Uses `name`/`value`/`display_name` to match TCGCSV extendedData format
3. **Added price fields to `cards` table** - Direct price storage for faster queries
4. **Enhanced `groups` table** - Added TCGCSV group metadata fields

#### Current Data Status:
- **Total Cards**: 3,065 Union Arena cards
- **Total Attributes**: 29,354 card attributes
- **Series Names**: 14 unique series (standardized, no duplicates)
- **Available Attributes**: Rarity, Number, CardType, RequiredEnergy, ActionPointCost, ActivationEnergy, Description, GeneratedEnergy, BattlePointBP, Trigger, Affinities, SeriesName

### Individual Card Detection Method:
- ✅ **Proven Method**: Using `extendedData` field length to distinguish individual cards from sealed products
- ✅ **100% Accurate**: Products with empty `extendedData` = sealed products, non-empty = individual cards
- ✅ **Expected Count**: 3,065 individual Union Arena cards (confirmed via TCGCSV analysis)

### Current Status:
- ✅ **Clean Codebase**: Streamlined scraper from 671 to ~200 lines
- ✅ **TCGCSV-Aligned Database**: Perfect structure match with TCGCSV JSON architecture
- ✅ **Ready to Run**: Scraper prepared to capture all 3,065 individual Union Arena cards
- ✅ **Database Populated**: 89 categories and 47 Union Arena groups loaded from TCGCSV
- ✅ **Search Working**: Cards searchable and filterable on web interface
- ✅ **Real-time Monitoring**: Web interface shows live scraping progress
- ✅ **Flexible Design**: System can handle different games with different attributes

## Next Steps
1. ✅ Explore TCGCSV data endpoints - **COMPLETED**
2. ✅ Analyze JSON data structure from working endpoints - **COMPLETED**
3. ✅ Identify Union Arena as Category 81 with 47 groups - **COMPLETED**
4. ✅ Discover TCGCSV metadata limitations - **COMPLETED**
5. ✅ Create scraping system infrastructure - **COMPLETED**
6. ✅ Implement Selenium WebDriver for JavaScript rendering - **COMPLETED**
7. ✅ Test scraping with rendered TCGPlayer pages - **COMPLETED**
8. ✅ Deploy full scraping system - **COMPLETED**
9. ✅ Refactor and clean up codebase - **COMPLETED**
10. ✅ Align database with TCGCSV architecture - **COMPLETED**
11. 🔄 **READY**: Start scraper to capture all 3,065 Union Arena cards
12. 🔄 Test search and filtering functionality with populated data
