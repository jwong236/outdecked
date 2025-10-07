#!/usr/bin/env python3
"""
TCGCSV-Only Scraper for Union Arena Cards
No TCGPlayer scraping needed - all data comes from TCGCSV!
"""

import requests
import time
import logging
from database import get_session
from models import Card, CardAttribute, CardPrice, Group, Category
from sqlalchemy import text
from datetime import datetime


def save_card_to_db_sqlalchemy(card_data):
    """Save a single card to database using SQLAlchemy ORM"""
    db_session = get_session()
    try:
        # Check if card already exists
        existing_card = (
            db_session.query(Card)
            .filter(Card.product_id == card_data["product_id"])
            .first()
        )

        if existing_card:
            # Update existing card
            card = existing_card
            card.name = card_data["name"]
            card.clean_name = card_data.get("clean_name", "")
            card.card_url = card_data.get("card_url", "")
            card.game = card_data.get("game", "Union Arena")
            card.group_id = card_data.get("group_id")
            card.category_id = card_data.get("category_id", 81)
            card.image_count = card_data.get("image_count", 0)
            card.is_presale = card_data.get("is_presale", False)
            card.released_on = card_data.get("released_on", "")
            card.presale_note = card_data.get("presale_note", "")
            card.modified_on = card_data.get("modified_on", "")
        else:
            # Create new card
            card = Card(
                name=card_data["name"],
                clean_name=card_data.get("clean_name", ""),
                card_url=card_data.get("card_url", ""),
                game=card_data.get("game", "Union Arena"),
                product_id=card_data["product_id"],
                group_id=card_data.get("group_id"),
                category_id=card_data.get("category_id", 81),
                image_count=card_data.get("image_count", 0),
                is_presale=card_data.get("is_presale", False),
                released_on=card_data.get("released_on", ""),
                presale_note=card_data.get("presale_note", ""),
                modified_on=card_data.get("modified_on", ""),
                created_at=datetime.utcnow(),
            )
            db_session.add(card)

        db_session.flush()  # Get the card ID

        # Handle price data
        if (
            card_data.get("price")
            or card_data.get("low_price")
            or card_data.get("mid_price")
            or card_data.get("high_price")
        ):
            existing_price = (
                db_session.query(CardPrice).filter(CardPrice.card_id == card.id).first()
            )

            if existing_price:
                # Update existing price
                if card_data.get("price"):
                    existing_price.market_price = card_data["price"]
                if card_data.get("low_price"):
                    existing_price.low_price = card_data["low_price"]
                if card_data.get("mid_price"):
                    existing_price.mid_price = card_data["mid_price"]
                if card_data.get("high_price"):
                    existing_price.high_price = card_data["high_price"]
            else:
                # Create new price
                price = CardPrice(
                    card_id=card.id,
                    market_price=card_data.get("price"),
                    low_price=card_data.get("low_price"),
                    mid_price=card_data.get("mid_price"),
                    high_price=card_data.get("high_price"),
                    created_at=datetime.utcnow(),
                )
                db_session.add(price)

        # Handle card attributes
        # First, delete existing attributes for this card
        db_session.query(CardAttribute).filter(
            CardAttribute.card_id == card.id
        ).delete()

        # Add new attributes
        for attr_name, attr_value in card_data.items():
            # Skip non-attribute fields
            if attr_name in [
                "name",
                "clean_name",
                "card_url",
                "game",
                "product_id",
                "group_id",
                "category_id",
                "image_count",
                "is_presale",
                "released_on",
                "presale_note",
                "modified_on",
                "price",
                "low_price",
                "mid_price",
                "high_price",
            ]:
                continue

            if attr_value:  # Only save non-empty attributes
                attribute = CardAttribute(
                    card_id=card.id,
                    name=attr_name,
                    value=str(attr_value),
                    display_name=attr_name.replace("_", " ").title(),
                    created_at=datetime.utcnow(),
                )
                db_session.add(attribute)

        db_session.commit()
        return 1  # Success

    except Exception as e:
        db_session.rollback()
        raise e
    finally:
        db_session.close()


def to_title_case(text):
    """Convert text to proper title case, handling special cases"""
    # Handle special cases first
    special_cases = {
        "BLEACH": "Bleach",
        "HUNTER X HUNTER": "Hunter X Hunter",
        "FULLMETAL ALCHEMIST": "Fullmetal Alchemist",
        "CODE GEASS": "Code Geass",
        "GODDESS OF VICTORY: NIKKE": "Goddess of Victory: Nikke",
        "ATTACK ON TITAN": "Attack On Titan",
        "BLACK CLOVER": "Black Clover",
        "DEMON SLAYER": "Demon Slayer",
        "JUJUTSU KAISEN": "Jujutsu Kaisen",
        "ONE PUNCH MAN": "One Punch Man",
        "SWORD ART ONLINE": "Sword Art Online",
        "RUROUNI KENSHIN": "Rurouni Kenshin",
        "KAIJU NO. 8": "Kaiju No. 8",
        "YU YU HAKUSHO": "Yu Yu Hakusho",
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
                    # Clean HTML tags from description
                    import re

                    cleaned_description = re.sub(r"</?em>", "", attr_value)
                    attributes["card_text"] = cleaned_description
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
                    # Store both trigger type and full trigger text
                    import re

                    match = re.match(r"\[([^\]]+)\]", attr_value)
                    if match:
                        trigger_type = match.group(1)
                        # Handle special case: [FINAL] -> [Final]
                        if trigger_type.upper() == "FINAL":
                            trigger_type = "Final"
                        attributes["trigger_type"] = trigger_type
                        attributes["trigger_text"] = (
                            attr_value  # Store full original text
                        )
                    else:
                        # If no brackets, treat the whole value as both type and text
                        attributes["trigger_type"] = attr_value
                        attributes["trigger_text"] = attr_value
                else:
                    # Store any other attributes with their original name
                    attributes[attr_name] = attr_value

            # Get price from TCGCSV
            price_data = price_lookup.get(product_id, {})
            market_price = price_data.get("marketPrice", "")

            # Get presale info
            presale_info = product.get("presaleInfo", {})

            # Get group abbreviation for print type detection and internal group ID
            group_abbreviation = None
            internal_group_id = None
            if group_id:
                from database import get_session
                from models import Group

                db_session = get_session()
                try:
                    # Query by group_id (TCGCSV ID) not internal id
                    group = (
                        db_session.query(Group)
                        .filter(Group.group_id == group_id)
                        .first()
                    )
                    if group:
                        group_abbreviation = group.abbreviation
                        internal_group_id = group.id  # Use internal ID for card storage
                finally:
                    db_session.close()

            # Detect print type using group abbreviation
            from search import detect_print_type

            print_type = detect_print_type(group_abbreviation, product_name)

            # Build card data with TCGCSV structure
            card_data = {
                "name": product_name,
                "clean_name": product.get("cleanName", ""),
                "card_url": product.get(
                    "url", f"https://www.tcgplayer.com/product/{product_id}"
                ),
                "game": "Union Arena",
                "product_id": product_id,
                "group_id": internal_group_id,  # Use internal group ID
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
                # Add standardized snake_case attribute names
                "rarity": attributes.get("rarity", ""),  # Keep as snake_case
                "print_type": print_type,  # Add print type detection as snake_case
            }

            # Save card to database immediately using SQLAlchemy
            try:
                saved_count = save_card_to_db_sqlalchemy(card_data)
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
