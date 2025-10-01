"""
Deck building routes and logic for OutDecked
Handles deck CRUD operations and deck builder functionality.
"""

from flask import request, jsonify, session
from deck_manager import create_deck_manager
from models import DECK_VALIDATION_RULES
from auth import get_current_user


def handle_get_decks():
    """Handle GET /api/user/decks - Get all user deck IDs only."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        print(f"🔵 API GET /api/user/decks - user: {user}, user_id: {user_id}")

        deck_manager = create_deck_manager(session, user_id)
        decks = deck_manager.get_all_decks()
        print(
            f"🔵 API GET /api/user/decks - returning {len(decks)} deck IDs for user {user_id}"
        )

        # Extract only deck IDs and sort by last modified (newest first)
        deck_ids = []
        for deck in decks:
            if deck.get("id"):
                deck_ids.append(deck["id"])

        # Sort by last modified (newest first) - we need to get this from the full deck data
        decks_with_timestamps = [
            (deck["id"], deck.get("last_modified", ""))
            for deck in decks
            if deck.get("id")
        ]
        decks_with_timestamps.sort(key=lambda x: x[1], reverse=True)
        sorted_deck_ids = [deck_id for deck_id, _ in decks_with_timestamps]

        print(f"🔵 API GET /api/user/decks - deck IDs: {sorted_deck_ids}")

        return jsonify(
            {
                "success": True,
                "data": {"deck_ids": sorted_deck_ids, "count": len(sorted_deck_ids)},
            }
        )
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to load deck IDs: {str(e)}"}),
            500,
        )


def handle_create_deck():
    """Handle POST /api/decks - Save new deck."""
    try:
        data = request.get_json()
        print(f"🔵 API POST /api/decks - request data: {data}")

        # Validate required fields
        if not data or not data.get("name"):
            return jsonify({"success": False, "error": "Deck name is required"}), 400

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        print(f"🔵 API POST /api/decks - user: {user}, user_id: {user_id}")

        deck_manager = create_deck_manager(session, user_id)

        # Create new deck
        deck = deck_manager.create_new_deck(
            name=data["name"],
            game=data.get("game", "Union Arena"),
            description=data.get("description", ""),
            visibility=data.get("visibility", "private"),
            preferences=data.get(
                "preferences",
                {
                    "series": data.get("series", ""),
                    "color": data.get("color", ""),
                    "cardTypes": data.get(
                        "cardTypes", ["Character", "Event", "Site"]
                    ),  # All EXCEPT "Action Point"
                    "printTypes": data.get("printTypes", ["Base"]),  # Base only
                    "rarities": data.get(
                        "rarities", ["Common", "Uncommon", "Rare", "Super Rare"]
                    ),  # Base rarities only
                },
            ),
        )

        # Add cards if provided (for deck duplication)
        if data.get("cards"):
            deck["cards"] = data["cards"]
            print(
                f"🔵 API POST /api/decks - adding {len(data['cards'])} cards to new deck"
            )

        # Add cover if provided (for deck duplication)
        if data.get("cover"):
            deck["cover"] = data["cover"]
            print(f"🔵 API POST /api/decks - setting cover: {data['cover']}")

        # Save deck
        saved_deck = deck_manager.save_deck(deck)
        print(f"🔵 API POST /api/decks - saved_deck: {saved_deck}")

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


def handle_get_deck(deck_id):
    """Handle GET /api/decks/<deck_id> - Get a specific deck."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None

        deck_manager = create_deck_manager(session, user_id)

        # Load the specific deck
        deck = deck_manager.load_deck(deck_id)

        if deck:
            return jsonify({"success": True, "deck": deck})
        else:
            return jsonify({"success": False, "error": "Deck not found"}), 404

    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to load deck: {str(e)}"}),
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
            if key in [
                "name",
                "game",
                "description",
                "visibility",
                "cards",
                "cover",
                "preferences",
            ]:
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
        print(f"Backend: User authentication - user={user}, user_id={user_id}")

        deck_manager = create_deck_manager(session, user_id)

        # Check if deck exists
        existing_deck = deck_manager.load_deck(deck_id)
        if not existing_deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Delete deck
        print(f"Backend: Attempting to delete deck {deck_id} for user {user_id}")
        success = deck_manager.delete_deck(deck_id)
        print(f"Backend: Delete operation returned success={success}")

        if success:
            print(f"Backend: Deck {deck_id} deleted successfully")
            return jsonify({"success": True, "message": "Deck deleted successfully"})
        else:
            print(f"Backend: Failed to delete deck {deck_id}")
            return jsonify({"success": False, "error": "Failed to delete deck"}), 500
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to delete deck: {str(e)}"}),
            500,
        )


