#!/bin/bash

# Ensure we're in the right directory
cd /app

# Check if database exists and has data
if [ ! -f "cards.db" ] || [ ! -s "cards.db" ]; then
    echo "No database found or database is empty. Starting scraping..."
    python -c "
from scraper import TCGCSVScraper
scraper = TCGCSVScraper()
print('Starting Union Arena card scraping...')
cards = scraper.scrape_all_union_arena_cards()
print(f'Scraping completed! Total cards: {len(cards)}')
"
else
    echo "Database exists with data. Skipping scraping."
    # Verify database has data
    python -c "
from database import get_db_connection
conn = get_db_connection()
cursor = conn.execute('SELECT COUNT(*) FROM cards')
count = cursor.fetchone()[0]
print(f'Database contains {count} cards')
conn.close()
"
fi

# Start the Flask application
exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 outdecked:app
