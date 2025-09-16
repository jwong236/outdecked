import requests
import json

# Test different search scenarios to debug the issue
url = 'http://localhost:5000/api/search'

print("=== Testing Base Print Only (no other filters) ===")
params_base_only = {
    'game': 'Union Arena',
    'and_filters': json.dumps([{'type': 'and', 'field': 'PrintType', 'value': 'Base', 'displayText': 'PrintType: Base'}]),
    'per_page': 5
}

try:
    response = requests.get(url, params=params_base_only)
    if response.status_code == 200:
        data = response.json()
        print(f'Base Print Only - Total cards found: {data.get("total", 0)}')
        print(f'Cards returned: {len(data.get("cards", []))}')
        
        for card in data.get('cards', [])[:3]:
            print(f'  {card["name"]} - Print Type: {card.get("print_type", "Unknown")}')
    else:
        print(f'Error: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Error: {e}')

print("\n=== Testing with default filters (Base + NOT Base Rarity + NOT Action Point) ===")
params_default = {
    'game': 'Union Arena',
    'and_filters': json.dumps([{'type': 'and', 'field': 'PrintType', 'value': 'Base', 'displayText': 'PrintType: Base'}]),
    'not_filters': json.dumps([
        {'type': 'not', 'field': 'CardType', 'value': 'Action Point', 'displayText': 'CardType: Action Point'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Common 1-Star', 'displayText': 'Rarity: Common 1-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Rare 1-Star', 'displayText': 'Rarity: Rare 1-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Rare 2-Star', 'displayText': 'Rarity: Rare 2-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Super Rare 1-Star', 'displayText': 'Rarity: Super Rare 1-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Super Rare 2-Star', 'displayText': 'Rarity: Super Rare 2-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Super Rare 3-Star', 'displayText': 'Rarity: Super Rare 3-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Uncommon 1-Star', 'displayText': 'Rarity: Uncommon 1-Star'},
        {'type': 'not', 'field': 'Rarity', 'value': 'Union Rare', 'displayText': 'Rarity: Union Rare'}
    ]),
    'per_page': 5
}

try:
    response = requests.get(url, params=params_default)
    if response.status_code == 200:
        data = response.json()
        print(f'Default filters - Total cards found: {data.get("total", 0)}')
        print(f'Cards returned: {len(data.get("cards", []))}')
        
        for card in data.get('cards', [])[:3]:
            print(f'  {card["name"]} - Print Type: {card.get("print_type", "Unknown")}, Rarity: {card.get("Rarity", "Unknown")}')
    else:
        print(f'Error: {response.status_code} - {response.text}')
except Exception as e:
    print(f'Error: {e}')

print("\n=== Testing Base cards with their actual rarities ===")
# Let's check what rarities Base cards actually have
import sqlite3
conn = sqlite3.connect('cards.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT c.name, c.print_type, ca.value as rarity
    FROM cards c 
    LEFT JOIN card_attributes ca ON c.id = ca.card_id AND ca.name = 'Rarity'
    WHERE c.print_type = 'Base' 
    LIMIT 10
""")

base_cards = cursor.fetchall()
print("Sample Base cards and their rarities:")
for card in base_cards:
    print(f'  {card[0]} - Print Type: {card[1]}, Rarity: {card[2]}')

# Check what rarities exist for Base cards
cursor.execute("""
    SELECT ca.value as rarity, COUNT(*) as count
    FROM cards c 
    LEFT JOIN card_attributes ca ON c.id = ca.card_id AND ca.name = 'Rarity'
    WHERE c.print_type = 'Base' AND ca.value IS NOT NULL
    GROUP BY ca.value
    ORDER BY count DESC
""")

rarity_stats = cursor.fetchall()
print("\nRarity distribution for Base cards:")
for rarity, count in rarity_stats:
    print(f'  {rarity}: {count} cards')

conn.close()
