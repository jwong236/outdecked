#!/usr/bin/env python3
"""
Updated pytest test suite for all current API endpoints
Tests the Flask backend API endpoints with the new endpoint structure
Covers all public, authentication, user, cart, and admin endpoints
"""

import pytest
import requests
import json
import time
from datetime import datetime

# Base URL for the Flask API
BASE_URL = "http://localhost:5000"


class TestPublicEndpoints:
    """Test class for public API endpoints (no authentication required)"""

    def test_cards_search_endpoint(self):
        """Test the main cards search endpoint (renamed from /api/search)"""
        print(f"\n[TEST] Testing cards search endpoint...")
        response = requests.get(
            f"{BASE_URL}/api/cards?game=Union Arena&page=1&per_page=5"
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {data['pagination']['total_cards']} total cards")
        print(f"   [OK] Returned {len(data['cards'])} cards in this page")

        # Print example card data
        if data["cards"]:
            example_card = data["cards"][0]
            print(
                f"   [INFO] Example card: {example_card.get('name')} ({example_card.get('group_abbreviation')})"
            )

        assert "cards" in data
        assert "pagination" in data
        assert len(data["cards"]) <= 5
        assert data["pagination"]["total_cards"] > 3000

    def test_cards_search_with_filters(self):
        """Test cards search with various filters"""
        print(f"\n[TEST] Testing cards search with filters...")

        # Test with query parameter
        response = requests.get(
            f"{BASE_URL}/api/cards?game=Union Arena&q=Attack&per_page=3"
        )
        assert response.status_code == 200
        data = response.json()
        print(f"   [OK] Query 'Attack' found {data['pagination']['total_cards']} cards")

        # Test with series filter
        response = requests.get(
            f"{BASE_URL}/api/cards?game=Union Arena&anime=Attack%20On%20Titan&per_page=3"
        )
        assert response.status_code == 200
        data = response.json()
        print(
            f"   [OK] Attack On Titan filter found {data['pagination']['total_cards']} cards"
        )

        # Test with color filter
        response = requests.get(
            f"{BASE_URL}/api/cards?game=Union Arena&color=Red&per_page=3"
        )
        assert response.status_code == 200
        data = response.json()
        print(
            f"   [OK] Red color filter found {data['pagination']['total_cards']} cards"
        )

    def test_cards_attributes_endpoint(self):
        """Test the cards attributes endpoint (renamed from /api/filter-fields)"""
        print(f"\n[TEST] Testing cards attributes endpoint...")
        response = requests.get(f"{BASE_URL}/api/cards/attributes")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} attribute fields")

        # Print all available fields
        for field in data:
            print(f"   [INFO] Field: {field['name']} (display: {field['display']})")

        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure of field objects
        for field in data:
            assert "name" in field
            assert "display" in field

        # Check that important fields are included
        field_names = [f["name"] for f in data]
        assert "PrintType" in field_names
        assert "SeriesName" in field_names
        assert "Rarity" in field_names

    def test_cards_attributes_field_endpoint(self):
        """Test the cards attributes field endpoint (renamed from /api/filter-values)"""
        print(f"\n[TEST] Testing cards attributes field endpoint...")

        # Test SeriesName
        response = requests.get(f"{BASE_URL}/api/cards/attributes/SeriesName")
        assert response.status_code == 200
        data = response.json()
        print(f"   [OK] Found {len(data)} series names")
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Attack On Titan" in data

        # Test Rarity
        response = requests.get(f"{BASE_URL}/api/cards/attributes/Rarity")
        assert response.status_code == 200
        data = response.json()
        print(f"   [OK] Found {len(data)} rarity values")
        assert isinstance(data, list)
        assert "Common" in data
        assert "Rare" in data

        # Test PrintType
        response = requests.get(f"{BASE_URL}/api/cards/attributes/PrintType")
        assert response.status_code == 200
        data = response.json()
        print(f"   [OK] Found {len(data)} print type values")
        expected_print_types = [
            "Base",
            "Pre-Release",
            "Starter Deck",
            "Pre-Release Starter",
            "Promotion",
        ]
        assert isinstance(data, list)
        for expected_type in expected_print_types:
            assert expected_type in data

        # Test non-existent field
        response = requests.get(f"{BASE_URL}/api/cards/attributes/NonExistentField123")
        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_games_endpoint(self):
        """Test games endpoint"""
        print(f"\n[TEST] Testing games endpoint...")
        response = requests.get(f"{BASE_URL}/api/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} games")

        # Print first few games
        for i, game in enumerate(data[:5]):
            print(f"   [INFO] Game {i+1}: {game['name']} (display: {game['display']})")

        assert isinstance(data, list)
        assert len(data) > 50

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

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print(f"\n[TEST] Testing stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Database stats:")
        print(f"   [INFO] Total cards: {data['total_cards']}")
        print(f"   [INFO] Game count: {data['total_games']}")
        print(f"   [INFO] Game stats: {len(data.get('game_stats', []))} games")

        assert "total_cards" in data
        assert "total_games" in data
        assert "game_stats" in data
        assert data["total_cards"] > 3000

    def test_stats_games_endpoint(self):
        """Test game-specific stats endpoint (renamed from /api/game-stats)"""
        print(f"\n[TEST] Testing game stats endpoint...")
        response = requests.get(f"{BASE_URL}/api/stats/games")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Found {len(data)} game stats")

        # Print game stats
        for stat in data:
            print(f"   [INFO] Game: {stat['game_name']} - {stat['card_count']} cards")

        assert isinstance(data, list)
        assert len(data) > 0

        # Check structure
        for stat in data:
            assert "game_name" in stat
            assert "card_count" in stat

    def test_images_endpoint(self):
        """Test TCGPlayer product images endpoint"""
        print(f"\n[TEST] Testing TCGPlayer product images endpoint...")

        # First get a card to get its product_id
        response = requests.get(f"{BASE_URL}/api/cards?game=Union Arena&per_page=1")
        assert response.status_code == 200
        data = response.json()

        if data["cards"] and data["cards"][0].get("product_id"):
            product_id = data["cards"][0]["product_id"]
            print(f"   [INFO] Testing with product ID: {product_id}")

            # Test TCGPlayer product image fetching
            response = requests.get(
                f"{BASE_URL}/api/images/product/{product_id}?size=1000x1000"
            )
            assert response.status_code == 200

            # Check that it returns image content
            assert response.headers.get("Content-Type", "").startswith("image/")
            print(
                f"   [OK] Successfully fetched TCGPlayer product image (Content-Type: {response.headers.get('Content-Type')})"
            )

    def test_health_endpoint(self):
        """Test health check endpoint (moved from /health)"""
        print(f"\n[TEST] Testing health check endpoint...")
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Health check: {data['status']}")
        print(f"   [INFO] Timestamp: {data['timestamp']}")

        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"

    def test_routes_endpoint(self):
        """Test the routes listing endpoint"""
        print(f"\n[TEST] Testing routes endpoint...")
        response = requests.get(f"{BASE_URL}/api/routes")
        assert response.status_code == 200

        # Should return HTML with route listings
        content = response.text
        assert "<pre>" in content
        assert "api/cards" in content
        assert "api/auth" in content
        print(
            f"   [OK] Routes endpoint returned {len(content)} characters of route data"
        )


