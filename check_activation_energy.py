import sqlite3

conn = sqlite3.connect('cards.db')
cursor = conn.cursor()

print('=== ACTIVATION ENERGY VALUES IN DATABASE ===')
cursor.execute('SELECT DISTINCT value FROM card_attributes WHERE name = "ActivationEnergy" ORDER BY value')
values = cursor.fetchall()
if values:
    for value in values:
        print(f'  "{value[0]}"')
else:
    print('  No ActivationEnergy values found')

print()
print('=== CHECKING ALL FIELDS FOR COLOR VALUES ===')
cursor.execute('''
    SELECT name, value, COUNT(*) as count
    FROM card_attributes 
    WHERE LOWER(value) IN ('red', 'blue', 'green', 'yellow', 'purple', 'black', 'white')
    GROUP BY name, value
    ORDER BY count DESC
''')
color_data = cursor.fetchall()
if color_data:
    for name, value, count in color_data:
        print(f'  {name}: "{value}" ({count} cards)')
else:
    print('  No color values found')

conn.close()
