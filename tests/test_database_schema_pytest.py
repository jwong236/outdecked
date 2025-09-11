#!/usr/bin/env python3
"""
Pytest test suite for database schema
Tests the database schema to ensure it matches expected structure
"""

import pytest
import sqlite3
import sys
import os

# Add parent directory to path to import database module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection


class TestDatabaseSchema:
    """Test class for database schema validation"""

    @pytest.fixture
    def conn(self):
        """Database connection fixture"""
        conn = get_db_connection()
        if not conn:
            pytest.skip("Database connection failed")
        yield conn
        conn.close()

    def test_database_connection(self):
        """Test that database connection works"""
        conn = get_db_connection()
        assert conn is not None
        conn.close()

    def test_cards_table_exists(self, conn):
        """Test that cards table exists"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cards'")
        result = cursor.fetchone()
        assert result is not None

    def test_cards_table_schema(self, conn):
        """Test cards table schema"""
        cursor = conn.execute("PRAGMA table_info(cards)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = [
            "id", "product_id", "name", "clean_name", "image_url", "image_url_small",
            "card_url", "game", "category_id", "group_id", "group_name", "image_count",
            "is_presale", "released_on", "presale_note", "modified_on", "created_at"
        ]
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns

    def test_cards_table_has_data(self, conn):
        """Test that cards table has data"""
        cursor = conn.execute("SELECT COUNT(*) FROM cards")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 3000  # Should have at least 3000 cards

    def test_card_attributes_table_exists(self, conn):
        """Test that card_attributes table exists"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='card_attributes'")
        result = cursor.fetchone()
        assert result is not None

    def test_card_attributes_table_schema(self, conn):
        """Test card_attributes table schema"""
        cursor = conn.execute("PRAGMA table_info(card_attributes)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "card_id", "name", "display_name", "value", "created_at"]
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns

    def test_card_attributes_table_has_data(self, conn):
        """Test that card_attributes table has data"""
        cursor = conn.execute("SELECT COUNT(*) FROM card_attributes")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 30000  # Should have at least 30000 attributes

    def test_card_prices_table_exists(self, conn):
        """Test that card_prices table exists"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='card_prices'")
        result = cursor.fetchone()
        assert result is not None

    def test_card_prices_table_schema(self, conn):
        """Test card_prices table schema"""
        cursor = conn.execute("PRAGMA table_info(card_prices)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "card_id", "market_price", "low_price", "mid_price", "high_price", "updated_at"]
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns

    def test_card_prices_table_has_data(self, conn):
        """Test that card_prices table has data"""
        cursor = conn.execute("SELECT COUNT(*) FROM card_prices")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 3000  # Should have at least 3000 prices

    def test_categories_table_exists(self, conn):
        """Test that categories table exists"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
        result = cursor.fetchone()
        assert result is not None

    def test_categories_table_schema(self, conn):
        """Test categories table schema"""
        cursor = conn.execute("PRAGMA table_info(categories)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "category_id", "name", "display_name", "description", "created_at"]
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns

    def test_categories_table_has_data(self, conn):
        """Test that categories table has data"""
        cursor = conn.execute("SELECT COUNT(*) FROM categories")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 80  # Should have at least 80 categories

    def test_groups_table_exists(self, conn):
        """Test that groups table exists"""
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='groups'")
        result = cursor.fetchone()
        assert result is not None

    def test_groups_table_schema(self, conn):
        """Test groups table schema"""
        cursor = conn.execute("PRAGMA table_info(groups)")
        columns = [row[1] for row in cursor.fetchall()]
        
        expected_columns = ["id", "group_id", "category_id", "name", "created_at"]
        
        assert len(columns) == len(expected_columns)
        for expected_col in expected_columns:
            assert expected_col in columns

    def test_groups_table_has_data(self, conn):
        """Test that groups table has data"""
        cursor = conn.execute("SELECT COUNT(*) FROM groups")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 40  # Should have at least 40 groups

    def test_foreign_key_relationships(self, conn):
        """Test that foreign key relationships are valid"""
        # Test that all card_attributes have valid card_ids
        cursor = conn.execute("""
            SELECT COUNT(*) FROM card_attributes ca 
            LEFT JOIN cards c ON ca.card_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_attributes = cursor.fetchone()[0]
        assert orphaned_attributes == 0

        # Test that all card_prices have valid card_ids
        cursor = conn.execute("""
            SELECT COUNT(*) FROM card_prices cp 
            LEFT JOIN cards c ON cp.card_id = c.id 
            WHERE c.id IS NULL
        """)
        orphaned_prices = cursor.fetchone()[0]
        assert orphaned_prices == 0

    def test_card_attributes_unique_fields(self, conn):
        """Test that card_attributes has expected unique fields"""
        cursor = conn.execute("SELECT DISTINCT name FROM card_attributes ORDER BY name")
        fields = [row[0] for row in cursor.fetchall()]
        
        expected_fields = [
            "ActionPointCost", "ActivationEnergy", "Affinities", "BattlePointBP",
            "CardType", "Description", "GeneratedEnergy", "Number", "Rarity",
            "RequiredEnergy", "SeriesName", "Trigger"
        ]
        
        assert len(fields) == len(expected_fields)
        for expected_field in expected_fields:
            assert expected_field in fields

    def test_union_arena_cards_exist(self, conn):
        """Test that Union Arena cards exist"""
        cursor = conn.execute("SELECT COUNT(*) FROM cards WHERE game = 'Union Arena'")
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 3000  # Should have at least 3000 Union Arena cards

    def test_categories_include_union_arena(self, conn):
        """Test that categories table includes Union Arena"""
        cursor = conn.execute("SELECT COUNT(*) FROM categories WHERE name = 'Union Arena'")
        count = cursor.fetchone()[0]
        assert count > 0

    def test_groups_include_union_arena_sets(self, conn):
        """Test that groups table includes Union Arena sets"""
        cursor = conn.execute("""
            SELECT COUNT(*) FROM groups g 
            JOIN categories c ON g.category_id = c.category_id 
            WHERE c.name = 'Union Arena'
        """)
        count = cursor.fetchone()[0]
        assert count > 0
        assert count >= 40  # Should have at least 40 Union Arena groups


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
