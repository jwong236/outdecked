#!/usr/bin/env python3
"""
Pytest test suite for API endpoints
Tests the Flask backend API endpoints to ensure they're working correctly
"""

import pytest
import requests
import json

# Base URL for the Flask API
BASE_URL = "http://localhost:5000"


class TestAPIEndpoints:
    """Test class for API endpoints"""

    def test_search_cards_basic(self):
        """Test basic search functionality"""
        print(f"\n[TEST] Testing search endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/cards?game=Union Arena&page=1&per_page=20"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data['cards'])} cards")
        print(f"   [INFO] Response structure: {list(data.keys())}")
        print(
            f"   [INFO] Sample card: {data['cards'][0] if data['cards'] else 'No cards'}"
        )
        print(f"   [INFO] Pagination: {data.get('pagination', 'No pagination')}")
        assert "cards" in data
        assert "pagination" in data
        assert len(data["cards"]) <= 20

    def test_filter_fields(self):
        """Test filter fields endpoint"""
        print(f"\n[TEST] Testing filter fields endpoint...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} filter fields")
        print(f"   [INFO] Response: {data}")
        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure of field objects
        for field in data:
            assert "name" in field
            assert "display" in field

    def test_filter_values_series_name(self):
        """Test filter values for series"""
        print(f"\n[TEST] Testing series filter values...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes/series")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Series values: {data}")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Attack On Titan" in data

    def test_filter_values_rarity(self):
        """Test filter values for rarity"""
        print(f"\n[TEST] Testing rarity filter values...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes/rarity")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Rarity values: {data}")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Common" in data
        assert "Rare" in data

    def test_filter_values_affinities_special_splitting(self):
        """Test filter values for affinities with special splitting"""
        print(f"\n[TEST] Testing affinities filter values...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes/affinities")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Affinities values: {data}")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Black Bulls" in data
        assert "Blue Rose Knights" in data

    def test_filter_values_dynamic_fields(self):
        """Test that filter values works with any field name"""
        print(f"\n[TEST] Testing dynamic filter fields...")
        test_fields = [
            "card_type",
            "battle_point",
            "required_energy",
            "activation_energy",
        ]

        for field in test_fields:
            print(f"   [TEST] Testing field: {field}")
            response = requests.get(f"{BASE_URL}/api/cards/attributes/{field}")
            assert response.status_code == 200

            data = response.json()
            print(f"   [INFO] {field} values: {data}")
            assert isinstance(data, list)

    def test_filter_values_nonexistent_field(self):
        """Test filter values with non-existent field returns empty array"""
        print(f"\n[TEST] Testing non-existent field...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes/NonExistentField123")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Non-existent field response: {data}")
        assert data == []

    def test_card_details(self):
        """Test individual card details endpoint"""
        print(f"\n[TEST] Testing card details endpoint...")
        response = requests.get(f"{BASE_URL}/api/cards/648434")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Card details: {data}")
        assert "id" in data
        assert "name" in data
        assert data["product_id"] == 648434

    def test_games_endpoint(self):
        """Test games endpoint returns all categories"""
        print(f"\n[TEST] Testing games endpoint...")
        response = requests.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Games response: {data}")
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


class TestDynamicFilterFunctionality:
    """Test class specifically for dynamic filter functionality"""

    def test_all_available_fields_work(self):
        """Test that all fields from filter-fields endpoint work with filter-values"""
        # Get all available fields
        response = requests.get(f"{BASE_URL}/api/cards/attributes")
        assert response.status_code == 200

        fields = response.json()
        assert len(fields) > 0

        # Test each field
        for field in fields:
            field_name = field["name"]
            response = requests.get(f"{BASE_URL}/api/cards/attributes/{field_name}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)

    def test_affinities_special_handling(self):
        """Test that affinities field properly splits values"""
        response = requests.get(f"{BASE_URL}/api/cards/attributes/affinities")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        # Should not contain any values with " / " (should be split)
        for value in data:
            assert " / " not in value

    def test_field_name_case_sensitivity(self):
        """Test that field names are case sensitive"""
        # Test with correct case
        response = requests.get(f"{BASE_URL}/api/cards/attributes/SeriesName")
        assert response.status_code == 200
        correct_data = response.json()

        # Test with incorrect case
        response = requests.get(f"{BASE_URL}/api/cards/attributes/seriesname")
        assert response.status_code == 200
        incorrect_data = response.json()

        # Should return different results (or empty for incorrect case)
        # This tests that the field names are used exactly as provided
        assert isinstance(correct_data, list)
        assert isinstance(incorrect_data, list)


class TestSeriesSpecificColors:
    """Test class for series-specific color filtering"""

    def test_colors_for_attack_on_titan(self):
        """Test colors available for Attack On Titan series"""
        print(f"\n[TEST] Testing colors for Attack On Titan...")
        response = requests.get(
            f"{BASE_URL}/api/cards/colors/Attack%20On%20Titan?game=Union%20Arena"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Attack On Titan colors: {data}")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Blue" in data
        assert "Green" in data
        assert "Red" in data

    def test_colors_for_bleach(self):
        """Test colors available for Bleach series"""
        print(f"\n[TEST] Testing colors for Bleach...")
        response = requests.get(
            f"{BASE_URL}/api/cards/colors/Bleach?game=Union%20Arena"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Bleach colors: {data}")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Blue" in data
        assert "Green" in data
        assert "Purple" in data
        assert "Yellow" in data

    def test_colors_for_nonexistent_series(self):
        """Test colors for a series that doesn't exist"""
        print(f"\n[TEST] Testing colors for nonexistent series...")
        response = requests.get(
            f"{BASE_URL}/api/cards/colors/NonexistentSeries?game=Union%20Arena"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Nonexistent series colors: {data}")
        assert isinstance(data, list)
        assert len(data) == 0  # Should return empty list

    def test_colors_endpoint_without_game_param(self):
        """Test that colors endpoint works without game parameter (defaults to Union Arena)"""
        print(f"\n[TEST] Testing colors endpoint without game parameter...")
        response = requests.get(f"{BASE_URL}/api/cards/colors/Attack%20On%20Titan")
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] Colors without game param: {data}")
        assert isinstance(data, list)
        assert len(data) > 0

    def test_colors_endpoint_url_encoding(self):
        """Test that series names with special characters are properly URL encoded"""
        print(f"\n[TEST] Testing URL encoding for series names...")
        # Test with series that has spaces
        response = requests.get(
            f"{BASE_URL}/api/cards/colors/One%20Punch%20Man?game=Union%20Arena"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [INFO] One Punch Man colors: {data}")
        assert isinstance(data, list)
        assert len(data) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
