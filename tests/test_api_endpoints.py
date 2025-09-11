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
        (
            "/api/attributes-fields/Union Arena",
            "Attributes Fields (Union Arena) - Legacy",
        ),
        (
            "/api/attributes-values/Union Arena/Rarity",
            "Attributes Values (Union Arena - Rarity) - Legacy",
        ),
        ("/api/card/1", "Card Details (ID: 1)"),
        ("/games", "Available Games"),
    ]

    results = []

    for endpoint, description in endpoints:
        success = test_endpoint(endpoint, description)
        results.append((endpoint, description, success))

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
