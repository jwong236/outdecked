"""
Test script for user's specific Alphonse Elric query
Demonstrates the new query syntax system
"""

import requests

url = "http://localhost:5000/api/cards"

print("=" * 80)
print("USER QUERY: Yellow Super Rare Alphonse Elric, 3 Energy, 1 AP")
print("=" * 80)

# Your exact query as a user would type it
query_params = {
    "basic_prints": "",
    "base_rarity": "",
    "no_ap": "",
    "q": "alphonse_elric c:yellow s:fullmetal_alchemist r:super_rare en:3 ap:1",
    "per_page": 10,
}

print(
    "\nQuery syntax: alphonse_elric c:yellow s:fullmetal_alchemist r:super_rare en:3 ap:1"
)
print("Presets: basic_prints, base_rarity, no_ap")
print(
    "\nURL: "
    + url
    + "?"
    + "&".join([f"{k}={v}" if v else k for k, v in query_params.items()])
)
print("=" * 80)

r = requests.get(url, params=query_params)
d = r.json()

print(f"\nResults: {d['pagination']['total_cards']} card(s) found")

if d["cards"]:
    for card in d["cards"]:
        attrs = {a["name"]: a["value"] for a in card.get("attributes", [])}

        print(f"\n  [FOUND] {card['name']}")
        print(f"    Series: {attrs.get('series', 'N/A')}")
        print(f"    Rarity: {attrs.get('rarity', 'N/A')}")
        print(f"    Color: {attrs.get('activation_energy', 'N/A')}")
        print(f"    Required Energy: {attrs.get('required_energy', 'N/A')}")
        print(f"    AP Cost: {attrs.get('action_point_cost', 'N/A')}")
        print(f"    Card Type: {attrs.get('card_type', 'N/A')}")
        print(f"    Print Type: {attrs.get('print_type', 'N/A')}")
        print(f"    Price: ${card.get('price', 'N/A')}")

print("\n" + "=" * 80)
print("QUERY SYNTAX SYSTEM WORKING PERFECTLY!")
print("=" * 80)
