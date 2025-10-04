"""
Deck management functions for OutDecked
Handles localStorage-based deck storage and validation.
"""

import json
import uuid
from datetime import datetime
from models import DECK_TEMPLATE, DECK_CARD_TEMPLATE
from deck_validation import validate_deck, get_card_max_copies
from database import get_session
from models import UserDeck
from sqlalchemy import text


class DeckManager:
    """Manages deck storage and operations using localStorage via Flask session."""

    def __init__(self, session):
        self.session = session
        self.storage_key = "outdecked_decks"

    def _get_decks_from_storage(self):
        """Get all decks from localStorage (session storage)."""
        decks_data = self.session.get(self.storage_key, "{}")
        try:
            return json.loads(decks_data)
        except json.JSONDecodeError:
            return {}

    def _save_decks_to_storage(self, decks):
        """Save all decks to localStorage (session storage)."""
        self.session[self.storage_key] = json.dumps(decks)

    def generate_deck_id(self):
        """Generate a unique deck ID."""
        return str(uuid.uuid4())

    def create_new_deck(
        self,
        name,
        game="Union Arena",
        description="",
        visibility="private",
        preferences=None,
    ):
        """Create a new empty deck."""
        deck_id = self.generate_deck_id()
        now = datetime.now().isoformat()

        deck = DECK_TEMPLATE.copy()
        deck.update(
            {
                "id": deck_id,
                "name": name,
                "game": game,
                "created_date": now,
                "last_modified": now,
                "description": description,
                "visibility": visibility,
                "preferences": preferences
                or {
                    "query": "",
                    "sort": "name_asc",
                    "page": 1,
                    "per_page": 25,
                    "filters": [],
                },
            }
        )

        return deck

    def save_deck(self, deck_data):
        """Save a deck to localStorage."""
        if not deck_data.get("id"):
            deck_data["id"] = self.generate_deck_id()

        # Update timestamps
        if not deck_data.get("created_date"):
            deck_data["created_date"] = datetime.now().isoformat()
        deck_data["last_modified"] = datetime.now().isoformat()

        # Validate and update deck
        deck_data = self.validate_deck(deck_data)

        # Save to storage
        decks = self._get_decks_from_storage()
        decks[deck_data["id"]] = deck_data
        self._save_decks_to_storage(decks)

        return deck_data

    def load_deck(self, deck_id):
        """Load a specific deck by ID."""
        decks = self._get_decks_from_storage()
        return decks.get(deck_id)

    def get_all_decks(self):
        """Get all saved decks."""
        decks = self._get_decks_from_storage()
        return list(decks.values())

    def delete_deck(self, deck_id):
        """Delete a deck by ID."""
        decks = self._get_decks_from_storage()
        if deck_id in decks:
            del decks[deck_id]
            self._save_decks_to_storage(decks)
            return True
        return False

    def validate_deck(self, deck_data):
        """Validate deck legality and update validation status using the new validation system."""
        # Use the centralized validation function
        validation_result = validate_deck(deck_data)

        # Update deck data with validation results
        deck_data["is_legal"] = validation_result["is_valid"]
        deck_data["validation_errors"] = validation_result["errors"]
        deck_data["validation_warnings"] = validation_result["warnings"]
        deck_data["total_cards"] = validation_result["stats"]["total_cards"]

        return deck_data

    def add_card_to_deck(self, deck_data, card_data, quantity=1):
        """Add a card to a deck."""
        if not deck_data.get("cards"):
            deck_data["cards"] = []

        # Check if card already exists in deck
        existing_card = None
        for card in deck_data["cards"]:
            if card.get("card_id") == card_data.get("id"):
                existing_card = card
                break

        if existing_card:
            # Update quantity
            new_quantity = existing_card.get("quantity", 1) + quantity
            game = deck_data.get("game", "Union Arena")
            card_number = card_data.get("card_number") or card_data.get("name", "")
            max_copies = get_card_max_copies(card_number, game)

            if new_quantity <= max_copies:
                existing_card["quantity"] = new_quantity
            else:
                existing_card["quantity"] = max_copies
        else:
            # Add new card
            deck_card = DECK_CARD_TEMPLATE.copy()
            deck_card.update(
                {
                    "card_id": card_data.get("id"),
                    "name": card_data.get("name"),
                    "image_url": card_data.get("image_url"),
                    "quantity": min(quantity, 4),  # Cap at 4
                    "metadata": {
                        k: v
                        for k, v in card_data.items()
                        if k not in ["id", "name", "image_url"]
                    },
                }
            )
            deck_data["cards"].append(deck_card)

        return self.validate_deck(deck_data)

    def remove_card_from_deck(self, deck_data, card_id, quantity=1):
        """Remove a card from a deck."""
        if not deck_data.get("cards"):
            return deck_data

        for i, card in enumerate(deck_data["cards"]):
            if card.get("card_id") == card_id:
                current_quantity = card.get("quantity", 1)
                new_quantity = current_quantity - quantity

                if new_quantity <= 0:
                    # Remove card completely
                    deck_data["cards"].pop(i)
                else:
                    # Update quantity
                    card["quantity"] = new_quantity
                break

        return self.validate_deck(deck_data)

    def update_card_quantity(self, deck_data, card_id, new_quantity):
        """Update the quantity of a card in a deck."""
        if not deck_data.get("cards"):
            return deck_data

        for card in deck_data["cards"]:
            if card.get("card_id") == card_id:
                game = deck_data.get("game", "Union Arena")
                card_number = card.get("card_number") or card.get("name", "")
                max_copies = get_card_max_copies(card_number, game)

                if new_quantity <= 0:
                    # Remove card
                    deck_data["cards"] = [
                        c for c in deck_data["cards"] if c.get("card_id") != card_id
                    ]
                else:
                    # Update quantity (cap at max copies)
                    card["quantity"] = min(new_quantity, max_copies)
                break

        return self.validate_deck(deck_data)


