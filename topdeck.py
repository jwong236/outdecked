from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
import requests
from bs4 import BeautifulSoup
import sqlite3
import os
import time
import json
from urllib.parse import urljoin, urlparse
import threading
from datetime import datetime
import re
from config import Config
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

app = Flask(__name__)
app.config.from_object(Config)

# Global variables for scraping status
scraping_status = {
    "is_running": False,
    "current_page": 0,
    "total_pages": 0,
    "game_name": "",
    "cards_found": 0,
    "should_stop": False,
}


# Database setup
def init_db():
    conn = sqlite3.connect("cards.db")
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_url TEXT NOT NULL,
            card_url TEXT NOT NULL,
            game TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    # Add table to track max pages found for each game
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS game_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_name TEXT UNIQUE NOT NULL,
            max_pages_found INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )
    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect("cards.db")
    conn.row_factory = sqlite3.Row
    return conn


def get_max_pages_for_game(game_name):
    """Get the maximum pages found for a specific game"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT max_pages_found FROM game_stats WHERE game_name = ?", (game_name,)
    )
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0


def update_max_pages_for_game(game_name, max_pages):
    """Update the maximum pages found for a specific game"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR REPLACE INTO game_stats (game_name, max_pages_found, last_updated)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    """,
        (game_name, max_pages),
    )
    conn.commit()
    conn.close()


