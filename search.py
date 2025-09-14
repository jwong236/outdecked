"""
Search API handlers for the Flask backend
"""

from flask import request, jsonify
from database import get_db_connection


def handle_api_search():
    """Handle the /api/search route with complex filtering and pagination logic."""
    conn = get_db_connection()

    # Get query parameters
    game = request.args.get("game", "Union Arena")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    search_query = request.args.get("q", "").strip()
    sort_by = request.args.get("sort", "")

    # Build base query
    base_query = "FROM cards c"

    # Build WHERE clause
    where_conditions = ["c.game = ?"]
    params = [game]

    if search_query:
        where_conditions.append("(c.name LIKE ? OR c.clean_name LIKE ?)")
        search_param = f"%{search_query}%"
        params.extend([search_param, search_param])

    # Handle filters
    filter_fields = [
        "SeriesName",
        "Rarity",
        "CardType",
        "ActivationEnergy",
        "RequiredEnergy",
        "ActionPointCost",
        "Trigger",
        "Affinities",
    ]

    for field in filter_fields:
        values = request.args.getlist(field)
        if values:
            # Create placeholders for the IN clause
            placeholders = ",".join(["?" for _ in values])
            where_conditions.append(
                f"(SELECT value FROM card_attributes WHERE card_id = c.id AND name = '{field}') IN ({placeholders})"
            )
            params.extend(values)

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    # Build ORDER BY clause
    order_clause = "ORDER BY c.name"  # Default
    if sort_by:
        if sort_by == "price_desc":
            order_clause = "ORDER BY COALESCE(cp.market_price, cp.mid_price) DESC"
        elif sort_by == "price_asc":
            order_clause = "ORDER BY COALESCE(cp.market_price, cp.mid_price) ASC"
        elif sort_by == "rarity_desc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Ultra Rare' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Secret Rare' THEN 6
                ELSE 7
            END DESC"""
        elif sort_by == "rarity_asc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Ultra Rare' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Secret Rare' THEN 6
                ELSE 7
            END ASC"""
        elif sort_by == "name_asc":
            order_clause = "ORDER BY c.name ASC"
        elif sort_by == "name_desc":
            order_clause = "ORDER BY c.name DESC"
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

    # Calculate offset for pagination
    offset = (page - 1) * per_page

    # Get paginated results with metadata and prices (TCGCSV-aligned)
    # Use market_price if available, otherwise fall back to mid_price
    search_query = (
        f"SELECT c.*, GROUP_CONCAT(cm.name || ':' || cm.value, '|||') as metadata, "
        f"COALESCE(cp.market_price, cp.mid_price) as price {base_query} "
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


def handle_filter_values(field, game=None):
    """Get all unique values for a specific filter field, optionally filtered by game"""
    conn = get_db_connection()

    if game:
        # Get distinct values for the field from card_attributes table, filtered by game
        query = """
            SELECT DISTINCT ca.value 
            FROM card_attributes ca
            INNER JOIN cards c ON ca.card_id = c.id
            WHERE ca.name = ? AND c.game = ? AND ca.value IS NOT NULL AND ca.value != ''
            ORDER BY ca.value
        """
        values = conn.execute(query, (field, game)).fetchall()
    else:
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

    # Special handling for numeric fields - sort numerically instead of alphabetically
    numeric_fields = [
        "RequiredEnergy",
        "ActionPointCost",
        "BattlePointBP",
        "GeneratedEnergy",
    ]

    if field in numeric_fields:
        try:
            # Convert to float, sort numerically, then back to string
            numeric_values = []
            for val in raw_values:
                try:
                    numeric_values.append(float(val))
                except ValueError:
                    # Skip non-numeric values
                    continue

            numeric_values.sort()
            result = []
            for val in numeric_values:
                if val == float("inf"):
                    continue  # Skip invalid numeric values
                result.append(str(val))

            return jsonify(result)
        except:
            # If anything fails, fall back to string sorting
            return jsonify(raw_values)

    return jsonify(raw_values)
