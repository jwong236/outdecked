"""
Search API handlers for the Flask backend
"""

from flask import request, jsonify
from database import get_session
from sqlalchemy import text


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
    """Handle the /api/search route with unified filter structure."""
    db_session = get_session()

    # Get basic query parameters from JSON body (unified format)
    page = 1
    per_page = 20
    search_query = ""
    sort_by = ""
    filters = []

    if request.is_json and request.json:
        data = request.json
        print(f"[SEARCH] Backend: Received request data: {data}")
        print(f"[SEARCH] Backend: per_page from request: {data.get('per_page')}")
        page = int(data.get("page", 1))
        per_page = int(data.get("per_page", 20))
        print(f"[SEARCH] Backend: Final per_page value: {per_page}")
        search_query = data.get("query", "").strip()
        sort_by = data.get("sort", "")
        filters = data.get("filters", [])

    # Build base query with group name
    base_query = "FROM cards c LEFT JOIN groups g ON c.group_id = g.id"

    # Build WHERE clause
    where_conditions = []
    params = {}

    # Handle search query
    if search_query:
        where_conditions.append("(c.name LIKE :search1 OR c.clean_name LIKE :search2)")
        search_param = f"%{search_query}%"
        params["search1"] = search_param
        params["search2"] = search_param

    # Process unified filters - group OR filters by field
    and_conditions = []
    or_conditions_by_field = {}  # Group OR conditions by field
    not_conditions = []

    for filter_item in filters:
        filter_type = filter_item.get("type", "and")
        field = filter_item.get("field", "")
        value = filter_item.get("value", "")

        if not field or not value:
            continue

        # Build condition based on field type
        if field == "game":
            condition = "c.game = :game"
            params["game"] = value
        elif field in [
            "series",
            "rarity",
            "card_type",
            "print_type",
            "activation_energy",
            "required_energy",
            "action_point_cost",
            "trigger_type",
            "affinities",
        ]:
            # Generate unique parameter names for each field value
            existing_params = [
                p for p in params.keys() if p.startswith(f"{field.lower()}_")
            ]
            param_name = f"{field.lower()}_{len(existing_params)}"
            condition = f"EXISTS (SELECT 1 FROM card_attributes WHERE card_id = c.id AND name = :{param_name}_field AND value = :{param_name}_value)"
            params[f"{param_name}_field"] = field
            params[f"{param_name}_value"] = value
        else:
            # Handle other fields
            param_name = f"{field.lower()}_direct"
            condition = f"c.{field} = :{param_name}"
            params[param_name] = value

        # Group conditions by type
        if filter_type == "and":
            and_conditions.append(condition)
        elif filter_type == "or":
            # Group OR conditions by field
            if field not in or_conditions_by_field:
                or_conditions_by_field[field] = []
            or_conditions_by_field[field].append(condition)
        elif filter_type == "not":
            # Handle NULL values properly for NOT filters
            if field in [
                "series",
                "activation_energy",
                "card_type",
                "rarity",
                "print_type",
                "trigger_type",
                "description",
                "affinities",
            ]:
                # For card_attributes fields, exclude only if attribute exists AND equals value
                not_param_field = f"not_{field.lower()}_field"
                not_param_value = f"not_{field.lower()}_value"
                not_condition = f"NOT EXISTS (SELECT 1 FROM card_attributes WHERE card_id = c.id AND name = :{not_param_field} AND value = :{not_param_value})"
                not_conditions.append(not_condition)
                params[not_param_field] = field
                params[not_param_value] = value
            else:
                # For direct card fields, use standard NOT logic
                not_conditions.append(f"NOT ({condition})")

    # Combine all conditions
    if and_conditions:
        where_conditions.extend(and_conditions)

    # Add grouped OR conditions (each field group becomes its own OR condition)
    for field, conditions in or_conditions_by_field.items():
        if len(conditions) > 1:
            or_condition = f"({' OR '.join(conditions)})"
            where_conditions.append(or_condition)
        else:
            where_conditions.extend(conditions)

    if not_conditions:
        where_conditions.extend(not_conditions)

    # Legacy print_type handling removed - now handled by unified filter system

    # Legacy direct filter parameter handling removed - now handled by unified filter system

    # Legacy advanced filter handling removed - now handled by unified filter system

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    # Debug output removed for performance

    # Build ORDER BY clause
    order_clause = "ORDER BY c.name"  # Default
    if sort_by:
        if sort_by == "price_desc":
            order_clause = "ORDER BY COALESCE(cp.market_price, cp.mid_price) DESC"
        elif sort_by == "price_asc":
            order_clause = "ORDER BY COALESCE(cp.market_price, cp.mid_price) ASC"
        elif sort_by == "rarity_desc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Super Rare' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Ultra Rare' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Secret Rare' THEN 6
                ELSE 7
            END DESC"""
        elif sort_by == "rarity_asc":
            order_clause = """ORDER BY CASE 
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Common' THEN 1
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Uncommon' THEN 2
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Rare' THEN 3
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Super Rare' THEN 4
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Ultra Rare' THEN 5
                WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'rarity') = 'Secret Rare' THEN 6
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
            order_clause = "ORDER BY CAST((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'required_energy') AS INTEGER) DESC"
        elif sort_by == "required_energy_asc":
            order_clause = "ORDER BY CAST((SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'required_energy') AS INTEGER) ASC"
        elif sort_by == "recent_series_rarity_desc":
            # Sort by most recent series first (published_on DESC), then by rarity DESC
            order_clause = """ORDER BY g.published_on DESC, 
                CASE 
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Secret Rare' THEN 1
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Ultra Rare' THEN 2
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Super Rare' THEN 3
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Rare' THEN 4
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Uncommon' THEN 5
                    WHEN (SELECT value FROM card_attributes WHERE card_id = c.id AND name = 'Rarity') = 'Common' THEN 6
                    ELSE 7
                END ASC"""

    # Get total count - need to match the main query structure with JOINs
    count_query = f"SELECT COUNT(DISTINCT c.id) as total {base_query} LEFT JOIN card_attributes cm ON c.id = cm.card_id LEFT JOIN card_prices cp ON c.id = cp.card_id {where_clause}"
    total_cards = db_session.execute(text(count_query), params).fetchone()[0]

    # Calculate offset for pagination
    offset = (page - 1) * per_page

    # Get paginated results with metadata and prices (TCGCSV-aligned)
    # Use market_price if available, otherwise fall back to mid_price
    # Aggregate prices to avoid duplicates from multiple price records
    search_query = (
        f"SELECT c.*, g.name as group_name, g.abbreviation as group_abbreviation, STRING_AGG(cm.name || ':' || cm.value || ':' || cm.display_name, '|||') as metadata, "
        f"COALESCE(MAX(cp.market_price), MAX(cp.mid_price)) as price {base_query} "
        f"LEFT JOIN card_attributes cm ON c.id = cm.card_id "
        f"LEFT JOIN card_prices cp ON c.id = cp.card_id "
        f"{where_clause} "
        f"GROUP BY c.id, g.name, g.abbreviation, g.published_on {order_clause} LIMIT :per_page OFFSET :offset"
    )
    search_params = params.copy()
    search_params["per_page"] = per_page
    search_params["offset"] = offset

    cursor = db_session.execute(text(search_query), search_params)
    raw_cards = [row._mapping for row in cursor.fetchall()]

    # Process cards to include metadata as individual fields
    cards = []
    for card in raw_cards:
        # Start with basic card data
        processed_card = {
            "id": card["id"],
            "product_id": card.get("product_id", 0),
            "name": card["name"],
            "clean_name": card.get("clean_name"),
            "card_url": card["card_url"],
            "game": card["game"],
            "category_id": card.get("category_id", 0),
            "group_id": card.get("group_id", 0),
            "group_name": card.get("group_name"),
            "group_abbreviation": card.get("group_abbreviation"),
            # print_type now comes from card_attributes via metadata processing
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

        # Parse metadata string and add as attributes array
        attributes = []
        if card["metadata"]:
            metadata_pairs = card["metadata"].split("|||")
            for pair in metadata_pairs:
                if ":" in pair:
                    parts = pair.split(":", 2)  # Split into max 3 parts
                    if len(parts) == 3:
                        name, field_value, display_name = parts
                    else:
                        # Fallback for old format without display_name
                        name, field_value = parts
                        display_name = name

                    # Don't overwrite group fields with any field from metadata
                    if name not in ["group_name", "group_abbreviation"]:
                        processed_card[name] = field_value
                        # Also add to attributes array for frontend compatibility
                        attributes.append(
                            {
                                "id": 0,  # Placeholder - not used by frontend
                                "card_id": card["id"],
                                "name": name,
                                "value": field_value,
                                "display_name": display_name,
                                "created_at": card.get("created_at", ""),
                            }
                        )

        # Add attributes array to processed card
        processed_card["attributes"] = attributes

        cards.append(processed_card)

    db_session.close()

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
    db_session = get_session()

    # Get unique field names from card_attributes table, excluding Description
    query = """
        SELECT DISTINCT name, display_name 
        FROM card_attributes 
        WHERE name != 'Description' 
        ORDER BY display_name
    """
    fields = db_session.execute(text(query)).fetchall()
    db_session.close()

    # Convert to list - PrintType is now in card_attributes like other fields
    field_list = [
        {"name": field[0], "display": field[1] or field[0]} for field in fields
    ]

    # Sort by display name
    field_list.sort(key=lambda x: x["display"])

    return jsonify(field_list)


def handle_filter_values(field, game=None):
    """Get all unique values for a specific filter field, optionally filtered by game"""

    # Special handling for print_type field
    if field == "print_type":
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

    db_session = get_session()

    try:
        from models import CardAttribute, Card

        if game:
            # Get distinct values for the field from card_attributes table, filtered by game
            values = (
                db_session.query(CardAttribute.value)
                .join(Card, CardAttribute.card_id == Card.id)
                .filter(
                    CardAttribute.name == field,
                    Card.game == game,
                    CardAttribute.value.isnot(None),
                    CardAttribute.value != "",
                )
                .distinct()
                .order_by(CardAttribute.value)
                .all()
            )
        else:
            # Get distinct values for the field from card_attributes table, excluding NULL and empty values
            values = (
                db_session.query(CardAttribute.value)
                .filter(
                    CardAttribute.name == field,
                    CardAttribute.value.isnot(None),
                    CardAttribute.value != "",
                )
                .distinct()
                .order_by(CardAttribute.value)
                .all()
            )
    finally:
        pass

    db_session.close()

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

    # Special handling for trigger_type - extract just the trigger type (first word in brackets)
    if field == "trigger_type":
        trigger_types = set()
        for value in raw_values:
            # Extract text between first set of brackets
            if "[" in value and "]" in value:
                start = value.find("[") + 1
                end = value.find("]")
                if start < end:
                    trigger_text = value[start:end].strip()
                    # Take only the first word (e.g., "Active", "Color", "Draw", etc.)
                    first_word = trigger_text.split()[0] if trigger_text else ""
                    if first_word:
                        # Normalize case - capitalize first letter, lowercase the rest
                        normalized_word = first_word.capitalize()
                        trigger_types.add(normalized_word)
        return jsonify(sorted(list(trigger_types)))

    # Special handling for numeric fields - sort numerically instead of alphabetically
    numeric_fields = [
        "RequiredEnergy",
        "ActionPointCost",
        "BattlePointBP",
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
                # Convert to int first to remove decimal places, then to string
                if val.is_integer():
                    result.append(str(int(val)))
                else:
                    result.append(str(val))

            return jsonify(result)
        except:
            # If anything fails, fall back to string sorting
            return jsonify(raw_values)

    return jsonify(raw_values)


def get_print_type_values():
    """Get unique print type values from the database"""
    db_session = get_session()
    cursor = db_session.cursor()

    try:
        query = "SELECT DISTINCT print_type FROM cards WHERE print_type IS NOT NULL AND print_type != '' ORDER BY print_type"
        cursor.execute(query)
        values = [row[0] for row in cursor.fetchall()]
        return jsonify(values)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        db_session.close()
