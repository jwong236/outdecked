#!/usr/bin/env python3
"""
Test runner for updated API endpoint tests
Runs the new comprehensive test suite for all current API endpoints
"""

import subprocess
import sys
import os
import time
from datetime import datetime


def run_updated_tests():
    """Run the updated API endpoint tests"""
    print("[START] OutDecked Updated API Test Suite")
    print("=" * 60)
    print(f"[TIME] Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    test_file = "test_api_endpoints_updated.py"

    print(f"[CHECK] Running {test_file}...")
    print("-" * 40)

    start_time = time.time()

    try:
        # Run pytest with verbose output and capture results
        result = subprocess.run(
            [sys.executable, "-m", "pytest", test_file, "-v", "-s", "--tb=short"],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__)),
        )

        end_time = time.time()
        duration = end_time - start_time

        # Parse results
        output_lines = result.stdout.split("\n")
        test_count = 0
        passed_count = 0
        failed_count = 0

        for line in output_lines:
            if "PASSED" in line:
                passed_count += 1
                test_count += 1
            elif "FAILED" in line:
                failed_count += 1
                test_count += 1
            elif "ERROR" in line:
                failed_count += 1
                test_count += 1

        status = "[OK] PASSED" if failed_count == 0 else "[ERROR] FAILED"
        print(f"{status} {test_file} ({duration:.2f}s)")
        print(f"   Tests: {passed_count}/{test_count} passed")

        if failed_count > 0:
            print(f"   [ERROR] {failed_count} tests failed")
            # Show first few error lines
            error_lines = [
                line for line in output_lines if "FAILED" in line or "ERROR" in line
            ][:3]
            for error_line in error_lines:
                print(f"   {error_line}")

        # Print full output for debugging
        print("\n" + "=" * 60)
        print("[OUTPUT] FULL TEST OUTPUT")
        print("=" * 60)
        print(result.stdout)

        if result.stderr:
            print("\n" + "=" * 60)
            print("[ERROR] ERRORS")
            print("=" * 60)
            print(result.stderr)

        return 0 if failed_count == 0 else 1

    except Exception as e:
        print(f"[ERROR] Error running {test_file}: {e}")
        return 1


def check_prerequisites():
    """Check if prerequisites are met"""
    print("[CHECK] Checking prerequisites...")

    # Check if Flask server is running
    try:
        import requests

        response = requests.get("http://localhost:5000/api/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Flask server is running on localhost:5000")
        else:
            print("[ERROR] Flask server is not responding properly")
            return False
    except Exception as e:
        print(f"[ERROR] Flask server is not running: {e}")
        print("   Please start the Flask server with: python outdecked.py")
        return False

    # Check if database exists (in parent directory)
    db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cards.db"
    )
    if os.path.exists(db_path):
        print("[OK] Database file exists")
    else:
        print("[ERROR] Database file not found")
        print("   Please run the scraper to populate the database")
        return False

    # Check if test file exists
    test_file = "test_api_endpoints_updated.py"
    if os.path.exists(test_file):
        print(f"[OK] {test_file} exists")
    else:
        print(f"[ERROR] {test_file} not found")
        return False

    print("[OK] All prerequisites met")
    print()
    return True


if __name__ == "__main__":
    print("[TEST] OutDecked Updated API Test Runner")
    print("=" * 50)
    print()

    if not check_prerequisites():
        print("[ERROR] Prerequisites not met. Please fix the issues above.")
        sys.exit(1)

    exit_code = run_updated_tests()

    print("\n" + "=" * 60)
    print("[SUMMARY] TEST SUMMARY")
    print("=" * 60)
    print(f"[TIME] Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if exit_code == 0:
        print("[SUCCESS] ALL TESTS PASSED! [SUCCESS]")
        print("[OK] All API endpoints are working correctly")
        print("[OK] Endpoint structure is properly organized")
        print("[OK] Authentication is working as expected")
        print("[OK] Public endpoints are accessible")
        print("[OK] Protected endpoints require authentication")
    else:
        print("[WARNING]  SOME TESTS FAILED")
        print("[ERROR] Please review the failed tests above")
        print("[ERROR] Check the Flask server is running on localhost:5000")
        print("[ERROR] Verify the database has been properly populated")

    sys.exit(exit_code)
