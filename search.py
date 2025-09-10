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
            order_clause = (
                "ORDER BY CAST(REPLACE(REPLACE("
                "(SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'price'), "
                "'$', ''), ',', '') AS REAL) DESC"
            )
        elif sort_by == "price_asc":
            order_clause = (
                "ORDER BY CAST(REPLACE(REPLACE("
                "(SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'price'), "
                "'$', ''), ',', '') AS REAL) ASC"
            )
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

    # Get total count
    count_query = f"SELECT COUNT(*) as total {base_query}{where_clause}"
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


def handle_filter_values(field):
    """Get all unique values for a specific filter field"""
    conn = get_db_connection()

    # Validate field name to prevent SQL injection
    allowed_fields = [
        "rarity",
        "series",
        "card_type",
        "color",
        "language",
        "cost_1",
        "cost_2",
        "special_ability",
        "affinities",
    ]
    if field not in allowed_fields:
        return jsonify([])

    # Get distinct values for the field from card_attributes table, excluding NULL and empty values
    query = "SELECT DISTINCT value FROM card_attributes WHERE name = ? AND value IS NOT NULL AND value != '' ORDER BY value"
    values = conn.execute(query, (field,)).fetchall()
    conn.close()

    # Extract the values from the result tuples
    raw_values = [row[0] for row in values]

    # Special handling for affinities - split on " / " to get individual affinities
    if field == "affinities":
        individual_affinities = set()
        for value in raw_values:
            # Split on " / " and add each individual affinity
            affinities = [affinity.strip() for affinity in value.split(" / ")]
            individual_affinities.update(affinities)
        return jsonify(sorted(list(individual_affinities)))

    return jsonify(raw_values)


def handle_metadata_fields(game):
    """Get all available metadata fields for a specific game"""
    conn = get_db_connection()
    fields = conn.execute(
        "SELECT name, field_display_name FROM attributes_fields WHERE game = ? ORDER BY field_display_name",
        (game,),
    ).fetchall()
    conn.close()

    return jsonify(
        [{"name": f["name"], "display": f["field_display_name"]} for f in fields]
    )


def handle_metadata_values(game, field):
    """Get all unique values for a specific metadata field in a game"""
    conn = get_db_connection()

    # Map frontend field name to database field name
    db_field = map_field_name(field)

    # Check if field is a direct card table column
    if is_direct_card_field(db_field):
        # Query directly from cards table
        values = conn.execute(
            f"""
            SELECT DISTINCT {db_field} as value 
            FROM cards
            WHERE game = ? AND {db_field} IS NOT NULL AND {db_field} != ''
            ORDER BY {db_field}
            """,
            (game,),
        ).fetchall()
    else:
        # Query from card_attributes table
        values = conn.execute(
            """
            SELECT DISTINCT cm.value 
            FROM card_attributes cm
            JOIN cards c ON cm.card_id = c.id
            WHERE c.game = ? AND cm.name = ? AND cm.value IS NOT NULL AND cm.value != ''
            ORDER BY cm.value
            """,
            (game, db_field),
        ).fetchall()

    conn.close()

    value_list = [v["value"] for v in values]

    # Return the values as-is since database is now standardized
    return jsonify(value_list)


def handle_anime_values():
    """Get all unique anime/series values (legacy endpoint)"""
    return handle_metadata_values("Union Arena", "series")


def handle_color_values():
    """Get all unique color values (legacy endpoint)"""
    return handle_metadata_values("Union Arena", "color")
