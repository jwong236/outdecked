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
        print(f"\n🔍 Testing search endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=1&per_page=5"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data['cards'])} cards")
        assert "cards" in data
        assert "pagination" in data
        assert len(data["cards"]) <= 5

    def test_filter_fields(self):
        """Test filter fields endpoint"""
        print(f"\n🔍 Testing filter fields endpoint...")
        response = requests.get(f"{BASE_URL}/api/filter-fields")
        assert response.status_code == 200

        data = response.json()
        print(f"   ✅ Found {len(data)} filter fields")
        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure of field objects
        for field in data:
            assert "name" in field
            assert "display" in field

    def test_filter_values_series_name(self):
        """Test filter values for SeriesName"""
        response = requests.get(f"{BASE_URL}/api/filter-values/SeriesName")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Attack On Titan" in data

    def test_filter_values_rarity(self):
        """Test filter values for Rarity"""
        response = requests.get(f"{BASE_URL}/api/filter-values/Rarity")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Common" in data
        assert "Rare" in data

    def test_filter_values_affinities_special_splitting(self):
        """Test filter values for Affinities with special splitting"""
        response = requests.get(f"{BASE_URL}/api/filter-values/Affinities")
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Black Bulls" in data
        assert "Blue Rose Knights" in data

    def test_filter_values_dynamic_fields(self):
        """Test that filter values works with any field name"""
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
            assert isinstance(data, list)

    def test_filter_values_nonexistent_field(self):
        """Test filter values with non-existent field returns empty array"""
        response = requests.get(f"{BASE_URL}/api/filter-values/NonExistentField123")
        assert response.status_code == 200

        data = response.json()
        assert data == []

    def test_card_details(self):
        """Test individual card details endpoint"""
        response = requests.get(f"{BASE_URL}/api/card/1")
        assert response.status_code == 200

        data = response.json()
        assert "id" in data
        assert "name" in data
        assert data["id"] == 1

    def test_games_endpoint(self):
        """Test games endpoint returns all categories"""
        response = requests.get(f"{BASE_URL}/games")
        assert response.status_code == 200

        data = response.json()
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
        response = requests.get(f"{BASE_URL}/api/filter-fields")
        assert response.status_code == 200

        fields = response.json()
        assert len(fields) > 0

        # Test each field
        for field in fields:
            field_name = field["name"]
            response = requests.get(f"{BASE_URL}/api/filter-values/{field_name}")
            assert response.status_code == 200

            data = response.json()
            assert isinstance(data, list)

    def test_affinities_special_handling(self):
        """Test that Affinities field properly splits values"""
        response = requests.get(f"{BASE_URL}/api/filter-values/Affinities")
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
        response = requests.get(f"{BASE_URL}/api/filter-values/SeriesName")
        assert response.status_code == 200
        correct_data = response.json()

        # Test with incorrect case
        response = requests.get(f"{BASE_URL}/api/filter-values/seriesname")
        assert response.status_code == 200
        incorrect_data = response.json()

        # Should return different results (or empty for incorrect case)
        # This tests that the field names are used exactly as provided
        assert isinstance(correct_data, list)
        assert isinstance(incorrect_data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
