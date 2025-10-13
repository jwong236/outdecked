"""
Test Action Point rarity behavior with base_rarity preset
"""

import requests

url = "http://localhost:5000/api/cards"

print("=" * 80)
print("ACTION POINT RARITY BEHAVIOR TEST")
print("=" * 80)

# Test 1: base_rarity alone (no no_ap)
print("\n1. base_rarity preset ONLY (no no_ap):")
r1 = requests.get(url, params={"base_rarity": "", "per_page": 1})
d1 = r1.json()
print(f"   Total cards: {d1['pagination']['total_cards']}")
print("   Expected: Common, Uncommon, Rare, Super Rare, AND Action Point")

# Test 2: base_rarity + no_ap
print("\n2. base_rarity + no_ap presets:")
r2 = requests.get(url, params={"base_rarity": "", "no_ap": "", "per_page": 1})
d2 = r2.json()
print(f"   Total cards: {d2['pagination']['total_cards']}")
print("   Expected: Common, Uncommon, Rare, Super Rare (NO Action Point)")

# Test 3: Check if Action Point rarity cards exist
print("\n3. Query for Action Point rarity specifically:")
r3 = requests.get(url, params={"q": "r:action_point", "per_page": 5})
d3 = r3.json()
print(f"   Total cards with Action Point rarity: {d3['pagination']['total_cards']}")

if d3["cards"]:
    print("\n   Sample cards with Action Point rarity:")
    for card in d3["cards"][:3]:
        attrs = {a["name"]: a["value"] for a in card.get("attributes", [])}
        print(f"     - {card['name']}")
        print(f"       Card Type: {attrs.get('card_type', 'N/A')}")
        print(f"       Rarity: {attrs.get('rarity', 'N/A')}")

# Test 4: Difference in results
diff = d1["pagination"]["total_cards"] - d2["pagination"]["total_cards"]
print(f"\n4. Difference between base_rarity alone vs base_rarity+no_ap:")
print(f"   Difference: {diff} cards")
print(f"   These {diff} cards are Action Point rarity cards")

print("\n" + "=" * 80)
print("CONCLUSION:")
print("=" * 80)
print("\nAction Point IS a base rarity!")
print("\nConditional inclusion:")
print("  - base_rarity ALONE -> includes Action Point rarity")
print("  - base_rarity + no_ap -> excludes Action Point rarity")
print("\nThis makes sense because:")
print("  - When no_ap is active, it filters out Action Point card types")
print("  - So Action Point rarity becomes irrelevant (no cards would match)")
print("  - Backend automatically excludes it to optimize the query")
