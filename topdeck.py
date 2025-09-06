from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_socketio import SocketIO, emit
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
socketio = SocketIO(app, cors_allowed_origins="*")

# Constants for metadata fields that use exact matching
METADATA_FIELDS_EXACT = ["series", "color", "rarity", "card_type", "cost_2"]

# Global variables for scraping status
scraping_status = {
    "is_running": False,
    "current_page": 0,
    "total_pages": 0,
    "game_name": "",
    "cards_found": 0,
    "should_stop": False,
    "logs": [],
}


def add_scraping_log(message, log_type="info"):
    """Add a log message to the scraping status and emit via WebSocket"""
    import datetime

    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = {"timestamp": timestamp, "message": message, "type": log_type}
    scraping_status["logs"].append(log_entry)
    # Keep only the last 50 logs to prevent memory issues
    if len(scraping_status["logs"]) > 50:
        scraping_status["logs"] = scraping_status["logs"][-50:]

    # Emit the log message via WebSocket
    socketio.emit("scraping_log", log_entry)


def scrape_card_metadata(card_url):
    """Scrape detailed metadata from a TCGPlayer card page using Selenium for Vue.js"""
    driver = None
    try:
        # Set up Chrome options for Selenium
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )

        # Initialize Chrome driver
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)

        print(f"Loading card page with Selenium: {card_url}")
        driver.get(card_url)

        # Wait for Vue.js to render the content
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )

        # Additional wait for Vue.js rendering
        time.sleep(5)

        # Get page source after JavaScript execution
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")
        metadata = {}

        # Debug: Print page title to see if we're getting the right page
        title = soup.find("title")
        print(f"Scraping metadata from: {title.get_text() if title else 'No title'}")

        # Debug: Check if we can find the TCGPlayer attributes list
        ul_elements = soup.find_all(
            "ul", class_=lambda x: x and "product__item-details__attributes" in x
        )
        print(
            f"Found {len(ul_elements)} ul elements with product__item-details__attributes class"
        )

        if ul_elements:
            print(f"First ul element classes: {ul_elements[0].get('class', [])}")
            print(
                f"First ul element text (first 200 chars): {ul_elements[0].get_text()[:200]}"
            )

        # Debug: Check for any ul elements
        all_ul_elements = soup.find_all("ul")
        print(f"Found {len(all_ul_elements)} total ul elements")

        # Debug: Check what's in the ul elements
        for i, ul in enumerate(all_ul_elements[:3]):  # Check first 3
            classes = ul.get("class", [])
            text = ul.get_text().strip()[:100]
            print(f"  UL {i+1}: classes={classes}, text='{text}...'")

        # Debug: Check for elements containing "Product Details"
        product_details_elements = soup.find_all(
            text=lambda text: text and "Product Details" in text
        )
        print(
            f"Found {len(product_details_elements)} elements containing 'Product Details'"
        )

        # Debug: Check for elements containing "Rarity:"
        rarity_elements = soup.find_all(text=lambda text: text and "Rarity:" in text)
        print(f"Found {len(rarity_elements)} elements containing 'Rarity:'")

        if rarity_elements:
            print(f"First rarity element: {rarity_elements[0]}")

        # Try multiple selectors for product details using the correct TCGPlayer structure
        product_details = None

        # Try to find the TCGPlayer attributes list directly
        product_details = soup.select_one(
            "ul[class*='product__item-details__attributes']"
        )

        if product_details:
            print(f"Found TCGPlayer attributes list directly!")
            print(f"Element name: {product_details.name}")
            print(f"Element classes: {product_details.get('class', [])}")
        else:
            # Fallback to other selectors
            tcgplayer_selectors = [
                "div[class*='product__item-details__attributes']",
                "div[class*='read_more_wrapper']",
                "div[class*='product-details__details']",
                "div[class*='product-details']",
                "div[class*='product-info']",
                "div[class*='specs']",
                "div[class*='details']",
            ]

            for selector in tcgplayer_selectors:
                product_details = soup.select_one(selector)
                if product_details:
                    print(f"Found product details with selector: {selector}")
                    break

        if product_details:
            print(f"Product details element: {product_details.name}")
            print(f"Product details classes: {product_details.get('class', [])}")

            # Check if this is the TCGPlayer attributes list directly
            if (
                product_details.name == "ul"
                and "product__item-details__attributes"
                in str(product_details.get("class", []))
            ):
                print("Found TCGPlayer attributes list directly!")

                # Parse structured HTML with <strong> and <span> elements
                li_elements = product_details.find_all("li")
                print(f"Found {len(li_elements)} attribute items")

                # Debug: Check the first li element specifically
                if li_elements:
                    first_li = li_elements[0]
                    print(f"First li element HTML: {first_li}")
                    strong_elem = first_li.find("strong")
                    span_elem = first_li.find("span")
                    print(f"First li strong: {strong_elem}")
                    print(f"First li span: {span_elem}")

                for i, li in enumerate(li_elements):
                    print(f"Processing li element {i+1}: {li}")
                    strong_elem = li.find("strong")
                    span_elem = li.find("span")

                    print(f"  Strong element: {strong_elem}")
                    print(f"  Span element: {span_elem}")

                    if strong_elem and span_elem:
                        label = strong_elem.get_text(strip=True).lower()
                        value = span_elem.get_text(strip=True)

                        print(f"Found attribute: {label} = {value}")

                        # Map to our metadata fields
                        if "rarity" in label:
                            metadata["rarity"] = value
                            print(f"✓ Set rarity to: {value}")
                        elif "number" in label:
                            metadata["card_number"] = value
                        elif "series name" in label:
                            metadata["series"] = value
                        elif "card type" in label:
                            metadata["card_type"] = value
                        elif "activation energy" in label:
                            metadata["color"] = value
                        elif "required energy" in label:
                            metadata["cost_2"] = value
                        elif "action point cost" in label:
                            metadata["cost_1"] = value
                        elif "trigger" in label:
                            metadata["special_ability"] = value
                        elif "battle point" in label or "bp" in label:
                            metadata["battle_points"] = value
                        elif "affinities" in label:
                            # Parse affinities - split by " / " and join with ", "
                            affinities = [
                                aff.strip() for aff in value.split(" / ") if aff.strip()
                            ]
                            metadata["affinities"] = ", ".join(affinities)
                        elif "generated energy" in label:
                            metadata["generated_energy"] = value

            else:
                # Try different row selectors based on TCGPlayer structure
                row_selectors = [
                    "ul[class*='product__item-details__attributes'] li",  # TCGPlayer attribute list
                    "div.product-details__row",
                    "div.product-info__row",
                    "div.spec-row",
                    "div[class*='row']",
                    "tr",  # Sometimes it's a table
                    "div[class*='detail']",
                    "li",  # List items
                ]

                details_rows = []
                for row_selector in row_selectors:
                    details_rows = product_details.select(row_selector)
                    if details_rows:
                        print(
                            f"Found {len(details_rows)} rows with selector: {row_selector}"
                        )
                        break

                # Special handling for TCGPlayer's concatenated metadata format
                if row_selector == "ul[class*='product__item-details__attributes'] li":
                    # TCGPlayer stores all metadata in one concatenated string
                    # We need to parse it from the parent ul element
                    parent_ul = product_details.select_one(
                        "ul[class*='product__item-details__attributes']"
                    )
                    if parent_ul:
                        full_text = parent_ul.get_text()
                        print(f"TCGPlayer concatenated metadata: {full_text}")

                        # Parse the concatenated string
                        # Format: "Rarity:CommonNumber:UE10BT/AOT-1-100Series Name:Attack on Titan..."
                        import re

                        if re.search(r"Rarity:", full_text):
                            rarity_match = re.search(
                                r"Rarity:([^N]+)Number:", full_text
                            )
                            if rarity_match:
                                metadata["rarity"] = rarity_match.group(1).strip()
                                print(f"Parsed rarity: {metadata['rarity']}")

                        if re.search(r"Number:", full_text):
                            number_match = re.search(
                                r"Number:([^S]+)Series Name:", full_text
                            )
                            if number_match:
                                metadata["card_number"] = number_match.group(1).strip()
                                print(f"Parsed number: {metadata['card_number']}")

                        if re.search(r"Series Name:", full_text):
                            series_match = re.search(
                                r"Series Name:([^C]+)Card Type:", full_text
                            )
                            if series_match:
                                metadata["series"] = series_match.group(1).strip()
                                print(f"Parsed series: {metadata['series']}")

                        if re.search(r"Card Type:", full_text):
                            type_match = re.search(
                                r"Card Type:([^A]+)Activation Energy:", full_text
                            )
                            if type_match:
                                metadata["card_type"] = type_match.group(1).strip()
                                print(f"Parsed card type: {metadata['card_type']}")

                        if re.search(r"Activation Energy:", full_text):
                            energy_match = re.search(
                                r"Activation Energy:([^R]+)Required Energy:", full_text
                            )
                            if energy_match:
                                metadata["color"] = energy_match.group(1).strip()
                                print(
                                    f"Parsed activation energy (color): {metadata['color']}"
                                )

                        if re.search(r"Required Energy:", full_text):
                            req_energy_match = re.search(
                                r"Required Energy:([^A]+)Action Point Cost:", full_text
                            )
                            if req_energy_match:
                                metadata["cost_2"] = req_energy_match.group(1).strip()
                                print(f"Parsed required energy: {metadata['cost_2']}")

                        if re.search(r"Action Point Cost:", full_text):
                            ap_cost_match = re.search(
                                r"Action Point Cost:([^T]+)Trigger:", full_text
                            )
                            if ap_cost_match:
                                metadata["cost_1"] = ap_cost_match.group(1).strip()
                                print(f"Parsed action point cost: {metadata['cost_1']}")

                        if re.search(r"Trigger:", full_text):
                            trigger_match = re.search(r"Trigger:([^N]+)", full_text)
                            if trigger_match:
                                metadata["special_ability"] = trigger_match.group(
                                    1
                                ).strip()
                                print(f"Parsed trigger: {metadata['special_ability']}")

                # Original logic for other selectors
                for row in details_rows:
                    # Try different label/value selectors
                    label_selectors = [
                        "div.product-details__label",
                        "div.product-info__label",
                        "span.label",
                        "dt",
                        "th",
                        "div[class*='label']",
                        "span[class*='label']",
                    ]

                    value_selectors = [
                        "div.product-details__value",
                        "div.product-info__value",
                        "span.value",
                        "dd",
                        "td",
                        "div[class*='value']",
                        "span[class*='value']",
                    ]

                    label_elem = None
                    value_elem = None

                    for label_sel in label_selectors:
                        label_elem = row.select_one(label_sel)
                        if label_elem:
                            break

                    for value_sel in value_selectors:
                        value_elem = row.select_one(value_sel)
                        if value_elem:
                            break

                    # If no specific selectors work, try to find any text elements
                    if not label_elem or not value_elem:
                        text_elements = row.find_all(text=True, recursive=True)
                        text_elements = [t.strip() for t in text_elements if t.strip()]
                        if len(text_elements) >= 2:
                            label_elem = type(
                                "obj",
                                (object,),
                                {"get_text": lambda: text_elements[0]},
                            )()
                            value_elem = type(
                                "obj",
                                (object,),
                                {"get_text": lambda: text_elements[1]},
                            )()

                    if label_elem and value_elem:
                        label = label_elem.get_text(strip=True).lower()
                        value = value_elem.get_text(strip=True)

                        print(f"Found metadata: {label} = {value}")

                        # Map common fields to our generic metadata structure
                        if "rarity" in label:
                            metadata["rarity"] = value
                        elif "number" in label:
                            metadata["card_number"] = value
                        elif "series" in label or "set" in label:
                            metadata["series"] = value
                        elif "card type" in label or "type" in label:
                            metadata["card_type"] = value
                        elif "color" in label or "theme" in label:
                            metadata["color"] = value
                        elif (
                            "activation energy" in label
                            or "mana cost" in label
                            or "energy cost" in label
                        ):
                            metadata["cost_1"] = value
                        elif (
                            "required energy" in label
                            or "action point cost" in label
                            or "casting cost" in label
                        ):
                            metadata["cost_2"] = value
                        elif (
                            "trigger" in label
                            or "keyword" in label
                            or "ability" in label
                        ):
                            metadata["special_ability"] = value
                        elif "language" in label:
                            metadata["language"] = value

        # Try to extract series from URL or breadcrumbs
        if not metadata.get("series"):
            # Try to get series from breadcrumbs
            breadcrumbs = soup.find("nav", {"aria-label": "Breadcrumb"})
            if breadcrumbs:
                breadcrumb_links = breadcrumbs.find_all("a")
                for link in breadcrumb_links:
                    text = link.get_text(strip=True)
                    if text and text not in ["Home", "TCG", "Union Arena"]:
                        metadata["series"] = text
                        break

        # Try different price selectors - TCGPlayer specific first
        price_selectors = [
            "span[class*='spotlight__price']",  # TCGPlayer specific
            "span.price",
            "div.price",
            "span[class*='price']",
            "div[class*='price']",
            ".market-price",
            ".low-price",
        ]

        for price_sel in price_selectors:
            price_elem = soup.select_one(price_sel)
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                if price_text and "$" in price_text:
                    # Extract just the price value (e.g., "$5.83" from longer text)
                    import re

                    price_match = re.search(r"\$[\d,]+\.?\d*", price_text)
                    if price_match:
                        metadata["price"] = price_match.group()
                        print(f"Found price with {price_sel}: {metadata['price']}")
                        break
                    else:
                        print(f"No clean price found in: {price_text}")
                        # Don't set price if we can't extract a clean value
                        break

        # Try different image selectors
        img_selectors = [
            "img.product-image",
            "img[class*='product']",
            "img[class*='card']",
            ".product-image img",
            ".card-image img",
        ]

        for img_sel in img_selectors:
            img_elem = soup.select_one(img_sel)
            if img_elem and img_elem.get("src"):
                metadata["high_res_image"] = img_elem["src"]
                break

        # Try different text/description selectors
        text_selectors = [
            "div.product-description",
            "div.card-text",
            "div[class*='description']",
            "div[class*='text']",
            ".product-details p",
            ".card-details p",
        ]

        for text_sel in text_selectors:
            card_text_elem = soup.select_one(text_sel)
            if card_text_elem:
                text_content = card_text_elem.get_text(strip=True)
                if (
                    text_content and len(text_content) > 10
                ):  # Only if it's substantial text
                    metadata["card_text"] = text_content
                    break

        # Only run text-based parsing if structured parsing didn't find the data
        if not metadata.get("rarity") or not metadata.get("series"):
            # Try to parse metadata from the main content area using TCGPlayer structure
            # Look for the main content that contains the attributes
            main_content = None

            # Try TCGPlayer-specific selectors first
            tcgplayer_selectors = [
                "div[class*='product__item-details__attributes']",
                "div[class*='read_more_wrapper']",
                "div[class*='product-details__details']",
                "div[class*='product-details']",
                "div[class*='product-info']",
            ]

            for selector in tcgplayer_selectors:
                main_content = soup.select_one(selector)
                if main_content:
                    print(f"Found main content with selector: {selector}")
                    break

            if not main_content:
                # Fallback: Try to find any div that contains "Product Details" text
                for div in soup.find_all("div"):
                    if div.get_text() and "Product Details" in div.get_text():
                        main_content = div
                        break

            if main_content:
                # Get all text content and parse it
                full_text = main_content.get_text()
                print(
                    f"Found main content text: {full_text[:500]}..."
                )  # Print first 500 chars

                # Parse the text to extract metadata
                lines = full_text.split("\n")
                for line in lines:
                    line = line.strip()
                    if ":" in line:
                        parts = line.split(":", 1)
                        if len(parts) == 2:
                            label = parts[0].strip().lower()
                            value = parts[1].strip()

                            print(f"Parsed from text: {label} = {value}")

                            # Map the labels to our metadata fields
                            if "rarity" in label:
                                metadata["rarity"] = value
                            elif "number" in label:
                                metadata["card_number"] = value
                            elif "series name" in label or "series" in label:
                                metadata["series"] = value
                            elif "card type" in label or "type" in label:
                                metadata["card_type"] = value
                            elif "activation energy" in label:
                                metadata["color"] = (
                                    value  # Activation energy is often the color
                                )
                            elif "required energy" in label:
                                metadata["cost_2"] = value
                            elif "action point cost" in label:
                                metadata["cost_1"] = value
                            elif "trigger" in label:
                                metadata["special_ability"] = value

        print(f"Extracted metadata: {metadata}")
        return metadata

    except Exception as e:
        print(f"Error scraping metadata for {card_url}: {str(e)}")
        return {}
    finally:
        if driver:
            driver.quit()


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
            rarity TEXT,
            card_number TEXT,
            series TEXT,
            card_type TEXT,
            color TEXT,
            cost_1 TEXT,
            cost_2 TEXT,
            special_ability TEXT,
            language TEXT,
            price TEXT,
            high_res_image TEXT,
            card_text TEXT,
            battle_points TEXT,
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

    # Create metadata table for dynamic fields
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS card_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (card_id) REFERENCES cards (id),
            UNIQUE(card_id, field_name)
        )
        """
    )

    # Create metadata fields table to track available fields per game
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS metadata_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game TEXT NOT NULL,
            field_name TEXT NOT NULL,
            field_display_name TEXT NOT NULL,
            field_type TEXT DEFAULT 'text',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(game, field_name)
        )
        """
    )

    # Add metadata columns to existing cards table if they don't exist
    metadata_columns = [
        "rarity",
        "card_number",
        "series",
        "card_type",
        "color",  # Card color/theme
        "cost_1",  # Generic cost field 1 (e.g., activation energy, mana cost)
        "cost_2",  # Generic cost field 2 (e.g., required energy, action point cost)
        "special_ability",  # Generic special ability field (e.g., trigger, keyword)
        "language",
        "price",
        "high_res_image",
        "card_text",  # Store the actual card text/description
    ]

    for column in metadata_columns:
        try:
            cursor.execute(f"ALTER TABLE cards ADD COLUMN {column} TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()
    conn.close()


def get_db_connection():
    # Check if database file exists, if not, initialize it
    if not os.path.exists("cards.db"):
        print("Database file not found, initializing new database...")
        init_db()

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

                    # Ensure English language parameter is added
                    if "Language=" not in card_url:
                        separator = "&" if "?" in card_url else "?"
                        card_url += f"{separator}Language=English"

                    # Generate high-quality image URL from product ID
                    image_url = None
                    if card_url:
                        product_id_match = re.search(r"/product/(\d+)/", card_url)
                        if product_id_match:
                            product_id = product_id_match.group(1)
                            image_url = f"https://tcgplayer-cdn.tcgplayer.com/product/{product_id}_in_1000x1000.jpg"

                    # Extract card name
                    card_name = ""
                    # Try to get name from img alt text
                    img_tag = item.find("img")
                    if img_tag and img_tag.get("alt"):
                        card_name = img_tag.get("alt")
                    else:
                        # Extract from URL
                        url_parts = card_url.split("/")
                        if len(url_parts) > 2:
                            last_part = url_parts[-1].split("?")[0]
                            card_name = last_part.replace("-", " ").title()

                    if card_url and card_name:
                        card_data = {
                            "name": card_name.strip(),
                            "image_url": image_url or "",
                            "card_url": card_url,
                            "game": game_name,
                        }

                        # Collect detailed metadata
                        print(
                            f"[Page {url.split('page=')[-1] if 'page=' in url else '?'}] Scraping metadata for: {card_name}"
                        )
                        metadata = scrape_card_metadata(card_url)
                        card_data.update(metadata)

                        # Debug: Print what metadata we collected
                        if metadata:
                            print(
                                f"[Page {url.split('page=')[-1] if 'page=' in url else '?'}] Metadata collected for {card_name}: {list(metadata.keys())}"
                            )
                        else:
                            print(
                                f"[Page {url.split('page=')[-1] if 'page=' in url else '?'}] No metadata collected for {card_name}"
                            )

                        cards.append(card_data)
                        print(
                            f"[Page {url.split('page=')[-1] if 'page=' in url else '?'}] Found card: {card_name}"
                        )
                        add_scraping_log(
                            f"[Page {url.split('page=')[-1] if 'page=' in url else '?'}] Found card: {card_name}",
                            "success",
                        )

                        # Save individual card to database immediately
                        save_cards_to_db([card_data])

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


# Removed unused scrape_tcgplayer_page function - using Selenium version instead


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
                card_id = existing[0]
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
                card_id = cursor.lastrowid
                print(f"Added new card: {card['name']}")

            # Save all metadata to the dynamic metadata table
            save_card_metadata(cursor, card_id, card["game"], card)

    conn.commit()
    conn.close()


def save_card_metadata(cursor, card_id, game, card_data):
    """Save card metadata to the dynamic metadata table"""
    # Define field mappings for display names
    field_display_names = {
        "rarity": "Rarity",
        "card_number": "Number",
        "series": "Series Name",
        "card_type": "Card Type",
        "color": "Activation Energy",
        "cost_2": "Required Energy",
        "cost_1": "Action Point Cost",
        "battle_points": "Battle Point (BP)",
        "special_ability": "Trigger",
        "price": "Price",
        "card_text": "Card Text",
        "language": "Language",
        "high_res_image": "High Res Image",
        "affinities": "Affinities",
        "generated_energy": "Generated Energy",
    }

    for field_name, field_value in card_data.items():
        if field_name in ["name", "image_url", "card_url", "game"]:
            continue  # Skip basic fields

        if field_value and str(field_value).strip():
            # Standardize case for certain fields
            standardized_value = str(field_value).strip()
            if field_name in METADATA_FIELDS_EXACT:
                # Title case for these fields to avoid duplicates like "code geass" vs "CODE GEASS"
                standardized_value = standardized_value.title()

            # Insert or update metadata
            cursor.execute(
                """
                INSERT OR REPLACE INTO card_metadata (card_id, field_name, field_value)
                VALUES (?, ?, ?)
                """,
                (card_id, field_name, standardized_value),
            )

            # Register field for this game if not already registered
            display_name = field_display_names.get(
                field_name, field_name.replace("_", " ").title()
            )
            cursor.execute(
                """
                INSERT OR IGNORE INTO metadata_fields (game, field_name, field_display_name)
                VALUES (?, ?, ?)
                """,
                (game, field_name, display_name),
            )


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
        max_empty_pages = (
            10  # Stop if we hit 10 consecutive empty pages (more lenient for TCGPlayer)
        )
        actual_max_page = 0  # Track the actual highest page with cards
        highest_page_reached = 0  # Track the highest page we actually reached

        # Get the previously found max pages for this game
        previous_max_pages = get_max_pages_for_game(game_name)

        # If scraping all, start from page 1 and continue until no more cards
        if scrape_all:
            start_page = 1
            # Use previous max pages + some buffer, or default to 200 if no previous data
            # TCGPlayer Union Arena currently has ~128 pages, so 200 is a safe upper limit
            end_page = (
                max(previous_max_pages + 50, 200) if previous_max_pages > 0 else 200
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

            # Update current page in status
            scraping_status["current_page"] = page_num

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
                add_scraping_log(f"Scraping page {page_num}...", "info")

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
                    add_scraping_log(
                        f"Found {len(cards)} cards on page {page_num}", "success"
                    )

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
                # Don't count errors as empty pages - just retry or continue
                # Only count truly empty pages (no cards found) as consecutive empty pages
                continue

        print(f"Scraping completed. Total cards found: {total_cards}")
        print(f"Highest page reached: {highest_page_reached}")
        print(f"Actual max page with cards: {actual_max_page}")

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
                "Content-Disposition": f'attachment; filename=topdeck_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
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

        # Create backup of current database (if it exists)
        if os.path.exists("cards.db"):
            backup_name = f"cards_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            os.rename("cards.db", backup_name)

        # Write the new database
        with open("cards.db", "wb") as db_file:
            db_file.write(db_data)

        # Verify the database is valid by trying to connect
        try:
            conn = sqlite3.connect("cards.db")
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()

            if not tables:
                # If no tables, restore the backup
                if os.path.exists(backup_name):
                    os.rename(backup_name, "cards.db")
                return (
                    jsonify({"error": "Invalid database file - no tables found"}),
                    400,
                )

        except sqlite3.Error:
            # If database is corrupted, restore the backup
            if os.path.exists(backup_name):
                os.rename(backup_name, "cards.db")
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
