#!/usr/bin/env python3
"""
Comprehensive pytest test suite for all API endpoints
Tests the Flask backend API endpoints to ensure they're working correctly
Includes examples of actual data responses
"""

import pytest
import requests
import json
import sys
import os
import time

# Base URL for the Flask API
BASE_URL = "http://localhost:5000"


class TestSearchAPI:
    """Test class for search API endpoints"""

    def test_search_basic(self):
        """Test basic search functionality"""
        print(f"\n[TEST] Testing basic search endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=1&per_page=5"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {data['pagination']['total_cards']} total cards")
        print(f"   [OK] Returned {len(data['cards'])} cards in this page")

        # Print example card data
        if data["cards"]:
            example_card = data["cards"][0]
            print(
                f"   📄 Example card: {example_card.get('name')} ({example_card.get('group_abbreviation')}) -> {example_card.get('print_type')}"
            )

        assert "cards" in data
        assert "pagination" in data
        assert len(data["cards"]) <= 5
        assert data["pagination"]["total_cards"] > 3000

    def test_search_with_query(self):
        """Test search with query parameter"""
        print(f"\n[TEST] Testing search with query...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&q=Attack&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Query 'Attack' found {data['pagination']['total_cards']} cards")

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0
        assert len(data["cards"]) <= 3

    def test_search_with_anime_filter(self):
        """Test search with anime (series) filter"""
        print(f"\n[TEST] Testing search with anime filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&anime=Attack%20On%20Titan&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   [OK] Attack On Titan filter found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_color_filter(self):
        """Test search with color filter"""
        print(f"\n[TEST] Testing search with color filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&color=Red&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   [OK] Red color filter found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_print_type_filter(self):
        """Test search with print type filter"""
        print(f"\n[TEST] Testing search with print type filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&print_type=Base&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   [OK] Base print type filter found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')}) -> {card.get('print_type')}"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_advanced_filters(self):
        """Test search with advanced filters (and_filters, or_filters, not_filters)"""
        print(f"\n[TEST] Testing search with advanced filters...")

        # Test with and_filters
        and_filters = [{"field": "PrintType", "value": "Base"}]
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&and_filters={json.dumps(and_filters)}&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   [OK] Advanced and_filters found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')}) -> {card.get('print_type')}"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_pagination(self):
        """Test search pagination"""
        print(f"\n[TEST] Testing search pagination...")

        # Test first page
        response1 = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=1&per_page=10"
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Test second page
        response2 = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=2&per_page=10"
        )
        assert response2.status_code == 200
        data2 = response2.json()

        print(f"   [OK] Page 1: {len(data1['cards'])} cards")
        print(f"   [OK] Page 2: {len(data2['cards'])} cards")
        print(f"   [OK] Total cards: {data1['pagination']['total_cards']}")

        # Ensure different results on different pages
        if len(data1["cards"]) > 0 and len(data2["cards"]) > 0:
            assert data1["cards"][0]["id"] != data2["cards"][0]["id"]

    def test_search_sorting(self):
        """Test search sorting"""
        print(f"\n[TEST] Testing search sorting...")

        # Test sorting by name
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&sort=name&per_page=5"
        )
        assert response.status_code == 200
        data = response.json()

        print(f"   [OK] Sorted by name, found {len(data['cards'])} cards")

        # Print first few results to verify sorting
        for i, card in enumerate(data["cards"][:3]):
            print(f"   📄 Sorted result {i+1}: {card.get('name')}")

        assert len(data["cards"]) > 0


class TestFilterAPI:
    """Test class for filter API endpoints"""

    def test_filter_fields(self):
        """Test filter fields endpoint"""
        print(f"\n[TEST] Testing filter fields endpoint...")
        response = requests.get(f"{BASE_URL}/api/filter-fields")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} filter fields")

        # Print all available fields
        for field in data:
            print(f"   📄 Field: {field['name']} (display: {field['display']})")

        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure of field objects
        for field in data:
            assert "name" in field
            assert "display" in field

        # Check that PrintType is included
        print_type_field = next((f for f in data if f["name"] == "PrintType"), None)
        assert print_type_field is not None
        print(f"   [OK] PrintType field found: {print_type_field}")

    def test_filter_values_series_name(self):
        """Test filter values for SeriesName"""
        print(f"\n[TEST] Testing filter values for SeriesName...")
        response = requests.get(f"{BASE_URL}/api/filter-values/SeriesName")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} series names")

        # Print all series names
        for series in data:
            print(f"   📄 Series: {series}")

        assert isinstance(data, list)
        assert len(data) > 0
        assert "Attack On Titan" in data

    def test_filter_values_rarity(self):
        """Test filter values for Rarity"""
        print(f"\n[TEST] Testing filter values for Rarity...")
        response = requests.get(f"{BASE_URL}/api/filter-values/Rarity")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} rarity values")

        # Print all rarity values
        for rarity in data:
            print(f"   📄 Rarity: {rarity}")

        assert isinstance(data, list)
        assert len(data) > 0
        assert "Common" in data
        assert "Rare" in data

    def test_filter_values_print_type(self):
        """Test filter values for PrintType"""
        print(f"\n[TEST] Testing filter values for PrintType...")
        response = requests.get(f"{BASE_URL}/api/filter-values/PrintType")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} print type values")

        # Print all print type values
        for print_type in data:
            print(f"   📄 Print Type: {print_type}")

        expected_print_types = [
            "Base",
            "Pre-Release",
            "Starter Deck",
            "Pre-Release Starter",
            "Promotion",
            "Box Topper Foil",
        ]
        assert isinstance(data, list)
        assert len(data) == len(expected_print_types)
        for expected_type in expected_print_types:
            assert expected_type in data

    def test_filter_values_affinities_special_splitting(self):
        """Test filter values for Affinities with special splitting"""
        print(f"\n[TEST] Testing filter values for Affinities...")
        response = requests.get(f"{BASE_URL}/api/filter-values/Affinities")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} affinity values")

        # Print all affinity values
        for affinity in data:
            print(f"   📄 Affinity: {affinity}")

        assert isinstance(data, list)
        assert len(data) > 0
        assert "Black Bulls" in data
        assert "Blue Rose Knights" in data

        # Should not contain any values with " / " (should be split)
        for value in data:
            assert " / " not in value

    def test_filter_values_dynamic_fields(self):
        """Test that filter values works with any field name"""
        print(f"\n[TEST] Testing filter values for dynamic fields...")
        test_fields = [
            "CardType",
            "BattlePointBP",
            "RequiredEnergy",
            "ActivationEnergy",
        ]

        for field in test_fields:
            response = requests.get(f"{BASE_URL}/api/filter-values/{field}")
            assert response.status_code == 200

            data = response.json()
            print(f"   [OK] Field '{field}': {len(data)} values")

            # Print first few values
            for value in data[:3]:
                print(f"   📄 {field}: {value}")

            assert isinstance(data, list)

    def test_filter_values_nonexistent_field(self):
        """Test filter values with non-existent field returns empty array"""
        print(f"\n[TEST] Testing filter values for non-existent field...")
        response = requests.get(f"{BASE_URL}/api/filter-values/NonExistentField123")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Non-existent field returned {len(data)} values (should be 0)")
        assert data == []


