"""
Database operations for OutDecked card management system.
Aligned with TCGCSV architecture for better data structure.
"""

import sqlite3
import os
import requests


def init_db():
    """Initialize the database with TCGCSV-aligned schema."""
    conn = sqlite3.connect("cards.db")
    cursor = conn.cursor()

    # Main cards table - matches TCGCSV product structure exactly
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            clean_name TEXT,
            image_url TEXT,
            card_url TEXT,
            game TEXT NOT NULL,
            category_id INTEGER,
            group_id INTEGER,
            group_name TEXT,
            image_count INTEGER,
            is_presale BOOLEAN DEFAULT FALSE,
            released_on TEXT,
            presale_note TEXT,
            modified_on TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Card attributes table - matches TCGCSV extendedData structure exactly
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_attributes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards (id),
            UNIQUE(card_id, name)
        )
        """
    )

    # Price data table - matches TCGCSV price structure
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            market_price REAL,
            low_price REAL,
            mid_price REAL,
            high_price REAL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards (id),
            UNIQUE(card_id)
        )
        """
    )

    # Categories table - matches TCGCSV categories
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            display_name TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Groups table - matches TCGCSV groups
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER UNIQUE NOT NULL,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories (category_id)
        )
        """
    )

    # Attributes fields table to track available fields per game
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS attributes_fields (
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

    conn.commit()
    conn.close()


def get_db_connection():
    """Get a database connection, initializing the database if it doesn't exist."""
    if not os.path.exists("cards.db"):
        print("Database file not found, initializing new database...")
        init_db()

    conn = sqlite3.connect("cards.db")
    conn.row_factory = sqlite3.Row
    return conn


def populate_categories_and_groups():
    """Populate categories and groups tables from TCGCSV"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Fetch categories from TCGCSV
        response = requests.get("https://tcgcsv.com/tcgplayer/categories")
        if response.status_code == 200:
            data = response.json()
            categories = data.get("results", [])

            for category in categories:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO categories (category_id, name, display_name, description)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        category["categoryId"],
                        category["name"],
                        category.get("displayName", ""),
                        category.get("categoryDescription", ""),
                    ),
                )

            print(f"✅ Populated {len(categories)} categories")

        # Fetch Union Arena groups
        response = requests.get("https://tcgcsv.com/tcgplayer/81/groups")
        if response.status_code == 200:
            data = response.json()
            groups = data.get("results", [])

            for group in groups:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO groups (group_id, category_id, name)
                    VALUES (?, ?, ?)
                    """,
                    (group["groupId"], 81, group["name"]),
                )

            print(f"✅ Populated {len(groups)} Union Arena groups")

        conn.commit()

    except Exception as e:
        print(f"❌ Error populating categories and groups: {e}")
        conn.rollback()
    finally:
        conn.close()


