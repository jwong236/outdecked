# OutDecked Database Schema Reference

> **See Also**: 
> - [API Endpoints Documentation](API_ENDPOINTS.md) for complete API reference
> - [Component Architecture](COMPONENT_ARCHITECTURE.md) for frontend structure

## Database Configuration
- **Database System**: PostgreSQL (all environments)
- **ORM**: SQLAlchemy
- **Location**: `backend/app/models.py` and `backend/app/database.py`

---

## Table Summary
- **User Management**: users, user_preferences, user_sessions, user_hands, user_decks
- **Card Data**: cards, card_attributes, card_prices
- **Reference Data**: categories, groups

---

## User Management Tables

### users
Primary table for user authentication and management.
- `id` (PK, Integer)
- `username` (String, Unique, Not Null)
- `email` (String, Unique, Not Null)
- `password_hash` (String, Not Null)
- `role` (String, Not Null, Default: "user") - Values: user/admin/owner
- `display_name` (String)
- `avatar_url` (String)
- `is_active` (Boolean, Default: True)
- `is_verified` (Boolean, Default: False)
- `email_verification_token` (String)
- `password_reset_token` (String)
- `password_reset_expires` (DateTime)
- `last_login` (DateTime)
- `created_at` (DateTime, Default: now)
- `updated_at` (DateTime, Default: now)

**Relationships**: 
- One-to-one with user_preferences
- One-to-many with user_sessions, user_hands, user_decks

### user_preferences
Stores UI customization settings per user.
- `id` (PK, Integer)
- `user_id` (FK → users.id, Not Null, Cascade Delete)
- `background` (String, Default: "background-1.jpg")
- `cards_per_page` (Integer, Default: 24)
- `theme` (String, Default: "light")
- `created_at` (DateTime, Default: now)
- `updated_at` (DateTime, Default: now)

### user_sessions
Active session tracking for logged-in users.
- `id` (PK, Integer)
- `user_id` (FK → users.id, Not Null, Cascade Delete)
- `session_token` (String, Unique, Not Null)
- `expires_at` (DateTime, Not Null)
- `ip_address` (String)
- `user_agent` (String)
- `created_at` (DateTime, Default: now)

### user_hands
Stores current hand/cart data as JSON (one per user).
- `id` (PK, Integer)
- `user_id` (FK → users.id, Not Null, Cascade Delete, **Unique**)
- `hand_data` (Text, Not Null) - Stored as JSON string
- `updated_at` (DateTime, Default: now)

**Unique Constraint**: user_id (one hand per user)

### user_decks
Stores saved deck data as JSON (multiple decks per user).
- `id` (PK, Integer)
- `user_id` (FK → users.id, Not Null, Cascade Delete)
- `deck_id` (String, Not Null)
- `deck_data` (Text, Not Null) - Stored as JSON string
- `created_at` (DateTime, Default: now)
- `updated_at` (DateTime, Default: now)

**Unique Constraint**: (user_id, deck_id)

---

## Card Data Tables

### cards
Main card information from TCGPlayer/TCGCSV.
- `id` (PK, Integer)
- `product_id` (Integer, Unique, Not Null) - TCGPlayer product ID
- `name` (String, Not Null)
- `clean_name` (String)
- `card_url` (String) - TCGPlayer URL
- `game` (String, Not Null)
- `category_id` (Integer)
- `group_id` (Integer)
- `group_name` (String)
- `image_count` (Integer)
- `is_presale` (Boolean, Default: False)
- `released_on` (String)
- `presale_note` (String)
- `modified_on` (String)
- `print_type` (String)
- `created_at` (DateTime, Default: now)

**Relationships**: 
- One-to-many with card_attributes, card_prices

### card_attributes
Card attributes/extended data (rarity, color, type, etc.).
- `id` (PK, Integer)
- `card_id` (FK → cards.id, Not Null, Cascade Delete)
- `name` (String, Not Null) - Attribute key name
- `display_name` (String, Not Null)
- `value` (String, Not Null)
- `created_at` (DateTime, Default: now)

