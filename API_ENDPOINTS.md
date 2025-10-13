# OutDecked API Endpoints Documentation

> **See Also**: 
> - [Database Schema Documentation](DATABASE_SCHEMA_NOTES.md) for complete database reference
> - [Component Architecture](COMPONENT_ARCHITECTURE.md) for frontend structure

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: Your Cloud Run URL

## Authentication
Most endpoints use session-based authentication with cookies. Protected endpoints require a valid session cookie obtained through login.

---

## Table of Contents
1. [Public Endpoints](#public-endpoints)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Card Search & Data Endpoints](#card-search--data-endpoints)
5. [Deck Management Endpoints](#deck-management-endpoints)
6. [Cart/Hand Endpoints](#carthand-endpoints)
7. [Admin Endpoints](#admin-endpoints)
8. [Utility Endpoints](#utility-endpoints)

---

## Public Endpoints

### Card Search & Information

#### `POST /api/cards` or `GET /api/cards`
Search cards with unified filter structure.

**Request Body (POST):**
```json
{
  "query": "string",
  "page": 1,
  "per_page": 20,
  "sort": "name_asc",
  "filters": [
    {
      "type": "and|or|not",
      "field": "rarity",
      "value": "Common"
    }
  ]
}
```

**Query Parameters (GET):**
- `game` - Filter by game name
- `query` - Search query
- `page` - Page number (default: 1)
- `per_page` - Results per page (default: 20)

**Response:**
```json
{
  "cards": [
    {
      "id": 123,
      "product_id": 456789,
      "name": "Card Name",
      "clean_name": "card name",
      "game": "Union Arena",
      "group_name": "Set Name",
      "price": "1.23",
      "attributes": [
        {
          "name": "Rarity",
          "value": "Common",
          "display_name": "Rarity"
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_cards": 100,
    "total_pages": 5,
    "has_prev": false,
    "has_next": true,
    "prev_page": null,
    "next_page": 2
  }
}
```

#### `GET /api/cards/<card_id>`
Get specific card by product_id with full attribute data.

**Response:**
```json
{
  "id": 123,
  "product_id": 456789,
  "name": "Card Name",
  "group_name": "Set Name",
  "group_abbreviation": "ABC",
  "attributes": [...],
  "price": "1.23"
}
```

#### `POST /api/cards/batch`
Get multiple cards by product IDs.

**Request Body:**
```json
{
  "product_ids": [123, 456, 789]
}
```

**Response:**
Array of card objects (same structure as single card GET).

#### `GET /api/cards/attributes`
List all available card attributes for filtering.

**Response:**
```json
[
  {
    "name": "Rarity",
    "display": "Rarity"
  },
  {
    "name": "CardType",
    "display": "Card Type"
  }
]
```

#### `GET /api/cards/attributes/<field>`
Get distinct values for a specific attribute.

**Query Parameters:**
- `game` - Optional game filter

**Response:**
```json
["Common", "Rare", "Super Rare", "Secret Rare"]
```

#### `GET /api/cards/colors/<series>`
Get available colors (activation energy) for a specific series.

**Query Parameters:**
- `game` - Game name (default: "Union Arena")

**Response:**
```json
["Red", "Blue", "Green", "Yellow", "Purple"]
```

### Game Information

#### `GET /api/games`
Get list of available games/categories.

**Response:**
```json
[
  {
    "name": "Union Arena",
    "display": "Union Arena"
  }
]
```

### Analytics

#### `GET /api/analytics`
Get basic application statistics.

**Response:**
```json
{
  "total_cards": 5000,
  "total_games": 5,
  "total_series": 50,
  "game_stats": [
    {
      "game": "Union Arena",
      "count": 2500
    }
  ]
}
```

#### `GET /api/analytics/games`
Get game-specific statistics.

**Response:**
```json
[
  {
    "game_name": "Union Arena",
    "card_count": 2500,
    "last_updated": null
  }
]
```

---

## Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "string (min 3 chars)",
  "email": "string (valid email)",
  "password": "string (min 6 chars)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 123
}
```

#### `POST /api/auth/login`
Login to existing account.

**Request Body:**
```json
{
  "username": "string (username or email)",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 123,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "display_name": "John Doe",
    "avatar_url": null
  }
}
```

**Sets session cookie for authentication.**

#### `POST /api/auth/logout`
Logout current user.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### `GET /api/auth/me`
Get current user information.

**Auth Required:** Yes

**Response:**
```json
{
  "user": {
    "id": 123,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "display_name": "John Doe",
    "avatar_url": null,
    "last_login": "2025-01-15T10:30:00"
  }
}
```

---

## User Endpoints

### Preferences

#### `GET /api/users/me/preferences`
Get user preferences.

**Auth Required:** Yes

**Response:**
```json
{
  "preferences": {
    "background": "/backgrounds/background-1.jpg",
    "cards_per_page": 24,
    "theme": "light"
  }
}
```

#### `PUT /api/users/me/preferences`
Update user preferences.

**Auth Required:** Yes

**Request Body:**
```json
{
  "preferences": {
    "background": "/backgrounds/background-2.jpg",
    "cards_per_page": 48,
    "theme": "dark"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated"
}
```

### Hand/Cart Management

#### `GET /api/users/me/hand`
Get user's saved hand/cart.

**Auth Required:** Yes (returns empty for anonymous)

**Response:**
```json
{
  "hand": [
    {
      "card_id": 123,
      "quantity": 2
    }
  ]
}
```

#### `POST /api/users/me/hand`
Save user's hand/cart.

**Auth Required:** Yes

**Request Body:**
```json
{
  "hand": [
    {
      "card_id": 123,
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hand saved successfully"
}
```

---

## Card Search & Data Endpoints

### Image Proxy

#### `GET /api/images/product/<product_id>`
Get TCGPlayer product image (proxied through backend).

**Query Parameters:**
- `size` - Image size (default: "1000x1000")
  - Options: "200x200", "400x400", "1000x1000"

**Response:** JPEG image with caching headers

---

## Deck Management Endpoints

### Deck CRUD

#### `GET /api/user/decks`
Get all user's deck IDs (sorted by last modified).

**Auth Required:** Optional (uses session storage if not logged in)

**Response:**
```json
{
  "success": true,
  "data": {
    "deck_ids": ["deck-123", "deck-456"],
    "count": 2
  }
}
```

#### `POST /api/user/decks`
Create a new deck.

**Auth Required:** Optional

**Request Body:**
```json
{
  "name": "My Deck",
  "game": "Union Arena",
  "description": "Deck description",
  "visibility": "private",
  "preferences": {
    "query": "",
    "sort": "name_asc",
    "page": 1,
    "per_page": 25,
    "filters": []
  },
  "cards": [],
  "cover": null
}
```

**Response:**
```json
{
  "success": true,
  "deck": {
    "id": "deck-123",
    "name": "My Deck",
    "game": "Union Arena",
    "cards": [],
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:30:00"
  },
  "message": "Deck created successfully"
}
```

#### `GET /api/user/decks/<deck_id>`
Get a specific deck by ID.

**Auth Required:** Optional

**Response:**
```json
{
  "success": true,
  "deck": {
    "id": "deck-123",
    "name": "My Deck",
    "game": "Union Arena",
    "cards": [
      {
        "card_id": 123,
        "quantity": 3
      }
    ]
  }
}
```

#### `POST /api/user/decks/batch`
Get multiple decks by IDs.

**Auth Required:** Optional

**Request Body:**
```json
{
  "deck_ids": ["deck-123", "deck-456"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "decks": [...],
    "count": 2,
    "missing_ids": []
  }
}
```

#### `PUT /api/user/decks/<deck_id>`
Update an existing deck.

**Auth Required:** Optional

**Request Body:**
```json
{
  "name": "Updated Deck Name",
  "description": "New description",
  "cards": [...]
}
```

**Response:**
```json
{
  "success": true,
  "deck": {...},
  "message": "Deck updated successfully"
}
```

#### `DELETE /api/user/decks/<deck_id>`
Delete a deck.

**Auth Required:** Optional

**Response:**
```json
{
  "success": true,
  "message": "Deck deleted successfully"
}
```

### Deck Card Management

#### `POST /api/user/decks/<deck_id>/cards`
Add a card to deck.

**Auth Required:** Optional

**Request Body:**
```json
{
  "card": {
    "card_id": 123,
    "name": "Card Name"
  },
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "deck": {...},
  "message": "Card added to deck successfully"
}
```

#### `POST /api/user/decks/<deck_id>/cards/batch`
Add multiple cards to deck.

**Auth Required:** Optional

**Request Body:**
```json
{
  "cards": [
    {
      "card_id": 123,
      "quantity": 2
    },
    {
      "card_id": 456,
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "deck": {...},
  "message": "Added 2 card types to deck successfully"
}
```

#### `PUT /api/user/decks/<deck_id>/cards/<card_id>`
Update card quantity in deck.

**Auth Required:** Optional

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "deck": {...},
  "message": "Card quantity updated successfully"
}
```

#### `DELETE /api/user/decks/<deck_id>/cards/<card_id>`
Remove card from deck.

**Auth Required:** Optional

**Request Body (optional):**
```json
{
  "quantity": 1
}
```

**Response:**
```json
{
  "success": true,
  "deck": {...},
  "message": "Card removed from deck successfully"
}
```

### Deck Validation

#### `POST /api/decks/validate`
Validate a deck without saving it.

**Request Body:**
```json
{
  "game": "Union Arena",
  "cards": [
    {
      "card_id": 123,
      "quantity": 3
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "is_valid": true,
    "errors": [],
    "warnings": [],
    "total_cards": 50
  }
}
```

---

## Cart/Hand Endpoints

These endpoints work for both logged-in and anonymous users.

#### `GET /api/users/me/cart`
Get cart contents.

**Response:**
- Logged in: Returns saved cart from database
- Anonymous: Returns message (frontend manages cart)

#### `POST /api/users/me/cart/cards`
Add cards to cart.

**Request Body:**
```json
{
  "hand": [
    {
      "card_id": 123,
      "quantity": 2
    }
  ]
}
```

#### `PUT /api/users/me/cart/cards/<card_id>`
Update card quantity in cart.

#### `DELETE /api/users/me/cart/cards/<card_id>`
Remove card from cart.

#### `DELETE /api/users/me/cart`
Clear entire cart.

---

## Admin Endpoints

All admin endpoints require appropriate permissions.

### User Management

#### `GET /api/users`
Get all users (requires `manage_users` permission).

**Auth Required:** Yes (Admin/Owner)

**Response:**
```json
{
  "users": [
    {
      "id": 123,
      "username": "john",
      "email": "john@example.com",
      "role": "user",
      "display_name": "John Doe",
      "is_active": true,
      "is_verified": false,
      "last_login": "2025-01-15T10:30:00",
      "created_at": "2025-01-01T00:00:00"
    }
  ]
}
```

#### `PUT /api/users/role`
Update user role (requires `manage_users` permission).

**Auth Required:** Yes (Admin/Owner)

**Request Body:**
```json
{
  "user_id": 123,
  "role": "admin"
}
```

**Valid Roles:** `user`, `moderator`, `admin`, `owner`

**Response:**
```json
{
  "success": true,
  "message": "User role updated"
}
```

#### `GET /api/user/stats`
Get user statistics (requires `view_admin_panel` permission).

**Auth Required:** Yes (Admin/Owner)

**Response:**
```json
{
  "total_users": 150,
  "recent_users": 25,
  "role_counts": {
    "user": 140,
    "moderator": 5,
    "admin": 4,
    "owner": 1
  }
}
```

### Scraping Management

#### `POST /api/admin/scraping/start`
Start card scraping (requires `manage_scraping` permission).

**Auth Required:** Yes (Admin/Owner)

**Response:**
```json
{
  "success": true,
  "message": "Scraping started"
}
```

#### `GET /api/admin/scraping/status`
Get scraping status (requires `view_admin_panel` permission).

**Auth Required:** Yes (Admin/Owner)

**Response:**
```json
{
  "status": "idle|running|completed",
  "message": "Status message"
}
```

### Database Management

#### `GET /api/admin/database/backup`
Backup database (requires `manage_database` permission).

**Auth Required:** Yes (Owner only)

#### `POST /api/admin/database/restore`
Restore database (requires `manage_database` permission).

**Auth Required:** Yes (Owner only)

---

## Utility Endpoints

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00"
}
```

#### `GET /api/routes`
List all available API routes (debugging).

**Response:** HTML page with all registered routes

#### `POST /api/tcgplayer/mass-entry`
Generate TCGPlayer Mass Entry URL from card list.

**Request Body:**
```json
{
  "card_ids": [
    {
      "card_id": "123",
      "quantity": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://www.tcgplayer.com/massentry?...",
  "entries": ["2 Card Name [SET]"],
  "count": 1
}
```

---

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Error message description",
  "success": false
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created (registration, deck creation)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Role-Based Permissions

### User Roles (in order of hierarchy)
1. **user** - Standard user
2. **moderator** - Can moderate content
3. **admin** - Can manage users and content
4. **owner** - Full system access

### Permissions by Role

| Permission | User | Moderator | Admin | Owner |
|------------|------|-----------|-------|-------|
| manage_users | ❌ | ❌ | ✅ | ✅ |
| manage_content | ❌ | ❌ | ✅ | ✅ |
| view_admin_panel | ❌ | ❌ | ✅ | ✅ |
| moderate_content | ❌ | ✅ | ✅ | ✅ |
| access_all_decks | ❌ | ❌ | ✅ | ✅ |
| system_settings | ❌ | ❌ | ❌ | ✅ |
| manage_scraping | ❌ | ❌ | ✅ | ✅ |
| manage_database | ❌ | ❌ | ❌ | ✅ |

---

## Rate Limiting & Caching

### Image Endpoints
- Images are cached for 24 hours
- CORS enabled for cross-origin requests

### Search Endpoints
- No rate limiting currently implemented
- Consider implementing for production

---

## Notes

1. **Session-based Auth**: All authenticated endpoints use Flask sessions with cookies
2. **Anonymous Access**: Deck and cart endpoints work without auth using session storage
3. **Deck Storage**: 
   - Logged in users: PostgreSQL database
   - Anonymous users: Browser session storage (frontend managed)
4. **Image Proxy**: Backend proxies TCGPlayer images to avoid CORS issues
5. **Batch Operations**: Use batch endpoints for better performance when fetching multiple resources
6. **Validation**: Deck validation happens on both frontend and backend