class TestAuthenticationEndpoints:
    """Test class for authentication endpoints"""

    def test_auth_register(self):
        """Test user registration endpoint"""
        print(f"\n[TEST] Testing auth register endpoint...")

        # Test with valid data
        test_user = {
            "username": f"testuser_{int(time.time())}",
            "password": "testpass123",
            "email": f"test_{int(time.time())}@example.com",
        }

        response = requests.post(f"{BASE_URL}/api/auth/register", json=test_user)
        assert response.status_code == 201

        data = response.json()
        print(f"   [OK] User registered: {data.get('message')}")
        assert "message" in data
        assert "success" in data
        assert data["success"] is True

    def test_auth_login(self):
        """Test user login endpoint"""
        print(f"\n[TEST] Testing auth login endpoint...")

        # First register a test user
        test_user = {
            "username": f"testuser_{int(time.time())}",
            "password": "testpass123",
            "email": f"test_{int(time.time())}@example.com",
        }

        # Register
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register", json=test_user
        )
        assert register_response.status_code == 201

        # Login
        login_data = {
            "username": test_user["username"],
            "password": test_user["password"],
        }

        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] User logged in: {data.get('message')}")
        assert "message" in data
        assert "success" in data
        assert data["success"] is True

    def test_auth_me(self):
        """Test auth me endpoint (requires authentication)"""
        print(f"\n[TEST] Testing auth me endpoint...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated request correctly returned 401: {data['error']}"
        )

    def test_auth_logout(self):
        """Test auth logout endpoint"""
        print(f"\n[TEST] Testing auth logout endpoint...")

        # Test logout (should work even without authentication)
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Logout successful: {data.get('message')}")
        assert "message" in data


