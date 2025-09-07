#!/usr/bin/env python3

import logging
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from bs4 import BeautifulSoup
from flask_socketio import SocketIO
from models import scraping_status

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("scraping.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def add_scraping_log(message, level="info", socketio=None):
    """Add a log entry to the scraping status and emit via SocketIO."""
    timestamp = time.strftime("%H:%M:%S")
    log_entry = f"[{timestamp}] {message}"

    # Add to scraping status logs
    scraping_status["logs"].append(log_entry)

    # Log to file and terminal
    if level == "error":
        logger.error(message)
    elif level == "warning":
        logger.warning(message)
    else:
        logger.info(message)

    # Emit via SocketIO if available
    if socketio:
        socketio.emit(
            "scraping_log", {"timestamp": timestamp, "message": message, "type": level}
        )


def extract_card_metadata_from_soup(soup, card_url, socketio=None):
    """Extract metadata from BeautifulSoup object of card page."""
    metadata = {}

    # Get card description
    description_elem = soup.select_one(".product__item-details__description")
    if description_elem:
        metadata["card_text"] = description_elem.get_text().strip()

    # Get all attribute list items
    attribute_items = soup.select(".product__item-details__attributes li")

    for li in attribute_items:
        # Each li contains: <div><strong>Name:</strong><span>Value</span></div>
        strong = li.find("strong")
        span = li.find("span")

        if strong and span:
            key = strong.get_text().strip().rstrip(":")
            value = span.get_text().strip()

            # Debug logging to see what attributes are being found
            if socketio:
                add_scraping_log(
                    f"Found attribute: '{key}' = '{value}'", "info", socketio
                )

            # Store with cleaned key and map to expected field names
            clean_key = key.lower().replace(" ", "_").replace("(", "").replace(")", "")

            # Map to expected field names for frontend compatibility
            field_mapping = {
                "number": "card_number",
                "activation_energy": "color",
                "required_energy": "cost_2",
                "action_point_cost": "cost_1",
                "battle_point_bp": "battle_points",
                "trigger": "special_ability",
                "series_name": "series",
            }

            # Use mapped field name if available, otherwise use clean key
            final_key = field_mapping.get(clean_key, clean_key)
            metadata[final_key] = value

    # Extract price from spotlight section
    price_elem = soup.select_one(".spotlight__price")
    if price_elem:
        price_text = price_elem.get_text().strip()
        if price_text:  # Only process if price text is not empty
            # Remove $ sign and store as numeric value
            try:
                price_value = float(price_text.replace("$", ""))
                metadata["price"] = price_value
                if socketio:
                    add_scraping_log(f"Found price: ${price_value}", "info", socketio)
            except ValueError:
                if socketio:
                    add_scraping_log(
                        f"Could not parse price: '{price_text}'", "warning", socketio
                    )
        else:
            if socketio:
                add_scraping_log("Price element found but empty", "warning", socketio)
    else:
        if socketio:
            add_scraping_log(
                "No price element found for this card", "warning", socketio
            )

    # Extract high-quality image URL
    image_element = soup.select_one(
        ".image-set__grid .swiper__slide .lazy-image__wrapper img"
    )
    if image_element:
        srcset = image_element.get("srcset", "")
        if srcset:
            # Parse srcset to find the highest quality image (1000x1000)
            srcset_parts = srcset.split(",")
            highest_quality_url = ""
            max_width = 0

            for part in srcset_parts:
                part = part.strip()
                if " " in part:
                    url, width_str = part.rsplit(" ", 1)
                    url = url.strip()
                    width_str = width_str.strip()

                    if width_str.endswith("w"):
                        try:
                            width = int(width_str[:-1])
                            if width > max_width:
                                max_width = width
                                highest_quality_url = url
                        except ValueError:
                            continue

            if highest_quality_url:
                metadata["image_url"] = highest_quality_url
            else:
                src = image_element.get("src", "")
                if src:
                    metadata["image_url"] = src
        else:
            src = image_element.get("src", "")
            if src:
                metadata["image_url"] = src

    return metadata


def scrape_card_page_selenium(
    card_url, socketio=None, driver=None, last_request_time=None
):
    """Scrape metadata from individual card page using Selenium."""
    should_close_driver = False
    if driver is None:
        # Create new driver if none provided
        should_close_driver = True
        try:
            if socketio:
                add_scraping_log(
                    f"Starting Selenium scrape for: {card_url}", "info", socketio
                )

            logger.debug(f"Loading card page with Selenium: {card_url}")

            # Setup Chrome options with anti-detection measures
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument(
                "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_argument("--disable-background-networking")
            chrome_options.add_argument("--disable-default-apps")
            chrome_options.add_argument("--disable-sync")
            chrome_options.add_argument("--disable-translate")
            chrome_options.add_argument("--disable-background-timer-throttling")
            chrome_options.add_argument("--disable-renderer-backgrounding")
            chrome_options.add_argument("--disable-backgrounding-occluded-windows")
            chrome_options.add_experimental_option(
                "excludeSwitches", ["enable-automation"]
            )
            chrome_options.add_experimental_option("useAutomationExtension", False)

            driver = webdriver.Chrome(options=chrome_options)

            # Execute script to remove webdriver property
            driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
        except Exception as e:
            error_msg = f"Error creating WebDriver: {e}"
            logger.error(error_msg)
            if socketio:
                add_scraping_log(f"ERROR: {error_msg}", "error", socketio)
            return {}

    try:

        # Dynamic sleep to ensure exactly 10 seconds between requests
        if last_request_time is not None:
            current_time = time.time()
            time_since_last = current_time - last_request_time
            if time_since_last < 10:
                sleep_time = 10 - time_since_last
                time.sleep(sleep_time)

        if socketio:
            add_scraping_log(f"Loading page: {card_url}", "info", socketio)

        # Update request_time before making the request
        request_time = time.time()

        driver.get(card_url)

        # Wait for the actual content we need to load
        try:
            WebDriverWait(driver, 10).until(
                lambda driver: driver.find_elements(
                    By.CSS_SELECTOR, ".product__item-details__attributes li"
                )
                or driver.find_elements(By.CSS_SELECTOR, ".spotlight__price")
            )
        except TimeoutException:
            pass  # Elements may still be present, proceed with extraction

        # Get page content (WebDriverWait already ensured elements are loaded)
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, "html.parser")

        # Check if we have the required content
        has_attributes = soup.select(".product__item-details__attributes li")
        has_price = soup.select_one(".spotlight__price")

        if not has_attributes and not has_price:
            if socketio:
                add_scraping_log(
                    f"WARNING: No content found on page {card_url}", "warning", socketio
                )

        if socketio:
            add_scraping_log(
                "Extracting metadata from page content...", "info", socketio
            )

        metadata = extract_card_metadata_from_soup(soup, card_url, socketio)

        if socketio:
            add_scraping_log(
                f"Metadata extraction complete. Found {len(metadata)} fields",
                "info",
                socketio,
            )

        logger.debug(f"Extracted {len(metadata)} metadata fields from {card_url}")
        return metadata, request_time

    except Exception as e:
        error_msg = f"Error scraping card metadata from {card_url}: {e}"
        logger.error(error_msg)
        if socketio:
            add_scraping_log(f"ERROR: {error_msg}", "error", socketio)
        return {}, time.time()
    finally:
        if should_close_driver and driver:
            driver.quit()
            if socketio:
                add_scraping_log("Selenium driver closed", "info", socketio)


def scrape_search_page_selenium(page_url, socketio=None, last_request_time=None):
    """Scrape a TCGPlayer search page to extract card entries using Selenium."""
    driver = None
    try:
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--disable-background-networking")
        chrome_options.add_argument("--disable-default-apps")
        chrome_options.add_argument("--disable-sync")
        chrome_options.add_argument("--disable-translate")
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-renderer-backgrounding")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")

        driver = webdriver.Chrome(options=chrome_options)

        # Dynamic sleep to ensure exactly 10 seconds between requests
        if last_request_time is not None:
            current_time = time.time()
            time_since_last = current_time - last_request_time
            if time_since_last < 10:
                sleep_time = 10 - time_since_last
                time.sleep(sleep_time)

        # Update request_time before making the request
        request_time = time.time()

        # REQUEST IS MADE
        driver.get(page_url)

        # Wait for search results to load
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CLASS_NAME, "search-result"))
        )

        soup = BeautifulSoup(driver.page_source, "html.parser")
        card_items = soup.find_all("div", class_="search-result")

        card_entries = []
        for item in card_items:
            link_tag = item.find("a", href=True)
            if link_tag:
                card_url = link_tag["href"]
                if not card_url.startswith("http"):
                    card_url = "https://www.tcgplayer.com" + card_url
                if "Language=English" not in card_url:
                    separator = "&" if "?" in card_url else "?"
                    card_url = f"{card_url}{separator}Language=English"

                img_tag = item.find("img")
                card_name = img_tag.get("alt") if img_tag and img_tag.get("alt") else ""

                if card_url and card_name:
                    card_entries.append({"name": card_name, "url": card_url})

        return card_entries, request_time

    except Exception:
        return [], time.time()
    finally:
        if driver:
            driver.quit()


