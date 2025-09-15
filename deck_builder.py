"""
Deck building routes and logic for OutDecked
Handles deck CRUD operations and deck builder functionality.
"""

from flask import request, jsonify, session
from deck_manager import create_deck_manager
from models import DECK_VALIDATION_RULES
from auth import get_current_user


def handle_get_decks():
    """Handle GET /api/decks - Get all user decks."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)
        decks = deck_manager.get_all_decks()

        # Sort decks by last modified (newest first)
        decks.sort(key=lambda x: x.get("last_modified", ""), reverse=True)

        return jsonify({"success": True, "decks": decks, "count": len(decks)})
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to load decks: {str(e)}"}),
            500,
        )


def handle_create_deck():
    """Handle POST /api/decks - Save new deck."""
    try:
        data = request.get_json()

        # Validate required fields
        if not data or not data.get("name"):
            return jsonify({"success": False, "error": "Deck name is required"}), 400

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Create new deck
        deck = deck_manager.create_new_deck(
            name=data["name"],
            game=data.get("game", "Union Arena"),
            description=data.get("description", ""),
        )

        # Save deck
        saved_deck = deck_manager.save_deck(deck)

        return jsonify(
            {
                "success": True,
                "deck": saved_deck,
                "message": "Deck created successfully",
            }
        )
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to create deck: {str(e)}"}),
            500,
        )


def handle_update_deck(deck_id):
    """Handle PUT /api/decks/<deck_id> - Update existing deck."""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Load existing deck
        existing_deck = deck_manager.load_deck(deck_id)
        if not existing_deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Update deck data
        for key, value in data.items():
            if key in ["name", "game", "description", "cards"]:
                existing_deck[key] = value

        # Save updated deck
        updated_deck = deck_manager.save_deck(existing_deck)

        return jsonify(
            {
                "success": True,
                "deck": updated_deck,
                "message": "Deck updated successfully",
            }
        )
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to update deck: {str(e)}"}),
            500,
        )


def handle_delete_deck(deck_id):
    """Handle DELETE /api/decks/<deck_id> - Delete deck."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Check if deck exists
        existing_deck = deck_manager.load_deck(deck_id)
        if not existing_deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Delete deck
        success = deck_manager.delete_deck(deck_id)

        if success:
            return jsonify({"success": True, "message": "Deck deleted successfully"})
        else:
            return jsonify({"success": False, "error": "Failed to delete deck"}), 500
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to delete deck: {str(e)}"}),
            500,
        )


def handle_get_deck(deck_id):
    """Handle GET /api/decks/<deck_id> - Get specific deck."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)
        deck = deck_manager.load_deck(deck_id)

        if not deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        return jsonify({"success": True, "deck": deck})
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to load deck: {str(e)}"}),
            500,
        )


def handle_add_card_to_deck(deck_id):
    """Handle POST /api/decks/<deck_id>/cards - Add card to deck."""
    try:
        data = request.get_json()

        if not data or not data.get("card"):
            return jsonify({"success": False, "error": "Card data is required"}), 400

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Load deck
        deck = deck_manager.load_deck(deck_id)
        if not deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Add card to deck
        quantity = data.get("quantity", 1)
        updated_deck = deck_manager.add_card_to_deck(deck, data["card"], quantity)

        # Save updated deck
        saved_deck = deck_manager.save_deck(updated_deck)

        return jsonify(
            {
                "success": True,
                "deck": saved_deck,
                "message": "Card added to deck successfully",
            }
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": f"Failed to add card to deck: {str(e)}"}
            ),
            500,
        )


def handle_remove_card_from_deck(deck_id, card_id):
    """Handle DELETE /api/decks/<deck_id>/cards/<card_id> - Remove card from deck."""
    try:
        data = request.get_json() or {}
        quantity = data.get("quantity", 1)

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Load deck
        deck = deck_manager.load_deck(deck_id)
        if not deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Remove card from deck
        updated_deck = deck_manager.remove_card_from_deck(deck, int(card_id), quantity)

        # Save updated deck
        saved_deck = deck_manager.save_deck(updated_deck)

        return jsonify(
            {
                "success": True,
                "deck": saved_deck,
                "message": "Card removed from deck successfully",
            }
        )
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to remove card from deck: {str(e)}",
                }
            ),
            500,
        )


def handle_update_card_quantity(deck_id, card_id):
    """Handle PUT /api/decks/<deck_id>/cards/<card_id> - Update card quantity in deck."""
    try:
        data = request.get_json()

        if not data or "quantity" not in data:
            return jsonify({"success": False, "error": "Quantity is required"}), 400

        quantity = int(data["quantity"])
        if quantity < 0:
            return (
                jsonify({"success": False, "error": "Quantity cannot be negative"}),
                400,
            )

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        
        deck_manager = create_deck_manager(session, user_id)

        # Load deck
        deck = deck_manager.load_deck(deck_id)
        if not deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Update card quantity
        updated_deck = deck_manager.update_card_quantity(deck, int(card_id), quantity)

        # Save updated deck
        saved_deck = deck_manager.save_deck(updated_deck)

        return jsonify(
            {
                "success": True,
                "deck": saved_deck,
                "message": "Card quantity updated successfully",
            }
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": f"Failed to update card quantity: {str(e)}"}
            ),
            500,
        )


def handle_get_validation_rules():
    """Handle GET /api/deck-validation-rules - Get deck validation rules."""
    try:
        return jsonify({"success": True, "rules": DECK_VALIDATION_RULES})
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to load validation rules: {str(e)}",
                }
            ),
            500,
        )
