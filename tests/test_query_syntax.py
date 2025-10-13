import requests

url = 'http://localhost:5000/api/cards'

print("="*80)
print("COMPREHENSIVE QUERY SYNTAX TESTS")
print("="*80)

# Test 1: Name search
print("\n1. Name search (q=rapi):")
r = requests.get(url, params={'q': 'rapi', 'per_page': 3})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    for card in d['cards'][:3]:
        print(f"   - {card['name']}")

# Test 2: Series filter
print("\n2. Series filter (q=s:goddess_of_victory):")
r = requests.get(url, params={'q': 's:goddess_of_victory', 'per_page': 3})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    attrs = {a['name']: a['value'] for a in d['cards'][0].get('attributes', [])}
    print(f"   First card: {d['cards'][0]['name']} (Series: {attrs.get('series', 'N/A')})")

# Test 3: Color filter
print("\n3. Color filter (q=c:yellow):")
r = requests.get(url, params={'q': 'c:yellow', 'per_page': 3})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    attrs = {a['name']: a['value'] for a in d['cards'][0].get('attributes', [])}
    print(f"   First card: {d['cards'][0]['name']} (Color: {attrs.get('activation_energy', 'N/A')})")

# Test 4: Multiple OR (comma)
print("\n4. Multiple colors OR (q=c:yellow,blue):")
r = requests.get(url, params={'q': 'c:yellow,blue', 'per_page': 3})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")

# Test 5: Multiple AND (space)
print("\n5. Multiple filters AND (q=s:goddess_of_victory r:common c:yellow):")
r = requests.get(url, params={'q': 's:goddess_of_victory r:common c:yellow', 'per_page': 5})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    for card in d['cards']:
        attrs = {a['name']: a['value'] for a in card.get('attributes', [])}
        print(f"   - {card['name']}")
        print(f"     Series: {attrs.get('series', 'N/A')}, Rarity: {attrs.get('rarity', 'N/A')}, Color: {attrs.get('activation_energy', 'N/A')}")

# Test 6: Name + filters
print("\n6. Name + filters (q=rapi r:common c:yellow):")
r = requests.get(url, params={'q': 'rapi r:common c:yellow', 'per_page': 5})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    for card in d['cards']:
        attrs = {a['name']: a['value'] for a in card.get('attributes', [])}
        print(f"   - {card['name']} (Rarity: {attrs.get('rarity', 'N/A')}, Color: {attrs.get('activation_energy', 'N/A')})")

# Test 7: NOT filter
print("\n7. NOT filter (q=-ct:action_point):")
r = requests.get(url, params={'q': '-ct:action_point', 'per_page': 3})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards (excluding Action Point card type)")

# Test 8: Preset override
print("\n8. Preset override (basic_prints&base_rarity&q=r:super_rare):")
r = requests.get(url, params={
    'basic_prints': '',
    'base_rarity': '',
    'q': 'r:super_rare',
    'per_page': 5
})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
print(f"   (Should only show Super Rare, base_rarity preset ignored)")
if d['cards']:
    attrs = {a['name']: a['value'] for a in d['cards'][0].get('attributes', [])}
    print(f"   First card rarity: {attrs.get('rarity', 'N/A')}")

# Test 9: Complex query
print("\n9. Complex query (q=r:common,uncommon c:yellow en:2 ap:1):")
r = requests.get(url, params={'q': 'r:common,uncommon c:yellow en:2 ap:1', 'per_page': 5})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")

# Test 10: Energy and AP filters
print("\n10. Numeric filters (q=en:3 ap:1):")
r = requests.get(url, params={'q': 'en:3 ap:1', 'per_page': 5})
d = r.json()
print(f"   Found: {d['pagination']['total_cards']} cards")
if d['cards']:
    card = d['cards'][0]
    attrs = {a['name']: a['value'] for a in card.get('attributes', [])}
    print(f"   First card: {card['name']}")
    print(f"   Required Energy: {attrs.get('required_energy', 'N/A')}")
    print(f"   AP Cost: {attrs.get('action_point_cost', 'N/A')}")

print("\n" + "="*80)
print("ALL TESTS COMPLETE!")
print("="*80)

