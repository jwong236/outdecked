# Configuration file for TCGPlayer Card Scraper

import os


class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get("SECRET_KEY") or "your-secret-key-here"
    DEBUG = os.environ.get("FLASK_DEBUG", "False").lower() == "true"

    # Database Configuration
    DATABASE_PATH = os.environ.get("DATABASE_PATH") or "cards.db"
