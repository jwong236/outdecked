"""
OutDecked - Card Management Web Application
Main Flask application with routes and business logic.
"""

from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_socketio import SocketIO, emit
import os
import json
import threading
from datetime import datetime
from config import Config
from models import scraping_status, GAME_URLS, SUPPORTED_GAMES, METADATA_FIELDS_EXACT
from database import (
    init_db,
    get_db_connection,
    get_max_pages_for_game,
    update_max_pages_for_game,
    save_cards_to_db,
)
from scraper import (
    add_scraping_log,
    scrape_tcgplayer_page_selenium,
    scrape_individual_card,
)

app = Flask(__name__)
app.config.from_object(Config)
socketio = SocketIO(app, cors_allowed_origins="*")


# Routes
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/admin/scraping")
def admin_scraping():
    return render_template("admin_scraping.html")


@app.route("/deckbuilder")
def deckbuilder():
    return render_template("deckbuilder.html")


@app.route("/proxy-printer")
def proxy_printer():
    return render_template("proxy_printer.html")


@app.route("/scrape", methods=["POST"])
def start_scraping():
    # Check if scraping is already running
    if scraping_status["is_running"]:
        return (
            jsonify(
                {
                    "error": "Scraping is already in progress. Please wait for it to complete or stop it first."
                }
            ),
            409,
        )

    data = request.get_json()
    game_name = data.get("game_name", "Unknown Game")
    start_page = int(data.get("start_page", 1))
    end_page = data.get("end_page")  # Can be None for infinite

    base_url = GAME_URLS.get(game_name)
    if not base_url:
        return jsonify({"error": "Invalid game selection"}), 400

    def scrape_pages():
        global scraping_status
        total_cards = 0
        consecutive_empty_pages = 0
        max_empty_pages = 3  # Stop if we hit 3 consecutive empty pages
        actual_max_page = 0  # Track the actual highest page with cards
        highest_page_reached = 0  # Track the highest page we actually reached

        # Update scraping status
        scraping_status.update(
            {
                "is_running": True,
                "current_page": start_page,
                "end_page": end_page if end_page else "∞",
                "game_name": game_name,
                "cards_found": 0,
                "should_stop": False,
            }
        )

        page_num = start_page
        while True:
            # Track the highest page we've reached
            highest_page_reached = page_num

            # Update current page in status
            scraping_status["current_page"] = page_num

            # Check if we should stop
            if scraping_status["should_stop"]:
                print("Scraping stopped by user request")
                break

            # Check if we've reached the end page (for finite scraping)
            if end_page and page_num > end_page:
                print(f"Reached end page {end_page}")
                add_scraping_log(f"Reached end page {end_page}", "info", socketio)
                break
            try:
                # Construct page URL
                if "page=" in base_url:
                    import re

                    page_url = base_url.replace(
                        re.search(r"page=\d+", base_url).group(), f"page={page_num}"
                    )
                else:
                    separator = "&" if "?" in base_url else "?"
                    page_url = f"{base_url}{separator}page={page_num}"

                print(f"Scraping page {page_num}: {page_url}")
                add_scraping_log(f"Scraping page {page_num}...", "info", socketio)

                # Update current page status
                scraping_status["current_page"] = page_num

                # Scrape the page using Selenium to handle JavaScript
                cards = scrape_tcgplayer_page_selenium(
                    page_url,
                    game_name,
                    lambda: scraping_status["should_stop"],
                    socketio,
                )
                if cards:
                    # Save to database
                    save_cards_to_db(cards)
                    total_cards += len(cards)
                    consecutive_empty_pages = 0  # Reset counter
                    actual_max_page = page_num  # Update the actual max page found
                    print(f"Found {len(cards)} cards on page {page_num}")
                    add_scraping_log(
                        f"Found {len(cards)} cards on page {page_num}",
                        "success",
                        socketio,
                    )

                    # Update scraping status with new card count
                    scraping_status["cards_found"] = total_cards

                    # Update max pages found in real-time
                    current_max = get_max_pages_for_game(game_name)
                    if page_num > current_max:
                        update_max_pages_for_game(game_name, page_num)
                        print(
                            f"Updated max pages for {game_name}: {current_max} -> {page_num}"
                        )
                        add_scraping_log(
                            f"Updated max pages for {game_name}: {current_max} -> {page_num}",
                            "info",
                            socketio,
                        )

                    # Emit real-time stats update
                    try:
                        # Get updated stats
                        conn = get_db_connection()
                        cursor = conn.cursor()
                        cursor.execute("SELECT COUNT(*) FROM cards")
                        total_cards_db = cursor.fetchone()[0]

                        cursor.execute("SELECT game, COUNT(*) FROM cards GROUP BY game")
                        game_stats = dict(cursor.fetchall())

                        conn.close()

                        # Emit stats update via SocketIO
                        socketio.emit(
                            "stats_update",
                            {"total_cards": total_cards_db, "game_stats": game_stats},
                        )
                    except Exception as e:
                        print(f"Error updating stats: {e}")
                else:
                    consecutive_empty_pages += 1
                    print(
                        f"No cards found on page {page_num} (consecutive empty: {consecutive_empty_pages})"
                    )

                    # If we hit consecutive empty pages, stop
                    if consecutive_empty_pages >= max_empty_pages:
                        print(
                            f"Stopping after {max_empty_pages} consecutive empty pages (reached page {page_num})"
                        )
                        add_scraping_log(
                            f"Stopping after {max_empty_pages} consecutive empty pages (reached page {page_num})",
                            "warning",
                            socketio,
                        )
                        break

                # Check for stop signal before delay
                if scraping_status["should_stop"]:
                    print("Scraping stopped by user request")
                    break

                # Be respectful with delays
                import time

                time.sleep(10)

            except Exception as e:
                print(f"Error scraping page {page_num}: {e}")
                # Don't count errors as empty pages - just retry or continue
                page_num += 1
                continue

            # Increment page number for next iteration
            page_num += 1

        print(f"Scraping completed. Total cards found: {total_cards}")
        print(f"Highest page reached: {highest_page_reached}")
        print(f"Actual max page with cards: {actual_max_page}")

        # Reset scraping status
        scraping_status.update(
            {
                "is_running": False,
                "current_page": 0,
                "end_page": "∞",
                "game_name": "",
                "cards_found": total_cards,
                "should_stop": False,
            }
        )

    # Start scraping in background thread
    thread = threading.Thread(target=scrape_pages)
    thread.daemon = True
    thread.start()

    return jsonify(
        {
            "message": "Scraping started",
            "start_page": start_page,
        }
    )


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
            order_clause = "ORDER BY (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') DESC"
        elif sort_by == "rarity_asc":
            order_clause = "ORDER BY (SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'rarity') ASC"
        elif sort_by == "number_desc":
            order_clause = "ORDER BY CAST((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'card_number') AS INTEGER) DESC"
        elif sort_by == "number_asc":
            order_clause = "ORDER BY CAST((SELECT field_value FROM card_metadata WHERE card_id = c.id AND field_name = 'card_number') AS INTEGER) ASC"
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