def sequential_crawler(
    game_name, start_page=1, should_stop_callback=None, socketio=None
):
    """Sequential crawler with dynamic timing for perfect 10-second intervals."""
    scraping_status["is_running"] = True
    scraping_status["current_page"] = start_page
    scraping_status["total_cards"] = 0
    scraping_status["logs"] = []

    cards_processed = 0
    current_page = start_page
    last_request_time = time.time()

    try:
        add_scraping_log(
            f"Starting sequential crawler for {game_name} from page {start_page}",
            "info",
            socketio,
        )

        while True:
            # Check if we should stop
            if should_stop_callback and should_stop_callback():
                add_scraping_log("Stop requested by user", "info", socketio)
                break

            # Process current search page
            page_url = f"https://www.tcgplayer.com/search/{game_name}/product?productLineName={game_name}&view=grid&ProductTypeName=Cards&page={current_page}"

            add_scraping_log(
                f"Processing search page {current_page}",
                "info",
                socketio,
            )
            scraping_status["current_page"] = current_page

            # Scrape the search page to get card entries
            card_entries, last_request_time = scrape_search_page_selenium(
                page_url, socketio, last_request_time
            )

            if not card_entries:
                add_scraping_log(
                    f"No cards found on page {current_page}, stopping",
                    "info",
                    socketio,
                )
                break

            # Process each card on this page
            for card_entry in card_entries:
                # Check if we should stop before processing each card
                if should_stop_callback and should_stop_callback():
                    add_scraping_log("Stop requested by user", "info", socketio)
                    return cards_processed

                card_name = card_entry["name"]
                card_url = card_entry["url"]

                add_scraping_log(
                    f"Scraping card page: {card_name}",
                    "info",
                    socketio,
                )

                # Scrape card metadata with dynamic sleep
                metadata, last_request_time = scrape_card_page_selenium(
                    card_url, socketio, None, last_request_time
                )

                if metadata:
                    # Create complete card data
                    card_data = {
                        "name": card_name,
                        "image_url": metadata.get("image_url", ""),
                        "card_url": card_url,
                        "game": game_name,
                    }
                    card_data.update(metadata)

                    # Save to database
                    from database import save_cards_to_db

                    try:
                        save_cards_to_db([card_data])
                        cards_processed += 1
                        scraping_status["total_cards"] = cards_processed
                        scraping_status["cards_found"] = cards_processed

                        if socketio:
                            socketio.emit(
                                "stats_update",
                                {
                                    "current_page": scraping_status.get(
                                        "current_page", 0
                                    ),
                                    "cards_found": cards_processed,
                                },
                            )

                            # Emit game stats update
                            from database import get_db_connection

                            conn = get_db_connection()
                            cursor = conn.cursor()

                            cursor.execute(
                                "SELECT game, COUNT(*) as card_count FROM cards GROUP BY game"
                            )
                            card_counts = {
                                row["game"]: row["card_count"]
                                for row in cursor.fetchall()
                            }

                            cursor.execute(
                                "SELECT game_name, max_pages_found FROM game_stats"
                            )
                            max_pages = {
                                row["game_name"]: row["max_pages_found"]
                                for row in cursor.fetchall()
                            }

                            conn.close()

                            game_stats = {}
                            for game in set(
                                list(card_counts.keys()) + list(max_pages.keys())
                            ):
                                game_stats[game] = {
                                    "card_count": card_counts.get(game, 0),
                                    "max_pages_found": max_pages.get(game, 0),
                                }

                            socketio.emit(
                                "game_stats_update", {"game_stats": game_stats}
                            )

                        add_scraping_log(
                            f"SUCCESS: Saved card to database: {card_name} (Total: {cards_processed})",
                            "success",
                            socketio,
                        )
                    except Exception as e:
                        add_scraping_log(
                            f"ERROR: Failed to save card to database: {card_name} - {str(e)}",
                            "error",
                            socketio,
                        )
                else:
                    add_scraping_log(
                        f"FAILED: No metadata extracted for {card_name}",
                        "error",
                        socketio,
                    )

            # Move to next page
            current_page += 1

            # Update max pages found for this game (use the page we just completed)
            from database import update_max_pages_for_game

            update_max_pages_for_game(game_name, current_page - 1)
            add_scraping_log(
                f"Updated max pages for {game_name}: {current_page - 1}",
                "info",
                socketio,
            )

        add_scraping_log(
            f"Sequential crawler completed. Processed {cards_processed} cards from {current_page - start_page} pages",
            "info",
            socketio,
        )
        scraping_status["is_running"] = False
        return cards_processed

    except Exception as e:
        logger.error(f"Error in sequential crawler: {e}")
        add_scraping_log(f"Crawler error: {e}", "error", socketio)
        scraping_status["is_running"] = False
        return 0
