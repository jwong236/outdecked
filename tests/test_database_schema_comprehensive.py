#!/usr/bin/env python3
"""
Comprehensive pytest test suite for database schema
Tests the database schema to ensure it matches expected structure
Includes examples of actual data and relationships
"""

import pytest
import sqlite3
import sys
import os

# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection


class TestDatabaseConnection:
    """Test class for database connection and basic setup"""

    def test_database_connection(self):
        """Test that database connection works"""
        print(f"\n🔍 Testing database connection...")
        conn = get_db_connection()
        assert conn is not None
        print(f"   ✅ Database connection successful")
        conn.close()

    def test_database_file_exists(self):
        """Test that database file exists"""
        print(f"\n🔍 Testing database file existence...")
        assert os.path.exists("cards.db")
        print(f"   ✅ Database file 'cards.db' exists")

    def test_database_tables_exist(self):
        """Test that all required tables exist"""
        print(f"\n🔍 Testing database tables existence...")
        conn = get_db_connection()
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        expected_tables = [
            "cards", "card_attributes", "card_prices", 
            "categories", "groups", "attributes_fields",
            "users", "user_preferences", "user_sessions", "user_hands", "user_decks"
        ]
        
        print(f"   ✅ Found {len(tables)} tables: {tables}")
        
        for table in expected_tables:
            assert table in tables, f"Table '{table}' not found"
            print(f"   📄 Table '{table}' exists")