def save_cards_to_db(cards):
    """Save scraped cards to database with TCGCSV-aligned structure."""
    conn = get_db_connection()
    cursor = conn.cursor()

    saved_count = 0
    failed_cards = []
    updated_count = 0
    inserted_count = 0

    try:
        for card in cards:
            if card["name"] and card.get("product_id"):
                try:
                    # Check if card already exists by product_id
                    cursor.execute(
                        "SELECT id FROM cards WHERE product_id = ?",
                        (card["product_id"],),
                    )
                    existing = cursor.fetchone()

                    if existing:
                        card_id = existing[0]
                        # Update existing card with TCGCSV fields
                        cursor.execute(
                            """
                            UPDATE cards SET name = ?, clean_name = ?, image_url = ?, card_url = ?, 
                                           group_id = ?, group_name = ?, image_count = ?, 
                                           is_presale = ?, released_on = ?, presale_note = ?, modified_on = ?
                            WHERE product_id = ?
                            """,
                            (
                                card["name"],
                                card.get("clean_name", ""),
                                card.get("image_url", ""),
                                card.get("card_url", ""),
                                card.get("group_id"),
                                card.get("series", ""),
                                card.get("image_count", 0),
                                card.get("is_presale", False),
                                card.get("released_on", ""),
                                card.get("presale_note", ""),
                                card.get("modified_on", ""),
                                card["product_id"],
                            ),
                        )
                        updated_count += 1
                    else:
                        # Insert new card with TCGCSV fields
                        cursor.execute(
                            """
                            INSERT INTO cards (product_id, name, clean_name, image_url, card_url, game, 
                                             category_id, group_id, group_name, image_count, 
                                             is_presale, released_on, presale_note, modified_on)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                card["product_id"],
                                card["name"],
                                card.get("clean_name", ""),
                                card.get("image_url", ""),
                                card.get("card_url", ""),
                                card["game"],
                                card.get("category_id", 81),
                                card.get("group_id"),
                                card.get("series", ""),
                                card.get("image_count", 0),
                                card.get("is_presale", False),
                                card.get("released_on", ""),
                                card.get("presale_note", ""),
                                card.get("modified_on", ""),
                            ),
                        )
                        card_id = cursor.lastrowid
                        inserted_count += 1

                    # Save price data
                    if any(
                        card.get(field)
                        for field in ["price", "low_price", "mid_price", "high_price"]
                    ):
                        cursor.execute(
                            """
                            INSERT OR REPLACE INTO card_prices 
                            (card_id, market_price, low_price, mid_price, high_price)
                            VALUES (?, ?, ?, ?, ?)
                            """,
                            (
                                card_id,
                                card.get("price"),
                                card.get("low_price"),
                                card.get("mid_price"),
                                card.get("high_price"),
                            ),
                        )

                    # Save attributes using TCGCSV structure
                    attributes_saved = save_card_attributes_tcgcsv(
                        cursor, card_id, card
                    )
                    saved_count += 1

                except Exception as e:
                    print(f"ERROR: Failed to save card {card['name']}: {e}")
                    failed_cards.append(card["name"])

        conn.commit()
        print(
            f"DB COMMIT: Committed {saved_count} cards to database ({inserted_count} new, {updated_count} updated)"
        )

        if failed_cards:
            print(f"WARNING: Failed to save {len(failed_cards)} cards: {failed_cards}")

    except Exception as e:
        print(f"ERROR: Database transaction failed: {e}")
        conn.rollback()
        raise e
    finally:
        conn.close()

    return saved_count, failed_cards


def save_card_attributes_tcgcsv(cursor, card_id, card_data):
    """Save card attributes using TCGCSV structure (name, display_name, value)"""
    attributes_count = 0

    # Define TCGCSV field mappings
    tcgcsv_mappings = {
        "rarity": {"name": "Rarity", "display_name": "Rarity"},
        "card_number": {"name": "Number", "display_name": "Number"},
        "card_text": {"name": "Description", "display_name": "Description"},
        "series": {"name": "SeriesName", "display_name": "Series Name"},
        "card_type": {"name": "CardType", "display_name": "Card Type"},
        "activation_energy": {
            "name": "ActivationEnergy",
            "display_name": "Activation Energy",
        },
        "required_energy": {
            "name": "RequiredEnergy",
            "display_name": "Required Energy",
        },
        "action_point_cost": {
            "name": "ActionPointCost",
            "display_name": "Action Point Cost",
        },
        "battle_point": {"name": "BattlePointBP", "display_name": "Battle Point (BP)"},
        "generated_energy": {
            "name": "GeneratedEnergy",
            "display_name": "Generated Energy",
        },
        "affinities": {"name": "Affinities", "display_name": "Affinities"},
        "trigger": {"name": "Trigger", "display_name": "Trigger"},
    }

    # Skip basic fields and price fields
    skip_fields = [
        "name",
        "clean_name",
        "image_url",
        "card_url",
        "game",
        "product_id",
        "group_id",
        "category_id",
        "image_count",
        "is_presale",
        "released_on",
        "presale_note",
        "modified_on",
        "price",
        "low_price",
        "mid_price",
        "high_price",
    ]

    for field_name, field_value in card_data.items():
        if field_name in skip_fields:
            continue

        if field_value and str(field_value).strip():
            # Get TCGCSV mapping or use field name as fallback
            mapping = tcgcsv_mappings.get(
                field_name,
                {
                    "name": field_name.upper(),
                    "display_name": field_name.replace("_", " ").title(),
                },
            )

            # Insert or update attributes using TCGCSV structure
            cursor.execute(
                """
                INSERT OR REPLACE INTO card_attributes (card_id, name, display_name, value)
                VALUES (?, ?, ?, ?)
                """,
                (
                    card_id,
                    mapping["name"],
                    mapping["display_name"],
                    str(field_value).strip(),
                ),
            )
            attributes_count += 1

    return attributes_count


def save_card_attributes(cursor, card_id, game, card_data):
    """Save card attributes to the dynamic attributes table."""
    from models import METADATA_FIELDS_EXACT

    # Define field mappings for display names
    field_display_names = {
        "rarity": "Rarity",
        "card_number": "Number",
        "series": "Series Name",
        "card_type": "Card Type",
        "activation_energy": "Activation Energy",
        "required_energy": "Required Energy",
        "action_point_cost": "Action Point Cost",
        "trigger": "Trigger",
        "energy": "Energy",
        "cost": "Cost",
        "color": "Color",
        "card_text": "Card Text",
        "description": "Description",
        "language": "Language",
    }

    attributes_count = 0
    for field_name, field_value in card_data.items():
        # Skip basic fields and price fields
        if field_name in [
            "name",
            "image_url",
            "card_url",
            "game",
            "product_id",
            "group_id",
            "category_id",
            "series",
            "price",
            "low_price",
            "mid_price",
            "high_price",
        ]:
            continue

        if field_value and str(field_value).strip():
            # Standardize case for certain fields
            standardized_value = str(field_value).strip()
            if field_name in METADATA_FIELDS_EXACT:
                standardized_value = standardized_value.title()

            # Insert or update attributes
            cursor.execute(
                """
                INSERT OR REPLACE INTO card_attributes (card_id, field_name, field_value)
                VALUES (?, ?, ?)
                """,
                (card_id, field_name, standardized_value),
            )
            attributes_count += 1

            # Register field for this game if not already registered
            display_name = field_display_names.get(
                field_name, field_name.replace("_", " ").title()
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO attributes_fields (game, field_name, field_display_name)
                VALUES (?, ?, ?)
                """,
                (game, field_name, display_name),
            )

    return attributes_count