class AuthenticatedDeckManager(DeckManager):
    """Manages deck storage for authenticated users with database persistence."""

    def __init__(self, session, user_id):
        super().__init__(session)
        self.user_id = user_id

    def _get_decks_from_database(self):
        """Get all decks from database for the authenticated user."""
        db_session = get_session()
        try:
            user_decks = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id)
                .all()
            )

            decks = {}
            for user_deck in user_decks:
                deck_data = json.loads(user_deck.deck_data)
                decks[user_deck.deck_id] = deck_data

            print(f"Returning {len(decks)} decks from database")
            return decks
        except Exception as e:
            print(f"Error loading decks from database: {e}")
            return {}
        finally:
            db_session.close()

    def _save_deck_to_database(self, deck_data):
        """Save a single deck to the database."""
        db_session = get_session()
        try:
            deck_json = json.dumps(deck_data)

            # Check if deck already exists
            existing_deck = (
                db_session.query(UserDeck)
                .filter(
                    UserDeck.user_id == self.user_id,
                    UserDeck.deck_id == deck_data["id"],
                )
                .first()
            )

            if existing_deck:
                # Update existing deck
                existing_deck.deck_data = deck_json
                existing_deck.updated_at = datetime.utcnow()
            else:
                # Create new deck
                new_deck = UserDeck(
                    user_id=self.user_id,
                    deck_id=deck_data["id"],
                    deck_data=deck_json,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                db_session.add(new_deck)

            db_session.commit()
        except Exception as e:
            print(f"Error saving deck to database: {e}")
            db_session.rollback()
        finally:
            db_session.close()

    def _delete_deck_from_database(self, deck_id):
        """Delete a deck from the database."""
        db_session = get_session()
        try:
            # First, check if the deck exists
            count_before = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id, UserDeck.deck_id == deck_id)
                .count()
            )
            print(
                f"Deck count before deletion: {count_before} for deck_id {deck_id}, user_id {self.user_id}"
            )

            # Now delete the deck
            rows_affected = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id, UserDeck.deck_id == deck_id)
                .delete()
            )
            db_session.commit()

            print(
                f"Deleted {rows_affected} rows for deck_id {deck_id}, user_id {self.user_id}"
            )

            # Check count after deletion
            count_after = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id, UserDeck.deck_id == deck_id)
                .count()
            )
            print(f"Deck count after deletion: {count_after}")

        except Exception as e:
            print(f"Error deleting deck from database: {e}")
            db_session.rollback()
            raise e  # Re-raise the exception so the calling code knows it failed
        finally:
            db_session.close()

    def _get_decks_from_storage(self):
        """Get all decks from database (primary) and session (fallback)."""
        # Try database first
        db_decks = self._get_decks_from_database()
        if db_decks:
            return db_decks

        # Fallback to session storage
        return super()._get_decks_from_storage()

    def _save_decks_to_storage(self, decks):
        """Save all decks to both database and session storage."""
        # Save to database
        for deck_data in decks.values():
            self._save_deck_to_database(deck_data)

        # Also save to session as backup
        super()._save_decks_to_storage(decks)

    def save_deck(self, deck_data):
        """Save a deck to both database and session storage."""
        if not deck_data.get("id"):
            deck_data["id"] = self.generate_deck_id()

        # Update timestamps
        if not deck_data.get("created_date"):
            deck_data["created_date"] = datetime.now().isoformat()
        deck_data["last_modified"] = datetime.now().isoformat()

        # Validate and update deck
        deck_data = self.validate_deck(deck_data)

        # Save to database
        self._save_deck_to_database(deck_data)

        # Also save to session storage as backup
        decks = super()._get_decks_from_storage()
        decks[deck_data["id"]] = deck_data
        super()._save_decks_to_storage(decks)

        return deck_data

    def get_all_decks(self):
        """Get all saved decks from database."""
        db_session = get_session()
        try:
            user_decks = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id)
                .all()
            )

            decks = []
            for user_deck in user_decks:
                deck_data = json.loads(user_deck.deck_data)
                decks.append(deck_data)

            print(
                f"[DECK] AuthenticatedDeckManager.get_all_decks - returning {len(decks)} decks from database for user {self.user_id}"
            )
            return decks
        except Exception as e:
            print(f"Error loading decks from database: {e}")
            return []
        finally:
            db_session.close()

    def load_deck(self, deck_id):
        """Load a specific deck by ID from database."""
        db_session = get_session()
        try:
            user_deck = (
                db_session.query(UserDeck)
                .filter(UserDeck.user_id == self.user_id, UserDeck.deck_id == deck_id)
                .first()
            )

            if user_deck:
                deck_data = json.loads(user_deck.deck_data)
                return deck_data
            return None
        except Exception as e:
            print(f"Error loading deck from database: {e}")
            return None
        finally:
            db_session.close()

    def delete_deck(self, deck_id):
        """Delete a deck from database only."""
        try:
            # Delete from database
            self._delete_deck_from_database(deck_id)
            return True
        except Exception as e:
            print(f"Error in delete_deck: {e}")
            return False


# Utility functions for direct use
def create_deck_manager(session, user_id=None):
    """Create a DeckManager instance for the given session.

    Args:
        session: Flask session object
        user_id: Optional user ID for authenticated users

    Returns:
        AuthenticatedDeckManager if user_id provided, otherwise DeckManager
    """
    if user_id:
        return AuthenticatedDeckManager(session, user_id)
    return DeckManager(session)
