"""
Enhanced SQLAlchemy models for OutDecked application.
Includes to_dict() methods for JSON serialization and proper relationships.
Supports both SQLite (development) and PostgreSQL (production).
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
    Float,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import json


Base = declarative_base()


class User(Base):
    """User model for authentication and user management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    display_name = Column(String)
    avatar_url = Column(String)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    email_verification_token = Column(String)
    password_reset_token = Column(String)
    password_reset_expires = Column(DateTime)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    preferences = relationship(
        "UserPreference",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    sessions = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    hands = relationship(
        "UserHand", back_populates="user", cascade="all, delete-orphan"
    )
    decks = relationship(
        "UserDeck", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Convert user to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserPreference(Base):
    """User preferences for UI customization."""

    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    background = Column(String, default="background-1.jpg")
    cards_per_page = Column(Integer, default=24)
    theme = Column(String, default="light")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="preferences")

    def to_dict(self):
        """Convert user preferences to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "background": self.background,
            "cards_per_page": self.cards_per_page,
            "theme": self.theme,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserSession(Base):
    """User session management."""

    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    session_token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def to_dict(self):
        """Convert user session to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_token": self.session_token,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserHand(Base):
    """User hand data storage (JSON)."""

    __tablename__ = "user_hands"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    hand_data = Column(Text, nullable=False)  # JSON string
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="hands")

    # Unique constraint
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_hands_user_id"),)

    def to_dict(self):
        """Convert user hand to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "hand_data": json.loads(self.hand_data) if self.hand_data else [],
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class UserDeck(Base):
    """User deck data storage (JSON)."""

    __tablename__ = "user_decks"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    deck_id = Column(String, nullable=False)
    deck_data = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="decks")

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("user_id", "deck_id", name="uq_user_decks_user_deck"),
    )

    def to_dict(self):
        """Convert user deck to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "deck_id": self.deck_id,
            "deck_data": json.loads(self.deck_data) if self.deck_data else {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Card(Base):
    """Card model matching TCGCSV structure."""

    __tablename__ = "cards"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, unique=True, nullable=False)
    name = Column(String, nullable=False)
    clean_name = Column(String)
    card_url = Column(String)
    game = Column(String, nullable=False)
    category_id = Column(Integer)
    group_id = Column(Integer)
    group_name = Column(String)
    image_count = Column(Integer)
    is_presale = Column(Boolean, default=False)
    released_on = Column(String)
    presale_note = Column(String)
    modified_on = Column(String)
    print_type = Column(String)  # Added based on search.py queries
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    attributes = relationship(
        "CardAttribute", back_populates="card", cascade="all, delete-orphan"
    )
    prices = relationship(
        "CardPrice", back_populates="card", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Convert card to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.name,
            "clean_name": self.clean_name,
            "card_url": self.card_url,
            "game": self.game,
            "category_id": self.category_id,
            "group_id": self.group_id,
            "group_name": self.group_name,
            "image_count": self.image_count,
            "is_presale": self.is_presale,
            "released_on": self.released_on,
            "presale_note": self.presale_note,
            "modified_on": self.modified_on,
            "print_type": self.print_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CardAttribute(Base):
    """Card attributes matching TCGCSV extendedData structure."""

    __tablename__ = "card_attributes"

    id = Column(Integer, primary_key=True)
    card_id = Column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    value = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    card = relationship("Card", back_populates="attributes")

    # Unique constraint
    __table_args__ = (
        UniqueConstraint("card_id", "name", name="uq_card_attributes_card_name"),
    )

    def to_dict(self):
        """Convert card attribute to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "card_id": self.card_id,
            "name": self.name,
            "display_name": self.display_name,
            "value": self.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class CardPrice(Base):
    """Card price data matching TCGCSV price structure."""

    __tablename__ = "card_prices"

    id = Column(Integer, primary_key=True)
    card_id = Column(
        Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False
    )
    market_price = Column(String)  # Using String to match TCGCSV format
    low_price = Column(String)
    mid_price = Column(String)
    high_price = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    card = relationship("Card", back_populates="prices")

    def to_dict(self):
        """Convert card price to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "card_id": self.card_id,
            "market_price": self.market_price,
            "low_price": self.low_price,
            "mid_price": self.mid_price,
            "high_price": self.high_price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Category(Base):
    """Card categories from TCGCSV."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, unique=True, nullable=False)
    name = Column(String, nullable=False)
    display_name = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert category to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "category_id": self.category_id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Group(Base):
    """Card groups from TCGCSV."""

    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, unique=True, nullable=False)
    category_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    abbreviation = Column(String)
    is_supplemental = Column(Boolean, default=False)
    published_on = Column(String)
    modified_on = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert group to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "group_id": self.group_id,
            "category_id": self.category_id,
            "name": self.name,
            "abbreviation": self.abbreviation,
            "is_supplemental": self.is_supplemental,
            "published_on": self.published_on,
            "modified_on": self.modified_on,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Deck management constants
DECK_TEMPLATE = {
    "id": "",
    "name": "",
    "game": "",
    "description": "",
    "cards": [],
    "created_date": "",
    "last_modified": "",
    "is_public": False,
    "tags": [],
    "notes": "",
    "preferences": {
        "query": "",
        "sort": "name_asc",
        "page": 1,
        "per_page": 25,
        "filters": [],
    },
}

DECK_CARD_TEMPLATE = {
    "card_id": "",
    "quantity": 1,
    "notes": "",
    "added_at": "",
}

DECK_VALIDATION_RULES = {
    "Union Arena": {
        "min_cards": 40,
        "max_cards": 50,
        "max_copies_per_card": 3,
        "required_cards": [],
        "banned_cards": [],
    },
    "default": {
        "min_cards": 1,
        "max_cards": 100,
        "max_copies_per_card": 4,
        "required_cards": [],
        "banned_cards": [],
    },
}
