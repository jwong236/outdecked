"""
Enhanced database operations for OutDecked card management system.
SQLAlchemy-based implementation with environment-based database switching.
Supports both SQLite (development) and PostgreSQL (production).
"""

import os
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from models import (
    Base,
    User,
    UserPreference,
    UserSession,
    UserHand,
    UserDeck,
    Card,
    CardAttribute,
    CardPrice,
    Category,
    Group,
)
from datetime import datetime
import json


class DatabaseManager:
    """Enhanced database manager for SQLAlchemy operations."""

    def __init__(self):
        self.engine = None
        self.Session = None
        self._setup_database()

    def _setup_database(self):
        """Setup database engine and session factory - PostgreSQL for all environments."""
        # Always use PostgreSQL
        self._setup_postgresql()

        # Create session factory
        self.Session = scoped_session(sessionmaker(bind=self.engine))

    def _setup_postgresql(self):
        """Setup PostgreSQL connection for all environments."""
        # Check for DATABASE_URL first (for local testing)
        database_url = os.environ.get("DATABASE_URL")
        if database_url:
            self.engine = create_engine(database_url)
            return

        # Fall back to individual environment variables
        db_host = os.environ.get("DB_HOST", "localhost")
        db_port = os.environ.get("DB_PORT", "5432")
        db_name = os.environ.get("DB_NAME", "outdecked")
        db_user = os.environ.get("DB_USER", "postgres")
        db_password = os.environ.get("DB_PASSWORD", "Applemon236!")

        # Cloud SQL connection string
        if db_host.startswith("/cloudsql/"):
            # Cloud SQL Proxy connection
            connection_string = (
                f"postgresql://{db_user}:{db_password}@/{db_name}?host={db_host}"
            )
        else:
            # Direct connection
            connection_string = (
                f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
            )

        self.engine = create_engine(connection_string, echo=False)

    def get_session(self):
        """Get a new database session."""
        return self.Session()

    def init_db(self):
        """Initialize the database with all tables."""
        try:
            # Create all tables
            Base.metadata.create_all(self.engine)
            print("Database tables created successfully")

            # Populate categories and groups
            self.populate_categories_and_groups()

            # Create default accounts
            self.create_default_owner()
            self.create_test_user()

        except Exception as e:
            print(f"Error initializing database: {e}")
            raise

    def populate_categories_and_groups(self):
        """Populate categories and groups tables from TCGCSV."""
        session = self.get_session()

        try:
            # Fetch categories from TCGCSV
            response = requests.get("https://tcgcsv.com/tcgplayer/categories")
            if response.status_code == 200:
                data = response.json()
                categories = data.get("results", [])

                for category_data in categories:
                    # Check if category already exists
                    existing = (
                        session.query(Category)
                        .filter_by(category_id=category_data["categoryId"])
                        .first()
                    )
                    if not existing:
                        category = Category(
                            category_id=category_data["categoryId"],
                            name=category_data["name"],
                            display_name=category_data.get("displayName", ""),
                            description=category_data.get("categoryDescription", ""),
                        )
                        session.add(category)

                session.commit()
                print(f"Populated {len(categories)} categories")

            # Fetch Union Arena groups
            response = requests.get("https://tcgcsv.com/tcgplayer/81/groups")
            if response.status_code == 200:
                data = response.json()
                groups = data.get("results", [])

                for group_data in groups:
                    # Check if group already exists
                    existing = (
                        session.query(Group)
                        .filter_by(group_id=group_data["groupId"])
                        .first()
                    )
                    if not existing:
                        group = Group(
                            group_id=group_data["groupId"],
                            category_id=81,
                            name=group_data["name"],
                            abbreviation=group_data.get("abbreviation"),
                            is_supplemental=group_data.get("isSupplemental", False),
                            published_on=group_data.get("publishedOn"),
                            modified_on=group_data.get("modifiedOn"),
                        )
                        session.add(group)

                session.commit()
                print(f"Populated {len(groups)} Union Arena groups")

        except Exception as e:
            print(f"Error populating categories and groups: {e}")
            session.rollback()
        finally:
            session.close()

    def create_default_owner(self):
        """Create default owner account."""
        session = self.get_session()

        try:
            # Check if owner already exists
            owner = session.query(User).filter_by(role="owner").first()
            if not owner:
                from werkzeug.security import generate_password_hash

                owner = User(
                    username="admin",
                    email="admin@outdecked.com",
                    password_hash=generate_password_hash("admin123"),
                    role="owner",
                    display_name="Administrator",
                    is_active=True,
                    is_verified=True,
                )
                session.add(owner)
                session.commit()
                print("Default owner account created")
        except Exception as e:
            print(f"Error creating default owner: {e}")
            session.rollback()
        finally:
            session.close()

    def create_test_user(self):
        """Create test user account."""
        session = self.get_session()

        try:
            # Check if test user already exists
            test_user = session.query(User).filter_by(username="testuser").first()
            if not test_user:
                from werkzeug.security import generate_password_hash

                test_user = User(
                    username="testuser",
                    email="test@outdecked.com",
                    password_hash=generate_password_hash("test123"),
                    role="user",
                    display_name="Test User",
                    is_active=True,
                    is_verified=True,
                )
                session.add(test_user)
                session.commit()
                print("Test user account created")
        except Exception as e:
            print(f"Error creating test user: {e}")
            session.rollback()
        finally:
            session.close()

    def get_database_info(self):
        """Get information about the current database connection."""
        return {
            "type": "PostgreSQL",
            "host": os.environ.get("DB_HOST", "localhost"),
            "database": os.environ.get("DB_NAME", "outdecked"),
        }

    def test_connection(self):
        """Test the database connection."""
        session = self.get_session()
        try:
            # Simple query to test connection
            result = session.execute(text("SELECT 1")).fetchone()
            return result[0] == 1
        except Exception as e:
            print(f"Database connection test failed: {e}")
            return False
        finally:
            session.close()


# Global database manager instance
db_manager = DatabaseManager()


def get_db_connection():
    """Legacy function for backward compatibility - returns SQLAlchemy session."""
    return db_manager.get_session()


def get_session():
    """Get a new database session."""
    return db_manager.get_session()


def init_db():
    """Initialize the database."""
    db_manager.init_db()


def get_cloud_sql_connection():
    """Legacy function for backward compatibility."""
    return db_manager.get_session()


# Legacy functions for backward compatibility
def populate_categories_and_groups():
    """Legacy function for backward compatibility."""
    db_manager.populate_categories_and_groups()


def create_default_owner():
    """Legacy function for backward compatibility."""
    db_manager.create_default_owner()


def create_test_user():
    """Legacy function for backward compatibility."""
    db_manager.create_test_user()


def get_database_info():
    """Get database information."""
    return db_manager.get_database_info()


def test_connection():
    """Test database connection."""
    return db_manager.test_connection()