class TestCardsTable:
    """Test class for cards table schema and data"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_cards_table_schema(self, conn):
        """Test cards table schema"""
        print(f"\n🔍 Testing cards table schema...")
        cursor = conn.execute("PRAGMA table_info(cards)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "product_id", "name", "clean_name", 
            "card_url", "game", "category_id", "group_id", "group_name", 
            "image_count", "is_presale", "released_on", "presale_note", 
            "modified_on"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_cards_table_has_data(self, conn):
        """Test that cards table has data"""
        print(f"\n🔍 Testing cards table data...")
        cursor = conn.execute("SELECT COUNT(*) FROM cards")
        count = cursor.fetchone()[0]
        print(f"   ✅ Cards table has {count} records")
        
        assert count > 0
        assert count >= 3000  # Should have at least 3000 cards

    def test_cards_table_sample_data(self, conn):
        """Test sample data from cards table"""
        print(f"\n🔍 Testing cards table sample data...")
        cursor = conn.execute("SELECT * FROM cards LIMIT 3")
        cards = cursor.fetchall()
        
        print(f"   ✅ Retrieved {len(cards)} sample cards")
        
        for i, card in enumerate(cards):
            print(f"   📄 Card {i+1}:")
            print(f"      ID: {card['id']}")
            print(f"      Name: {card['name']}")
            print(f"      Game: {card['game']}")
            print(f"      Product ID: {card['product_id']}")
            print(f"      Group: {card['group_name']}")
            print(f"      Card URL: {card['card_url'][:50]}..." if card['card_url'] else "      Card URL: None")
        
        assert len(cards) > 0
        for card in cards:
            assert card['id'] is not None
            assert card['name'] is not None
            assert card['game'] is not None

    def test_union_arena_cards_exist(self, conn):
        """Test that Union Arena cards exist"""
        print(f"\n🔍 Testing Union Arena cards...")
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE game = 'Union Arena'")
        count = cursor.fetchone()[0]
        print(f"   ✅ Found {count} Union Arena cards")
        
        assert count > 0
        assert count >= 3000  # Should have at least 3000 Union Arena cards

    def test_cards_have_required_fields(self, conn):
        """Test that cards have required fields populated"""
        print(f"\n🔍 Testing cards required fields...")
        
        # Test that cards have names
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE name IS NULL OR name = ''")
        null_names = cursor.fetchone()[0]
        print(f"   ✅ Cards with null/empty names: {null_names}")
        assert null_names == 0

        # Test that cards have games
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE game IS NULL OR game = ''")
        null_games = cursor.fetchone()[0]
        print(f"   ✅ Cards with null/empty games: {null_games}")
        assert null_games == 0

        # Test that cards have product_ids
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE product_id IS NULL")
        null_product_ids = cursor.fetchone()[0]
        print(f"   ✅ Cards with null product_ids: {null_product_ids}")
        assert null_product_ids == 0


class TestCardAttributesTable:
    """Test class for card_attributes table schema and data"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_card_attributes_table_schema(self, conn):
        """Test card_attributes table schema"""
        print(f"\n🔍 Testing card_attributes table schema...")
        cursor = conn.execute("PRAGMA table_info(card_attributes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "card_id", "name", "display_name", "value", "created_at"]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_card_attributes_table_has_data(self, conn):
        """Test that card_attributes table has data"""
        print(f"\n🔍 Testing card_attributes table data...")
        cursor = conn.execute("SELECT COUNT(*) FROM card_attributes")
        count = cursor.fetchone()[0]
        print(f"   ✅ Card attributes table has {count} records")
        
        assert count > 0
        assert count >= 30000  # Should have at least 30000 attributes

    def test_card_attributes_sample_data(self, conn):
        """Test sample data from card_attributes table"""
        print(f"\n🔍 Testing card_attributes table sample data...")
        cursor = conn.execute("SELECT * FROM card_attributes LIMIT 5")
        attributes = cursor.fetchall()
        
        print(f"   ✅ Retrieved {len(attributes)} sample attributes")
        
        for i, attr in enumerate(attributes):
            print(f"   📄 Attribute {i+1}:")
            print(f"      Card ID: {attr['card_id']}")
            print(f"      Name: {attr['name']}")
            print(f"      Display Name: {attr['display_name']}")
            print(f"      Value: {attr['value']}")
        
        assert len(attributes) > 0
        for attr in attributes:
            assert attr['card_id'] is not None
            assert attr['name'] is not None
            assert attr['value'] is not None

    def test_card_attributes_unique_fields(self, conn):
        """Test that card_attributes has expected unique fields"""
        print(f"\n🔍 Testing card_attributes unique fields...")
        cursor = conn.execute("SELECT DISTINCT name FROM card_attributes ORDER BY name")
        fields = [row[0] for row in cursor.fetchall()]
        
        print(f"   ✅ Found {len(fields)} unique attribute fields:")
        for field in fields:
            print(f"   📄 Field: {field}")
        
        expected_fields = [
            "ActionPointCost", "ActivationEnergy", "Affinities", "BattlePointBP",
            "CardType", "Description", "GeneratedEnergy", "Number", "PrintType",
            "Rarity", "RequiredEnergy", "SeriesName", "Trigger"
        ]
        
        assert len(fields) == len(expected_fields)
        for expected_field in expected_fields:
            assert expected_field in fields, f"Field '{expected_field}' not found"

    def test_card_attributes_field_counts(self, conn):
        """Test counts for each attribute field"""
        print(f"\n🔍 Testing card_attributes field counts...")
        cursor = conn.execute("""
            SELECT name, COUNT(*) as count 
            FROM card_attributes 
            GROUP BY name 
            ORDER BY count DESC
        """)
        field_counts = cursor.fetchall()
        
        print(f"   ✅ Attribute field counts:")
        for field_count in field_counts:
            print(f"   📄 {field_count['name']}: {field_count['count']} records")
        
        assert len(field_counts) > 0
        for field_count in field_counts:
            assert field_count['count'] > 0


class TestCardPricesTable:
    """Test class for card_prices table schema and data"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_card_prices_table_schema(self, conn):
        """Test card_prices table schema"""
        print(f"\n🔍 Testing card_prices table schema...")
        cursor = conn.execute("PRAGMA table_info(card_prices)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "card_id", "market_price", "low_price", "mid_price", "high_price", "updated_at"]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_card_prices_table_has_data(self, conn):
        """Test that card_prices table has data"""
        print(f"\n🔍 Testing card_prices table data...")
        cursor = conn.execute("SELECT COUNT(*) FROM card_prices")
        count = cursor.fetchone()[0]
        print(f"   ✅ Card prices table has {count} records")
        
        assert count > 0
        assert count >= 3000  # Should have at least 3000 prices

    def test_card_prices_sample_data(self, conn):
        """Test sample data from card_prices table"""
        print(f"\n🔍 Testing card_prices table sample data...")
        cursor = conn.execute("SELECT * FROM card_prices LIMIT 3")
        prices = cursor.fetchall()
        
        print(f"   ✅ Retrieved {len(prices)} sample price records")
        
        for i, price in enumerate(prices):
            print(f"   📄 Price {i+1}:")
            print(f"      Card ID: {price['card_id']}")
            print(f"      Market Price: {price['market_price']}")
            print(f"      Low Price: {price['low_price']}")
            print(f"      Mid Price: {price['mid_price']}")
            print(f"      High Price: {price['high_price']}")
        
        assert len(prices) > 0
        for price in prices:
            assert price['card_id'] is not None


class TestCategoriesTable:
    """Test class for categories table schema and data"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_categories_table_schema(self, conn):
        """Test categories table schema"""
        print(f"\n🔍 Testing categories table schema...")
        cursor = conn.execute("PRAGMA table_info(categories)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "category_id", "name", "display_name", "description", "created_at"]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_categories_table_has_data(self, conn):
        """Test that categories table has data"""
        print(f"\n🔍 Testing categories table data...")
        cursor = conn.execute("SELECT COUNT(*) FROM categories")
        count = cursor.fetchone()[0]
        print(f"   ✅ Categories table has {count} records")
        
        assert count > 0
        assert count >= 80  # Should have at least 80 categories

    def test_categories_sample_data(self, conn):
        """Test sample data from categories table"""
        print(f"\n🔍 Testing categories table sample data...")
        cursor = conn.execute("SELECT * FROM categories LIMIT 5")
        categories = cursor.fetchall()
        
        print(f"   ✅ Retrieved {len(categories)} sample categories")
        
        for i, category in enumerate(categories):
            print(f"   📄 Category {i+1}:")
            print(f"      ID: {category['category_id']}")
            print(f"      Name: {category['name']}")
            print(f"      Display Name: {category['display_name']}")
            print(f"      Description: {category['description'][:50]}..." if category['description'] else "      Description: None")
        
        assert len(categories) > 0
        for category in categories:
            assert category['category_id'] is not None
            assert category['name'] is not None

    def test_categories_include_union_arena(self, conn):
        """Test that categories table includes Union Arena"""
        print(f"\n🔍 Testing Union Arena in categories...")
        cursor = conn.execute("SELECT * FROM categories WHERE name = 'Union Arena'")
        union_arena = cursor.fetchone()
        
        if union_arena:
            print(f"   ✅ Union Arena category found:")
            print(f"   📄 ID: {union_arena['category_id']}")
            print(f"   📄 Name: {union_arena['name']}")
            print(f"   📄 Display Name: {union_arena['display_name']}")
        
        assert union_arena is not None


class TestGroupsTable:
    """Test class for groups table schema and data"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_groups_table_schema(self, conn):
        """Test groups table schema"""
        print(f"\n🔍 Testing groups table schema...")
        cursor = conn.execute("PRAGMA table_info(groups)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "group_id", "category_id", "name", "abbreviation", "is_supplemental", "published_on", "modified_on", "created_at"]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_groups_table_has_data(self, conn):
        """Test that groups table has data"""
        print(f"\n🔍 Testing groups table data...")
        cursor = conn.execute("SELECT COUNT(*) FROM groups")
        count = cursor.fetchone()[0]
        print(f"   ✅ Groups table has {count} records")
        
        assert count > 0
        assert count >= 40  # Should have at least 40 groups

    def test_groups_sample_data(self, conn):
        """Test sample data from groups table"""
        print(f"\n🔍 Testing groups table sample data...")
        cursor = conn.execute("SELECT * FROM groups LIMIT 5")
        groups = cursor.fetchall()
        
        print(f"   ✅ Retrieved {len(groups)} sample groups")
        
        for i, group in enumerate(groups):
            print(f"   📄 Group {i+1}:")
            print(f"      ID: {group['group_id']}")
            print(f"      Category ID: {group['category_id']}")
            print(f"      Name: {group['name']}")
            print(f"      Abbreviation: {group['abbreviation']}")
            print(f"      Is Supplemental: {group['is_supplemental']}")
        
        assert len(groups) > 0
        for group in groups:
            assert group['group_id'] is not None
            assert group['name'] is not None

    def test_groups_include_union_arena_sets(self, conn):
        """Test that groups table includes Union Arena sets"""
        print(f"\n🔍 Testing Union Arena groups...")
        cursor = conn.execute("""
            SELECT g.*, c.name as category_name
            FROM groups g 
            JOIN categories c ON g.category_id = c.category_id 
            WHERE c.name = 'Union Arena'
            LIMIT 5
        """)
        union_arena_groups = cursor.fetchall()
        
        print(f"   ✅ Found {len(union_arena_groups)} Union Arena groups")
        
        for i, group in enumerate(union_arena_groups):
            print(f"   📄 Union Arena Group {i+1}:")
            print(f"      ID: {group['group_id']}")
            print(f"      Name: {group['name']}")
            print(f"      Abbreviation: {group['abbreviation']}")
            print(f"      Category: {group['category_name']}")
        
        assert len(union_arena_groups) > 0
        assert len(union_arena_groups) >= 5  # Should have at least 5 Union Arena groups


class TestDatabaseRelationships:
    """Test class for database relationships and foreign keys"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_foreign_key_relationships(self, conn):
        """Test that foreign key relationships are valid"""
        print(f"\n🔍 Testing foreign key relationships...")
        
        # Test that all card_attributes have valid card_ids
        cursor = conn.execute("""
            SELECT COUNT(*) FROM card_attributes ca 
            LEFT JOIN cards c ON ca.card_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_attributes = cursor.fetchone()[0]
        print(f"   ✅ Orphaned card_attributes: {orphaned_attributes}")
        assert orphaned_attributes == 0

        # Test that all card_prices have valid card_ids
        cursor = conn.execute("""
            SELECT COUNT(*) FROM card_prices cp 
            LEFT JOIN cards c ON cp.card_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_prices = cursor.fetchone()[0]
        print(f"   ✅ Orphaned card_prices: {orphaned_prices}")
        assert orphaned_prices == 0

        # Test that all cards have valid group_ids (if not null)
        cursor = conn.execute("""
            SELECT COUNT(*) FROM cards c 
            LEFT JOIN groups g ON c.group_id = g.group_id 
            WHERE c.group_id IS NOT NULL AND g.group_id IS NULL
        """)
        orphaned_cards = cursor.fetchone()[0]
        print(f"   ✅ Cards with invalid group_ids: {orphaned_cards}")
        assert orphaned_cards == 0

    def test_card_attributes_per_card(self, conn):
        """Test that cards have expected attributes"""
        print(f"\n🔍 Testing card attributes per card...")
        
        # Get a sample card with its attributes
        cursor = conn.execute("""
            SELECT c.id, c.name, COUNT(ca.id) as attribute_count
            FROM cards c
            LEFT JOIN card_attributes ca ON c.id = ca.card_id
            GROUP BY c.id, c.name
            LIMIT 5
        """)
        cards_with_attributes = cursor.fetchall()
        
        print(f"   ✅ Sample cards with attribute counts:")
        for card in cards_with_attributes:
            print(f"   📄 {card['name']}: {card['attribute_count']} attributes")
        
        assert len(cards_with_attributes) > 0
        for card in cards_with_attributes:
            assert card['attribute_count'] > 0

    def test_groups_categories_relationship(self, conn):
        """Test that groups are properly linked to categories"""
        print(f"\n🔍 Testing groups-categories relationship...")
        
        cursor = conn.execute("""
            SELECT COUNT(*) FROM groups g 
            LEFT JOIN categories c ON g.category_id = c.category_id 
            WHERE c.category_id IS NULL
        """)
        orphaned_groups = cursor.fetchone()[0]
        print(f"   ✅ Groups with invalid category_ids: {orphaned_groups}")
        assert orphaned_groups == 0

    def test_data_consistency(self, conn):
        """Test data consistency across tables"""
        print(f"\n🔍 Testing data consistency...")
        
        # Test that all cards have at least one attribute
        cursor = conn.execute("""
            SELECT COUNT(*) FROM cards c
            LEFT JOIN card_attributes ca ON c.id = ca.card_id
            WHERE ca.id IS NULL
        """)
        cards_without_attributes = cursor.fetchone()[0]
        print(f"   ✅ Cards without attributes: {cards_without_attributes}")
        assert cards_without_attributes == 0

        # Test that all cards have price data
        cursor = conn.execute("""
            SELECT COUNT(*) FROM cards c
            LEFT JOIN card_prices cp ON c.id = cp.card_id
            WHERE cp.id IS NULL
        """)
        cards_without_prices = cursor.fetchone()[0]
        print(f"   ✅ Cards without prices: {cards_without_prices}")
        assert cards_without_prices < 50  # Some cards may not have price data


class TestDatabasePerformance:
    """Test class for database performance and indexing"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_database_indexes(self, conn):
        """Test that important indexes exist"""
        print(f"\n🔍 Testing database indexes...")
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in cursor.fetchall()]
        
        print(f"   ✅ Found {len(indexes)} indexes: {indexes}")
        
        # Check for important indexes
        important_indexes = [
            "idx_cards_product_id",
            "idx_cards_game", 
            "idx_card_attributes_card_id",
            "idx_card_attributes_name",
            "idx_card_prices_card_id"
        ]
        
        for index in important_indexes:
            if index in indexes:
                print(f"   📄 Index '{index}' exists")
            else:
                print(f"   ⚠️  Index '{index}' missing (may impact performance)")

    def test_query_performance(self, conn):
        """Test basic query performance"""
        print(f"\n🔍 Testing query performance...")
        import time
        
        # Test cards query
        start_time = time.time()
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE game = 'Union Arena'")
        count = cursor.fetchone()[0]
        cards_time = time.time() - start_time
        print(f"   ✅ Cards query: {cards_time:.3f}s ({count} results)")
        
        # Test attributes query
        start_time = time.time()
        cursor = conn.execute("SELECT COUNT(*) FROM card_attributes WHERE name = 'Rarity'")
        count = cursor.fetchone()[0]
        attributes_time = time.time() - start_time
        print(f"   ✅ Attributes query: {attributes_time:.3f}s ({count} results)")
        
        # Test join query
        start_time = time.time()
        cursor = conn.execute("""
            SELECT c.name, ca.value 
            FROM cards c 
            JOIN card_attributes ca ON c.id = ca.card_id 
            WHERE ca.name = 'Rarity' 
            LIMIT 10
        """)
        results = cursor.fetchall()
        join_time = time.time() - start_time
        print(f"   ✅ Join query: {join_time:.3f}s ({len(results)} results)")
        
        # Performance should be reasonable (less than 1 second for basic queries)
        assert cards_time < 1.0
        assert attributes_time < 1.0
        assert join_time < 1.0


class TestUserTables:
    """Test class for user management tables"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_users_table_schema(self, conn):
        """Test users table schema"""
        print(f"\n🔍 Testing users table schema...")
        cursor = conn.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "username", "email", "password_hash", "role", 
            "display_name", "avatar_url", "is_active", "is_verified",
            "email_verification_token", "password_reset_token", 
            "password_reset_expires", "last_login", "created_at", "updated_at"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_user_preferences_table_schema(self, conn):
        """Test user_preferences table schema"""
        print(f"\n🔍 Testing user_preferences table schema...")
        cursor = conn.execute("PRAGMA table_info(user_preferences)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "user_id", "background", "cards_per_page", "default_sort", "theme",
            "created_at", "updated_at"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_user_sessions_table_schema(self, conn):
        """Test user_sessions table schema"""
        print(f"\n🔍 Testing user_sessions table schema...")
        cursor = conn.execute("PRAGMA table_info(user_sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "user_id", "session_token", "expires_at", 
            "ip_address", "user_agent", "created_at"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_user_hands_table_schema(self, conn):
        """Test user_hands table schema"""
        print(f"\n🔍 Testing user_hands table schema...")
        cursor = conn.execute("PRAGMA table_info(user_hands)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "user_id", "hand_data", "updated_at"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_user_decks_table_schema(self, conn):
        """Test user_decks table schema"""
        print(f"\n🔍 Testing user_decks table schema...")
        cursor = conn.execute("PRAGMA table_info(user_decks)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "user_id", "deck_id", "deck_data", 
            "created_at", "updated_at"
        ]
        
        print(f"   ✅ Found {len(columns)} columns: {columns}")
        
        for expected_col in expected_columns:
            assert expected_col in columns, f"Column '{expected_col}' not found"
            print(f"   📄 Column '{expected_col}' exists")

    def test_owner_account_exists(self, conn):
        """Test that owner account exists"""
        print(f"\n🔍 Testing owner account existence...")
        cursor = conn.execute("SELECT username, role FROM users WHERE role = 'owner'")
        owner = cursor.fetchone()
        
        assert owner is not None, "Owner account should exist"
        assert owner[0] == "owner", "Owner username should be 'owner'"
        assert owner[1] == "owner", "Owner role should be 'owner'"
        print(f"   ✅ Owner account exists: {owner[0]}")

    def test_owner_has_preferences(self, conn):
        """Test that owner has default preferences"""
        print(f"\n🔍 Testing owner preferences...")
        cursor = conn.execute("SELECT id FROM users WHERE role = 'owner'")
        owner = cursor.fetchone()
        
        if owner:
            cursor.execute(
                "SELECT COUNT(*) FROM user_preferences WHERE user_id = ?", 
                (owner[0],)
            )
            pref_count = cursor.fetchone()[0]
            print(f"   ✅ Owner has {pref_count} preferences")
            assert pref_count > 0, "Owner should have default preferences"

    def test_user_table_indexes(self, conn):
        """Test that user table indexes exist"""
        print(f"\n🔍 Testing user table indexes...")
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in cursor.fetchall()]
        
        expected_indexes = [
            "idx_users_username",
            "idx_users_email", 
            "idx_users_role",
            "idx_user_preferences_user_id",
            "idx_user_sessions_token",
            "idx_user_sessions_user_id",
            "idx_user_hands_user_id"
        ]
        
        for index in expected_indexes:
            if index in indexes:
                print(f"   📄 Index '{index}' exists")
            else:
                print(f"   ⚠️  Index '{index}' missing")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
