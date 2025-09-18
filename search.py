"""
Search API handlers for the Flask backend
"""

from flask import request, jsonify
from database import get_db_connection


def detect_print_type(abbreviation, card_name=None):
    """Automatically detect print type from group abbreviation and card name"""
    if not abbreviation:
        return "Unknown"
    elif card_name and "Box Topper Foil" in card_name:
        return "Box Topper Foil"
    elif abbreviation.endswith("_PRE"):
        return "Pre-Release Starter"
    elif abbreviation.endswith("_RE"):
        return "Pre-Release"
    elif abbreviation.endswith("ST"):
        return "Starter Deck"
    elif abbreviation == "UEPR":
        return "Promotion"
    else:
        return "Base"


def handle_api_search():
    """Handle the /api/search route with complex filtering and pagination logic."""
    conn = get_db_connection()

    # Get query parameters
    game = request.args.get("game", "Union Arena")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    search_query = request.args.get("q", "").strip()
    sort_by = request.args.get("sort", "")
    anime = request.args.get("anime", "").strip()  # For series filtering
    color = request.args.get("color", "").strip()  # For color filtering
    card_type = request.args.get("cardType", "").strip()  # For card type filtering

    # Build base query with group name
    base_query = "FROM cards c LEFT JOIN groups g ON c.group_id = g.group_id"

    # Build WHERE clause
    where_conditions = ["c.game = ?"]
    params = [game]

    if search_query:
        where_conditions.append("(c.name LIKE ? OR c.clean_name LIKE ?)")
        search_param = f"%{search_query}%"
        params.extend([search_param, search_param])

    # Handle anime (series) filter
    if anime:
        where_conditions.append(
            "(SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'SeriesName') = ?"
        )
        params.append(anime)

    # Handle color filter
    if color:
        where_conditions.append(
            "(SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'ActivationEnergy') = ?"
        )
        params.append(color)

    # Handle card type filter
    if card_type:
        where_conditions.append(
            "(SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'CardType') = ?"
        )
        params.append(card_type)

    # Handle print type filter
    print_type = request.args.get("print_type", "")
    if print_type and print_type != "all":
        if print_type == "Base":
            # Base cards are everything that doesn't match special patterns
            where_conditions.append(
                "g.abbreviation NOT LIKE '%_RE' AND g.abbreviation NOT LIKE '%_PRE' AND g.abbreviation NOT LIKE '%ST' AND g.abbreviation != 'UEPR' AND c.name NOT LIKE '%Box Topper Foil%'"
            )
        elif print_type == "Pre-Release":
            where_conditions.append("g.abbreviation LIKE '%_RE'")
        elif print_type == "Starter Deck":
            where_conditions.append(
                "g.abbreviation LIKE '%ST' AND g.abbreviation NOT LIKE '%_PRE'"
            )
        elif print_type == "Pre-Release Starter":
            where_conditions.append("g.abbreviation LIKE '%_PRE'")
        elif print_type == "Promotion":
            # Promotion is only UEPR cards
            where_conditions.append("g.abbreviation = 'UEPR'")
        elif print_type == "Box Topper Foil":
            # Box Topper Foil cards have "Box Topper Foil" in their name
            where_conditions.append("c.name LIKE '%Box Topper Foil%'")

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
        "PrintType",
    ]

    for field in filter_fields:
        values = request.args.getlist(field)
        if values:
            if field == "PrintType":
                # Use database print_type column for filtering
                placeholders = ",".join(["?" for _ in values])
                where_conditions.append(f"c.print_type IN ({placeholders})")
                params.extend(values)
            else:
                # Regular field handling
                placeholders = ",".join(["?" for _ in values])
                where_conditions.append(
                    f"(SELECT value FROM card_attributes WHERE card_id = c.id AND name = '{field}') IN ({placeholders})"
                )
                params.extend(values)

    # Handle advanced filters (and_filters, or_filters, not_filters)
    import json

    # Process AND filters
    and_filters_json = request.args.get("and_filters")
    if and_filters_json:
        try:
            and_filters = json.loads(and_filters_json)
            for filter_obj in and_filters:
                field = filter_obj.get("field")
                value = filter_obj.get("value")
                if field and value:
                    if field == "PrintType":
                        # Use database print_type column for filtering
                        where_conditions.append("c.print_type = ?")
                        params.append(value)
                    else:
                        # Regular field handling
                        where_conditions.append(
                            f"(SELECT value FROM card_attributes WHERE card_id = c.id AND name = '{field}') = ?"
                        )
                        params.append(value)
        except json.JSONDecodeError:
            pass  # Ignore invalid JSON

    # Process OR filters
    or_filters_json = request.args.get("or_filters")
    if or_filters_json:
        try:
            or_filters = json.loads(or_filters_json)
            or_conditions = []
            for filter_obj in or_filters:
                field = filter_obj.get("field")
                value = filter_obj.get("value")
                if field and value:
                    if field == "PrintType":
                        # Use database print_type column for filtering
                        or_conditions.append("(c.print_type = ?)")
                        params.append(value)
                    else:
                        # Regular field handling
                        or_conditions.append(
                            f"(SELECT value FROM card_attributes WHERE card_id = c.id AND name = '{field}') = ?"
                        )
                        params.append(value)
            if or_conditions:
                where_conditions.append(f"({' OR '.join(or_conditions)})")
        except json.JSONDecodeError:
            pass  # Ignore invalid JSON

    # Process NOT filters
    not_filters_json = request.args.get("not_filters")
    if not_filters_json:
        try:
            not_filters = json.loads(not_filters_json)
            for filter_obj in not_filters:
                field = filter_obj.get("field")
                value = filter_obj.get("value")
                if field and value:
                    if field == "PrintType":
                        # Use database print_type column for filtering
                        where_conditions.append("NOT (c.print_type = ?)")
                        params.append(value)
                    else:
                        # Regular field handling
                        where_conditions.append(
                            f"NOT ((SELECT value FROM card_attributes WHERE card_id = c.id AND name = '{field}') = ?)"
                        )
                        params.append(value)
        except json.JSONDecodeError:
            pass  # Ignore invalid JSON

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
        f"SELECT c.*, g.name as group_name, g.abbreviation as group_abbreviation, GROUP_CONCAT(cm.name || ':' || cm.value, '|||') as metadata, "
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
            "product_id": card.get("product_id", 0),
            "name": card["name"],
            "clean_name": card.get("clean_name"),
            "image_url": card["image_url"],
            "card_url": card["card_url"],
            "game": card["game"],
            "category_id": card.get("category_id", 0),
            "group_id": card.get("group_id", 0),
            "group_name": card.get("group_name"),
            "group_abbreviation": card.get("group_abbreviation"),
            "print_type": card.get("print_type", "Unknown"),
            "image_count": card.get("image_count", 0),
            "is_presale": card.get("is_presale", False),
            "released_on": card.get("released_on", ""),
            "presale_note": card.get("presale_note", ""),
            "modified_on": card.get("modified_on", ""),
            "price": card.get("price", None),  # Add price from card_prices table
            "low_price": card.get("low_price"),
            "mid_price": card.get("mid_price"),
            "high_price": card.get("high_price"),
            "created_at": card.get("created_at", ""),
        }

        # Parse metadata string and add as individual fields
        if card["metadata"]:
            metadata_pairs = card["metadata"].split("|||")
            for pair in metadata_pairs:
                if ":" in pair:
                    name, field_value = pair.split(":", 1)
                    # Don't overwrite group fields with any field from metadata
                    if name not in ["group_name", "group_abbreviation"]:
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

    # Convert to list and add PrintType as a special field
    field_list = [
        {"name": field["name"], "display": field["display_name"] or field["name"]}
        for field in fields
    ]

    # Add PrintType as a special field (not from card_attributes)
    field_list.append({"name": "PrintType", "display": "Print Type"})

    # Sort by display name
    field_list.sort(key=lambda x: x["display"])

    return jsonify(field_list)


def handle_filter_values(field, game=None):
    """Get all unique values for a specific filter field, optionally filtered by game"""

    # Special handling for PrintType field
    if field == "PrintType":
        # Return all possible print types with proper casing
        return jsonify(
            [
                "Base",
                "Pre-Release",
                "Starter Deck",
                "Pre-Release Starter",
                "Promotion",
                "Box Topper Foil",
            ]
        )

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


def get_print_type_values():
    """Get unique print type values from the database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        query = "SELECT DISTINCT print_type FROM cards WHERE print_type IS NOT NULL AND print_type != '' ORDER BY print_type"
        cursor.execute(query)
        values = [row[0] for row in cursor.fetchall()]
        return jsonify(values)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
