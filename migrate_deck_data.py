#!/usr/bin/env python3
"""
Deck Data Migration Script
Exports deck data from local database and imports to Cloud SQL
"""

import os
import json
import sys
from datetime import datetime
from database import DatabaseManager
from sqlalchemy import text


def export_deck_data():
    """Export deck data from local database"""
    print("Exporting deck data from local database...")

    # Connect to local database
    local_db = DatabaseManager()
    session = local_db.Session()

    try:
        # Get all decks
        decks_query = text(
            """
            SELECT id, user_id, deck_data, created_at, updated_at
            FROM user_decks
            ORDER BY created_at
        """
        )

        decks_result = session.execute(decks_query)
        decks = []

        for row in decks_result:
            # Parse the JSON deck_data
            deck_json = json.loads(row.deck_data) if row.deck_data else {}

            deck_data = {
                "id": deck_json.get("id", row.id),
                "user_id": row.user_id,
                "name": deck_json.get("name", "Unnamed Deck"),
                "game": deck_json.get("game", "Union Arena"),
                "cards": deck_json.get("cards", []),
                "cover_image": deck_json.get("cover_image"),
                "visibility": deck_json.get("visibility", "private"),
                "is_legal": deck_json.get("is_legal", False),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "preferences": deck_json.get("preferences", {}),
            }
            decks.append(deck_data)

        print(f"Found {len(decks)} decks to export")

        # Get all users (to preserve user relationships)
        users_query = text(
            """
            SELECT id, username, email, created_at, updated_at
            FROM users
            ORDER BY created_at
        """
        )

        users_result = session.execute(users_query)
        users = []

        for row in users_result:
            user_data = {
                "id": row.id,
                "username": row.username,
                "email": row.email,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
                "preferences": {},
            }
            users.append(user_data)

        print(f"Found {len(users)} users to export")

        # Get all user hands
        hands_query = text(
            """
            SELECT user_id, hand_data, updated_at
            FROM user_hands
            ORDER BY updated_at
        """
        )

        hands_result = session.execute(hands_query)
        hands = []

        for row in hands_result:
            # Parse the JSON hand_data
            hand_json = json.loads(row.hand_data) if row.hand_data else {}

            # Extract hand_items from the cards array
            hand_items = []
            if "cards" in hand_json and isinstance(hand_json["cards"], list):
                hand_items = hand_json["cards"]

            hand_data = {
                "user_id": row.user_id,
                "hand_items": hand_items,
                "created_at": None,  # Not available in current schema
                "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            }
            hands.append(hand_data)

        print(f"Found {len(hands)} user hands to export")

        # Create export data
        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "users": users,
            "decks": decks,
            "user_hands": hands,
        }

        # Save to file
        export_filename = (
            f"deck_data_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(export_filename, "w") as f:
            json.dump(export_data, f, indent=2)

        print(f"Deck data exported to: {export_filename}")
        return export_filename, export_data

    except Exception as e:
        print(f"Error exporting deck data: {e}")
        return None, None
    finally:
        session.close()


def import_deck_data(export_filename):
    """Import deck data to Cloud SQL"""
    print("Importing deck data to Cloud SQL...")

    # Load export data
    with open(export_filename, "r") as f:
        export_data = json.load(f)

    # Set Cloud SQL environment variables
    os.environ["DB_HOST"] = "/cloudsql/outdecked:us-central1:outdecked-db"
    os.environ["DB_NAME"] = "postgres"
    os.environ["DB_USER"] = "postgres"
    os.environ["DB_PASSWORD"] = "outdecked-prod-2024"

    # Connect to Cloud SQL
    cloud_db = DatabaseManager()
    session = cloud_db.Session()

    try:
        # Import users first
        print(f"Importing {len(export_data['users'])} users...")
        for user_data in export_data["users"]:
            # Check if user already exists
            existing_user = session.execute(
                text(
                    "SELECT id FROM users WHERE username = :username OR email = :email"
                ),
                {"username": user_data["username"], "email": user_data["email"]},
            ).fetchone()

            if existing_user:
                print(f"User {user_data['username']} already exists, skipping...")
                continue

            # Insert user
            insert_user = text(
                """
                INSERT INTO users (id, username, email, created_at, updated_at)
                VALUES (:id, :username, :email, :created_at, :updated_at)
            """
            )

            session.execute(
                insert_user,
                {
                    "id": user_data["id"],
                    "username": user_data["username"],
                    "email": user_data["email"],
                    "created_at": user_data["created_at"],
                    "updated_at": user_data["updated_at"],
                },
            )

        # Import user hands
        print(f"Importing {len(export_data['user_hands'])} user hands...")
        for hand_data in export_data["user_hands"]:
            # Check if hand already exists
            existing_hand = session.execute(
                text("SELECT user_id FROM user_hands WHERE user_id = :user_id"),
                {"user_id": hand_data["user_id"]},
            ).fetchone()

            if existing_hand:
                print(
                    f"Hand for user {hand_data['user_id']} already exists, skipping..."
                )
                continue

            # Insert hand
            insert_hand = text(
                """
                INSERT INTO user_hands (user_id, hand_data, updated_at)
                VALUES (:user_id, :hand_data, :updated_at)
            """
            )

            hand_json = {"hand_items": hand_data["hand_items"]}
            session.execute(
                insert_hand,
                {
                    "user_id": hand_data["user_id"],
                    "hand_data": json.dumps(hand_json),
                    "updated_at": hand_data["updated_at"],
                },
            )

        # Import decks
        print(f"Importing {len(export_data['decks'])} decks...")
        for deck_data in export_data["decks"]:
            # Check if deck already exists
            existing_deck = session.execute(
                text("SELECT id FROM user_decks WHERE id = :id"),
                {"id": deck_data["id"]},
            ).fetchone()

            if existing_deck:
                print(f"Deck {deck_data['name']} already exists, skipping...")
                continue

            # Insert deck
            insert_deck = text(
                """
                INSERT INTO user_decks (id, user_id, deck_data, created_at, updated_at)
                VALUES (:id, :user_id, :deck_data, :created_at, :updated_at)
            """
            )

            deck_json = {
                "id": deck_data["id"],
                "name": deck_data["name"],
                "game": deck_data["game"],
                "cards": deck_data["cards"],
                "cover_image": deck_data["cover_image"],
                "visibility": deck_data["visibility"],
                "is_legal": deck_data["is_legal"],
                "preferences": deck_data["preferences"],
            }

            session.execute(
                insert_deck,
                {
                    "id": deck_data["id"],
                    "user_id": deck_data["user_id"],
                    "deck_data": json.dumps(deck_json),
                    "created_at": deck_data["created_at"],
                    "updated_at": deck_data["updated_at"],
                },
            )

        # Commit all changes
        session.commit()
        print("Deck data imported successfully!")

        # Verify import
        user_count = session.execute(text("SELECT COUNT(*) FROM users")).fetchone()[0]
        deck_count = session.execute(
            text("SELECT COUNT(*) FROM user_decks")
        ).fetchone()[0]
        hand_count = session.execute(
            text("SELECT COUNT(*) FROM user_hands")
        ).fetchone()[0]

        print(f"Import verification:")
        print(f"   Users: {user_count}")
        print(f"   Decks: {deck_count}")
        print(f"   User Hands: {hand_count}")

    except Exception as e:
        print(f"Error importing deck data: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def main():
    """Main migration function"""
    print("Starting Deck Data Migration")
    print("=" * 50)

    # Step 1: Export from local
    export_filename, export_data = export_deck_data()
    if not export_filename:
        print("Export failed, aborting migration")
        sys.exit(1)

    print("\n" + "=" * 50)

    # Step 2: Import to Cloud SQL
    try:
        import_deck_data(export_filename)
        print("\nMigration completed successfully!")
        print(f"Export file saved as: {export_filename}")
        print("Your deck data is now available in production!")

    except Exception as e:
        print(f"\nMigration failed: {e}")
        print("You can retry the import using the export file")
        sys.exit(1)


if __name__ == "__main__":
    main()