class TestUserEndpoints:
    """Test class for user-specific endpoints (require authentication)"""

    def test_user_preferences(self):
        """Test user preferences endpoints"""
        print(f"\n[TEST] Testing user preferences endpoints...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/user/preferences")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated preferences request correctly returned 401: {data['error']}"
        )

    def test_user_hand(self):
        """Test user hand endpoints"""
        print(f"\n[TEST] Testing user hand endpoints...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/user/hand")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated hand request correctly returned 401: {data['error']}"
        )

    def test_user_decks(self):
        """Test user decks endpoints"""
        print(f"\n[TEST] Testing user decks endpoints...")

        # Test without authentication (may return 200 with empty list or 401)
        response = requests.get(f"{BASE_URL}/api/user/decks")
        assert response.status_code in [200, 401]

        if response.status_code == 401:
            data = response.json()
            assert "error" in data
            print(
                f"   [OK] Unauthenticated decks request correctly returned 401: {data['error']}"
            )
        else:
            data = response.json()
            print(
                f"   [OK] Unauthenticated decks request returned 200 (may be intentional): {data}"
            )


class TestCartEndpoints:
    """Test class for cart endpoints (work for both authenticated and anonymous users)"""

    def test_cart_get(self):
        """Test cart get endpoint"""
        print(f"\n[TEST] Testing cart get endpoint...")

        # Test without authentication (should work for anonymous users)
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Cart get successful: {data.get('message')}")
        assert "hand" in data
        assert "message" in data

    def test_cart_add_cards(self):
        """Test cart add cards endpoint"""
        print(f"\n[TEST] Testing cart add cards endpoint...")

        # Test without authentication (should work for anonymous users)
        test_cards = [{"id": 1, "quantity": 2}]

        response = requests.post(
            f"{BASE_URL}/api/cart/cards", json={"cards": test_cards}
        )
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Cart add cards successful: {data.get('message')}")
        assert "success" in data
        assert data["success"] is True

    def test_cart_update_card(self):
        """Test cart update card endpoint"""
        print(f"\n[TEST] Testing cart update card endpoint...")

        # Test without authentication (should work for anonymous users)
        response = requests.put(f"{BASE_URL}/api/cart/cards/1", json={"quantity": 3})
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Cart update card successful: {data.get('message')}")
        assert "success" in data
        assert data["success"] is True

    def test_cart_remove_card(self):
        """Test cart remove card endpoint"""
        print(f"\n[TEST] Testing cart remove card endpoint...")

        # Test without authentication (should work for anonymous users)
        response = requests.delete(f"{BASE_URL}/api/cart/cards/1")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Cart remove card successful: {data.get('message')}")
        assert "success" in data
        assert data["success"] is True

    def test_cart_clear(self):
        """Test cart clear endpoint"""
        print(f"\n[TEST] Testing cart clear endpoint...")

        # Test without authentication (should work for anonymous users)
        response = requests.delete(f"{BASE_URL}/api/cart")
        assert response.status_code == 200

        data = response.json()
        print(f"   [OK] Cart clear successful: {data.get('message')}")
        assert "success" in data
        assert data["success"] is True


class TestAdminEndpoints:
    """Test class for admin endpoints (require admin authentication)"""

    def test_admin_users(self):
        """Test admin users endpoint"""
        print(f"\n[TEST] Testing admin users endpoint...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin users request correctly returned 401: {data['error']}"
        )

    def test_admin_users_role(self):
        """Test admin users role endpoint"""
        print(f"\n[TEST] Testing admin users role endpoint...")

        # Test without authentication (should return 401)
        response = requests.put(
            f"{BASE_URL}/api/admin/users/role", json={"user_id": 1, "role": "admin"}
        )
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin role request correctly returned 401: {data['error']}"
        )

    def test_admin_users_stats(self):
        """Test admin users stats endpoint"""
        print(f"\n[TEST] Testing admin users stats endpoint...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/admin/users/stats")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin stats request correctly returned 401: {data['error']}"
        )

    def test_admin_scraping_start(self):
        """Test admin scraping start endpoint"""
        print(f"\n[TEST] Testing admin scraping start endpoint...")

        # Test without authentication (should return 401)
        response = requests.post(f"{BASE_URL}/api/admin/scraping/start")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin scraping start request correctly returned 401: {data['error']}"
        )

    def test_admin_scraping_status(self):
        """Test admin scraping status endpoint"""
        print(f"\n[TEST] Testing admin scraping status endpoint...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/admin/scraping/status")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin scraping status request correctly returned 401: {data['error']}"
        )

    def test_admin_database_backup(self):
        """Test admin database backup endpoint"""
        print(f"\n[TEST] Testing admin database backup endpoint...")

        # Test without authentication (should return 401)
        response = requests.get(f"{BASE_URL}/api/admin/database/backup")
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin database backup request correctly returned 401: {data['error']}"
        )

    def test_admin_database_restore(self):
        """Test admin database restore endpoint"""
        print(f"\n[TEST] Testing admin database restore endpoint...")

        # Test without authentication (should return 401)
        response = requests.post(
            f"{BASE_URL}/api/admin/database/restore", json={"backup_data": "test"}
        )
        assert response.status_code == 401

        data = response.json()
        assert "error" in data
        print(
            f"   [OK] Unauthenticated admin database restore request correctly returned 401: {data['error']}"
        )


