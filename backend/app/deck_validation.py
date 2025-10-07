"""
Deck validation system for Union Arena and other card games.
This module provides the single source of truth for all deck validation rules.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime

# Card-specific exceptions to normal rules
CARD_EXCEPTIONS = {
    "UEX04BT/HTR-2-011": {
        "max_copies": 14,
        "reason": "Special promotional card with increased limit",
    }
    # Add more exceptions here as needed
}

# Deck validation rules by game
DECK_VALIDATION_RULES = {
    "Union Arena": {
        "min_cards": 50,
        "max_cards": 50,
        "default_max_copies": 4,
        "max_color_triggers": 4,
        "max_special_triggers": 4,
        "max_final_triggers": 4,
        "required_cards": [],
        "banned_cards": [],
    },
    "default": {
        "min_cards": 1,
        "max_cards": 100,
        "default_max_copies": 4,
        "max_color_triggers": 4,
        "max_special_triggers": 4,
        "max_final_triggers": 4,
        "required_cards": [],
        "banned_cards": [],
    },
}


def get_card_max_copies(card_number: str, game: str = "Union Arena") -> int:
    """
    Get the maximum number of copies allowed for a specific card.
    Checks CARD_EXCEPTIONS first, then falls back to default rules.
    """
    # Check for card-specific exceptions
    if card_number in CARD_EXCEPTIONS:
        return CARD_EXCEPTIONS[card_number]["max_copies"]

    # Use default rule for the game
    rules = DECK_VALIDATION_RULES.get(game, DECK_VALIDATION_RULES["default"])
    return rules["default_max_copies"]


def count_triggers(cards: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Count different types of triggers in the deck.
    Returns a dictionary with trigger counts.
    """
    total_triggers = 0
    color_triggers = 0
    special_triggers = 0
    final_triggers = 0

    for card in cards:
        quantity = card.get("quantity", 1)

        # Get trigger attribute
        trigger_value = None
        if "attributes" in card:
            for attr in card["attributes"]:
                if attr.get("name") == "trigger_text":
                    trigger_value = attr.get("value", "")
                    break

        if trigger_value and trigger_value.strip():
            total_triggers += quantity

            trigger_text = trigger_value.lower()
            if "[color]" in trigger_text:
                color_triggers += quantity
            if "[special]" in trigger_text:
                special_triggers += quantity
            if "[final]" in trigger_text:
                final_triggers += quantity

    return {
        "total_triggers": total_triggers,
        "color_triggers": color_triggers,
        "special_triggers": special_triggers,
        "final_triggers": final_triggers,
    }


def validate_deck(deck_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a deck and return structured validation results.

    Args:
        deck_data: Dictionary containing deck information including cards

    Returns:
        Dictionary with validation results:
        {
            "is_valid": bool,
            "errors": List[str],
            "warnings": List[str],
            "stats": Dict[str, Any]
        }
    """
    game = deck_data.get("game", "Union Arena")
    rules = DECK_VALIDATION_RULES.get(game, DECK_VALIDATION_RULES["default"])
    cards = deck_data.get("cards", [])

    # Initialize result
    result = {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "stats": {
            "total_cards": 0,
            "total_triggers": 0,
            "color_triggers": 0,
            "special_triggers": 0,
            "final_triggers": 0,
            "card_counts": {},
        },
    }

    # Count cards and check for duplicates
    total_cards = 0
    card_counts = {}

    for card in cards:
        quantity = card.get("quantity", 1)
        total_cards += quantity

        # Get card identifier (prefer card_number, fallback to name)
        card_id = card.get("card_number") or card.get("name", "")
        if card_id:
            card_counts[card_id] = card_counts.get(card_id, 0) + quantity

    # Update stats
    result["stats"]["total_cards"] = total_cards
    result["stats"]["card_counts"] = card_counts

    # Count triggers
    trigger_counts = count_triggers(cards)
    result["stats"].update(trigger_counts)

    # Validate card count
    if total_cards < rules["min_cards"]:
        result["is_valid"] = False
        result["errors"].append(
            f"Deck has {total_cards} cards, minimum is {rules['min_cards']}"
        )
    elif total_cards > rules["max_cards"]:
        result["is_valid"] = False
        result["errors"].append(
            f"Deck has {total_cards} cards, maximum is {rules['max_cards']}"
        )

    # Validate card copies
    for card_id, count in card_counts.items():
        max_copies = get_card_max_copies(card_id, game)
        if count > max_copies:
            result["is_valid"] = False
            if card_id in CARD_EXCEPTIONS:
                result["errors"].append(
                    f"'{card_id}' has {count} copies, maximum is {max_copies} ({CARD_EXCEPTIONS[card_id]['reason']})"
                )
            else:
                result["errors"].append(
                    f"'{card_id}' has {count} copies, maximum is {max_copies}"
                )

    # Validate trigger limits
    if trigger_counts["color_triggers"] > rules["max_color_triggers"]:
        result["is_valid"] = False
        result["errors"].append(
            f"Too many Color triggers ({trigger_counts['color_triggers']}/{rules['max_color_triggers']} max)"
        )

    if trigger_counts["special_triggers"] > rules["max_special_triggers"]:
        result["is_valid"] = False
        result["errors"].append(
            f"Too many Special triggers ({trigger_counts['special_triggers']}/{rules['max_special_triggers']} max)"
        )

    if trigger_counts["final_triggers"] > rules["max_final_triggers"]:
        result["is_valid"] = False
        result["errors"].append(
            f"Too many Final triggers ({trigger_counts['final_triggers']}/{rules['max_final_triggers']} max)"
        )

    # Add warnings for potential issues (removed deck size warning for better UX)

    # Check for banned cards
    for card in cards:
        card_id = card.get("card_number") or card.get("name", "")
        if card_id in rules["banned_cards"]:
            result["is_valid"] = False
            result["errors"].append(f"'{card_id}' is banned in {game}")

    # Check for required cards
    for required_card in rules["required_cards"]:
        if required_card not in card_counts:
            result["warnings"].append(f"Consider adding '{required_card}' to your deck")

    return result


def get_validation_rules(game: str = "Union Arena") -> Dict[str, Any]:
    """
    Get validation rules for a specific game.
    """
    return DECK_VALIDATION_RULES.get(game, DECK_VALIDATION_RULES["default"])


def get_card_exceptions() -> Dict[str, Dict[str, Any]]:
    """
    Get all card exceptions.
    """
    return CARD_EXCEPTIONS.copy()
