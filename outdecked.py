"""
OutDecked - Card Management Web Application
Main Flask application with routes and business logic.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_socketio import SocketIO, emit
import os
import json
import threading
import time
from datetime import datetime
from config import Config

# from models import scraping_status, GAME_URLS, SUPPORTED_GAMES, METADATA_FIELDS_EXACT  # Moved to scraping_archive
from database import (
    init_db,
    get_db_connection,
    get_max_pages_for_game,
    update_max_pages_for_game,
    save_cards_to_db,
)

# from scraper import add_scraping_log  # Moved to scraping_archive
from search import (
    handle_api_search,
    handle_filter_values,
    handle_metadata_fields,
    handle_metadata_values,
    handle_anime_values,
    handle_color_values,
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
socketio = SocketIO(app, cors_allowed_origins="*")


# Routes
@app.route("/")
def index():
    return render_template("home.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


# @app.route("/admin/scraping")  # DISABLED - template moved to scraping_archive
# def admin_scraping():
#     return render_template("admin_scraping.html")


@app.route("/deckbuilder")
def deckbuilder():
    return render_template("deckbuilder.html")


# Deck Builder API Routes
@app.route("/api/decks", methods=["GET"])
def get_decks():
    return handle_get_decks()


@app.route("/api/decks", methods=["POST"])
def create_deck():
    return handle_create_deck()


@app.route("/api/decks/<deck_id>", methods=["GET"])
def get_deck(deck_id):
    return handle_get_deck(deck_id)


@app.route("/api/decks/<deck_id>", methods=["PUT"])
def update_deck(deck_id):
    return handle_update_deck(deck_id)


@app.route("/api/decks/<deck_id>", methods=["DELETE"])
def delete_deck(deck_id):
    return handle_delete_deck(deck_id)


@app.route("/api/decks/<deck_id>/cards", methods=["POST"])
def add_card_to_deck(deck_id):
    return handle_add_card_to_deck(deck_id)


@app.route("/api/decks/<deck_id>/cards/<card_id>", methods=["PUT"])
def update_card_quantity(deck_id, card_id):
    return handle_update_card_quantity(deck_id, card_id)


@app.route("/api/decks/<deck_id>/cards/<card_id>", methods=["DELETE"])
def remove_card_from_deck(deck_id, card_id):
    return handle_remove_card_from_deck(deck_id, card_id)


@app.route("/api/deck-validation-rules", methods=["GET"])
def get_validation_rules():
    return handle_get_validation_rules()


@app.route("/proxy-printer")
def proxy_printer():
    return render_template("proxy_printer.html")


@app.route("/cart")
def cart():
    return render_template("cart.html")


@app.route("/search")
def search_cards():
    query = request.args.get("q", "").strip()
    game_filter = request.args.get("game", "")

    conn = get_db_connection()

    if query:
        if game_filter:
            cursor = conn.execute(
                """
                SELECT * FROM cards 
                WHERE name LIKE ? AND game = ?
                ORDER BY name
            """,
                (f"%{query}%", game_filter),
            )
        else:
            cursor = conn.execute(
                """
                SELECT * FROM cards 
                WHERE name LIKE ?
                ORDER BY name
            """,
                (f"%{query}%",),
            )
    else:
        if game_filter:
            cursor = conn.execute(
                """
                SELECT * FROM cards 
                WHERE game = ?
                ORDER BY name
            """,
                (game_filter,),
            )
        else:
            cursor = conn.execute("SELECT * FROM cards ORDER BY name")

    cards = cursor.fetchall()
    conn.close()

    return render_template(
        "search.html", cards=cards, query=query, game_filter=game_filter
    )


@app.route("/api/search")
def api_search():
    return handle_api_search()


@app.route("/games")
def get_games():
    conn = get_db_connection()
    cursor = conn.execute("SELECT DISTINCT game FROM cards ORDER BY game")
    games = [row["game"] for row in cursor.fetchall()]
    conn.close()
    return jsonify(games)


@app.route("/api/filter-values/<field>")
def get_filter_values(field):
    return handle_filter_values(field)


@app.route("/api/metadata-fields/<game>")
def get_metadata_fields(game):
    return handle_metadata_fields(game)


@app.route("/api/metadata-values/<game>/<field>")
def get_metadata_values(game, field):
    return handle_metadata_values(game, field)


@app.route("/api/anime-values")
def get_anime_values():
    return handle_anime_values()


@app.route("/api/color-values")
def get_color_values():
    return handle_color_values()


@app.route("/stats")
def get_stats():
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


# Health check endpoint for Cloud Run
@app.route("/health")
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route("/api/game-stats")
def get_game_stats():
    """Get statistics for all games including max pages found"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get max pages for each game
    cursor.execute(
        "SELECT game_name, max_pages_found, last_updated FROM game_stats ORDER BY game_name"
    )
    game_stats = cursor.fetchall()

    # Get card counts for each game
    cursor.execute("SELECT game, COUNT(*) as card_count FROM cards GROUP BY game")
    card_counts = {row["game"]: row["card_count"] for row in cursor.fetchall()}

    conn.close()

    # Combine the data
    stats = []
    for stat in game_stats:
        game_name = stat["game_name"]
        stats.append(
            {
                "game_name": game_name,
                "max_pages_found": stat["max_pages_found"],
                "card_count": card_counts.get(game_name, 0),
                "last_updated": stat["last_updated"],
            }
        )

    return jsonify(stats)


