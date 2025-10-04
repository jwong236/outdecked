#!/usr/bin/env python3
"""
Comprehensive test runner for OutDecked API and Database
Runs all tests and provides a detailed summary with examples
"""

import subprocess
import sys
import os
import time
from datetime import datetime

def run_tests():
    """Run all comprehensive tests and provide summary"""
    print("🚀 OutDecked Comprehensive Test Suite")
    print("=" * 60)
    print(f"📅 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test files to run
    test_files = [
        "test_database_schema_comprehensive.py",
        "test_api_endpoints_comprehensive.py"
    ]
    
    results = {}
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for test_file in test_files:
        print(f"[TEST] Running {test_file}...")
        print("-" * 40)
        
        start_time = time.time()
        
        try:
            # Run pytest with verbose output and capture results
            result = subprocess.run([
                sys.executable, "-m", "pytest", 
                test_file, 
                "-v", "-s", "--tb=short"
            ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Parse results
            output_lines = result.stdout.split('\n')
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
            
            results[test_file] = {
                'duration': duration,
                'total': test_count,
                'passed': passed_count,
                'failed': failed_count,
                'output': result.stdout,
                'errors': result.stderr
            }
            
            total_tests += test_count
            passed_tests += passed_count
            failed_tests += failed_count
            
            status = "[OK] PASSED" if failed_count == 0 else "[FAIL] FAILED"
            print(f"{status} {test_file} ({duration:.2f}s)")
            print(f"   Tests: {passed_count}/{test_count} passed")
            
            if failed_count > 0:
                print(f"   [FAIL] {failed_count} tests failed")
                # Show first few error lines
                error_lines = [line for line in output_lines if "FAILED" in line or "ERROR" in line][:3]
                for error_line in error_lines:
                    print(f"   {error_line}")
            
        except Exception as e:
            print(f"[FAIL] Error running {test_file}: {e}")
            results[test_file] = {
                'duration': 0,
                'total': 0,
                'passed': 0,
                'failed': 1,
                'output': '',
                'errors': str(e)
            }
            failed_tests += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print("[INFO] COMPREHENSIVE TEST SUMMARY")
    print("=" * 60)
    
    print(f"📅 Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[TIME]  Total duration: {sum(r['duration'] for r in results.values()):.2f}s")
    print()
    
    print("📋 Test Results by File:")
    for test_file, result in results.items():
        status = "[OK]" if result['failed'] == 0 else "[FAIL]"
        print(f"   {status} {test_file}")
        print(f"      Duration: {result['duration']:.2f}s")
        print(f"      Tests: {result['passed']}/{result['total']} passed")
        if result['failed'] > 0:
            print(f"      Failed: {result['failed']}")
        print()
    
    print("[RESULT] Overall Results:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Passed: {passed_tests}")
    print(f"   Failed: {failed_tests}")
    print(f"   Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "   Success Rate: 0%")
    print()
    
    if failed_tests == 0:
        print("🎉 ALL TESTS PASSED! 🎉")
        print("[OK] Database schema is valid and complete")
        print("[OK] All API endpoints are working correctly")
        print("[OK] Data relationships are properly maintained")
        return 0
    else:
        print("[WARN]  SOME TESTS FAILED")
        print("[FAIL] Please review the failed tests above")
        print("[FAIL] Check the Flask server is running on localhost:5000")
        print("[FAIL] Verify the database has been properly populated")
        return 1

def check_prerequisites():
    """Check if prerequisites are met"""
    print("[TEST] Checking prerequisites...")
    
    # Check if Flask server is running
    try:
        import requests
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            print("[OK] Flask server is running on localhost:5000")
        else:
            print("[FAIL] Flask server is not responding properly")
            return False
    except Exception as e:
        print(f"[FAIL] Flask server is not running: {e}")
        print("   Please start the Flask server with: python outdecked.py")
        return False
    
    # Check if database exists
    if os.path.exists("cards.db"):
        print("[OK] Database file exists")
    else:
        print("[FAIL] Database file not found")
        print("   Please run the scraper to populate the database")
        return False
    
    # Check if test files exist
    test_files = [
        "tests/test_database_schema_comprehensive.py",
        "tests/test_api_endpoints_comprehensive.py"
    ]
    
    for test_file in test_files:
        if os.path.exists(test_file):
            print(f"[OK] {test_file} exists")
        else:
            print(f"[FAIL] {test_file} not found")
            return False
    
    print("[OK] All prerequisites met")
    print()
    return True

if __name__ == "__main__":
    print("🧪 OutDecked Comprehensive Test Runner")
    print("=" * 50)
    print()
    
    if not check_prerequisites():
        print("[FAIL] Prerequisites not met. Please fix the issues above.")
        sys.exit(1)
    
    exit_code = run_tests()
    sys.exit(exit_code)
