"""
Constants and data models for OutDecked card management system.
"""

# Constants for metadata fields that use exact matching
METADATA_FIELDS_EXACT = ["series", "color", "rarity", "card_type", "cost_2"]

# Global variables for scraping status
scraping_status = {
    "is_running": False,
    "current_page": 0,
    "total_pages": 0,
    "game_name": "",
    "cards_found": 0,
    "should_stop": False,
    "logs": [],
}

# Define base URLs for supported games
GAME_URLS = {
    "Pokemon": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
    "Union Arena": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
}

# Supported games for scraping
SUPPORTED_GAMES = [
    {
        "name": "Pokemon",
        "url": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
    },
    {
        "name": "Union Arena",
        "url": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
    },
]