@app.route("/api/card/<int:card_id>")
def get_card(card_id):
    """Get a specific card by ID"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT * FROM cards WHERE id = ?", (card_id,))
    card = cursor.fetchone()
    conn.close()

    if card:
        return jsonify(dict(card))
    else:
        return jsonify({"error": "Card not found"}), 404


@app.route("/api/generate-pdf", methods=["POST"])
def generate_pdf():
    """Generate PDF for selected cards (placeholder for now)"""
    data = request.get_json()
    cards = data.get("cards", [])
    layout = data.get("layout", {})

    if not cards:
        return jsonify({"error": "No cards selected"}), 400

    # TODO: Implement actual PDF generation
    # For now, return a placeholder response
    return jsonify(
        {
            "message": f"PDF generation for {len(cards)} cards requested",
            "layout": layout,
            "status": "placeholder",
        }
    )


@app.route("/api/stats")
def api_stats():
    """API endpoint for basic statistics"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT COUNT(*) as total FROM cards")
    total_cards = cursor.fetchone()["total"]

    cursor = conn.execute("SELECT COUNT(DISTINCT game) as games FROM cards")
    total_games = cursor.fetchone()["games"]

    conn.close()

    return jsonify(
        {
            "total_cards": total_cards,
            "game_count": total_games,
            "last_scrape": "Never",  # TODO: Track last scrape time
            "cards_today": 0,  # TODO: Track cards added today
        }
    )


@app.route("/api/backup-database", methods=["GET"])
def backup_database():
    """Download the current database as a backup file"""
    try:
        # Check if database file exists
        if not os.path.exists("cards.db"):
            return jsonify({"error": "Database file not found"}), 404

        # Read the database file
        with open("cards.db", "rb") as db_file:
            db_data = db_file.read()

        # Create response with database file
        response = app.response_class(
            db_data,
            mimetype="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename=outdecked_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
            },
        )
        return response
    except Exception as e:
        return jsonify({"error": f"Failed to backup database: {str(e)}"}), 500


@app.route("/api/restore-database", methods=["POST"])
def restore_database():
    """Upload and restore a database backup file"""
    try:

        # Check if file was uploaded
        if "database_file" not in request.files:
            return jsonify({"error": "No database file uploaded"}), 400

        file = request.files["database_file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        # Validate file extension
        if not file.filename.endswith(".db"):
            return (
                jsonify({"error": "Invalid file type. Please upload a .db file"}),
                400,
            )

        # Read the uploaded file
        db_data = file.read()

        # Delete current database if it exists
        if os.path.exists("cards.db"):
            os.remove("cards.db")

        # Write the new database
        with open("cards.db", "wb") as db_file:
            db_file.write(db_data)

        # Verify the database is valid by trying to connect
        try:
            import sqlite3

            conn = sqlite3.connect("cards.db")
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()

            if not tables:
                return (
                    jsonify({"error": "Invalid database file - no tables found"}),
                    400,
                )

        except sqlite3.Error:
            return (
                jsonify(
                    {"error": "Invalid database file - corrupted or invalid format"}
                ),
                400,
            )

        return jsonify({"message": "Database restored successfully"})

    except Exception as e:
        return jsonify({"error": f"Failed to restore database: {str(e)}"}), 500


# Initialize database when app starts (for Cloud Run)
init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, debug=True, use_reloader=True, host="0.0.0.0", port=port)
