"""
Search functionality for OutDecked
Handles all search, filtering, and pagination logic.
"""

from flask import request, jsonify
from database import get_db_connection
from models import METADATA_FIELDS_EXACT
import json

# Field name mapping from frontend to TCGCSV database names
FIELD_NAME_MAPPING = {
    "series": "SeriesName",  # TCGCSV attribute from extendedData
    "color": "ActivationEnergy",  # TCGCSV attribute
    "rarity": "Rarity",  # TCGCSV attribute
    "card_type": "CardType",  # TCGCSV attribute
    "required_energy": "RequiredEnergy",  # TCGCSV attribute
    "trigger": "Trigger",  # TCGCSV attribute
}


def map_field_name(frontend_field):
    """Map frontend field name to database field name"""
    return FIELD_NAME_MAPPING.get(frontend_field, frontend_field)


def is_direct_card_field(field):
    """Check if field is a direct card table column"""
    return field in ["name", "clean_name", "game"]


def handle_api_search():
    """Handle the /api/search route with complex filtering and pagination logic."""
    query = request.args.get("q", "").strip()
    game_filter = request.args.get("game", "")
    anime_filter = request.args.get("anime", "")
    color_filter = request.args.get("color", "")
    sort_by = request.args.get("sort", "")
    page = int(request.args.get("page", 1))
    per_page = int(
        request.args.get("per_page", 24)
    )  # 24 cards per page (good for grid layout)

    # Get filter parameters
    or_filters_json = request.args.get("or_filters", "")
    and_filters_json = request.args.get("and_filters", "")
    not_filters_json = request.args.get("not_filters", "")

    or_filters = []
    and_filters = []
    not_filters = []

    if or_filters_json:
        try:
            or_filters = json.loads(or_filters_json)
        except json.JSONDecodeError:
            pass

    if and_filters_json:
        try:
            and_filters = json.loads(and_filters_json)
        except json.JSONDecodeError:
            pass

    if not_filters_json:
        try:
            not_filters = json.loads(not_filters_json)
        except json.JSONDecodeError:
            pass

    # Calculate offset
    offset = (page - 1) * per_page

    conn = get_db_connection()

    # Build the base query
    base_query = "FROM cards c"
    where_conditions = []
    params = []

    if query:
        where_conditions.append("c.name LIKE ?")
        params.append(f"%{query}%")

    if game_filter:
        where_conditions.append("c.game = ?")
        params.append(game_filter)

    if anime_filter:
        where_conditions.append(
            "c.id IN (SELECT card_id FROM card_attributes WHERE name = 'SeriesName' AND LOWER(value) = LOWER(?))"
        )
        params.append(anime_filter)

    if color_filter:
        where_conditions.append(
            "c.id IN (SELECT card_id FROM card_attributes WHERE name = 'ActivationEnergy' AND LOWER(value) = LOWER(?))"
        )
        params.append(color_filter)

    # Handle OR filters (any one must match)
    if or_filters:
        or_conditions = []
        for filter_item in or_filters:
            field = filter_item.get("field")
            value = filter_item.get("value")
            if field and value:
                # Map frontend field name to database field name
                db_field = map_field_name(field)

                if is_direct_card_field(db_field):
                    # Direct card table column
                    or_conditions.append(f"LOWER(c.{db_field}) = LOWER(?)")
                    params.append(value)
                else:
                    # TCGCSV attribute
                    if (
                        db_field == "Trigger"
                        and value.startswith("[")
                        and value.endswith("]")
                    ):
                        # Special handling for trigger types - match cards that start with the trigger type
                        or_conditions.append(
                            f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND (LOWER(value) LIKE LOWER(?) OR LOWER(value) LIKE LOWER(?)))"
                        )
                        params.extend([db_field, f"{value}%", f"{value.upper()}%"])
                    elif db_field == "BattlePointBP" and (">" in value or "<" in value):
                        # Special handling for battle point ranges
                        if value.startswith(">"):
                            threshold = value.replace(">", "").strip()
                            or_conditions.append(
                                f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) > ?)"
                            )
                            params.extend([db_field, threshold])
                        elif value.startswith("<"):
                            threshold = value.replace("<", "").strip()
                            or_conditions.append(
                                f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) < ?)"
                            )
                            params.extend([db_field, threshold])
                    else:
                        or_conditions.append(
                            f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND LOWER(value) = LOWER(?))"
                        )
                        params.extend([db_field, value])

        if or_conditions:
            where_conditions.append(f"({' OR '.join(or_conditions)})")

    # Handle AND filters (all must match)
    for filter_item in and_filters:
        field = filter_item.get("field")
        value = filter_item.get("value")
        if field and value:
            # Map frontend field name to database field name
            db_field = map_field_name(field)

            if is_direct_card_field(db_field):
                # Direct card table column
                where_conditions.append(f"LOWER(c.{db_field}) = LOWER(?)")
                params.append(value)
            else:
                # TCGCSV attribute
                if (
                    db_field == "Trigger"
                    and value.startswith("[")
                    and value.endswith("]")
                ):
                    # Special handling for trigger types - match cards that start with the trigger type
                    where_conditions.append(
                        f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND (LOWER(value) LIKE LOWER(?) OR LOWER(value) LIKE LOWER(?)))"
                    )
                    params.extend([db_field, f"{value}%", f"{value.upper()}%"])
                elif db_field == "BattlePointBP" and (">" in value or "<" in value):
                    # Special handling for battle point ranges
                    if value.startswith(">"):
                        threshold = value.replace(">", "").strip()
                        where_conditions.append(
                            f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) > ?)"
                        )
                        params.extend([db_field, threshold])
                    elif value.startswith("<"):
                        threshold = value.replace("<", "").strip()
                        where_conditions.append(
                            f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) < ?)"
                        )
                        params.extend([db_field, threshold])
                else:
                    where_conditions.append(
                        f"c.id IN (SELECT card_id FROM card_attributes WHERE name = ? AND LOWER(value) = LOWER(?))"
                    )
                    params.extend([db_field, value])

    # Handle NOT filters (must NOT match)
    for filter_item in not_filters:
        field = filter_item.get("field")
        value = filter_item.get("value")
        if field and value:
            # Map frontend field name to database field name
            db_field = map_field_name(field)

            if is_direct_card_field(db_field):
                # Direct card table column
                where_conditions.append(f"LOWER(c.{db_field}) != LOWER(?)")
                params.append(value)
            else:
                # TCGCSV attribute
                if (
                    db_field == "Trigger"
                    and value.startswith("[")
                    and value.endswith("]")
                ):
                    # Special handling for trigger types - exclude cards that start with the trigger type
                    where_conditions.append(
                        f"c.id NOT IN (SELECT card_id FROM card_attributes WHERE name = ? AND (LOWER(value) LIKE LOWER(?) OR LOWER(value) LIKE LOWER(?)))"
                    )
                    params.extend([db_field, f"{value}%", f"{value.upper()}%"])
                elif db_field == "BattlePointBP" and (">" in value or "<" in value):
                    # Special handling for battle point ranges
                    if value.startswith(">"):
                        threshold = value.replace(">", "").strip()
                        where_conditions.append(
                            f"c.id NOT IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) > ?)"
                        )
                        params.extend([db_field, threshold])
                    elif value.startswith("<"):
                        threshold = value.replace("<", "").strip()
                        where_conditions.append(
                            f"c.id NOT IN (SELECT card_id FROM card_attributes WHERE name = ? AND CAST(value AS INTEGER) < ?)"
                        )
                        params.extend([db_field, threshold])
                else:
                    where_conditions.append(
                        f"c.id NOT IN (SELECT card_id FROM card_attributes WHERE name = ? AND LOWER(value) = LOWER(?))"
                    )
                    params.extend([db_field, value])

    if where_conditions:
        where_clause = " WHERE " + " AND ".join(where_conditions)
    else:
        where_clause = ""

    # Build ORDER BY clause
    order_clause = "ORDER BY c.name"  # Default
    if sort_by:
        if sort_by == "price_desc":
            order_clause = "ORDER BY cp.market_price DESC"
        elif sort_by == "price_asc":
            order_clause = "ORDER BY cp.market_price ASC"
        elif sort_by == "rarity_desc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common 1-Star' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon 1-Star' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare 1-Star' THEN 6
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare' THEN 7
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 1-Star' THEN 8
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 2-Star' THEN 9
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 3-Star' THEN 10
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Union Rare' THEN 11
                ELSE 12
            END DESC"""
        elif sort_by == "rarity_asc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common 1-Star' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon 1-Star' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare 1-Star' THEN 6
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare' THEN 7
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 1-Star' THEN 8
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 2-Star' THEN 9
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare 3-Star' THEN 10
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Union Rare' THEN 11
                ELSE 12
            END ASC"""
        elif sort_by == "number_desc":
            order_clause = "ORDER BY CAST(SUBSTR((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Number'), -3) AS INTEGER) DESC"
        elif sort_by == "number_asc":
            order_clause = "ORDER BY CAST(SUBSTR((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Number'), -3) AS INTEGER) ASC"
        elif sort_by == "required_energy_desc":
            order_clause = "ORDER BY CAST((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'RequiredEnergy') AS INTEGER) DESC"
        elif sort_by == "required_energy_asc":
            order_clause = "ORDER BY CAST((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'RequiredEnergy') AS INTEGER) ASC"

    # Get total count - need to match the main query structure with JOINs
    count_query = f"SELECT COUNT(DISTINCT c.id) as total {base_query} LEFT JOIN card_attributes cm ON c.id = cm.card_id LEFT JOIN card_prices cp ON c.id = cp.card_id {where_clause}"
    total_cards = conn.execute(count_query, params).fetchone()["total"]

    # Get paginated results with metadata and prices (TCGCSV-aligned)
    search_query = (
        f"SELECT c.*, GROUP_CONCAT(cm.name || ':' || cm.value, '|||') as metadata, "
        f"cp.market_price as price {base_query} "
        f"LEFT JOIN card_attributes cm ON c.id = cm.card_id "
        f"LEFT JOIN card_prices cp ON c.id = cp.card_id "
        f"{where_clause} "
        f"GROUP BY c.id {order_clause} LIMIT ? OFFSET ?"
    )
    search_params = params + [per_page, offset]

    cursor = conn.execute(search_query, search_params)
    raw_cards = [dict(row) for row in cursor.fetchall()]

    # Process cards to include metadata as individual fields
    cards = []
    for card in raw_cards:
        # Start with basic card data
        processed_card = {
            "id": card["id"],
            "name": card["name"],
            "image_url": card["image_url"],
            "card_url": card["card_url"],
            "game": card["game"],
            "price": card.get("price", ""),  # Add price from card_prices table
        }

        # Parse metadata string and add as individual fields
        if card["metadata"]:
            metadata_pairs = card["metadata"].split("|||")
            for pair in metadata_pairs:
                if ":" in pair:
                    name, field_value = pair.split(":", 1)
                    processed_card[name] = field_value

        cards.append(processed_card)

    conn.close()

    # Calculate pagination info
    total_pages = (total_cards + per_page - 1) // per_page  # Ceiling division
    has_prev = page > 1
    has_next = page < total_pages

    return jsonify(
        {
            "cards": cards,
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_cards": total_cards,
                "total_pages": total_pages,
                "has_prev": has_prev,
                "has_next": has_next,
                "prev_page": page - 1 if has_prev else None,
                "next_page": page + 1 if has_next else None,
            },
        }
    )