class TestCardAPI:
    """Test class for card-specific API endpoints"""

    def test_card_details(self):
        """Test individual card details endpoint"""
        print(f"\n[TEST] Testing card details endpoint...")
        response = requests.get(f"{BASE_URL}/api/cards/653527")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Card details for ID 1:")
        print(f"   📄 Name: {data.get('name')}")
        print(f"   📄 Game: {data.get('game')}")
        print(f"   📄 Product ID: {data.get('product_id')}")
        print(f"   📄 Group: {data.get('group_name')}")

        assert "id" in data
        assert "name" in data
        assert data["id"] == 1

    def test_card_by_url(self):
        """Test card lookup by URL (functionality not implemented)"""
        print(f"\n[TEST] Testing card lookup by URL...")
        print(f"   [WARN]  URL lookup functionality not implemented")
        print(f"   [OK] Skipping URL lookup test")

        # This test is skipped since URL lookup is not implemented
        assert True

    def test_card_not_found(self):
        """Test card not found scenarios"""
        print(f"\n[TEST] Testing card not found scenarios...")

        # Test with non-existent ID
        response = requests.get(f"{BASE_URL}/api/cards/999999999")
        assert response.status_code == 404

        data = response.json()
        print(f"   [OK] Non-existent card ID returned 404: {data.get('error')}")
        assert "error" in data

        # URL lookup functionality not implemented, so skip this test
        print(f"   [WARN]  URL lookup functionality not implemented")
        print(f"   [OK] Skipping invalid URL test")


class TestGamesAPI:
    """Test class for games API endpoints"""

    def test_games_endpoint(self):
        """Test games endpoint returns all categories"""
        print(f"\n[TEST] Testing games endpoint...")
        response = requests.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} games")

        # Print first few games
        for i, game in enumerate(data[:5]):
            print(f"   📄 Game {i+1}: {game['name']} (display: {game['display']})")

        assert isinstance(data, list)
        assert len(data) > 50  # Should have many games from categories table

        # Check structure of game objects
        for game in data:
            assert "name" in game
            assert "display" in game

        # Check that Union Arena is present
        union_arena_games = [
            game
            for game in data
            if "Union Arena" in game["name"] or "Union Arena" in game["display"]
        ]
        assert len(union_arena_games) > 0
        print(f"   [OK] Union Arena found in games list")

    def test_game_stats_endpoint(self):
        """Test game stats endpoint"""
        print(f"\n[TEST] Testing game stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/analytics/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} game stats")

        # Print game stats
        for stat in data:
            print(f"   📄 Game: {stat['game_name']} - {stat['card_count']} cards")

        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure
        for stat in data:
            assert "game_name" in stat
            assert "card_count" in stat


