"""
OutDecked - Card Management Web Application
Main Flask application with routes and business logic.
"""

from flask import (
    Flask,
    request,
    jsonify,
    send_file,
    redirect,
    url_for,
    send_from_directory,
)
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import json
import threading
import time
import requests
import logging
from datetime import datetime
from config import Config

# from models import scraping_status, GAME_URLS, SUPPORTED_GAMES, METADATA_FIELDS_EXACT  # Moved to scraping_archive
from database import (
    init_db,
    get_db_connection,
    save_cards_to_db,
)

# from scraper import add_scraping_log  # Moved to scraping_archive
from search import (
    handle_api_search,
    handle_filter_fields,
    handle_filter_values,
)
from auth import (
    handle_register,
    handle_login,
    handle_logout,
    handle_get_current_user,
    handle_get_user_preferences,
    handle_update_user_preferences,
    handle_get_users,
    handle_update_user_role,
    handle_get_user_stats,
    handle_get_user_hand,
    handle_save_user_hand,
    handle_get_user_decks,
    handle_save_user_decks,
    require_auth,
    require_role,
    require_permission,
)
from deck_builder import (
    handle_get_decks,
    handle_create_deck,
    handle_update_deck,
    handle_delete_deck,
    handle_get_deck,
    handle_get_decks_batch,
    handle_add_card_to_deck,
    handle_add_cards_to_deck,
    handle_remove_card_from_deck,
    handle_update_card_quantity,
    handle_get_validation_rules,
)

app = Flask(__name__)
app.config.from_object(Config)

# Configure sessions
app.config["SESSION_COOKIE_SECURE"] = False  # Set to True in production with HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# Enable CORS for all routes with credentials support
CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    supports_credentials=True,
)