def handle_filter_fields():
    """Get all available filter fields (excluding Description)"""
    conn = get_db_connection()

    # Get unique field names from card_attributes table, excluding Description
    query = """
        SELECT DISTINCT name, display_name 
        FROM card_attributes 
        WHERE name != 'Description' 
        ORDER BY display_name
    """
    fields = conn.execute(query).fetchall()
    conn.close()

    # Return field names with display names
    return jsonify(
        [
            {"name": field["name"], "display": field["display_name"] or field["name"]}
            for field in fields
        ]
    )


def handle_filter_values(field):
    """Get all unique values for a specific filter field"""
    conn = get_db_connection()

    # Get distinct values for the field from card_attributes table, excluding NULL and empty values
    query = "SELECT DISTINCT value FROM card_attributes WHERE name = ? AND value IS NOT NULL AND value != '' ORDER BY value"
    values = conn.execute(query, (field,)).fetchall()
    conn.close()

    # Extract the values from the result tuples
    raw_values = [row[0] for row in values]

    # Special handling for Affinities - split on " / " to get individual affinities
    if field == "Affinities":
        individual_affinities = set()
        for value in raw_values:
            # Split on " / " and add each individual affinity
            affinities = [affinity.strip() for affinity in value.split(" / ")]
            individual_affinities.update(affinities)
        return jsonify(sorted(list(individual_affinities)))

    # Special handling for Trigger field - extract just the trigger type
    elif field == "Trigger":
        trigger_types = set()
        for value in raw_values:
            # Extract trigger type from [Type] format
            if value.startswith("[") and "]" in value:
                trigger_type = value.split("]")[0] + "]"
                # Normalize FINAL to Final (TCGCSV has inconsistent casing)
                if trigger_type.upper() == "[FINAL]":
                    trigger_type = "[Final]"
                trigger_types.add(trigger_type)
        return jsonify(sorted(list(trigger_types)))

    # Special handling for Rarity field - custom ordering
    elif field == "Rarity":
        # Define rarity order (least rare to most rare)
        rarity_order = {
            "Action Point": 0,
            "Common": 1,
            "Uncommon": 2,
            "Rare": 3,
            "Super Rare": 4,
            "Union Rare": 5,
        }

        def get_rarity_rank(rarity):
            # Handle star variations
            base_rarity = rarity
            stars = 0

            if "1-Star" in rarity:
                stars = 1
                base_rarity = rarity.replace(" 1-Star", "")
            elif "2-Star" in rarity:
                stars = 2
                base_rarity = rarity.replace(" 2-Star", "")
            elif "3-Star" in rarity:
                stars = 3
                base_rarity = rarity.replace(" 3-Star", "")

            # Get base rank
            base_rank = rarity_order.get(base_rarity, 999)

            # Add star bonus (more stars = higher rank)
            return base_rank + (stars * 0.1)

        # Sort by rarity rank
        sorted_rarities = sorted(raw_values, key=get_rarity_rank)
        return jsonify(sorted_rarities)

    # Special handling for BattlePointBP field - create ranges
    elif field == "BattlePointBP":
        # Create predefined ranges for battle points
        ranges = [
            "< 1000",
            "> 1000",
            "< 2000",
            "> 2000",
            "< 3000",
            "> 3000",
            "< 4000",
            "> 4000",
            "< 5000",
            "> 5000",
            "< 10000",
            "> 10000",
        ]
        return jsonify(ranges)

    # Special handling for numeric fields - sort as integers
    elif field in [
        "RequiredEnergy",
        "ActionPointCost",
        "GeneratedEnergy",
    ]:
        try:
            # Convert to integers and sort, then convert back to strings
            numeric_values = []
            for value in raw_values:
                try:
                    numeric_values.append(int(value))
                except ValueError:
                    # If conversion fails, keep as string and add to end
                    numeric_values.append(float("inf"))

            # Sort numerically
            sorted_numeric = sorted(numeric_values)

            # Convert back to strings, handling the infinity case
            result = []
            for val in sorted_numeric:
                if val == float("inf"):
                    continue  # Skip invalid numeric values
                result.append(str(val))

            return jsonify(result)
        except:
            # If anything fails, fall back to string sorting
            return jsonify(raw_values)

    return jsonify(raw_values)
