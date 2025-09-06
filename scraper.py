"""
Web scraping functionality for OutDecked card management system.
"""

import requests
from bs4 import BeautifulSoup
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from models import METADATA_FIELDS_EXACT


def add_scraping_log(message, log_type="info", socketio=None):
    """Add a log message to the scraping status and emit via WebSocket"""
    import datetime
    from models import scraping_status

    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = {"timestamp": timestamp, "message": message, "type": log_type}
    scraping_status["logs"].append(log_entry)
    # Keep only the last 50 logs to prevent memory issues
    if len(scraping_status["logs"]) > 50:
        scraping_status["logs"] = scraping_status["logs"][-50:]

    # Emit the log message via WebSocket if socketio is available
    if socketio:
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


def scrape_tcgplayer_page_selenium(
    url, game_name, should_stop_callback=None, socketio=None
):
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

        # Debug: Check for alternative card container classes
        if len(card_items) == 0:
            print(
                "No cards found with 'search-result__product' class, checking alternatives..."
            )
            alt_items = soup.find_all("div", class_=re.compile(r".*product.*"))
            print(f"Found {len(alt_items)} items with 'product' in class name")

            # Check for any divs that might contain product links
            product_links = soup.find_all("a", href=re.compile(r"/product/\d+/"))
            print(f"Found {len(product_links)} product links on page")

            # Check page content for debugging
            page_text = soup.get_text()[:500] if soup else "No soup content"
            print(f"Page content preview: {page_text}")

        cards = []

        # If no cards found with primary selector, try alternative selectors
        if len(card_items) == 0:
            print("Trying alternative selectors...")
            # Try different possible selectors
            alternative_selectors = [
                "div[class*='product']",
                "div[class*='search-result']",
                "div[class*='item']",
                "div[class*='card']",
            ]

            for selector in alternative_selectors:
                alt_items = soup.select(selector)
                if len(alt_items) > 0:
                    print(f"Found {len(alt_items)} items with selector: {selector}")
                    card_items = alt_items
                    break

        for i, item in enumerate(card_items, 1):
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
                        # Check for stop signal before processing each card
                        if should_stop_callback and should_stop_callback():
                            print("Stop signal received during card processing")
                            return cards

                        page_num = url.split("page=")[-1] if "page=" in url else "?"
                        add_scraping_log(
                            f"[Page {page_num}] Discovered card: {card_name.strip()}",
                            "info",
                            socketio,
                        )

                        card_data = {
                            "name": card_name.strip(),
                            "image_url": image_url or "",
                            "card_url": card_url,
                            "game": game_name,
                        }

                        # Collect detailed metadata
                        add_scraping_log(
                            f"[Page {page_num}] Collecting metadata for: {card_name}",
                            "info",
                            socketio,
                        )

                        metadata = scrape_card_metadata(card_url)
                        card_data.update(metadata)

                        # Log metadata collection completion
                        if metadata:
                            add_scraping_log(
                                f"[Page {page_num}] Metadata collected for {card_name}",
                                "success",
                                socketio,
                            )
                        else:
                            add_scraping_log(
                                f"[Page {page_num}] No metadata found for {card_name}",
                                "warning",
                                socketio,
                            )

                        # Check for stop signal after metadata collection
                        if should_stop_callback and should_stop_callback():
                            print("Stop signal received after metadata collection")
                            return cards

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
                        from database import save_cards_to_db

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
