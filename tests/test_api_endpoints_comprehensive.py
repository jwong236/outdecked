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

# Base URL for the Flask API
BASE_URL = "http://localhost:5000"


class TestSearchAPI:
    """Test class for search API endpoints"""

    def test_search_basic(self):
        """Test basic search functionality"""
        print(f"\n🔍 Testing basic search endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=1&per_page=5"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {data['pagination']['total_cards']} total cards")
        print(f"   ✅ Returned {len(data['cards'])} cards in this page")

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
        print(f"\n🔍 Testing search with query...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&q=Attack&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Query 'Attack' found {data['pagination']['total_cards']} cards")

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0
        assert len(data["cards"]) <= 3

    def test_search_with_anime_filter(self):
        """Test search with anime (series) filter"""
        print(f"\n🔍 Testing search with anime filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&anime=Attack%20On%20Titan&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   ✅ Attack On Titan filter found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_color_filter(self):
        """Test search with color filter"""
        print(f"\n🔍 Testing search with color filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&color=Red&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Red color filter found {data['pagination']['total_cards']} cards")

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')})"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_print_type_filter(self):
        """Test search with print type filter"""
        print(f"\n🔍 Testing search with print type filter...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&print_type=Base&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   ✅ Base print type filter found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')}) -> {card.get('print_type')}"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_with_advanced_filters(self):
        """Test search with advanced filters (and_filters, or_filters, not_filters)"""
        print(f"\n🔍 Testing search with advanced filters...")

        # Test with and_filters
        and_filters = [{"field": "PrintType", "value": "Base"}]
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&and_filters={json.dumps(and_filters)}&per_page=3"
        )
        assert response.status_code == 200

        data = response.json()
        print(
            f"   ✅ Advanced and_filters found {data['pagination']['total_cards']} cards"
        )

        # Print example results
        for i, card in enumerate(data["cards"][:3]):
            print(
                f"   📄 Result {i+1}: {card.get('name')} ({card.get('group_abbreviation')}) -> {card.get('print_type')}"
            )

        assert data["pagination"]["total_cards"] > 0

    def test_search_pagination(self):
        """Test search pagination"""
        print(f"\n🔍 Testing search pagination...")

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

        print(f"   ✅ Page 1: {len(data1['cards'])} cards")
        print(f"   ✅ Page 2: {len(data2['cards'])} cards")
        print(f"   ✅ Total cards: {data1['pagination']['total_cards']}")

        # Ensure different results on different pages
        if len(data1["cards"]) > 0 and len(data2["cards"]) > 0:
            assert data1["cards"][0]["id"] != data2["cards"][0]["id"]

    def test_search_sorting(self):
        """Test search sorting"""
        print(f"\n🔍 Testing search sorting...")

        # Test sorting by name
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&sort=name&per_page=5"
        )
        assert response.status_code == 200
        data = response.json()

        print(f"   ✅ Sorted by name, found {len(data['cards'])} cards")

        # Print first few results to verify sorting
        for i, card in enumerate(data["cards"][:3]):
            print(f"   📄 Sorted result {i+1}: {card.get('name')}")

        assert len(data["cards"]) > 0


class TestFilterAPI:
    """Test class for filter API endpoints"""

    def test_filter_fields(self):
        """Test filter fields endpoint"""
        print(f"\n🔍 Testing filter fields endpoint...")
        response = requests.get(f"{BASE_URL}/api/filter-fields")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} filter fields")

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
        print(f"   ✅ PrintType field found: {print_type_field}")

    def test_filter_values_series_name(self):
        """Test filter values for SeriesName"""
        print(f"\n🔍 Testing filter values for SeriesName...")
        response = requests.get(f"{BASE_URL}/api/filter-values/SeriesName")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} series names")

        # Print all series names
        for series in data:
            print(f"   📄 Series: {series}")

        assert isinstance(data, list)
        assert len(data) > 0
        assert "Attack On Titan" in data

    def test_filter_values_rarity(self):
        """Test filter values for Rarity"""
        print(f"\n🔍 Testing filter values for Rarity...")
        response = requests.get(f"{BASE_URL}/api/filter-values/Rarity")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} rarity values")

        # Print all rarity values
        for rarity in data:
            print(f"   📄 Rarity: {rarity}")

        assert isinstance(data, list)
        assert len(data) > 0
        assert "Common" in data
        assert "Rare" in data

    def test_filter_values_print_type(self):
        """Test filter values for PrintType"""
        print(f"\n🔍 Testing filter values for PrintType...")
        response = requests.get(f"{BASE_URL}/api/filter-values/PrintType")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} print type values")

        # Print all print type values
        for print_type in data:
            print(f"   📄 Print Type: {print_type}")

        expected_print_types = [
            "Base",
            "Pre-Release",
            "Starter Deck",
            "Pre-Release Starter",
            "Promotion",
        ]
        assert isinstance(data, list)
        assert len(data) == len(expected_print_types)
        for expected_type in expected_print_types:
            assert expected_type in data

    def test_filter_values_affinities_special_splitting(self):
        """Test filter values for Affinities with special splitting"""
        print(f"\n🔍 Testing filter values for Affinities...")
        response = requests.get(f"{BASE_URL}/api/filter-values/Affinities")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} affinity values")

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
        print(f"\n🔍 Testing filter values for dynamic fields...")
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
            print(f"   ✅ Field '{field}': {len(data)} values")

            # Print first few values
            for value in data[:3]:
                print(f"   📄 {field}: {value}")

            assert isinstance(data, list)

    def test_filter_values_nonexistent_field(self):
        """Test filter values with non-existent field returns empty array"""
        print(f"\n🔍 Testing filter values for non-existent field...")
        response = requests.get(f"{BASE_URL}/api/filter-values/NonExistentField123")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Non-existent field returned {len(data)} values (should be 0)")
        assert data == []


