"""
Test what users see when first entering the search page
Default presets: basic_prints, base_rarity, no_ap
"""

import requests

url = "http://localhost:5000/api/cards"

print("=" * 80)
print("DEFAULT SEARCH PAGE - First Visit")
print("=" * 80)

# Simulating user visiting /search with default presets
params = {
    "basic_prints": "",  # Base OR Starter Deck
    "base_rarity": "",  # Common, Uncommon, Rare, Super Rare
    "no_ap": "",  # NOT Action Point
    "per_page": 24,
}

r = requests.get(url, params=params)
d = r.json()

print(f"\nTotal cards displayed: {d['pagination']['total_cards']}")
print(f"Total pages (24 per page): {d['pagination']['total_pages']}")
print(f"\nURL: {url}?basic_prints&base_rarity&no_ap")

print("\n" + "=" * 80)
print("BREAKDOWN:")
print("=" * 80)

# Show what each preset does
print("\nPreset filters applied:")
print("  1. basic_prints -> Print Type: Base OR Starter Deck")
print("  2. base_rarity  -> Rarity: Common, Uncommon, Rare, Super Rare")
print("  3. no_ap        -> NOT Card Type: Action Point")

print(
    f"\nThis filters from 3,539 total cards down to {d['pagination']['total_cards']} cards"
)

# Show sample of first few cards
if d["cards"]:
    print(f"\nFirst 5 cards on page 1:")
    for i, card in enumerate(d["cards"][:5], 1):
        attrs = {a["name"]: a["value"] for a in card.get("attributes", [])}
        print(f"  {i}. {card['name']}")
        print(
            f"     Rarity: {attrs.get('rarity', 'N/A')}, Print: {attrs.get('print_type', 'N/A')}"
        )
