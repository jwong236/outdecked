"""
Database operations for OutDecked card management system.
"""

import sqlite3
import os


def init_db():
    """Initialize the database with all required tables."""
    conn = sqlite3.connect("cards.db")
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_url TEXT NOT NULL,
            card_url TEXT NOT NULL,
            game TEXT NOT NULL,
            rarity TEXT,
            card_number TEXT,
            series TEXT,
            card_type TEXT,
            color TEXT,
            cost_1 TEXT,
            cost_2 TEXT,
            special_ability TEXT,
            language TEXT,
            price TEXT,
            high_res_image TEXT,
            card_text TEXT,
            battle_points TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    # Add table to track max pages found for each game
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS game_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_name TEXT UNIQUE NOT NULL,
            max_pages_found INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create metadata table for dynamic fields
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards (id),
            UNIQUE(card_id, field_name)
        )
        """
    )

    # Create metadata fields table to track available fields per game
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS metadata_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_display_name TEXT NOT NULL,
            field_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(game, field_name)
        )
        """
    )

    # Add metadata columns to existing cards table if they don't exist
    metadata_columns = [
        "rarity",
        "card_number",
        "series",
        "card_type",
        "color",  # Card color/theme
        "cost_1",  # Generic cost field 1 (e.g., activation energy, mana cost)
        "cost_2",  # Generic cost field 2 (e.g., required energy, action point cost)
        "special_ability",  # Generic special ability field (e.g., trigger, keyword)
        "language",
        "price",
        "high_res_image",
        "card_text",  # Store the actual card text/description
    ]

    for column in metadata_columns:
        try:
            cursor.execute(f"ALTER TABLE cards ADD COLUMN {column} TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()
    conn.close()


def get_db_connection():
    """Get a database connection, initializing the database if it doesn't exist."""
    # Check if database file exists, if not, initialize it
    if not os.path.exists("cards.db"):
        print("Database file not found, initializing new database...")
        init_db()

    conn = sqlite3.connect("cards.db")
    conn.row_factory = sqlite3.Row
    return conn


def get_max_pages_for_game(game_name):
    """Get the maximum pages found for a specific game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT max_pages_found FROM game_stats WHERE game_name = ?", (game_name,)
    )
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0


def update_max_pages_for_game(game_name, max_pages):
    """Update the maximum pages found for a specific game."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR REPLACE INTO game_stats (game_name, max_pages_found, last_updated)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    """,
        (game_name, max_pages),
    )
    conn.commit()
    conn.close()


def save_cards_to_db(cards):
    """Save scraped cards to database with duplicate prevention."""
    conn = get_db_connection()
    cursor = conn.cursor()

    for card in cards:
        if card["name"] and card["card_url"]:  # Only require name and card_url
            # Check if card already exists
            cursor.execute(
                "SELECT id FROM cards WHERE card_url = ?", (card["card_url"],)
            )
            existing = cursor.fetchone()

            if existing:
                card_id = existing[0]
                # Update existing card with fresh data
                cursor.execute(
                    "UPDATE cards SET name = ?, image_url = ?, game = ? WHERE card_url = ?",
                    (
                        card["name"],
                        card["image_url"] or "",
                        card["game"],
                        card["card_url"],
                    ),
                )
                print(f"Updated existing card: {card['name']}")
            else:
                # Insert new card
                cursor.execute(
                    """
                    INSERT INTO cards (name, image_url, card_url, game)
                    VALUES (?, ?, ?, ?)
                """,
                    (
                        card["name"],
                        card["image_url"] or "",
                        card["card_url"],
                        card["game"],
                    ),
                )
                card_id = cursor.lastrowid
                print(f"Added new card: {card['name']}")

            # Save all metadata to the dynamic metadata table
            save_card_metadata(cursor, card_id, card["game"], card)

    conn.commit()
    conn.close()


def save_card_metadata(cursor, card_id, game, card_data):
    """Save card metadata to the dynamic metadata table."""
    from models import METADATA_FIELDS_EXACT

    # Define field mappings for display names
    field_display_names = {
        "rarity": "Rarity",
        "card_number": "Number",
        "series": "Series Name",
        "card_type": "Card Type",
        "color": "Activation Energy",
        "cost_2": "Required Energy",
        "cost_1": "Action Point Cost",
        "battle_points": "Battle Point (BP)",
        "special_ability": "Trigger",
        "price": "Price",
        "card_text": "Card Text",
        "language": "Language",
        "high_res_image": "High Res Image",
        "affinities": "Affinities",
        "generated_energy": "Generated Energy",
    }

    for field_name, field_value in card_data.items():
        if field_name in ["name", "image_url", "card_url", "game"]:
            continue  # Skip basic fields

        if field_value and str(field_value).strip():
            # Standardize case for certain fields
            standardized_value = str(field_value).strip()
            if field_name in METADATA_FIELDS_EXACT:
                # Title case for these fields to avoid duplicates like "code geass" vs "CODE GEASS"
                standardized_value = standardized_value.title()

            # Insert or update metadata
            cursor.execute(
                """
                INSERT OR REPLACE INTO card_metadata (card_id, field_name, field_value)
                VALUES (?, ?, ?)
                """,
                (card_id, field_name, standardized_value),
            )

            # Register field for this game if not already registered
            display_name = field_display_names.get(
                field_name, field_name.replace("_", " ").title()
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO metadata_fields (game, field_name, field_display_name)
                VALUES (?, ?, ?)
                """,
                (game, field_name, display_name),
            )