def handle_get_decks_batch():
    """Handle POST /api/user/decks/batch - Get multiple decks by IDs."""
    try:
        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None
        print(f"🔵 API POST /api/user/decks/batch - user: {user}, user_id: {user_id}")

        data = request.get_json()
        if not data or not data.get("deck_ids"):
            return (
                jsonify({"success": False, "error": "deck_ids array is required"}),
                400,
            )

        deck_ids = data["deck_ids"]
        if not isinstance(deck_ids, list):
            return (
                jsonify({"success": False, "error": "deck_ids must be an array"}),
                400,
            )

        print(
            f"🔵 API POST /api/user/decks/batch - requesting {len(deck_ids)} decks: {deck_ids}"
        )

        deck_manager = create_deck_manager(session, user_id)
        decks = []
        missing_ids = []

        for deck_id in deck_ids:
            deck = deck_manager.load_deck(deck_id)
            if deck:
                decks.append(deck)
            else:
                missing_ids.append(deck_id)

        print(
            f"🔵 API POST /api/user/decks/batch - found {len(decks)} decks, missing {len(missing_ids)}"
        )

        response_data = {"decks": decks, "count": len(decks)}

        if missing_ids:
            response_data["missing_ids"] = missing_ids

        return jsonify({"success": True, "data": response_data})
    except Exception as e:
        return (
            jsonify({"success": False, "error": f"Failed to load decks: {str(e)}"}),
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


def handle_add_cards_to_deck(deck_id):
    """Handle POST /api/user/decks/<deck_id>/cards/batch - Add multiple cards to deck."""
    try:
        data = request.get_json()

        if not data or not data.get("cards"):
            return jsonify({"success": False, "error": "Cards data is required"}), 400

        # Check if user is authenticated
        user = get_current_user()
        user_id = user["id"] if user else None

        deck_manager = create_deck_manager(session, user_id)

        # Load deck
        deck = deck_manager.load_deck(deck_id)
        if not deck:
            return jsonify({"success": False, "error": "Deck not found"}), 404

        # Add cards to deck (merge quantities if card already exists)
        updated_deck = deck.copy()
        if not updated_deck.get("cards"):
            updated_deck["cards"] = []

        for card_data in data["cards"]:
            card_id = card_data.get("card_id") or card_data.get("product_id")
            quantity = card_data.get("quantity", 1)

            if not card_id:
                continue

            # Check if card already exists in deck
            existing_card = None
            for existing in updated_deck["cards"]:
                if existing.get("card_id") == card_id or existing.get("id") == card_id:
                    existing_card = existing
                    break

            if existing_card:
                # Update quantity
                existing_card["quantity"] = existing_card.get("quantity", 0) + quantity
            else:
                # Add new card
                updated_deck["cards"].append({"card_id": card_id, "quantity": quantity})

        # Save updated deck
        saved_deck = deck_manager.save_deck(updated_deck)

        return jsonify(
            {
                "success": True,
                "deck": saved_deck,
                "message": f"Added {len(data['cards'])} card types to deck successfully",
            }
        )
    except Exception as e:
        return (
            jsonify(
                {"success": False, "error": f"Failed to add cards to deck: {str(e)}"}
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
