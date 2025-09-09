"""
Constants and data models for OutDecked card management system.
"""

# Constants for metadata fields that use exact matching
METADATA_FIELDS_EXACT = ["series", "color", "rarity", "card_type", "cost_2"]

# Global variables for scraping status - MOVED TO SCRAPING_ARCHIVE
# scraping_status = {
#     "is_running": False,
#     "current_page": 0,
#     "total_pages": 0,
#     "game_name": "",
#     "cards_found": 0,
#     "should_stop": False,
#     "logs": [],
# }

# Define base URLs for supported games - MOVED TO SCRAPING_ARCHIVE
# GAME_URLS = {
#     "Pokemon": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
#     "Union Arena": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
# }

# Supported games for scraping - MOVED TO SCRAPING_ARCHIVE
# SUPPORTED_GAMES = [
#     {
#         "name": "Pokemon",
#         "url": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
#     },
#     {
#         "name": "Union Arena",
#         "url": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
#     },
# ]

# Deck building constants and validation rules
DECK_VALIDATION_RULES = {
    "Union Arena": {
        "min_cards": 50,
        "max_cards": 50,
        "max_copies_per_card": 4,
        "required_cards": 0,  # No required cards for Union Arena
    },
    "Pokemon": {
        "min_cards": 60,
        "max_cards": 60,
        "max_copies_per_card": 4,
        "required_cards": 0,  # No required cards for Pokemon
    },
    "default": {
        "min_cards": 60,
        "max_cards": 60,
        "max_copies_per_card": 4,
        "required_cards": 0,
    },
}

# Deck data structure template
DECK_TEMPLATE = {
    "id": "",  # Unique identifier
    "name": "",  # User-defined deck name
    "game": "",  # Game type (Union Arena, Pokemon, etc.)
    "cards": [],  # Array of card objects
    "created_date": "",  # ISO timestamp
    "last_modified": "",  # ISO timestamp
    "total_cards": 0,  # Count of cards in deck
    "is_legal": False,  # Deck validation status
    "description": "",  # Optional deck description
}

# Card in deck structure template
DECK_CARD_TEMPLATE = {
    "card_id": 0,  # Database card ID
    "name": "",  # Card name
    "image_url": "",  # Card image URL
    "quantity": 1,  # Number of copies (1-4)
    "metadata": {},  # Full card metadata (rarity, cost, etc.)
}
