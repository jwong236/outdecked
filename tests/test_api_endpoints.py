#!/usr/bin/env python3
"""
Test script for API endpoints
Tests the Flask backend API endpoints to ensure they're working correctly
"""

import requests
import json
import sys

# Base URL for the Flask API
BASE_URL = "http://localhost:5000"


def test_endpoint(endpoint, description):
    """Test a single API endpoint"""
    print(f"\n🔍 Testing {description}")
    print(f"   URL: {BASE_URL}{endpoint}")

    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Response: {json.dumps(data, indent=2)[:200]}...")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection Error: Is the Flask server running on {BASE_URL}?")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout: Request took too long")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected Error: {e}")
        return False


def test_price_fallback():
    """Test that the search API uses price fallback logic (market_price -> mid_price)"""
    print(f"\n💰 Testing Price Fallback Logic")
    print(f"   URL: {BASE_URL}/api/search?game=Union Arena&page=1&per_page=20")

    try:
        response = requests.get(
            f"{BASE_URL}/api/search?game=Union Arena&page=1&per_page=20", timeout=10
        )
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            cards = data.get("cards", [])

            if not cards:
                print(f"   ❌ No cards returned")
                return False

            # Count cards with valid prices vs N/A
            valid_prices = 0
            na_prices = 0

            for card in cards:
                price = card.get("price")
                if price and price != "N/A" and price != "" and price != 0:
                    valid_prices += 1
                else:
                    na_prices += 1

            print(f"   📊 Cards with valid prices: {valid_prices}")
            print(f"   📊 Cards with N/A prices: {na_prices}")
            print(f"   📊 Total cards: {len(cards)}")

            # Should have very few N/A prices (less than 5% ideally)
            na_percentage = (na_prices / len(cards)) * 100 if cards else 0
            print(f"   📊 N/A percentage: {na_percentage:.1f}%")

            if na_percentage < 10:  # Less than 10% N/A is acceptable
                print(f"   ✅ Price fallback working well!")
                return True
            else:
                print(f"   ⚠️  High percentage of N/A prices - may need investigation")
                return False
        else:
            print(f"   ❌ Error: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection Error: Is the Flask server running on {BASE_URL}?")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout: Request took too long")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected Error: {e}")
        return False


def main():
    """Test all API endpoints"""
    print("🚀 Testing Flask API Endpoints")
    print("=" * 50)

    # List of endpoints to test
    endpoints = [
        ("/api/search?game=Union Arena&page=1&per_page=5", "Search Cards (basic)"),
        ("/api/filter-fields", "Filter Fields (new architecture)"),
        ("/api/filter-values/SeriesName", "Filter Values - SeriesName"),
        ("/api/filter-values/Rarity", "Filter Values - Rarity"),
        (
            "/api/filter-values/Affinities",
            "Filter Values - Affinities (special splitting)",
        ),
        ("/api/card/1", "Card Details (ID: 1)"),
        ("/games", "Available Games"),
    ]

    results = []

    for endpoint, description in endpoints:
        success = test_endpoint(endpoint, description)
        results.append((endpoint, description, success))

    # Test price fallback logic
    price_test_success = test_price_fallback()
    results.append(
        ("/api/search (price fallback)", "Price Fallback Logic", price_test_success)
    )

    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)

    successful = sum(1 for _, _, success in results if success)
    total = len(results)

    for endpoint, description, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {description}")

    print(f"\n🎯 Results: {successful}/{total} endpoints working")

    if successful == total:
        print("🎉 All endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints are failing. Check the Flask server logs.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