# Scraping functions
def scrape_tcgplayer_page_selenium(url, game_name, should_stop_callback=None):
    """Scrape a TCGPlayer page using Selenium to handle JavaScript rendering"""
    import re  # Move import to top of function

    driver = None
    try:
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in background
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # Setup Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)

        print(f"Loading page with Selenium: {url}")
        driver.get(url)

        # Check for stop signal before waiting
        if should_stop_callback and should_stop_callback():
            print("Stop signal received before page processing")
            return []

        # Wait for content to load
        wait = WebDriverWait(driver, 10)

        # Be respectful - add delay to respect robots.txt
        time.sleep(2)

        # Check for stop signal after initial delay
        if should_stop_callback and should_stop_callback():
            print("Stop signal received after initial delay")
            return []

        # Wait for either search results or a "no results" message
        try:
            # Wait for search results to appear
            wait.until(
                EC.any_of(
                    EC.presence_of_element_located(
                        (By.CLASS_NAME, "search-result__product")
                    ),
                    EC.presence_of_element_located((By.CLASS_NAME, "no-results")),
                    EC.presence_of_element_located((By.CLASS_NAME, "search-results")),
                )
            )

            # Wait for images to load (additional delay for lazy loading)
            time.sleep(3)

            # Check for stop signal after image loading delay
            if should_stop_callback and should_stop_callback():
                print("Stop signal received after image loading delay")
                return []

            # Try to wait for at least one real image to load
            try:
                wait.until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, "img[src*='tcgplayer-cdn.tcgplayer.com']")
                    )
                )
            except:
                print("No real images loaded yet, proceeding with what we have")

        except:
            print("Timeout waiting for content to load")

        # Get page source after JavaScript execution
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")

        # Debug: Check what we got
        print(
            f"Page title: {soup.find('title').get_text() if soup.find('title') else 'No title'}"
        )
        print(
            f"Body content length: {len(soup.find('body').get_text()) if soup.find('body') else 0}"
        )

        # Look for search results
        card_items = soup.find_all("div", class_="search-result__product")
        print(f"Found {len(card_items)} items with 'search-result__product' class")

        cards = []
        for item in card_items:
            try:
                # Extract card URL
                card_link = item.find("a", href=re.compile(r"/product/\d+/"))
                if card_link:
                    card_url = card_link["href"]
                    if card_url.startswith("/"):
                        card_url = "https://www.tcgplayer.com" + card_url

                    # Extract card image - prioritize real images over placeholders
                    img_tag = item.find("img")
                    image_url = None
                    if img_tag:
                        # Try multiple image sources
                        image_url = (
                            img_tag.get("src")
                            or img_tag.get("data-src")
                            or img_tag.get("data-lazy-src")
                        )

                        if image_url:
                            if image_url.startswith("//"):
                                image_url = "https:" + image_url
                            # Skip placeholder images
                            if (
                                image_url
                                == "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                            ):
                                image_url = None

                    # If no image URL found, generate one from the product ID
                    if not image_url and card_url:
                        # Extract product ID from URL (e.g., /product/649456/...)
                        product_id_match = re.search(r"/product/(\d+)/", card_url)
                        if product_id_match:
                            product_id = product_id_match.group(1)
                            image_url = f"https://tcgplayer-cdn.tcgplayer.com/product/{product_id}_in_1000x1000.jpg"

                    # Extract card name
                    card_name = ""
                    if img_tag and img_tag.get("alt"):
                        card_name = img_tag.get("alt")
                    else:
                        # Extract from URL
                        url_parts = card_url.split("/")
                        if len(url_parts) > 2:
                            last_part = url_parts[-1].split("?")[0]
                            card_name = last_part.replace("-", " ").title()

                    if card_url and card_name:
                        cards.append(
                            {
                                "name": card_name.strip(),
                                "image_url": image_url or "",
                                "card_url": card_url,
                                "game": game_name,
                            }
                        )
                        print(f"Found card: {card_name} -> {card_url}")

            except Exception as e:
                print(f"Error processing card item: {e}")
                continue

        return cards

    except Exception as e:
        print(f"Error with Selenium scraping: {e}")
        return []
    finally:
        if driver:
            driver.quit()


def scrape_tcgplayer_page(url, game_name):
    """Scrape a single TCGPlayer page for card data"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")
        cards = []

        # Debug: Print page title and some basic info
        title = soup.find("title")
        print(f"Page title: {title.get_text() if title else 'No title found'}")

        # Debug: Check if page has any content
        body = soup.find("body")
        if body:
            print(f"Body content length: {len(body.get_text())}")
            # Look for any divs that might contain products
            all_divs = soup.find_all("div")
            print(f"Total divs on page: {len(all_divs)}")

            # Check for any divs with classes containing 'product', 'search', 'result', 'card'
            product_divs = soup.find_all(
                "div", class_=re.compile(r"product|search|result|card", re.I)
            )
            print(f"Divs with product/search/result/card classes: {len(product_divs)}")

            # Print first few div classes for debugging
            for i, div in enumerate(all_divs[:10]):
                if div.get("class"):
                    print(f"Div {i}: {div.get('class')}")

        # Debug: Check for any links
        all_links = soup.find_all("a", href=True)
        print(f"Total links on page: {len(all_links)}")
        product_links = [
            link for link in all_links if "/product/" in link.get("href", "")
        ]
        print(f"Links containing '/product/': {len(product_links)}")

        # Debug: Check for any images
        all_images = soup.find_all("img")
        print(f"Total images on page: {len(all_images)}")

        # Find card grid items using TCGPlayer's Vue.js structure
        card_items = soup.find_all("div", class_="search-result__product")
        print(f"Found {len(card_items)} items with 'search-result__product' class")

        if not card_items:
            # Try alternative selectors as fallback
            card_items = soup.find_all("div", class_="product-details")
            print(f"Found {len(card_items)} items with 'product-details' class")

        if not card_items:
            # Try more generic selectors
            card_items = soup.find_all("a", href=re.compile(r"/product/\d+/"))
            print(f"Found {len(card_items)} items with product links")

        for item in card_items:
            try:
                # For TCGPlayer's Vue.js structure, look for card link in .product-card__content
                card_url = None
                card_link = None

                # First try to find the link in .product-card__content
                product_card_content = item.find("div", class_="product-card__content")
                if product_card_content:
                    card_link = product_card_content.find("a", href=True)
                else:
                    # Fallback: look for any link with product pattern
                    card_link = item.find("a", href=re.compile(r"/product/\d+/"))

                if card_link:
                    card_url = card_link["href"]

                    # Convert relative URLs to absolute
                    if card_url.startswith("/"):
                        card_url = "https://www.tcgplayer.com" + card_url

                    # Extract card image from the item
                    img_tag = item.find("img")
                    image_url = None
                    if img_tag:
                        image_url = (
                            img_tag.get("src")
                            or img_tag.get("data-src")
                            or img_tag.get("data-lazy")
                        )
                        if image_url:
                            # Convert relative URLs to absolute
                            if image_url.startswith("//"):
                                image_url = "https:" + image_url
                            elif image_url.startswith("/"):
                                image_url = "https://www.tcgplayer.com" + image_url

                    # Extract card name
                    card_name = ""
                    if img_tag and img_tag.get("alt"):
                        card_name = img_tag.get("alt")
                    else:
                        # Try to extract from URL (like union-arena-ue10bt-attack-on-titan-levi-010)
                        url_parts = card_url.split("/")
                        if len(url_parts) > 2:
                            last_part = url_parts[-1].split("?")[
                                0
                            ]  # Remove query params
                            card_name = last_part.replace("-", " ").title()

                    # If we have a card URL, add it
                    if card_url and card_name:
                        cards.append(
                            {
                                "name": card_name.strip(),
                                "image_url": image_url or "",  # Allow empty image URL
                                "card_url": card_url,
                                "game": game_name,
                            }
                        )
                        print(f"Found card: {card_name} -> {card_url}")

            except Exception as e:
                print(f"Error processing card item: {e}")
                continue

        return cards
    except Exception as e:
        print(f"Error scraping page {url}: {e}")
        return []


def scrape_individual_card(card_url, game_name):
    """Scrape individual card page for detailed information"""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        response = requests.get(card_url, headers=headers, timeout=30)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")

        # Try to find the card name in various locations
        card_name = None

        # Look for h1 with product name
        h1_tag = soup.find("h1")
        if h1_tag:
            card_name = h1_tag.get_text(strip=True)

        # Look for product title in meta tags
        if not card_name:
            meta_title = soup.find("meta", property="og:title")
            if meta_title:
                card_name = meta_title.get("content", "").strip()

        # Look for breadcrumb navigation
        if not card_name:
            breadcrumbs = soup.find("nav", {"aria-label": "Breadcrumb"})
            if breadcrumbs:
                last_breadcrumb = breadcrumbs.find_all("a")[-1]
                if last_breadcrumb:
                    card_name = last_breadcrumb.get_text(strip=True)

        # Look for image with alt text
        if not card_name:
            img_tag = soup.find("img", alt=True)
            if img_tag:
                card_name = img_tag.get("alt", "").strip()

        if card_name:
            # Find the main product image
            img_tag = soup.find("img", class_="product-image") or soup.find(
                "img", {"data-testid": "product-image"}
            )
            if not img_tag:
                img_tag = soup.find(
                    "img", src=re.compile(r"\.(jpg|jpeg|png|webp)", re.I)
                )

            image_url = None
            if img_tag:
                image_url = img_tag.get("src") or img_tag.get("data-src")
                if image_url:
                    if image_url.startswith("//"):
                        image_url = "https:" + image_url
                    elif image_url.startswith("/"):
                        image_url = "https://www.tcgplayer.com" + image_url

            return {
                "name": card_name,
                "image_url": image_url,
                "card_url": card_url,
                "game": game_name,
            }

        return None
    except Exception as e:
        print(f"Error scraping individual card {card_url}: {e}")
        return None


def save_cards_to_db(cards):
    """Save scraped cards to database with duplicate prevention"""
    conn = get_db_connection()
    cursor = conn.cursor()

    for card in cards:
        if card["name"] and card["card_url"]:  # Only require name and card_url
            # Check if card already exists
            cursor.execute(
                "SELECT id FROM cards WHERE card_url = ?", (card["card_url"],)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing card with new image if it's better
                cursor.execute(
                    "SELECT image_url FROM cards WHERE card_url = ?",
                    (card["card_url"],),
                )
                current_image = cursor.fetchone()[0]

                # If current image is placeholder and new image is real, update it
                if (
                    current_image
                    == "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                    and card["image_url"]
                    and card["image_url"].startswith("https://")
                ):
                    cursor.execute(
                        "UPDATE cards SET image_url = ? WHERE card_url = ?",
                        (card["image_url"], card["card_url"]),
                    )
                    print(f"Updated image for: {card['name']}")
            else:
                # Insert new card
                cursor.execute(
                    """
                    INSERT INTO cards (name, image_url, card_url, game)
                    VALUES (?, ?, ?, ?)
                """,
                    (
                        card["name"],
                        card["image_url"] or "",
                        card["card_url"],
                        card["game"],
                    ),
                )
                print(f"Added new card: {card['name']}")

    conn.commit()
    conn.close()


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
        return jsonify({"error": "Scraping is already in progress. Please wait for it to complete or stop it first."}), 409
    
    data = request.get_json()
    game_name = data.get("game_name", "Unknown Game")
    start_page = int(data.get("start_page", 1))
    end_page = int(data.get("end_page", 10))
    scrape_all = data.get("scrape_all", False)

    # Define base URLs for supported games
    game_urls = {
        "Pokemon": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
        "Union Arena": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
    }

    base_url = game_urls.get(game_name)
    if not base_url:
        return jsonify({"error": "Invalid game selection"}), 400

    def scrape_pages():
        nonlocal start_page, end_page
        global scraping_status
        total_cards = 0
        consecutive_empty_pages = 0
        max_empty_pages = 3  # Stop if we hit 3 consecutive empty pages
        actual_max_page = 0  # Track the actual highest page with cards
        highest_page_reached = 0  # Track the highest page we actually reached

        # Get the previously found max pages for this game
        previous_max_pages = get_max_pages_for_game(game_name)

        # If scraping all, start from page 1 and continue until no more cards
        if scrape_all:
            start_page = 1
            # Use previous max pages + some buffer, or default to 1000 if no previous data
            end_page = (
                max(previous_max_pages + 50, 1000) if previous_max_pages > 0 else 1000
            )
        # else: start_page and end_page are already defined from the outer function scope

        # Update scraping status with smart progress tracking
        scraping_status.update(
            {
                "is_running": True,
                "current_page": start_page,
                "total_pages": end_page - start_page + 1,
                "game_name": game_name,
                "cards_found": 0,
                "should_stop": False,
            }
        )

        for page_num in range(start_page, end_page + 1):
            # Track the highest page we've reached
            highest_page_reached = page_num

            # Check if we should stop
            if scraping_status["should_stop"]:
                print("Scraping stopped by user request")
                break
            try:
                # Construct page URL
                if "page=" in base_url:
                    page_url = base_url.replace(
                        re.search(r"page=\d+", base_url).group(), f"page={page_num}"
                    )
                else:
                    separator = "&" if "?" in base_url else "?"
                    page_url = f"{base_url}{separator}page={page_num}"

                print(f"Scraping page {page_num}: {page_url}")

                # Update current page status
                scraping_status["current_page"] = page_num

                # Scrape the page using Selenium to handle JavaScript
                cards = scrape_tcgplayer_page_selenium(
                    page_url, game_name, lambda: scraping_status["should_stop"]
                )

                if cards:
                    # Save to database
                    save_cards_to_db(cards)
                    total_cards += len(cards)
                    consecutive_empty_pages = 0  # Reset counter
                    actual_max_page = page_num  # Update the actual max page found
                    print(f"Found {len(cards)} cards on page {page_num}")

                    # Update cards found status
                    scraping_status["cards_found"] = total_cards
                else:
                    consecutive_empty_pages += 1
                    print(f"No cards found on page {page_num}")

                    # If scraping all and we hit consecutive empty pages, stop
                    if scrape_all and consecutive_empty_pages >= max_empty_pages:
                        print(
                            f"Stopping after {max_empty_pages} consecutive empty pages"
                        )
                        break

                # Check for stop signal before delay
                if scraping_status["should_stop"]:
                    print("Scraping stopped by user request")
                    break

                # Be respectful with delays - respect robots.txt crawl-delay: 10
                time.sleep(10)

            except Exception as e:
                print(f"Error scraping page {page_num}: {e}")
                consecutive_empty_pages += 1
                if scrape_all and consecutive_empty_pages >= max_empty_pages:
                    print(f"Stopping after {max_empty_pages} consecutive errors")
                    break
                continue

        print(f"Scraping completed. Total cards found: {total_cards}")

        # Update the max pages found for this game
        current_max = get_max_pages_for_game(game_name)

        if scrape_all:
            # For "scrape all" mode, update to the highest page we actually reached
            if highest_page_reached > current_max:
                update_max_pages_for_game(game_name, highest_page_reached)
                print(
                    f"Updated max pages for {game_name}: {current_max} -> {highest_page_reached} (scrape all mode)"
                )
        else:
            # For specific page range, only update if we found cards on new pages
            if actual_max_page > current_max:
                update_max_pages_for_game(game_name, actual_max_page)
                print(
                    f"Updated max pages for {game_name}: {current_max} -> {actual_max_page}"
                )

        # Reset scraping status
        scraping_status.update(
            {
                "is_running": False,
                "current_page": 0,
                "total_pages": 0,
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
            "pages": end_page - start_page + 1,
            "start_page": start_page,
            "end_page": end_page,
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
    page = int(request.args.get("page", 1))
    per_page = int(
        request.args.get("per_page", 24)
    )  # 24 cards per page (good for grid layout)

    # Calculate offset
    offset = (page - 1) * per_page

    conn = get_db_connection()

    # Build the base query
    base_query = "FROM cards"
    where_conditions = []
    params = []

    if query:
        where_conditions.append("name LIKE ?")
        params.append(f"%{query}%")

    if game_filter:
        where_conditions.append("game = ?")
        params.append(game_filter)

    if where_conditions:
        where_clause = " WHERE " + " AND ".join(where_conditions)
    else:
        where_clause = ""

    # Get total count
    count_query = f"SELECT COUNT(*) as total {base_query}{where_clause}"
    total_cards = conn.execute(count_query, params).fetchone()["total"]

    # Get paginated results
    search_query = f"SELECT * {base_query}{where_clause} ORDER BY name LIMIT ? OFFSET ?"
    search_params = params + [per_page, offset]

    cursor = conn.execute(search_query, search_params)
    cards = [dict(row) for row in cursor.fetchall()]
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


@app.route("/api/games")
def get_supported_games():
    """Get list of supported games for scraping"""
    supported_games = [
        {
            "name": "Pokemon",
            "url": "https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards",
        },
        {
            "name": "Union Arena",
            "url": "https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards",
        },
    ]
    return jsonify(supported_games)


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
    return jsonify({
        "message": f"PDF generation for {len(cards)} cards requested",
        "layout": layout,
        "status": "placeholder"
    })


@app.route("/api/stats")
def api_stats():
    """API endpoint for basic statistics"""
    conn = get_db_connection()
    cursor = conn.execute("SELECT COUNT(*) as total FROM cards")
    total_cards = cursor.fetchone()["total"]

    cursor = conn.execute("SELECT COUNT(DISTINCT game) as games FROM cards")
    total_games = cursor.fetchone()["games"]

    conn.close()

    return jsonify({
        "total_cards": total_cards,
        "game_count": total_games,
        "last_scrape": "Never",  # TODO: Track last scrape time
        "cards_today": 0  # TODO: Track cards added today
    })


# Initialize database when app starts (for Cloud Run)
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
