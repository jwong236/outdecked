#!/usr/bin/env python3
"""
Simple test runner script
Runs all pytest tests with output visible
"""

import subprocess
import sys


def run_tests():
    """Run all pytest tests with output"""
    print("🧪 Running All Tests with Output")
    print("=" * 50)

    # Run pytest with output enabled
    cmd = [sys.executable, "-m", "pytest", "tests/", "-v", "-s", "--tb=short"]

    try:
        result = subprocess.run(cmd, check=True)
        print("\n🎉 All tests passed!")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with exit code {e.returncode}")
        return e.returncode


if __name__ == "__main__":
    sys.exit(run_tests())
