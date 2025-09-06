# OutDecked

A powerful web application that extracts card data from TCGPlayer and provides a searchable interface for trading cards. Built with Flask, OutDecked allows you to scrape multiple pages of cards from any supported TCG game and build a local database for easy searching and image downloading.

## Features

- **Web Scraping**: Extract card data from TCGPlayer search pages
- **Database Storage**: SQLite database for storing card information
- **Search Interface**: Find cards by name with real-time search
- **Image Management**: View and download card images directly
- **Multi-Game Support**: Works with any TCG game supported by TCGPlayer
- **Responsive Design**: Modern, mobile-friendly web interface
- **Background Processing**: Non-blocking scraping operations

## Screenshots

The application features a clean, modern interface with:
- Home page with scraping controls and statistics
- Search page with card grid display
- Responsive design that works on all devices
- Beautiful card layouts with hover effects

## Installation

### Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

### Local Development Setup

1. **Clone or download the project files**
   ```bash
   # If you have git installed
   git clone <repository-url>
   cd tcgplayer-scraper
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python outdecked.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

### Deployment

This application is optimized for **Google Cloud Run** deployment, which provides:
- Serverless, auto-scaling infrastructure
- Pay-per-use pricing model
- Easy container-based deployment
- Built-in load balancing and monitoring

See `GOOGLE_CLOUD_DEPLOYMENT.md` for detailed deployment instructions.

## Usage

### Getting Started

1. **Start the Application**
   - Run `python outdecked.py`
   - Open your web browser to `http://localhost:5000`

2. **Scrape Your First Cards**
   - Enter a TCGPlayer search URL (e.g., Union Arena cards)
   - Specify the game name
   - Set the page range (start with 1-5 pages for testing)
   - Click "Start Scraping"

3. **Search and Browse Cards**
   - Use the search page to find specific cards
   - Filter by game type
   - View card images and details
   - Download images to your local machine

### Example URLs

Here are some example TCGPlayer URLs you can use:

- **Union Arena**: `https://www.tcgplayer.com/search/union-arena/product?productLineName=union-arena&view=grid&ProductTypeName=Cards`
- **Magic: The Gathering**: `https://www.tcgplayer.com/search/magic/product?productLineName=magic&view=grid&ProductTypeName=Cards`
- **Pokemon**: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&view=grid&ProductTypeName=Cards`
- **Yu-Gi-Oh!**: `https://www.tcgplayer.com/search/yu-gi-oh/product?productLineName=yu-gi-oh&view=grid&ProductTypeName=Cards`

### Scraping Guidelines

- **Be Respectful**: Don't scrape too many pages at once
- **Start Small**: Begin with 5-10 pages to test
- **Monitor Progress**: Check the console for scraping updates
- **Wait Between Sessions**: Allow time between large scraping operations

## Project Structure

```
outdecked/
├── outdecked.py                # Main Flask application
├── config.py                 # Configuration settings
├── requirements.txt          # Python dependencies
├── Dockerfile               # Container configuration
├── cloudbuild.yaml          # Google Cloud Build config
├── deploy.sh                # Linux/Mac deployment script
├── deploy.ps1               # Windows PowerShell script
├── .dockerignore            # Docker ignore file
├── templates/               # HTML templates
│   ├── base.html           # Base template with styling
│   ├── index.html          # Home page with scraping form
│   └── search.html         # Search and results page
├── static/                  # Static assets directory
├── cards.db                 # SQLite database (created automatically)
├── README.md                # This file
└── GOOGLE_CLOUD_DEPLOYMENT.md # Cloud Run deployment guide
```

## Technical Details

### Backend (Flask)
- **Web Framework**: Flask for the web application
- **Database**: SQLite for storing card data
- **Scraping**: BeautifulSoup4 for HTML parsing
- **Requests**: HTTP library for fetching web pages
- **Threading**: Background processing for scraping operations

### Frontend
- **Bootstrap 5**: Modern, responsive CSS framework
- **Font Awesome**: Icon library for better UX
- **Vanilla JavaScript**: No heavy frameworks, fast and lightweight
- **Responsive Design**: Works on desktop, tablet, and mobile

### Database Schema
```sql
CREATE TABLE cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    card_url TEXT NOT NULL,
    game TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

- `GET /` - Home page with scraping form
- `POST /scrape` - Start scraping operation
- `GET /search` - Search page with results
- `GET /api/search` - JSON API for search results
- `GET /games` - List of available games
- `GET /stats` - Database statistics

## Configuration

### Environment Variables
The application can be configured using environment variables:

- `SECRET_KEY`: Flask secret key (defaults to 'your-secret-key-here')
- `DATABASE_URL`: Database connection string (defaults to local SQLite)

### Customization
- Modify `app.py` to change scraping behavior
- Update CSS in `templates/base.html` for styling changes
- Add new routes for additional functionality

## Troubleshooting

### Common Issues

1. **Scraping Not Working**
   - Check if TCGPlayer is accessible from your network
   - Verify the URL format is correct
   - Check console for error messages

2. **Images Not Loading**
   - Some card images may be protected or unavailable
   - Check browser console for network errors
   - Verify image URLs are accessible

3. **Database Errors**
   - Ensure write permissions in the project directory
   - Check if `cards.db` file is corrupted
   - Delete `cards.db` to reset the database

4. **Performance Issues**
   - Reduce page range for scraping
   - Increase delay between requests
   - Check system resources

### Debug Mode
Run the application in debug mode for detailed error messages:
```bash
export FLASK_ENV=development
python outdecked.py
```

## Legal and Ethical Considerations

- **Respect Robots.txt**: Check TCGPlayer's robots.txt file
- **Rate Limiting**: Don't overwhelm their servers
- **Terms of Service**: Review TCGPlayer's terms before scraping
- **Personal Use**: This tool is for personal/educational use only
- **Data Usage**: Don't redistribute scraped data commercially

## Contributing

Contributions are welcome! Please consider:

- Adding support for more card games
- Improving the scraping algorithms
- Enhancing the user interface
- Adding new features like price tracking
- Optimizing database performance

## License

This project is for educational and personal use only. Please respect TCGPlayer's terms of service and use responsibly.

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console output for error messages
3. Verify your Python environment and dependencies
4. Check that TCGPlayer URLs are accessible

## Future Enhancements

Potential improvements for future versions:

- **Price Tracking**: Monitor card price changes over time
- **Collection Management**: Organize cards into personal collections
- **Export Features**: Export data to CSV, JSON, or other formats
- **Advanced Search**: Filter by card type, rarity, set, etc.
- **Image Caching**: Store images locally for offline access
- **API Integration**: Connect with other TCG databases
- **User Accounts**: Multi-user support with personal databases

---

**Note**: This application is designed for educational purposes and personal use. Always respect website terms of service and use web scraping responsibly.
