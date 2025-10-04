#!/usr/bin/env python3
"""
Import deck data to Cloud SQL using the export file
This script runs the import part only, using the exported JSON file
"""

import os
import json
import sys
from database import DatabaseManager
from sqlalchemy import text


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

            hand_json = {"cards": hand_data["hand_items"]}
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
    """Main import function"""
    export_filename = "deck_data_export_20251004_155756.json"

    if not os.path.exists(export_filename):
        print(f"Export file {export_filename} not found!")
        sys.exit(1)

    print("Starting Deck Data Import to Cloud SQL")
    print("=" * 50)

    try:
        import_deck_data(export_filename)
        print("\nImport completed successfully!")
        print("Your deck data is now available in production!")

    except Exception as e:
        print(f"\nImport failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
