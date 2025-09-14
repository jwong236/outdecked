"""
OutDecked - Card Management Web Application
Main Flask application with routes and business logic.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os
import json
import threading
import time
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

# Enable CORS for all routes
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

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
    return render_template("home.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/scraping")
def scraping():
    return render_template("scraping.html")


@app.route("/api/start-scraping", methods=["POST"])
def start_scraping():
    """Start the Union Arena card scraping process"""
    try:
        # Import here to avoid circular imports
        from scraper import TCGCSVScraper
        import threading

        def run_scraping():
            scraper = TCGCSVScraper()
            try:
                logger.info("🚀 Starting Union Arena card scraping...")
                cards = scraper.scrape_all_union_arena_cards()
                logger.info(f"🎉 Scraping completed! Total cards: {len(cards)}")
            except Exception as e:
                logger.error(f"❌ Scraping failed: {e}")

        # Run scraping in background thread
        scraping_thread = threading.Thread(target=run_scraping)
        scraping_thread.daemon = True
        scraping_thread.start()

        return jsonify({"status": "success", "message": "Scraping started"})

    except Exception as e:
        logger.error(f"❌ Failed to start scraping: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/scraping-status", methods=["GET"])
def get_scraping_status():
    """Get current scraping status and logs with detailed statistics"""
    try:
        # Read the latest log entries from outdecked.log (where scraper actually logs)
        log_file = "outdecked.log"
        if os.path.exists(log_file):
            with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                # Get last 100 lines for better statistics parsing
                recent_lines = lines[-100:] if len(lines) > 100 else lines
                logs = [line.strip() for line in recent_lines if line.strip()]
        else:
            logs = ["[INFO] No logs available yet"]

        # Parse statistics from logs
        stats = {
            "is_running": False,
            "current_group": None,
            "current_group_number": 0,
            "total_groups": 47,  # Union Arena has 47 groups
            "current_card": 0,
            "total_cards_in_group": 0,
            "cards_processed": 0,
            "groups_completed": 0,
            "estimated_time_remaining": "Unknown",
            "current_operation": "Idle",
        }

        # Check if scraping is running and parse statistics
        if logs:
            import time
            import re

            # Look for recent activity (within last 5 minutes)
            current_time = time.time()
            recent_activity = False

            for log in logs[-20:]:  # Check last 20 log entries
                if "Starting Union Arena card scraping" in log:
                    stats["is_running"] = True
                    stats["current_operation"] = "Starting"
                    recent_activity = True
                elif "Processing group" in log:
                    stats["is_running"] = True
                    stats["current_operation"] = "Processing Group"
                    recent_activity = True
                    # Extract group number: "Processing group 1/47: Attack on Titan"
                    match = re.search(r"Processing group (\d+)/(\d+): (.+)", log)
                    if match:
                        stats["current_group_number"] = int(match.group(1))
                        stats["total_groups"] = int(match.group(2))
                        stats["current_group"] = match.group(3)
                        stats["groups_completed"] = stats["current_group_number"] - 1
                elif "Processing card" in log:
                    stats["is_running"] = True
                    stats["current_operation"] = "Scraping Cards"
                    recent_activity = True
                    # Extract card progress: "Processing card 18/134: Erwin Smith"
                    match = re.search(r"Processing card (\d+)/(\d+):", log)
                    if match:
                        stats["current_card"] = int(match.group(1))
                        stats["total_cards_in_group"] = int(match.group(2))
                        stats["cards_processed"] = stats["current_card"] - 1
                elif "Successfully scraped" in log:
                    stats["is_running"] = True
                    recent_activity = True
                elif "Saved" in log and "cards from" in log and "to database" in log:
                    # Group completed: "Saved 134 cards from Attack on Titan to database"
                    match = re.search(r"Saved (\d+) cards from (.+) to database", log)
                    if match:
                        cards_saved = int(match.group(1))
                        group_name = match.group(2)
                        stats["groups_completed"] += 1
                elif "Scraping completed" in log or "WebDriver closed" in log:
                    stats["is_running"] = False
                    stats["current_operation"] = "Completed"
                    break

            # Calculate estimated time remaining
            if (
                stats["is_running"]
                and stats["current_card"] > 0
                and stats["total_cards_in_group"] > 0
            ):
                # Estimate based on 10 seconds per card + processing time
                cards_remaining_in_group = (
                    stats["total_cards_in_group"] - stats["current_card"]
                )
                groups_remaining = stats["total_groups"] - stats["current_group_number"]

                # Rough estimate: 10 seconds per card + 30 seconds per group completion
                time_per_card = 10  # seconds
                time_per_group_completion = 30  # seconds

                time_remaining_seconds = (
                    cards_remaining_in_group * time_per_card
                    + groups_remaining
                    * (
                        stats["total_cards_in_group"] * time_per_card
                        + time_per_group_completion
                    )
                )

                if time_remaining_seconds < 3600:  # Less than 1 hour
                    stats["estimated_time_remaining"] = (
                        f"{time_remaining_seconds // 60} minutes"
                    )
                else:  # More than 1 hour
                    hours = time_remaining_seconds // 3600
                    minutes = (time_remaining_seconds % 3600) // 60
                    stats["estimated_time_remaining"] = f"{hours}h {minutes}m"

        return jsonify(
            {
                "status": "success",
                "logs": logs[-20:],  # Return last 20 log entries
                "statistics": stats,
            }
        )

    except Exception as e:
        logger.error(f"❌ Failed to get scraping status: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


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
    cursor = conn.execute("SELECT name, display_name FROM categories ORDER BY name")
    games = [
        {"name": row["name"], "display": row["display_name"]}
        for row in cursor.fetchall()
    ]
    conn.close()
    return jsonify(games)


@app.route("/api/filter-fields")
def api_filter_fields():
    return handle_filter_fields()


@app.route("/api/filter-values/<field>")
def api_filter_values(field):
    game = request.args.get("game")
    return handle_filter_values(field, game)


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
    """Get statistics for all games"""
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


@app.route("/api/card-by-url")
def get_card_by_url():
    """Get a specific card by URL"""
    card_url = request.args.get("url")
    if not card_url:
        return jsonify({"error": "URL parameter is required"}), 400

    conn = get_db_connection()
    cursor = conn.execute("SELECT * FROM cards WHERE card_url = ?", (card_url,))
    card = cursor.fetchone()
    conn.close()

    if card:
        return jsonify({"success": True, "card": dict(card)})
    else:
        return jsonify({"success": False, "error": "Card not found"}), 404


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
