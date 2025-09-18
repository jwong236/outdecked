#!/usr/bin/env python3
"""
Test script to test the deck deletion endpoint directly
"""

import requests
import json
import sys


def test_delete_endpoint():
    """Test the DELETE /api/decks/<deck_id> endpoint"""

    # First, get all decks to see what exists
    print("=== Getting all decks ===")
    try:
        response = requests.get("http://localhost:5000/api/decks")
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                decks = data.get("decks", [])
                print(f"Found {len(decks)} decks:")
                for i, deck in enumerate(decks):
                    print(
                        f"  {i+1}. ID: {deck.get('id', 'NO_ID')}, Name: {deck.get('name', 'NO_NAME')}"
                    )

                if not decks:
                    print("No decks found to delete!")
                    return

                # Test deleting the first deck
                deck_to_delete = decks[0]
                deck_id = deck_to_delete.get("id")
                deck_name = deck_to_delete.get("name")

                print(
                    f"\n=== Testing deletion of deck: {deck_name} (ID: {deck_id}) ==="
                )

                # Delete the deck
                delete_response = requests.delete(
                    f"http://localhost:5000/api/decks/{deck_id}"
                )
                print(f"Delete response status: {delete_response.status_code}")

                if delete_response.status_code == 200:
                    delete_data = delete_response.json()
                    print(f"Delete response data: {delete_data}")
                else:
                    print(f"Delete failed: {delete_response.text}")

                # Check if deck was actually deleted
                print(f"\n=== Checking if deck was deleted ===")
                check_response = requests.get("http://localhost:5000/api/decks")
                if check_response.status_code == 200:
                    check_data = check_response.json()
                    if check_data.get("success"):
                        remaining_decks = check_data.get("decks", [])
                        print(f"Remaining decks: {len(remaining_decks)}")

                        # Check if our deleted deck is still there
                        deleted_deck_exists = any(
                            deck.get("id") == deck_id for deck in remaining_decks
                        )
                        if deleted_deck_exists:
                            print(
                                f"❌ ERROR: Deck {deck_name} (ID: {deck_id}) still exists after deletion!"
                            )
                        else:
                            print(
                                f"✅ SUCCESS: Deck {deck_name} (ID: {deck_id}) was successfully deleted!"
                            )
                    else:
                        print(f"Failed to get decks after deletion: {check_data}")
                else:
                    print(
                        f"Failed to check decks after deletion: {check_response.status_code}"
                    )

            else:
                print(f"Failed to get decks: {data}")
        else:
            print(f"Failed to get decks: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print(
            "❌ ERROR: Could not connect to server. Make sure the Flask server is running on localhost:5000"
        )
    except Exception as e:
        print(f"❌ ERROR: {e}")


if __name__ == "__main__":
    test_delete_endpoint()
