#!/bin/bash

# Ensure we're in the right directory
cd /app

# Force database recreation for schema updates
echo "Forcing database recreation due to schema changes..."
if [ -f "cards.db" ]; then
    echo "Removing old database file..."
    rm -f cards.db
fi

# Create fresh database with new schema
echo "Creating fresh database with updated schema..."
python -c "
from scraper import TCGCSVScraper
scraper = TCGCSVScraper()
print('Starting Union Arena card scraping...')
cards = scraper.scrape_all_union_arena_cards()
print(f'Scraping completed! Total cards: {len(cards)}')
"

# Start the Flask application
exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 outdecked:app