class TestCardAPI:
    """Test class for card-specific API endpoints"""

    def test_card_details(self):
        """Test individual card details endpoint"""
        print(f"\n🔍 Testing card details endpoint...")
        response = requests.get(f"{BASE_URL}/api/card/1")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Card details for ID 1:")
        print(f"   📄 Name: {data.get('name')}")
        print(f"   📄 Game: {data.get('game')}")
        print(f"   📄 Product ID: {data.get('product_id')}")
        print(f"   📄 Group: {data.get('group_name')}")

        assert "id" in data
        assert "name" in data
        assert data["id"] == 1

    def test_card_by_url(self):
        """Test card lookup by URL"""
        print(f"\n🔍 Testing card lookup by URL...")

        # First get a card to get its URL
        response1 = requests.get(f"{BASE_URL}/api/card/1")
        assert response1.status_code == 200
        card_data = response1.json()
        card_url = card_data.get("card_url")

        if card_url:
            # Test lookup by URL
            response2 = requests.get(f"{BASE_URL}/api/card-by-url?url={card_url}")
            assert response2.status_code == 200

            data = response2.json()
            print(f"   ✅ Card lookup by URL successful:")
            print(f"   📄 Name: {data['card'].get('name')}")
            print(f"   📄 URL: {data['card'].get('card_url')}")

            assert data["success"] is True
            assert "card" in data
            assert data["card"]["id"] == 1

    def test_card_not_found(self):
        """Test card not found scenarios"""
        print(f"\n🔍 Testing card not found scenarios...")

        # Test with non-existent ID
        response = requests.get(f"{BASE_URL}/api/card/999999")
        assert response.status_code == 404

        data = response.json()
        print(f"   ✅ Non-existent card ID returned 404: {data.get('error')}")
        assert "error" in data

        # Test with invalid URL
        response2 = requests.get(f"{BASE_URL}/api/card-by-url?url=invalid-url")
        assert response2.status_code == 404

        data2 = response2.json()
        print(f"   ✅ Invalid URL returned 404: {data2.get('error')}")
        assert data2["success"] is False


class TestGamesAPI:
    """Test class for games API endpoints"""

    def test_games_endpoint(self):
        """Test games endpoint returns all categories"""
        print(f"\n🔍 Testing games endpoint...")
        response = requests.get(f"{BASE_URL}/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} games")

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
        print(f"   ✅ Union Arena found in games list")

    def test_game_stats_endpoint(self):
        """Test game stats endpoint"""
        print(f"\n🔍 Testing game stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/game-stats")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} game stats")

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
        print(f"\n🔍 Testing stats endpoint...")
        response = requests.get(f"{BASE_URL}/stats")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Database stats:")
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
        print(f"\n🔍 Testing API stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ API stats:")
        print(f"   📄 Total cards: {data['total_cards']}")
        print(f"   📄 Game count: {data['game_count']}")
        print(f"   📄 Last scrape: {data['last_scrape']}")

        assert "total_cards" in data
        assert "game_count" in data
        assert "last_scrape" in data
        assert data["total_cards"] > 3000


class TestHealthAPI:
    """Test class for health and utility API endpoints"""

    def test_health_check(self):
        """Test health check endpoint"""
        print(f"\n🔍 Testing health check endpoint...")
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Health check: {data['status']}")
        print(f"   📄 Timestamp: {data['timestamp']}")

        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"


class TestDeckBuilderAPI:
    """Test class for deck builder API endpoints"""

    def test_deck_validation_rules(self):
        """Test deck validation rules endpoint"""
        print(f"\n🔍 Testing deck validation rules endpoint...")
        response = requests.get(f"{BASE_URL}/api/deck-validation-rules")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Deck validation rules:")
        print(f"   📄 Union Arena rules: {data.get('Union Arena', {})}")

        assert isinstance(data, dict)
        assert "Union Arena" in data

    def test_decks_endpoint(self):
        """Test decks endpoint (should return empty list for now)"""
        print(f"\n🔍 Testing decks endpoint...")
        response = requests.get(f"{BASE_URL}/api/decks")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} decks")

        assert isinstance(data, list)


class TestScrapingAPI:
    """Test class for scraping API endpoints"""

    def test_scraping_status(self):
        """Test scraping status endpoint"""
        print(f"\n🔍 Testing scraping status endpoint...")
        response = requests.get(f"{BASE_URL}/api/scraping-status")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Scraping status: {data['status']}")
        print(f"   📄 Current operation: {data['statistics']['current_operation']}")
        print(f"   📄 Is running: {data['statistics']['is_running']}")

        assert "status" in data
        assert "logs" in data
        assert "statistics" in data
        assert data["status"] == "success"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