@app.route("/games")
def get_games():
    conn = get_db_connection()
    cursor = conn.execute("SELECT DISTINCT game FROM cards ORDER BY game")
    games = [row["game"] for row in cursor.fetchall()]
    conn.close()
    return jsonify(games)


@app.route("/api/filter-values/<field>")
def get_filter_values(field):
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
    return jsonify([row[0] for row in values])


@app.route("/api/metadata-fields/<game>")
def get_metadata_fields(game):
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


@app.route("/api/metadata-values/<game>/<field>")
def get_metadata_values(game, field):
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


@app.route("/api/anime-values")
def get_anime_values():
    """Get all unique anime/series values (legacy endpoint)"""
    return get_metadata_values("Union Arena", "series")


@app.route("/api/color-values")
def get_color_values():
    """Get all unique color values (legacy endpoint)"""
    return get_metadata_values("Union Arena", "color")


@app.route("/api/games")
def get_supported_games():
    """Get list of supported games for scraping"""
    return jsonify(SUPPORTED_GAMES)


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


@app.route("/api/scraping-status")
def get_scraping_status():
    return jsonify(scraping_status)


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


@app.route("/api/stop-scraping", methods=["POST"])
def stop_scraping():
    global scraping_status
    scraping_status["should_stop"] = True
    return jsonify({"message": "Stop signal sent"})


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
        # Check if scraping is currently running
        if scraping_status.get("is_running", False):
            return (
                jsonify({"error": "Cannot restore database while scraping is running"}),
                400,
            )

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
    socketio.run(app, debug=False, host="0.0.0.0", port=port)
