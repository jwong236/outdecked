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
    handle_add_card_to_deck,
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
def deckbuilder():
    return send_from_directory("frontend", "index.html")


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
@app.route("/api/cards")
def api_cards():
    """Search cards (renamed from /api/search)"""
    return handle_api_search()


@app.route("/api/cards/<int:card_id>")
def get_card_by_id(card_id):
    """Get specific card by product_id"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT * FROM cards WHERE product_id = ?", (card_id,))
    card = cursor.fetchone()
    conn.close()

    if card:
        return jsonify(dict(card))
    else:
        return jsonify({"error": "Card not found"}), 404


@app.route("/api/cards/attributes")
def api_cards_attributes():
    """List all available card attributes (renamed from /api/filter-fields)"""
    return handle_filter_fields()


@app.route("/api/cards/attributes/<field>")
def api_cards_attribute_values(field):
    """Get distinct values for specific attribute (renamed from /api/filter-values/<field>)"""
    game = request.args.get("game")
    return handle_filter_values(field, game)


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


@app.route("/api/stats")
def get_stats():
    """Get basic application statistics"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT COUNT(*) as total FROM cards")
    total_cards = cursor.fetchone()["total"]

    cursor = conn.execute("SELECT COUNT(DISTINCT game) as games FROM cards")
    total_games = cursor.fetchone()["games"]

    cursor = conn.execute(
        "SELECT game, COUNT(*) as count FROM cards GROUP BY game ORDER BY count DESC"
    )
    game_stats = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify(
        {
            "total_cards": total_cards,
            "total_games": total_games,
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


@app.route("/api/stats/games")
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


@app.route("/api/images")
def get_image():
    """Fetch and return image content (renamed from /api/proxy-image)"""
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "URL parameter is required"}), 400

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        # Return the image with proper headers
        return (
            response.content,
            200,
            {
                "Content-Type": response.headers.get("Content-Type", "image/jpeg"),
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            },
        )
    except requests.RequestException as e:
        return jsonify({"error": f"Failed to fetch image: {str(e)}"}), 400


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
@app.route("/api/user/preferences", methods=["GET"])
@app.route("/api/user/preferences/", methods=["GET"])
def get_user_preferences():
    """Get user preferences"""
    return handle_get_user_preferences()


@app.route("/api/user/preferences", methods=["PUT"])
@app.route("/api/user/preferences/", methods=["PUT"])
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
@app.route("/api/user/hand", methods=["GET"])
def get_user_hand():
    """Get user's saved hand"""
    return handle_get_user_hand()


@app.route("/api/user/hand", methods=["POST"])
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
@app.route("/api/cart", methods=["GET"])
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


@app.route("/api/cart/cards", methods=["POST"])
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


@app.route("/api/cart/cards/<card_id>", methods=["PUT"])
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


@app.route("/api/cart/cards/<card_id>", methods=["DELETE"])
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


@app.route("/api/cart", methods=["DELETE"])
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
    socketio.run(app, debug=True, use_reloader=True, host="0.0.0.0", port=port)
