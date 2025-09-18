#!/usr/bin/env python3
"""
Script to delete all decks for a specific user.
Usage: python delete_user_decks.py <username>
"""

import sys
import sqlite3
from database import get_db_connection


def get_user_id_by_username(username):
    """Get user ID by username."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        result = cursor.fetchone()

        if result:
            return result[0]
        else:
            return None
    except Exception as e:
        print(f"Error finding user: {e}")
        return None
    finally:
        conn.close()


def delete_all_user_decks(user_id):
    """Delete all decks for a specific user."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # First, count how many decks the user has
        cursor.execute("SELECT COUNT(*) FROM user_decks WHERE user_id = ?", (user_id,))
        deck_count = cursor.fetchone()[0]

        if deck_count == 0:
            print(f"User has no decks to delete.")
            return True

        print(f"Found {deck_count} decks for user ID {user_id}")

        # Delete all decks for this user
        cursor.execute("DELETE FROM user_decks WHERE user_id = ?", (user_id,))
        deleted_count = cursor.rowcount

        conn.commit()

        print(f"Successfully deleted {deleted_count} decks for user ID {user_id}")
        return True

    except Exception as e:
        print(f"Error deleting decks: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def main():
    if len(sys.argv) != 2:
        print("Usage: python delete_user_decks.py <username>")
        print("Example: python delete_user_decks.py Punkkee")
        sys.exit(1)

    username = sys.argv[1]

    print(f"Looking for user: {username}")

    # Get user ID
    user_id = get_user_id_by_username(username)

    if user_id is None:
        print(f"User '{username}' not found in database.")
        sys.exit(1)

    print(f"Found user '{username}' with ID: {user_id}")

    # Confirm deletion
    response = input(
        f"Are you sure you want to delete ALL decks for user '{username}'? (yes/no): "
    )

    if response.lower() not in ["yes", "y"]:
        print("Deletion cancelled.")
        sys.exit(0)

    # Delete all decks
    success = delete_all_user_decks(user_id)

    if success:
        print("✅ All decks deleted successfully!")
    else:
        print("❌ Failed to delete decks.")
        sys.exit(1)


if __name__ == "__main__":
    main()
