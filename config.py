# Configuration file for TCGPlayer Card Scraper

import os

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Database Configuration
    DATABASE_PATH = os.environ.get('DATABASE_PATH') or 'cards.db'
    
    # Scraping Configuration
    REQUEST_DELAY = int(os.environ.get('REQUEST_DELAY', '2'))  # seconds between requests
    REQUEST_TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT', '30'))  # seconds
    MAX_PAGES_PER_SESSION = int(os.environ.get('MAX_PAGES_PER_SESSION', '50'))
    
    # User Agent for requests
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    
    # Supported card games (for reference)
    SUPPORTED_GAMES = [
        'Union Arena',
        'Magic: The Gathering',
        'Pokemon',
        'Yu-Gi-Oh!',
        'Digimon',
        'Cardfight!! Vanguard',
        'Dragon Ball Super',
        'Final Fantasy TCG',
        'Force of Will',
        'Legend of the Five Rings'
    ]
    
    # Example URLs for different games
    EXAMPLE_URLS = {
        'Union Arena': 'https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards',
        'Magic: The Gathering': 'https://www.tcgplayer.com/search/magic/product?productLineName=magic&view=grid&ProductTypeName=Cards',
        'Pokemon': 'https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards',
        'Yu-Gi-Oh!': 'https://www.tcgplayer.com/search/yu-gi-oh/product?productLineName=yu-gi-oh&view=grid&ProductTypeName=Cards'
    }