**Unique Constraint**: (card_id, name)

**Common Attribute Names**:
- `rarity`, `color`, `cardtype`, `feature`, `cost`, `power`, `ap`, `dp`, `trigger`

### card_prices
Current pricing data from TCGPlayer.
- `id` (PK, Integer)
- `card_id` (FK → cards.id, Not Null, Cascade Delete)
- `market_price` (String) - Stored as string to match TCGCSV
- `low_price` (String)
- `mid_price` (String)
- `high_price` (String)
- `created_at` (DateTime, Default: now)

**Note**: Prices stored as strings to match TCGCSV format

---

## Reference Data Tables

### categories
TCG game categories (e.g., "Union Arena", "Magic: The Gathering").
- `id` (PK, Integer)
- `category_id` (Integer, Unique, Not Null) - TCGPlayer category ID
- `name` (String, Not Null)
- `display_name` (String)
- `description` (String)
- `created_at` (DateTime, Default: now)

**Note**: Union Arena is category_id 81

### groups
Card sets/groups within categories.
- `id` (PK, Integer)
- `group_id` (Integer, Unique, Not Null) - TCGPlayer group ID
- `category_id` (Integer, Not Null)
- `name` (String, Not Null)
- `abbreviation` (String)
- `is_supplemental` (Boolean, Default: False)
- `published_on` (String)
- `modified_on` (String)
- `created_at` (DateTime, Default: now)

---

## Important Database Patterns

### JSON Storage
- `hand_data` in user_hands: Array of card objects
- `deck_data` in user_decks: Full deck object with cards, metadata, preferences

### Cascade Deletes
All foreign keys use CASCADE DELETE to maintain referential integrity:
- Deleting a user removes all their preferences, sessions, hands, and decks
- Deleting a card removes all its attributes and prices

### Data Sources
- Cards, attributes, and prices scraped from TCGCSV API
- Categories and groups populated from TCGCSV on database initialization
- User data created through application registration/authentication

### Default Accounts
Created on initialization:
- **Owner**: username="admin", role="owner", password from env or "admin123"
- **Test User**: username="testuser", role="user", password from env or "test123"

---

## Query Patterns

### Common Searches (from search.py)
- Cards queried with JOIN to card_attributes for filtering
- Filters applied on: rarity, color, cardtype, cost, power, feature, group_name, print_type
- Full-text search on card names using LIKE/ILIKE
- Pagination with LIMIT and OFFSET

### Deck Validation Rules
Defined in models.py:
- **Union Arena**: 40-50 cards, max 3 copies per card
- **Default**: 1-100 cards, max 4 copies per card

---

## Key Relationships Diagram
```
users (1) ──────── (1) user_preferences
  │
  ├─── (many) user_sessions
  ├─── (1) user_hands
  └─── (many) user_decks

cards (1) ──────── (many) card_attributes
  └─── (many) card_prices

categories (1) ──────── (many) groups
```

---

## Card Attributes Reference

### Attribute Name Format
**All attributes are stored in snake_case (lowercase with underscores).**

There is NO name transformation - the attribute names in the database are exactly as shown below.

### All Card Attribute Names
These attributes are scraped from TCGCSV and stored in `card_attributes` table:

**Core Game Attributes:**
- `rarity` - Card rarity (e.g., Common, Rare, Super Rare, etc.)
- `card_type` - Type of card (e.g., Character, Event, etc.)
- `series` - Series the card belongs to (e.g., "Goddess of Victory", "Attack on Titan")
- `print_type` - Print version (Base, Pre-Release, Starter Deck, etc.)

**Numeric Attributes:**
- `activation_energy` - Color/energy cost to activate (e.g., Yellow, Blue, Green)
- `required_energy` - Energy required to play (numeric)
- `action_point_cost` - AP cost (numeric)
- `battle_point` - Battle points/power (numeric)
- `generated_energy` - Energy generated by card