def get_cards_with_attributes(game=None, group_id=None, limit=None):
    """Get cards with their attributes in a structured format."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Build query
    query = """
    SELECT c.*, g.name as group_name, cat.name as category_name
    FROM cards c
    LEFT JOIN groups g ON c.group_id = g.group_id
    LEFT JOIN categories cat ON c.category_id = cat.category_id
    WHERE 1=1
    """
    params = []

    if game:
        query += " AND c.game = ?"
        params.append(game)

    if group_id:
        query += " AND c.group_id = ?"
        params.append(group_id)

    query += " ORDER BY c.name"

    if limit:
        query += " LIMIT ?"
        params.append(limit)

    cursor.execute(query, params)
    cards = cursor.fetchall()

    # Get attributes for each card
    for card in cards:
        cursor.execute(
            "SELECT field_name, field_value FROM card_attributes WHERE card_id = ?",
            (card["id"],),
        )
        attributes = cursor.fetchall()
        card["attributes"] = {
            attr["field_name"]: attr["field_value"] for attr in attributes
        }

        # Get price data
        cursor.execute("SELECT * FROM card_prices WHERE card_id = ?", (card["id"],))
        price_data = cursor.fetchone()
        if price_data:
            card["prices"] = dict(price_data)

    conn.close()
    return cards
