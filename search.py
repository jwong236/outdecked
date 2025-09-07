"""
Search functionality for OutDecked
Handles all search, filtering, and pagination logic.
"""

from flask import request, jsonify
from database import get_db_connection
from models import METADATA_FIELDS_EXACT
import json


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
    base_query = "FROM cards"
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
            "c.id IN (SELECT card_id FROM card_metadata WHERE field_name = 'series' AND LOWER(field_value) = LOWER(?))"
        )
        params.append(anime_filter)

    if color_filter:
        where_conditions.append(
            "c.id IN (SELECT card_id FROM card_metadata WHERE field_name = 'color' AND LOWER(field_value) = LOWER(?))"
        )
        params.append(color_filter)

    # Handle OR filters (any one must match)
    if or_filters:
        or_conditions = []
        for filter_item in or_filters:
            field = filter_item.get("field")
            value = filter_item.get("value")
            if field and value:
                # Use case-insensitive comparison for text fields
                if field in METADATA_FIELDS_EXACT:
                    or_conditions.append(
                        f"c.id IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) = LOWER(?))"
                    )
                    params.extend([field, value])
                elif field == "affinities":
                    # For affinities, check if the value is contained in the comma-separated list
                    or_conditions.append(
                        f"c.id IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) LIKE LOWER(?))"
                    )
                    value = f"%{value}%"
                    params.extend([field, value])
                else:
                    or_conditions.append(f"c.{field} = ?")
                    params.append(value)

        if or_conditions:
            where_conditions.append(f"({' OR '.join(or_conditions)})")

    # Handle AND filters (all must match)
    for filter_item in and_filters:
        field = filter_item.get("field")
        value = filter_item.get("value")
        if field and value:
            # Use case-insensitive comparison for text fields
            if field in METADATA_FIELDS_EXACT:
                where_conditions.append(
                    f"c.id IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) = LOWER(?))"
                )
                params.extend([field, value])
            elif field == "affinities":
                # For affinities, check if the value is contained in the comma-separated list
                where_conditions.append(
                    f"c.id IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) LIKE LOWER(?))"
                )
                params.extend([field, f"%{value}%"])
            else:
                where_conditions.append(f"c.{field} = ?")
                params.append(value)

    # Handle NOT filters (must NOT match)
    for filter_item in not_filters:
        field = filter_item.get("field")
        value = filter_item.get("value")
        if field and value:
            # Use case-insensitive comparison for text fields
            if field in METADATA_FIELDS_EXACT:
                where_conditions.append(
                    f"c.id NOT IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) = LOWER(?))"
                )
                params.extend([field, value])
            elif field == "affinities":
                # For affinities, check if the value is NOT contained in the comma-separated list
                where_conditions.append(
                    f"c.id NOT IN (SELECT card_id FROM card_metadata WHERE field_name = ? AND LOWER(field_value) LIKE LOWER(?))"
                )
                params.extend([field, f"%{value}%"])
            else:
                where_conditions.append(f"c.{field} != ?")
                params.append(value)

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
                "(SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'price'), "
                "'$', ''), ',', '') AS REAL) DESC"
            )
        elif sort_by == "price_asc":
            order_clause = (
                "ORDER BY CAST(REPLACE(REPLACE("
                "(SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'price'), "
                "'$', ''), ',', '') AS REAL) ASC"
            )
        elif sort_by == "rarity_desc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Common' THEN 1
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Uncommon' THEN 2
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Rare' THEN 3
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Common 1-Star' THEN 4
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Uncommon 1-Star' THEN 5
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Rare 1-Star' THEN 6
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare' THEN 7
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 1-Star' THEN 8
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 2-Star' THEN 9
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 3-Star' THEN 10
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Union Rare' THEN 11
                ELSE 12
            END DESC"""
        elif sort_by == "rarity_asc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Common' THEN 1
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Uncommon' THEN 2
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Rare' THEN 3
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Common 1-Star' THEN 4
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Uncommon 1-Star' THEN 5
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Rare 1-Star' THEN 6
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare' THEN 7
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 1-Star' THEN 8
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 2-Star' THEN 9
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Super Rare 3-Star' THEN 10
                WHEN (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') = 'Union Rare' THEN 11
                ELSE 12
            END ASC"""
        elif sort_by == "number_desc":
            order_clause = "ORDER BY CAST(SUBSTR((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'card_number'), -3) AS INTEGER) DESC"
        elif sort_by == "number_asc":
            order_clause = "ORDER BY CAST(SUBSTR((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'card_number'), -3) AS INTEGER) ASC"
        elif sort_by == "cost_2_desc":
            order_clause = "ORDER BY CAST((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'cost_2') AS INTEGER) DESC"
        elif sort_by == "cost_2_asc":
            order_clause = "ORDER BY CAST((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'cost_2') AS INTEGER) ASC"

    # Get total count
    count_query = (
        f"SELECT COUNT(*) as total FROM cards c{where_clause.replace('FROM cards', '')}"
    )
    total_cards = conn.execute(count_query, params).fetchone()["total"]

    # Get paginated results with metadata
    search_query = (
        f"SELECT c.*, GROUP_CONCAT(cm.field_name || ':' || cm.field_value, '|||') as metadata {base_query} c "
        f"LEFT JOIN card_metadata cm ON c.id = cm.card_id "
        f"{where_clause.replace('FROM cards', '')} "
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
        }

        # Parse metadata string and add as individual fields
        if card["metadata"]:
            metadata_pairs = card["metadata"].split("|||")
            for pair in metadata_pairs:
                if ":" in pair:
                    field_name, field_value = pair.split(":", 1)
                    processed_card[field_name] = field_value

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

    # Get distinct values for the field from card_metadata table, excluding NULL and empty values
    query = "SELECT DISTINCT field_value FROM card_metadata WHERE field_name = ? AND field_value IS NOT NULL AND field_value != '' ORDER BY field_value"
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
        "SELECT field_name, field_display_name FROM metadata_fields WHERE game = ? ORDER BY field_display_name",
        (game,),
    ).fetchall()
    conn.close()

    return jsonify(
        [{"name": f["field_name"], "display": f["field_display_name"]} for f in fields]
    )


def handle_metadata_values(game, field):
    """Get all unique values for a specific metadata field in a game"""
    conn = get_db_connection()
    values = conn.execute(
        """
        SELECT DISTINCT cm.field_value 
        FROM card_metadata cm
        JOIN cards c ON cm.card_id = c.id
        WHERE c.game = ? AND cm.field_name = ? AND cm.field_value IS NOT NULL AND cm.field_value != ''
        ORDER BY cm.field_value
        """,
        (game, field),
    ).fetchall()
    conn.close()

    value_list = [v["field_value"] for v in values]

    # Return the values as-is since database is now standardized
    return jsonify(value_list)


def handle_anime_values():
    """Get all unique anime/series values (legacy endpoint)"""
    return handle_metadata_values("Union Arena", "series")


def handle_color_values():
    """Get all unique color values (legacy endpoint)"""
    return handle_metadata_values("Union Arena", "color")
