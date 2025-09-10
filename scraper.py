#!/usr/bin/env python3
"""
TCGCSV-Only Scraper for Union Arena Cards
No TCGPlayer scraping needed - all data comes from TCGCSV!
"""

import requests
import time
import logging
from database import save_cards_to_db

def to_title_case(text):
    """Convert text to proper title case, handling special cases"""
    # Handle special cases first
    special_cases = {
        'BLEACH': 'Bleach',
        'HUNTER X HUNTER': 'Hunter X Hunter',
        'FULLMETAL ALCHEMIST': 'Fullmetal Alchemist',
        'CODE GEASS': 'Code Geass',
        'GODDESS OF VICTORY: NIKKE': 'Goddess of Victory: Nikke',
        'ATTACK ON TITAN': 'Attack On Titan',
        'BLACK CLOVER': 'Black Clover',
        'DEMON SLAYER': 'Demon Slayer',
        'JUJUTSU KAISEN': 'Jujutsu Kaisen',
        'ONE PUNCH MAN': 'One Punch Man',
        'SWORD ART ONLINE': 'Sword Art Online',
        'RUROUNI KENSHIN': 'Rurouni Kenshin',
        'KAIJU NO. 8': 'Kaiju No. 8',
        'YU YU HAKUSHO': 'Yu Yu Hakusho'
    }
    
    # Check if it's a special case
    if text in special_cases:
        return special_cases[text]
    
    # For other cases, use standard title case
    return text.title()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("outdecked.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class TCGCSVScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )

    def get_union_arena_groups(self):
        """Get all Union Arena groups from TCGCSV"""
        url = "https://tcgcsv.com/tcgplayer/81/groups"
        response = self.session.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        return []

    def get_group_products(self, group_id):
        """Get all products from a group"""
        url = f"https://tcgcsv.com/tcgplayer/81/{group_id}/products"
        response = self.session.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        return []

    def get_group_prices(self, group_id):
        """Get prices for all products in a group"""
        url = f"https://tcgcsv.com/tcgplayer/81/{group_id}/prices"
        response = self.session.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        return []

    def is_individual_card(self, product):
        """Check if a product is an individual card using extendedData"""
        return len(product.get("extendedData", [])) > 0

    def scrape_group_cards(self, group_id, group_name):
        """Scrape all individual cards from a group using TCGCSV data only"""
        products = self.get_group_products(group_id)
        prices = self.get_group_prices(group_id)

        if not products:
            return []

        # Create price lookup
        price_lookup = {price["productId"]: price for price in prices}

        # Filter for individual cards
        individual_cards = [p for p in products if self.is_individual_card(p)]

        if not individual_cards:
            logger.info(f"No individual cards found in group {group_name}")
            return []

        logger.info(f"Found {len(individual_cards)} individual cards in {group_name}")

        scraped_cards = []

        for i, product in enumerate(individual_cards):
            product_id = product["productId"]
            product_name = product["name"]

            logger.info(
                f"Processing card {i+1}/{len(individual_cards)}: {product_name}"
            )

            # Extract attributes from TCGCSV extendedData
            attributes = {}
            extended_data = product.get("extendedData", [])
            for attr in extended_data:
                attr_name = attr.get("name", "").lower()
                attr_value = attr.get("value", "")

                # Map TCGCSV field names to our database field names
                if attr_name == "rarity":
                    attributes["rarity"] = attr_value
                elif attr_name == "number":
                    attributes["card_number"] = attr_value
                elif attr_name == "description":
                    attributes["card_text"] = attr_value
                elif attr_name == "seriesname":
                    attributes["series"] = to_title_case(attr_value)
                elif attr_name == "cardtype":
                    attributes["card_type"] = attr_value
                elif attr_name == "activationenergy":
                    attributes["activation_energy"] = attr_value
                elif attr_name == "requiredenergy":
                    attributes["required_energy"] = attr_value
                elif attr_name == "actionpointcost":
                    attributes["action_point_cost"] = attr_value
                elif attr_name == "battlepointbp":
                    attributes["battle_point"] = attr_value
                elif attr_name == "generatedenergy":
                    attributes["generated_energy"] = attr_value
                elif attr_name == "affinities":
                    attributes["affinities"] = attr_value
                elif attr_name == "trigger":
                    attributes["trigger"] = attr_value
                else:
                    # Store any other attributes with their original name
                    attributes[attr_name] = attr_value

            # Get price from TCGCSV
            price_data = price_lookup.get(product_id, {})
            market_price = price_data.get("marketPrice", "")

            # Get presale info
            presale_info = product.get("presaleInfo", {})

            # Build card data with TCGCSV structure
            card_data = {
                "name": product_name,
                "clean_name": product.get("cleanName", ""),
                "image_url": f"https://tcgplayer-cdn.tcgplayer.com/product/{product_id}_in_1000x1000.jpg",
                "card_url": product.get(
                    "url", f"https://www.tcgplayer.com/product/{product_id}"
                ),
                "game": "Union Arena",
                "product_id": product_id,
                "group_id": group_id,
                "category_id": 81,
                "image_count": product.get("imageCount", 0),
                "is_presale": presale_info.get("isPresale", False),
                "released_on": presale_info.get("releasedOn", ""),
                "presale_note": presale_info.get("note", ""),
                "modified_on": product.get("modifiedOn", ""),
                "price": market_price,
                "low_price": price_data.get("lowPrice", ""),
                "mid_price": price_data.get("midPrice", ""),
                "high_price": price_data.get("highPrice", ""),
                **attributes,  # Add all TCGCSV attributes
            }

            # Save card to database immediately
            try:
                saved_count, failed_cards = save_cards_to_db([card_data])
                if saved_count > 0:
                    logger.info(f"SAVED: {product_name}")
                else:
                    logger.warning(f"FAILED: {product_name}")
            except Exception as e:
                logger.error(f"ERROR saving card {product_name}: {e}")

            scraped_cards.append(card_data)

        return scraped_cards

    def scrape_all_union_arena_cards(self):
        """Scrape all Union Arena cards from all groups using TCGCSV only"""
        logger.info("Starting Union Arena card scraping using TCGCSV only...")

        groups = self.get_union_arena_groups()
        if not groups:
            logger.error("No Union Arena groups found")
            return

        logger.info(f"Found {len(groups)} Union Arena groups")

        total_cards = 0
        all_cards = []
        for group in groups:
            group_id = group["groupId"]
            group_name = group["name"]

            logger.info(f"Processing group: {group_name} (ID: {group_id})")

            group_cards = self.scrape_group_cards(group_id, group_name)
            total_cards += len(group_cards)
            all_cards.extend(group_cards)

            logger.info(
                f"Completed group {group_name}: {len(group_cards)} cards processed"
            )

        logger.info(f"Scraping completed! Total cards processed: {total_cards}")
        return all_cards


if __name__ == "__main__":
    scraper = TCGCSVScraper()
    scraper.scrape_all_union_arena_cards()