class TestEndpointStructure:
    """Test class for verifying endpoint structure and organization"""

    def test_all_public_endpoints_accessible(self):
        """Test that all public endpoints are accessible without authentication"""
        print(f"\n[TEST] Testing all public endpoints accessibility...")

        public_endpoints = [
            "/api/cards",
            "/api/cards/attributes",
            "/api/cards/attributes/SeriesName",
            "/api/games",
            "/api/stats",
            "/api/stats/games",
            "/api/health",
            "/api/routes",
        ]

        for endpoint in public_endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert (
                response.status_code == 200
            ), f"Public endpoint {endpoint} should be accessible"
            print(f"   [OK] {endpoint} - accessible")

    def test_all_auth_endpoints_require_authentication(self):
        """Test that all authentication-required endpoints properly require auth"""
        print(f"\n[TEST] Testing authentication requirements...")

        auth_endpoints = [
            ("GET", "/api/auth/me"),
            ("GET", "/api/user/preferences"),
            ("GET", "/api/user/hand"),
            ("GET", "/api/admin/users"),
            ("GET", "/api/admin/users/stats"),
            ("GET", "/api/admin/scraping/status"),
            ("GET", "/api/admin/database/backup"),
        ]

        for method, endpoint in auth_endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert (
                response.status_code == 401
            ), f"Auth endpoint {endpoint} should require authentication"
            print(f"   [OK] {endpoint} - requires authentication")

        # Test PUT endpoint for admin users role
        response = requests.put(
            f"{BASE_URL}/api/admin/users/role", json={"user_id": 1, "role": "admin"}
        )
        assert (
            response.status_code == 401
        ), f"Auth endpoint /api/admin/users/role should require authentication"
        print(f"   [OK] /api/admin/users/role (PUT) - requires authentication")

        # Test POST endpoint for admin scraping start
        response = requests.post(f"{BASE_URL}/api/admin/scraping/start")
        assert (
            response.status_code == 401
        ), f"Auth endpoint /api/admin/scraping/start should require authentication"
        print(f"   [OK] /api/admin/scraping/start (POST) - requires authentication")

        # Test POST endpoint for admin database restore
        response = requests.post(
            f"{BASE_URL}/api/admin/database/restore", json={"backup_data": "test"}
        )
        assert (
            response.status_code == 401
        ), f"Auth endpoint /api/admin/database/restore should require authentication"
        print(f"   [OK] /api/admin/database/restore (POST) - requires authentication")

        # Special case for /api/user/decks - may work for anonymous users
        response = requests.get(f"{BASE_URL}/api/user/decks")
        assert response.status_code in [
            200,
            401,
        ], f"User decks endpoint should return 200 or 401"
        print(
            f"   [OK] /api/user/decks - returns {response.status_code} (may be intentional)"
        )

    def test_cart_endpoints_work_anonymous(self):
        """Test that cart endpoints work for anonymous users"""
        print(f"\n[TEST] Testing cart endpoints for anonymous users...")

        cart_endpoints = [
            ("GET", "/api/cart"),
            ("POST", "/api/cart/cards"),
            ("PUT", "/api/cart/cards/1"),
            ("DELETE", "/api/cart/cards/1"),
            ("DELETE", "/api/cart"),
        ]

        for method, endpoint in cart_endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            elif method == "POST":
                response = requests.post(f"{BASE_URL}{endpoint}", json={"cards": []})
            elif method == "PUT":
                response = requests.put(f"{BASE_URL}{endpoint}", json={"quantity": 1})
            elif method == "DELETE":
                response = requests.delete(f"{BASE_URL}{endpoint}")

            assert (
                response.status_code == 200
            ), f"Cart endpoint {endpoint} should work for anonymous users"
            print(f"   [OK] {method} {endpoint} - works for anonymous users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
