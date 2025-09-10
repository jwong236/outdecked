"""
Constants and data models for OutDecked card management system.
"""

# Constants for metadata fields that use exact matching (TCGCSV attribute names)
METADATA_FIELDS_EXACT = [
    "Rarity",
    "CardType",
    "RequiredEnergy",
    "ActivationEnergy",
    "Trigger",
]


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