socketio = SocketIO(app, cors_allowed_origins="*")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("outdecked.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# Routes
@app.route("/")
def index():
    """Serve the Next.js frontend"""
    return send_from_directory("frontend", "index.html")


# Catch-all route moved to end of file


@app.route("/admin")
def admin():
    """Admin route"""
    return send_from_directory("frontend", "index.html")


@app.route("/scraping")
def scraping():
    return send_from_directory("frontend", "index.html")


# Removed /api/start-scraping - moved to /api/admin/scraping/start with auth
# Removed /api/scraping-status - moved to /api/admin/scraping/status with auth


# @app.route("/admin/scraping")  # DISABLED - template moved to scraping_archive
# def admin_scraping():
#     return render_template("admin_scraping.html")


@app.route("/deckbuilder")
@app.route("/deckbuilder/")
def deckbuilder():
    # Serve the main deckbuilder page - handles both deck list and individual deck editing via query parameters
    return send_from_directory("frontend", "deckbuilder.html")


@app.route("/auth")
def auth():
    return send_from_directory("frontend", "auth.html")


# User Deck Management (Require Auth)
@app.route("/api/user/decks", methods=["GET"])
def get_user_decks():
    """Get user's saved decks (moved from /api/decks)"""
    return handle_get_decks()


@app.route("/api/user/decks", methods=["POST"])
def create_user_deck():
    """Create deck (moved from /api/decks)"""
    return handle_create_deck()


@app.route("/api/user/decks/<deck_id>", methods=["GET"])
def get_user_deck(deck_id):
    """Get specific deck (moved from /api/decks/{id})"""
    return handle_get_deck(deck_id)


@app.route("/api/user/decks/batch", methods=["POST"])
def get_user_decks_batch():
    """Get multiple decks by IDs"""
    return handle_get_decks_batch()


@app.route("/api/user/decks/<deck_id>", methods=["PUT"])
def update_user_deck(deck_id):
    """Update deck (moved from /api/decks/{id})"""
    return handle_update_deck(deck_id)


@app.route("/api/user/decks/<deck_id>", methods=["DELETE"])
def delete_user_deck(deck_id):
    """Delete deck (moved from /api/decks/{id})"""
    return handle_delete_deck(deck_id)


@app.route("/api/user/decks/<deck_id>/cards", methods=["POST"])
def add_card_to_user_deck(deck_id):
    """Add card to deck"""
    return handle_add_card_to_deck(deck_id)


@app.route("/api/user/decks/<deck_id>/cards/batch", methods=["POST"])
def add_cards_to_user_deck(deck_id):
    """Add multiple cards to deck"""
    return handle_add_cards_to_deck(deck_id)


@app.route("/api/user/decks/<deck_id>/cards/<card_id>", methods=["PUT"])
def update_user_deck_card_quantity(deck_id, card_id):
    """Update card quantity in deck"""
    return handle_update_card_quantity(deck_id, card_id)


@app.route("/api/user/decks/<deck_id>/cards/<card_id>", methods=["DELETE"])
def remove_card_from_user_deck(deck_id, card_id):
    """Remove card from deck"""
    return handle_remove_card_from_deck(deck_id, card_id)


# Removed /api/deck-validation-rules - validation should be frontend-only


@app.route("/proxy-printer")
def proxy_printer():
    return send_from_directory("frontend", "index.html")


@app.route("/cart")
def cart():
    return send_from_directory("frontend", "index.html")


@app.route("/search")
@app.route("/search/")
def search():
    try:
        return send_from_directory("frontend", "search/index.html")
    except FileNotFoundError:
        return send_from_directory("frontend", "index.html")


# Legacy search route removed - using Next.js frontend with /api/search endpoint


# Public API - Card Search and Information
@app.route("/api/cards", methods=["GET", "POST"])
def api_cards():
    """Search cards with unified filter structure"""
    return handle_api_search()


@app.route("/api/search", methods=["GET", "POST"])
def api_search():
    """Search cards endpoint (alias for /api/cards for backward compatibility)"""
    return handle_api_search()


@app.route("/api/cards/<int:card_id>")
def get_card_by_id(card_id):
    """Get specific card by product_id with full attribute data"""
    conn = get_db_connection()

    try:
        # Get card with full attribute data (same structure as batch endpoint)
        query = (
            "SELECT c.*, g.name as group_name, g.abbreviation as group_abbreviation, "
            "GROUP_CONCAT(cm.name || ':' || cm.value || ':' || cm.display_name, '|||') as metadata, "
            "COALESCE(cp.market_price, cp.mid_price) as price "
            "FROM cards c "
            "LEFT JOIN groups g ON c.group_id = g.id "
            "LEFT JOIN card_attributes cm ON c.id = cm.card_id "
            "LEFT JOIN card_prices cp ON c.id = cp.card_id "
            "WHERE c.product_id = ? "
            "GROUP BY c.id"
        )

        cursor = conn.execute(query, (card_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            card = dict(row)

            # Parse metadata string into individual attributes
            attributes = []
            if card.get("metadata"):
                metadata_pairs = card["metadata"].split("|||")
                for pair in metadata_pairs:
                    if ":" in pair:
                        parts = pair.split(":", 2)  # Split into max 3 parts
                        if len(parts) == 3:
                            name, value, display_name = parts
                        else:
                            # Fallback for old format without display_name
                            name, value = parts
                            display_name = name

                        card[name] = value
                        # Also add to attributes array for frontend compatibility
                        attributes.append(
                            {
                                "id": 0,  # Placeholder - not used by frontend
                                "card_id": card["id"],
                                "name": name,
                                "value": value,
                                "display_name": display_name,
                                "created_at": card.get("created_at", ""),
                            }
                        )

            # Add attributes array to card
            card["attributes"] = attributes

            # Remove the raw metadata string
            if "metadata" in card:
                del card["metadata"]

            return jsonify(card)
        else:
            return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/batch", methods=["POST"])
def get_cards_batch():
    """Get multiple cards by product IDs with full attribute data"""
    try:
        data = request.get_json()
        product_ids = data.get("product_ids", [])

        if not product_ids:
            return jsonify([])

        conn = get_db_connection()

        # Create placeholders for the IN clause
        placeholders = ",".join(["?" for _ in product_ids])

        # Get cards with full attribute data (same structure as search endpoint)
        query = (
            f"SELECT c.*, g.name as group_name, g.abbreviation as group_abbreviation, "
            f"GROUP_CONCAT(cm.name || ':' || cm.value, '|||') as metadata, "
            f"COALESCE(cp.market_price, cp.mid_price) as price "
            f"FROM cards c "
            f"LEFT JOIN groups g ON c.group_id = g.id "
            f"LEFT JOIN card_attributes cm ON c.id = cm.card_id "
            f"LEFT JOIN card_prices cp ON c.id = cp.card_id "
            f"WHERE c.product_id IN ({placeholders}) "
            f"GROUP BY c.id"
        )

        cursor = conn.execute(query, product_ids)
        rows = cursor.fetchall()
        conn.close()

        # Convert to list of dictionaries and parse metadata
        cards = []
        for row in rows:
            card = dict(row)

            # Parse metadata string into individual attributes
            attributes = []
            if card.get("metadata"):
                metadata_pairs = card["metadata"].split("|||")
                for pair in metadata_pairs:
                    if ":" in pair:
                        parts = pair.split(":", 2)  # Split into max 3 parts
                        if len(parts) == 3:
                            name, value, display_name = parts
                        else:
                            # Fallback for old format without display_name
                            name, value = parts
                            display_name = name

                        card[name] = value
                        # Also add to attributes array for frontend compatibility
                        attributes.append(
                            {
                                "id": 0,  # Placeholder - not used by frontend
                                "card_id": card["id"],
                                "name": name,
                                "value": value,
                                "display_name": display_name,
                                "created_at": card.get("created_at", ""),
                            }
                        )

            # Add attributes array to card
            card["attributes"] = attributes

            # Remove the raw metadata string
            if "metadata" in card:
                del card["metadata"]

            cards.append(card)

        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/cards/attributes")
def api_cards_attributes():
    """List all available card attributes (renamed from /api/filter-fields)"""
    return handle_filter_fields()


@app.route("/api/cards/attributes/<field>")
def api_cards_attribute_values(field):
    """Get distinct values for specific attribute (renamed from /api/filter-values/<field>)"""
    game = request.args.get("game")
    return handle_filter_values(field, game)


# Backward compatibility endpoints
@app.route("/api/filter-fields")
def api_filter_fields():
    """Filter fields endpoint (backward compatibility)"""
    return handle_filter_fields()


@app.route("/api/filter-values/<field>")
def api_filter_values(field):
    """Filter values endpoint (backward compatibility)"""
    game = request.args.get("game")
    return handle_filter_values(field, game)


@app.route("/api/cards/colors/<series>")
def api_cards_colors_for_series(series):
    """Get available colors for a specific series"""
    game = request.args.get("game", "Union Arena")
    conn = get_db_connection()

    try:
        # Query to get distinct colors for cards in the specified series
        query = """
        SELECT DISTINCT ca.value as color
        FROM cards c
        JOIN card_attributes ca ON c.id = ca.card_id
        WHERE c.game = ? 
        AND ca.name = 'ActivationEnergy'
        AND EXISTS (
            SELECT 1 FROM card_attributes ca2 
            WHERE ca2.card_id = c.id 
            AND ca2.name = 'SeriesName' 
            AND ca2.value = ?
        )
        ORDER BY ca.value
        """

        cursor = conn.execute(query, (game, series))
        colors = [row[0] for row in cursor.fetchall()]
        conn.close()

        return jsonify(colors)

    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500


@app.route("/api/games")
def get_games():
    """Get available games"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT name, display_name FROM categories ORDER BY name")
    games = [
        {"name": row["name"], "display": row["display_name"]}
        for row in cursor.fetchall()
    ]
    conn.close()
    return jsonify(games)


# Removed /api/print-type-values - not used by frontend


@app.route("/api/analytics")
def get_stats():
    """Get basic application statistics"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT COUNT(*) as total FROM cards")
    total_cards = cursor.fetchone()["total"]

    cursor = conn.execute("SELECT COUNT(DISTINCT game) as games FROM cards")
    total_games = cursor.fetchone()["games"]

    cursor = conn.execute(
        "SELECT COUNT(DISTINCT group_name) as series FROM cards WHERE group_name IS NOT NULL AND group_name != ''"
    )
    total_series = cursor.fetchone()["series"]

    cursor = conn.execute(
        "SELECT game, COUNT(*) as count FROM cards GROUP BY game ORDER BY count DESC"
    )
    game_stats = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify(
        {
            "total_cards": total_cards,
            "total_games": total_games,
            "total_series": total_series,
            "game_stats": game_stats,
        }
    )


@app.route("/api/health")
def health_check():
    """Health check endpoint (moved from /health for consistency)"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route("/api/routes")
def list_routes():
    """List all available API routes for debugging"""
    import urllib.parse

    output = []
    for rule in app.url_map.iter_rules():
        methods = ",".join(rule.methods)
        line = urllib.parse.unquote(
            "{:50s} {:20s} {}".format(rule.endpoint, methods, rule)
        )
        output.append(line)

    return "<pre>" + "\n".join(sorted(output)) + "</pre>"


@app.route("/api/analytics/games")
def get_game_stats():
    """Get game-specific statistics (renamed from /api/game-stats)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get card counts for each game
    cursor.execute("SELECT game, COUNT(*) as card_count FROM cards GROUP BY game")
    card_counts = cursor.fetchall()

    conn.close()

    # Format the data
    stats = []
    for row in card_counts:
        stats.append(
            {
                "game_name": row["game"],
                "card_count": row["card_count"],
                "last_updated": None,  # Not tracked in new schema
            }
        )

    return jsonify(stats)


@app.route("/api/images/product/<int:product_id>")
def get_product_image(product_id):
    """Get TCGPlayer product image with specified size"""
    size = request.args.get("size", "1000x1000")  # Default to 1000x1000

    # Validate size parameter (basic validation)
    if not size or "x" not in size:
        size = "1000x1000"

    # Construct TCGPlayer CDN URL
    image_url = (
        f"https://tcgplayer-cdn.tcgplayer.com/product/{product_id}_in_{size}.jpg"
    )

    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Return the image with proper headers
        return (
            response.content,
            200,
            {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                "Access-Control-Allow-Origin": "*",  # Allow CORS
            },
        )
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch product image: {str(e)}"}), 400


# Removed /api/card-by-url - not used anywhere, product_id lookup is better


# Removed /api/generate-pdf - frontend handles PDF generation entirely


# Removed duplicate /api/stats endpoint - using the one defined earlier


# Removed /api/backup-database - moved to /api/admin/database/backup with auth


# Removed /api/restore-database - moved to /api/admin/database/restore with auth


# Authentication Routes
@app.route("/api/auth/register", methods=["POST"])
def register():
    """User registration endpoint"""
    return handle_register()


@app.route("/api/auth/login", methods=["POST"])
def login():
    """User login endpoint"""
    return handle_login()


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """User logout endpoint"""
    return handle_logout()


@app.route("/api/auth/me", methods=["GET"])
@app.route("/api/auth/me/", methods=["GET"])
def get_current_user():
    """Get current user information"""
    return handle_get_current_user()


# User Management Routes
@app.route("/api/users/me/preferences", methods=["GET"])
@app.route("/api/users/me/preferences/", methods=["GET"])
def get_user_preferences():
    """Get user preferences"""
    return handle_get_user_preferences()


@app.route("/api/users/me/preferences", methods=["PUT"])
@app.route("/api/users/me/preferences/", methods=["PUT"])
def update_user_preferences():
    """Update user preferences"""
    return handle_update_user_preferences()


@app.route("/api/users", methods=["GET"])
@require_permission("manage_users")
def get_users():
    """Get all users (admin only)"""
    return handle_get_users()


@app.route("/api/users/role", methods=["PUT"])
@require_permission("manage_users")
def update_user_role():
    """Update user role (admin only)"""
    return handle_update_user_role()


@app.route("/api/user/stats", methods=["GET"])
@require_permission("view_admin_panel")
def get_user_stats():
    """Get user statistics (admin only)"""
    return handle_get_user_stats()


# Hand Persistence Routes
@app.route("/api/users/me/hand", methods=["GET"])
def get_user_hand():
    """Get user's saved hand"""
    return handle_get_user_hand()


@app.route("/api/users/me/hand", methods=["POST"])
def save_user_hand():
    """Save user's hand to database"""
    return handle_save_user_hand()


# Removed duplicate user/decks endpoints - using the ones defined earlier


# Admin Endpoints (Require Admin Role)
@app.route("/api/admin/users", methods=["GET"])
@require_permission("view_admin_panel")
def get_admin_users():
    """List all users (moved from /api/users)"""
    return handle_get_users()


@app.route("/api/admin/users/role", methods=["PUT"])
@require_permission("manage_users")
def update_admin_user_role():
    """Update user role (moved from /api/users/role)"""
    return handle_update_user_role()


@app.route("/api/admin/users/stats", methods=["GET"])
@require_permission("view_admin_panel")
def get_admin_user_stats():
    """User statistics (moved from /api/user/stats)"""
    return handle_get_user_stats()


@app.route("/api/admin/scraping/start", methods=["POST"])
@require_permission("manage_scraping")
def start_admin_scraping():
    """Start scraping (moved from /api/start-scraping)"""
    # TODO: Implement scraping start with admin authentication
    return jsonify({"success": True, "message": "Scraping started"})


@app.route("/api/admin/scraping/status", methods=["GET"])
@require_permission("view_admin_panel")
def get_admin_scraping_status():
    """Scraping status (moved from /api/scraping-status)"""
    # TODO: Implement scraping status with admin authentication
    return jsonify({"status": "idle", "message": "No scraping in progress"})


@app.route("/api/admin/database/backup", methods=["GET"])
@require_permission("manage_database")
def backup_admin_database():
    """Database backup (moved from /api/backup-database, ADD AUTH!)"""
    return handle_backup_database()


@app.route("/api/admin/database/restore", methods=["POST"])
@require_permission("manage_database")
def restore_admin_database():
    """Database restore (moved from /api/restore-database, ADD AUTH!)"""
    return handle_restore_database()


# Mixed Auth Cart Endpoints (work for both logged-in and anonymous users)
@app.route("/api/users/me/cart", methods=["GET"])
def get_cart():
    """Get cart contents - works for both logged-in and anonymous users"""
    from auth import get_current_user

    user = get_current_user()
    if user:
        # Logged in: get from user's saved hand in database
        return handle_get_user_hand()
    else:
        # Not logged in: get from session storage (handled by frontend)
        return jsonify(
            {"hand": [], "message": "Anonymous user - cart managed by frontend"}
        )


@app.route("/api/users/me/cart/cards", methods=["POST"])
def add_cards_to_cart():
    """Add cards to cart - works for both logged-in and anonymous users"""
    from auth import get_current_user

    user = get_current_user()
    if user:
        # Logged in: save to user's database
        return handle_save_user_hand()
    else:
        # Not logged in: save to session (handled by frontend)
        return jsonify(
            {"success": True, "message": "Anonymous user - cart managed by frontend"}
        )


@app.route("/api/users/me/cart/cards/<card_id>", methods=["PUT"])
def update_cart_card_quantity(card_id):
    """Update card quantity in cart"""
    from auth import get_current_user

    user = get_current_user()
    if user:
        # Logged in: update in database
        # TODO: Implement individual card quantity update
        return jsonify({"success": True, "message": "Card quantity updated"})
    else:
        # Not logged in: handled by frontend
        return jsonify(
            {"success": True, "message": "Anonymous user - cart managed by frontend"}
        )


@app.route("/api/users/me/cart/cards/<card_id>", methods=["DELETE"])
def remove_card_from_cart(card_id):
    """Remove card from cart"""
    from auth import get_current_user

    user = get_current_user()
    if user:
        # Logged in: remove from database
        # TODO: Implement individual card removal
        return jsonify({"success": True, "message": "Card removed"})
    else:
        # Not logged in: handled by frontend
        return jsonify(
            {"success": True, "message": "Anonymous user - cart managed by frontend"}
        )


@app.route("/api/users/me/cart", methods=["DELETE"])
def clear_cart():
    """Clear entire cart"""
    from auth import get_current_user

    user = get_current_user()
    if user:
        # Logged in: clear from database
        # TODO: Implement cart clearing
        return jsonify({"success": True, "message": "Cart cleared"})
    else:
        # Not logged in: handled by frontend
        return jsonify(
            {"success": True, "message": "Anonymous user - cart managed by frontend"}
        )


# TCGPlayer Integration
@app.route("/api/tcgplayer/mass-entry", methods=["POST"])
def generate_tcgplayer_mass_entry_url():
    """Generate TCGPlayer Mass Entry URL from a list of cards"""
    try:
        data = request.get_json()
        card_ids = data.get("card_ids", [])  # List of {card_id: str, quantity: int}

        if not card_ids:
            return jsonify({"error": "No cards provided"}), 400

        # Get card data from database
        conn = get_db_connection()
        product_ids = [str(card["card_id"]) for card in card_ids]
        placeholders = ",".join(["?" for _ in product_ids])

        query = f"""
            SELECT c.name, c.product_id, ca_number.value as number
            FROM cards c
            LEFT JOIN card_attributes ca_number ON c.id = ca_number.card_id AND ca_number.name = 'Number'
            WHERE c.product_id IN ({placeholders})
        """

        print(f"🔍 Query: {query}")
        print(f"🔍 Product IDs: {product_ids}")
        cursor = conn.execute(query, product_ids)
        rows = cursor.fetchall()
        print(f"🔍 Found {len(rows)} cards in database")
        conn.close()

        # Create a map of product_id to card data (convert to string for comparison)
        card_map = {str(row["product_id"]): row for row in rows}
        print(f"🔍 Card map keys: {list(card_map.keys())}")

        # Build the Mass Entry format
        entries = []
        for card in card_ids:
            card_id = str(card["card_id"])  # Convert to string for lookup
            quantity = card.get("quantity", 1)

            print(f"🔍 Looking for card_id: {card_id} (type: {type(card_id)})")
            if card_id not in card_map:
                print(f"⚠️ Card {card_id} not found in card_map")
                continue

            card_data = card_map[card_id]
            print(f"✅ Found card: {card_data['name']}")
            card_name = card_data["name"]
            number = card_data["number"]

            if not number:
                # If no number attribute, just use name
                entries.append(f"{quantity} {card_name}")
                continue

            # Extract set code and card number from Number attribute
            # Format: UE13BT/YYH-1-038 -> set_code: UE13BT, card_num: 038
            try:
                parts = number.split("/")
                set_code = parts[0] if parts else ""

                # Get the last part after the last dash for card number
                if len(parts) > 1:
                    number_parts = parts[1].split("-")
                    card_num = number_parts[-1] if number_parts else ""
                else:
                    card_num = ""

                # Format: {qty} {name} [{set_code}]
                # TCGPlayer seems to match on name and set code, not individual card numbers
                if set_code:
                    entry = f"{quantity} {card_name} [{set_code}]"
                else:
                    entry = f"{quantity} {card_name}"

                entries.append(entry)
            except Exception as e:
                # Fallback to just name if parsing fails
                print(f"Error parsing number for {card_name}: {e}")
                entries.append(f"{quantity} {card_name}")

        # Join with || separator and URL encode
        from urllib.parse import quote

        cards_param = "||".join(entries)
        encoded_cards = quote(cards_param)

        # Build the full URL
        mass_entry_url = f"https://www.tcgplayer.com/massentry?productline=Union%20Arena&c={encoded_cards}"

        return jsonify(
            {
                "success": True,
                "url": mass_entry_url,
                "entries": entries,
                "count": len(entries),
            }
        )

    except Exception as e:
        print(f"Error generating TCGPlayer Mass Entry URL: {e}")
        return jsonify({"error": str(e)}), 500


# Catch-all route for serving Next.js static files (must be last!)
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve Next.js static files and routes"""

    # Clean up the path
    clean_path = path.rstrip("/")

    # Try different variations of the path
    paths_to_try = [
        path,  # Original path
        f"{clean_path}/index.html",  # Directory with index.html
        clean_path,  # Path without trailing slash
    ]

    for try_path in paths_to_try:
        try:
            return send_from_directory("frontend", try_path)
        except FileNotFoundError:
            continue

    # If nothing works, serve the main index.html for client-side routing
    return send_from_directory("frontend", "index.html")


# Initialize database when app starts (for Cloud Run)
init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(
        app,
        debug=True,
        use_reloader=True,
        host="0.0.0.0",
        port=port,
        allow_unsafe_werkzeug=True,
    )