**Special Attributes:**
- `affinities` - Card affinities (can be multi-value separated by " / ", e.g., "Elysion / Counters")
- `trigger_type` - Trigger type (e.g., Get, Active, Color, Draw, Final, Raid, Special)
- `trigger_text` - Full trigger text including brackets (e.g., "[Get] Add this card to your hand.")
- `card_number` - Card number in set (e.g., "UE14BT/NIK-1-009")
- `card_text` - Card effect text (HTML tags removed)

### Print Type Values
Hard-coded in system (from search.py):
- `Base` - Standard set cards
- `Pre-Release` - Pre-release event cards
- `Starter Deck` - Starter deck cards
- `Pre-Release Starter` - Pre-release starter cards
- `Promotion` - Promotional cards
- `Box Topper Foil` - Box topper cards

### Trigger Types
Extracted from trigger text (first word in brackets):
- `Active`
- `Color`
- `Draw`
- `Final`
- `Get`
- `Raid`
- `Special`

### Special Handling in Queries

**Affinities:**
- Stored as single string with " / " separator
- Split on query to allow filtering by individual affinity
- Example: "Red / Blue" becomes ["Red", "Blue"] for filter options

**Trigger Type:**
- Extracted from full trigger text using regex: `\[([^\]]+)\]`
- Only first word of bracketed text used (e.g., "[Active Trigger]" → "Active")
- Normalized to capitalize first letter

**Numeric Fields:**
- Sorted numerically instead of alphabetically
- Fields: required_energy, action_point_cost, battle_point
- Converted to int if whole number, kept as float otherwise

**Description Field:**
- Excluded from filter options (too long/unique)
- HTML tags (`<em>`, `</em>`) cleaned during scraping

### Query Syntax Field Shortcuts

For the new query syntax system, these shortcuts map to attribute names:

| Shortcut | Attribute Name | Example |
|----------|---------------|---------|
| `c` | activation_energy | `c:yellow` |
| `r` | rarity | `r:super_rare` |
| `s` | series | `s:goddess_of_victory` |
| `pt` | print_type | `pt:base` |
| `ct` | card_type | `ct:character` |
| `en` | required_energy | `en:3` |
| `ap` | action_point_cost | `ap:1` |
| `bp` | battle_point | `bp:1500` |
| `af` | affinities | `af:elysion` |
| `tr` | trigger_type | `tr:get` |
| `ge` | generated_energy | `ge:y` |

### Querying Unique Values

To get unique values for any attribute (requires database access):
```python
from database import get_session
from models import CardAttribute

session = get_session()

# Get all unique values for a specific attribute (use snake_case names)
values = session.query(CardAttribute.value)\
    .filter(
        CardAttribute.name == 'rarity',  # lowercase: rarity, series, card_type, etc.
        CardAttribute.value.isnot(None),
        CardAttribute.value != ''
    )\
    .distinct()\
    .order_by(CardAttribute.value)\
    .all()

session.close()
```

### Data Flow

**Scraping** (TCGCSV → Database):
1. Fetch product data from TCGCSV API
2. Extract `extendedData` array from each product
3. Map attribute names (lowercase → TitleCase)
4. Insert into `card_attributes` table

**Search/Filter** (Database → Frontend):
1. Query distinct attribute names for filter fields
2. Query distinct values per attribute for filter options
3. Apply special formatting (split affinities, extract triggers, etc.)
4. Return formatted options to frontend

---

## Important Notes
- **Terminology**: Use "attributes" not "metadata" (user preference)
- **Attribute Naming**: All attributes stored in snake_case (lowercase with underscores) - NO PascalCase transformation
- **Database Immutability**: Don't modify database schema unless explicitly instructed
- **Price Format**: Prices stored as strings (e.g., "1.23") not floats
- **Timestamps**: All datetime fields use UTC
- **Session Management**: Sessions have expiration times, cleaned up periodically
- **Attribute Values**: Specific unique values (e.g., which rarities exist) require live database access via API endpoints `/api/cards/attributes/<field>` or direct query
- **Query Syntax**: New system uses clean URLs with field shortcuts (see Query Syntax Field Shortcuts section)

