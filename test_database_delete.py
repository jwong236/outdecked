#!/usr/bin/env python3
"""
Test script to directly test database deletion operations
"""

import sqlite3
import json
import sys


def get_db_connection():
    """Get database connection"""
    return sqlite3.connect("cards.db")


def test_database_deletion():
    """Test deck deletion directly in the database"""

    print("=== Testing Database Deck Deletion ===")

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # First, see what decks exist
        print("\n1. Checking existing decks...")
        cursor.execute("SELECT user_id, deck_id, deck_data FROM user_decks")
        rows = cursor.fetchall()

        if not rows:
            print("No decks found in database!")
            return

        print(f"Found {len(rows)} decks in database:")
        for i, row in enumerate(rows):
            user_id, deck_id, deck_data = row
            try:
                deck_info = json.loads(deck_data)
                deck_name = deck_info.get("name", "NO_NAME")
                print(
                    f"  {i+1}. User: {user_id}, Deck ID: {deck_id}, Name: {deck_name}"
                )
            except:
                print(
                    f"  {i+1}. User: {user_id}, Deck ID: {deck_id}, Name: [INVALID JSON]"
                )

        # Test deleting the first deck
        test_row = rows[0]
        test_user_id, test_deck_id, test_deck_data = test_row
        test_deck_name = "UNKNOWN"
        try:
            deck_info = json.loads(test_deck_data)
            test_deck_name = deck_info.get("name", "UNKNOWN")
        except:
            pass

        print(
            f"\n2. Testing deletion of deck: {test_deck_name} (User: {test_user_id}, ID: {test_deck_id})"
        )

        # Check count before deletion
        cursor.execute(
            "SELECT COUNT(*) FROM user_decks WHERE user_id = ? AND deck_id = ?",
            (test_user_id, test_deck_id),
        )
        count_before = cursor.fetchone()[0]
        print(f"   Count before deletion: {count_before}")

        # Delete the deck
        cursor.execute(
            "DELETE FROM user_decks WHERE user_id = ? AND deck_id = ?",
            (test_user_id, test_deck_id),
        )
        rows_affected = cursor.rowcount
        conn.commit()

        print(f"   Rows affected by DELETE: {rows_affected}")

        # Check count after deletion
        cursor.execute(
            "SELECT COUNT(*) FROM user_decks WHERE user_id = ? AND deck_id = ?",
            (test_user_id, test_deck_id),
        )
        count_after = cursor.fetchone()[0]
        print(f"   Count after deletion: {count_after}")

        if count_after == 0:
            print(f"   ✅ SUCCESS: Deck was deleted from database!")
        else:
            print(f"   ❌ ERROR: Deck still exists in database!")

        # Show remaining decks
        print(f"\n3. Remaining decks in database:")
        cursor.execute("SELECT user_id, deck_id, deck_data FROM user_decks")
        remaining_rows = cursor.fetchall()
        print(f"   Total remaining: {len(remaining_rows)}")

        conn.close()

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_database_deletion()