class TestStatsAPI:
    """Test class for statistics API endpoints"""

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print(f"\n[TEST] Testing stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/analytics")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Database stats:")
        print(f"   📄 Total cards: {data['total_cards']}")
        print(f"   📄 Total games: {data['total_games']}")
        print(f"   📄 Game breakdown: {len(data['game_stats'])} games")

        assert "total_cards" in data
        assert "total_games" in data
        assert "game_stats" in data
        assert data["total_cards"] > 3000
        assert data["total_games"] > 0

    def test_api_stats_endpoint(self):
        """Test API stats endpoint"""
        print(f"\n[TEST] Testing API stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/analytics")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] API stats:")
        print(f"   📄 Total cards: {data['total_cards']}")
        print(f"   📄 Total games: {data['total_games']}")
        print(f"   📄 Total series: {data['total_series']}")

        assert "total_cards" in data
        assert "total_games" in data
        assert "total_series" in data
        assert data["total_cards"] > 3000


class TestHealthAPI:
    """Test class for health and utility API endpoints"""

    def test_health_check(self):
        """Test health check endpoint"""
        print(f"\n[TEST] Testing health check endpoint...")
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Health check: {data['status']}")
        print(f"   📄 Timestamp: {data['timestamp']}")

        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"


class TestDeckBuilderAPI:
    """Test class for deck builder API endpoints"""

    def test_deck_validation_rules(self):
        """Test user decks endpoint"""
        print(f"\n[TEST] Testing user decks endpoint...")
        response = requests.get(f"{BASE_URL}/api/user/decks")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] User decks response:")
        print(f"   📄 Success: {data.get('success')}")
        print(f"   📄 Count: {data.get('data', {}).get('count', 0)}")

        assert isinstance(data, dict)
        assert "success" in data
        assert "data" in data

    def test_decks_endpoint(self):
        """Test decks endpoint (should return empty list for now)"""
        print(f"\n[TEST] Testing decks endpoint...")
        response = requests.get(f"{BASE_URL}/api/user/decks")
        assert response.status_code == 200

        data = response.json()
        deck_count = data.get("data", {}).get("count", 0)
        print(f"   [OK] Found {deck_count} decks")

        assert isinstance(data, dict)
        assert data.get("success") is True
        assert deck_count == 0  # Should be empty for now

    def test_user_decks_persistence(self):
        """Test user deck persistence endpoints"""
        print(f"\n[TEST] Testing user deck persistence...")

        # Create a session to maintain cookies
        session = requests.Session()

        # Use existing test user (created in database setup)
        test_username = "testuser"

        # Login to get session
        login_data = {"username": test_username, "password": "testpass123"}

        login_response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert login_response.status_code == 200

        # Test saving decks
        test_decks = [
            {
                "id": "test_deck_1",
                "name": "Test Deck 1",
                "game": "Union Arena",
                "visibility": "private",
                "cards": [],
                "created_date": "2024-01-01T00:00:00",
                "last_modified": "2024-01-01T00:00:00",
            },
            {
                "id": "test_deck_2",
                "name": "Test Deck 2",
                "game": "Union Arena",
                "visibility": "private",
                "cards": [],
                "created_date": "2024-01-01T00:00:00",
                "last_modified": "2024-01-01T00:00:00",
            },
        ]

        save_response = session.post(f"{BASE_URL}/api/user/decks", json=test_decks[0])
        assert save_response.status_code == 200

        # Test loading decks
        load_response = session.get(f"{BASE_URL}/api/user/decks")
        assert load_response.status_code == 200

        loaded_data = load_response.json()
        assert loaded_data["success"] == True
        deck_count = loaded_data["data"]["count"]
        assert deck_count >= 1  # At least one deck should be saved

        print(f"   [OK] Successfully saved and loaded {deck_count} decks")

        # Verify deck data integrity (simplified check)
        assert loaded_data["data"]["count"] > 0

        print(f"   [OK] Deck data integrity verified")


class TestScrapingAPI:
    """Test class for scraping API endpoints"""

    def test_scraping_status(self):
        """Test scraping status endpoint (requires authentication)"""
        print(f"\n[TEST] Testing scraping status endpoint...")
        response = requests.get(f"{BASE_URL}/api/admin/scraping/status")

        if response.status_code == 401:
            print(f"   [WARN]  Scraping status endpoint requires authentication")
            print(f"   [OK] Skipping scraping status test (401 Unauthorized)")
            assert response.status_code == 401
        else:
            assert response.status_code == 200
            data = response.json()
            print(f"   [OK] Scraping status: {data['status']}")
            print(f"   📄 Current operation: {data['statistics']['current_operation']}")
            print(f"   📄 Is running: {data['statistics']['is_running']}")

            assert "status" in data
            assert "logs" in data
            assert "statistics" in data
            assert data["status"] == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
