# Scraping Reference Guide

This document contains all the selectors and URLs used in the TCGPlayer scraping system for future reference.

## URLs

### Search Page URL
```
https://www.tcgplayer.com/search/{game_name}/product?productLineName={game_name}&view=grid&ProductTypeName=Cards&page={page_num}
```

**Example:**
```
https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards&page=1
```

### Individual Card URL
- Base URL from search results
- **Required Parameter:** `&Language=English` (automatically appended if not present)

**Example:**
```
https://www.tcgplayer.com/product/123456/union-arena-card-name?Language=English
```

## CSS Selectors

### Search Page Selectors (24 card entries per page)

#### Card Container
```css
.search-result
```

#### Card Name
```css
.search-result img[alt]
```

#### Card URL Link
```css
.search-result a[href]
```

#### Card Image
```css
.search-result img
```

### Individual Card Page Selectors

#### Card Image
```css
.product__item-image img
```

#### Card Name
```css
.product__item-details__content h1
```

#### Card Description
```css
.product__item-details__description
```

#### Card Attributes Container
```css
.product__item-details__attributes
```

#### Individual Attribute Items
```css
.product__item-details__attributes li
```

#### Attribute Name (within each li)
```css
.product__item-details__attributes li strong
```

#### Attribute Value (within each li)
```css
.product__item-details__attributes li span
```

#### Price (Spotlight Price)
```css
.spotlight__price
```

## Attribute Extraction Pattern

### HTML Structure
```html
<div class="product__item-details__content">
  <h2>Product Details</h2>
  <div class="product__item-details__description">[Card description text]</div>
  <ul class="product__item-details__attributes">
    <li>
      <div>
        <strong>Rarity:</strong>
        <span>Common</span>
      </div>
    </li>
    <li>
      <div>
        <strong>Number:</strong>
        <span>UEX03BT/CGH-2-053</span>
      </div>
    </li>
    <!-- More attributes... -->
  </ul>
</div>
```

### Extraction Code Pattern
```python
# Get all attribute items
attribute_items = soup.select('.product__item-details__attributes li')

for item in attribute_items:
    strong = item.find('strong')
    span = item.find('span')
    
    if strong and span:
        key = strong.get_text().strip().rstrip(':')
        value = span.get_text().strip()
        
        # Store with cleaned key
        clean_key = key.lower().replace(' ', '_').replace('(', '').replace(')', '')
        metadata[clean_key] = value
```

## Field Mapping

The following mapping is used to convert extracted attribute keys to frontend-expected keys:

```python
field_mapping = {
    "number": "card_number",
    "activation_energy": "color",
    "required_energy": "cost_2",
    "action_point_cost": "cost_1",
    "battle_point_bp": "battle_points",
    "trigger": "special_ability",
    "series_name": "series",
}
```

## Common Attributes Found

Based on Union Arena cards, the following attributes are commonly extracted:

- **Rarity:** Common, Rare, etc.
- **Number:** Card number (e.g., UEX03BT/CGH-2-053)
- **Series Name:** Game series (e.g., CODE GEASS)
- **Card Type:** Character, Event, etc.
- **Affinities:** Faction/affiliation
- **Activation Energy:** Color requirement
- **Required Energy:** Energy cost
- **Action Point Cost:** Action cost
- **Battle Point (BP):** Power/attack value
- **Trigger:** Special ability text
- **Generated Energy:** Energy type produced

## Rate Limiting

- **Crawl-Delay:** 10 seconds (from TCGPlayer robots.txt)
- **Implementation:** Dynamic timing using `time.time()` to ensure exactly 10 seconds between requests
- **Scope:** Both page requests and individual card requests
- **Timing:** `request_time` is set before making the request, not after receiving the response

## WebDriver Configuration

### Chrome Options
```python
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_argument("--disable-background-networking")
chrome_options.add_argument("--disable-default-apps")
chrome_options.add_argument("--disable-sync")
chrome_options.add_argument("--disable-translate")
chrome_options.add_argument("--disable-background-timer-throttling")
chrome_options.add_argument("--disable-renderer-backgrounding")
chrome_options.add_argument("--disable-backgrounding-occluded-windows")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option("useAutomationExtension", False)
```

### Anti-Detection Script
```javascript
Object.defineProperty(navigator, 'webdriver', {get: () => undefined})
```

## Database Schema

### Cards Table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT)
- `image_url` (TEXT)
- `card_url` (TEXT UNIQUE)
- `game` (TEXT)
- `price` (TEXT)

### Card Metadata Table
- `card_id` (INTEGER)
- `field_name` (TEXT)
- `field_value` (TEXT)
- `game` (TEXT)

### Game Stats Table
- `game_name` (TEXT PRIMARY KEY)
- `max_pages_found` (INTEGER)

## Page Loading Strategy

### WebDriverWait Implementation
```python
# Wait for actual content to load (not just body tag)
WebDriverWait(driver, 10).until(
    lambda driver: driver.find_elements(By.CSS_SELECTOR, ".product__item-details__attributes li") 
    or driver.find_elements(By.CSS_SELECTOR, ".spotlight__price")
)
```

### Content Validation
```python
# Check if we have the required content
has_attributes = soup.select(".product__item-details__attributes li")
has_price = soup.select_one(".spotlight__price")

if not has_attributes and not has_price:
    # Log warning if no content found
    add_scraping_log(f"WARNING: No content found on page {card_url}", "warning", socketio)
```

## Notes

- All requests must include the `Language=English` parameter for individual card pages
- The sequential crawler uses a single WebDriver instance for efficiency
- Price extraction converts dollar amounts to float values (removes $ sign)
- The system updates existing cards with fresh data rather than just updating placeholder images
- Max pages are tracked per game and updated as new pages are discovered
- WebDriverWait waits for actual content elements, not just page structure
- No retry logic needed - WebDriverWait handles all timing requirements
- Chrome options include background service disabling to reduce Google API errors
