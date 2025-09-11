#!/usr/bin/env python3
"""
Database Schema Test Script
Tests the actual database schema to verify it matches documentation
"""

import sqlite3
import sys
from pathlib import Path


def get_db_connection():
    """Get database connection"""
    db_path = Path("cards.db")
    if not db_path.exists():
        print(f"❌ Database file not found: {db_path}")
        return None

    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row  # Enable column access by name
        return conn
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        return None


def test_table_exists(conn, table_name, description):
    """Test if a table exists"""
    print(f"\n🔍 Testing {description}")

    try:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        result = cursor.fetchone()

        if result:
            print(f"   ✅ Table '{table_name}' exists")
            return True
        else:
            print(f"   ❌ Table '{table_name}' does not exist")
            return False
    except Exception as e:
        print(f"   ❌ Error checking table: {e}")
        return False


def test_table_schema(conn, table_name, expected_columns):
    """Test table schema against expected columns"""
    print(f"\n📋 Testing schema for table '{table_name}'")

    try:
        cursor = conn.execute(f"PRAGMA table_info({table_name})")
        actual_columns = cursor.fetchall()

        print(f"   Expected columns: {len(expected_columns)}")
        print(f"   Actual columns: {len(actual_columns)}")

        # Check each expected column
        missing_columns = []
        extra_columns = []

        actual_column_names = [col["name"] for col in actual_columns]

        for expected_col in expected_columns:
            if expected_col not in actual_column_names:
                missing_columns.append(expected_col)

        for actual_col in actual_column_names:
            if actual_col not in expected_columns:
                extra_columns.append(actual_col)

        if not missing_columns and not extra_columns:
            print(f"   ✅ Schema matches exactly")
            return True
        else:
            if missing_columns:
                print(f"   ❌ Missing columns: {missing_columns}")
            if extra_columns:
                print(f"   ⚠️  Extra columns: {extra_columns}")
            return False

    except Exception as e:
        print(f"   ❌ Error checking schema: {e}")
        return False


def test_table_data(conn, table_name, description):
    """Test basic data in table"""
    print(f"\n📊 Testing data in table '{table_name}'")

    try:
        # Get row count
        cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        count = cursor.fetchone()["count"]
        print(f"   📈 Row count: {count:,}")

        if count == 0:
            print(f"   ⚠️  Table is empty")
            return True

        # Get sample data
        cursor = conn.execute(f"SELECT * FROM {table_name} LIMIT 3")
        sample_rows = cursor.fetchall()

        print(f"   📝 Sample data (first 3 rows):")
        for i, row in enumerate(sample_rows, 1):
            print(f"      Row {i}: {dict(row)}")

        return True

    except Exception as e:
        print(f"   ❌ Error checking data: {e}")
        return False


def test_foreign_keys(conn):
    """Test foreign key relationships"""
    print(f"\n🔗 Testing foreign key relationships")

    try:
        # Check if foreign keys are enabled
        cursor = conn.execute("PRAGMA foreign_keys")
        fk_enabled = cursor.fetchone()[0]
        print(f"   Foreign keys enabled: {bool(fk_enabled)}")

        # Test card_attributes -> cards relationship
        cursor = conn.execute(
            """
            SELECT COUNT(*) as count 
            FROM card_attributes ca 
            LEFT JOIN cards c ON ca.card_id = c.id 
            WHERE c.id IS NULL
        """
        )
        orphaned_attrs = cursor.fetchone()["count"]
        print(f"   Orphaned card_attributes: {orphaned_attrs}")

        # Test card_prices -> cards relationship
        cursor = conn.execute(
            """
            SELECT COUNT(*) as count 
            FROM card_prices cp 
            LEFT JOIN cards c ON cp.card_id = c.id 
            WHERE c.id IS NULL
        """
        )
        orphaned_prices = cursor.fetchone()["count"]
        print(f"   Orphaned card_prices: {orphaned_prices}")

        if orphaned_attrs == 0 and orphaned_prices == 0:
            print(f"   ✅ All foreign key relationships are valid")
            return True
        else:
            print(f"   ⚠️  Some foreign key relationships are broken")
            return False

    except Exception as e:
        print(f"   ❌ Error checking foreign keys: {e}")
        return False


def main():
    """Test database schema"""
    print("🗄️  Testing Database Schema")
    print("=" * 50)

    # Connect to database
    conn = get_db_connection()
    if not conn:
        return 1

    try:
        # Expected table schemas - current database structure
        expected_schemas = {
            "cards": [
                "id",
                "product_id",
                "name",
                "clean_name",
                "image_url",
                "image_url_small",
                "card_url",
                "game",
                "category_id",
                "group_id",
                "group_name",
                "image_count",
                "is_presale",
                "released_on",
                "presale_note",
                "modified_on",
                "created_at",
            ],
            "card_attributes": [
                "id",
                "card_id",
                "name",
                "display_name",
                "value",
                "created_at",
            ],
            "card_prices": [
                "id",
                "card_id",
                "market_price",
                "low_price",
                "mid_price",
                "high_price",
                "updated_at",
            ],
            "categories": [
                "id",
                "category_id",
                "name",
                "display_name",
                "description",
                "created_at",
            ],
            "groups": [
                "id",
                "group_id",
                "category_id",
                "name",
                "created_at",
            ],
        }

        results = []

        # Test each table
        for table_name, expected_columns in expected_schemas.items():
            # Test table existence
            exists = test_table_exists(conn, table_name, f"Table '{table_name}'")
            if not exists:
                results.append((table_name, False, "Table does not exist"))
                continue

            # Test schema
            schema_ok = test_table_schema(conn, table_name, expected_columns)

            # Test data
            data_ok = test_table_data(conn, table_name, f"Data in '{table_name}'")

            results.append((table_name, schema_ok and data_ok, "Schema and data"))

        # Test foreign keys
        fk_ok = test_foreign_keys(conn)
        results.append(("foreign_keys", fk_ok, "Foreign key relationships"))

        # Summary
        print("\n" + "=" * 50)
        print("📊 SUMMARY")
        print("=" * 50)

        successful = sum(1 for _, success, _ in results if success)
        total = len(results)

        for table_name, success, test_type in results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {table_name} ({test_type})")

        print(f"\n🎯 Results: {successful}/{total} tests passed")

        if successful == total:
            print("🎉 Database schema is up to date!")
            return 0
        else:
            print("⚠️  Some schema issues found. Check the results above.")
            return 1

    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
