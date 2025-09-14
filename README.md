# OutDecked

A modern web application for trading card game enthusiasts. OutDecked combines a Flask backend for data scraping and management with a Next.js frontend for a beautiful, responsive user experience. Build decks, search cards, manage your collection, and print proxies.

## Features

- **Modern Frontend**: Next.js 14 with TypeScript, Tailwind CSS, and React Query
- **Deck Building**: Create and manage trading card decks with validation
- **Card Search**: Advanced search with filters for series, rarity, color, and more
- **Proxy Printing**: Generate printable proxy cards for playtesting
- **Collection Management**: Track cards in your hand/collection
- **Background Switching**: Multiple beautiful anime-themed backgrounds
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Data Scraping**: Extract card data from TCGPlayer (backend feature)

## Screenshots

The application features a clean, modern interface with:
- Home page with scraping controls and statistics
- Search page with card grid display
- Responsive design that works on all devices
- Beautiful card layouts with hover effects

## Installation

### Prerequisites

- **Node.js 18+** and npm
- **Python 3.7+** and pip
- **Git** (for cloning the repository)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd outdecked
   ```

2. **Install Python dependencies (Backend)**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies (Frontend)**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Start the backend server**
   ```bash
   python outdecked.py
   ```
   The Flask server will run on `http://localhost:5000`

5. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The Next.js app will run on `http://localhost:3000`

6. **Open your browser**
   Navigate to `http://localhost:3000` to use the application

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
├── outdecked.py                    # Flask backend server
├── config.py                      # Backend configuration
├── database.py                    # Database models and operations
├── scraper.py                     # TCGPlayer scraping logic
├── search.py                      # Search API endpoints
├── requirements.txt               # Python dependencies
├── cards.db                       # SQLite database (auto-created)
├── frontend/                      # Next.js frontend application
│   ├── src/
│   │   ├── app/                   # Next.js App Router pages
│   │   │   ├── page.tsx          # Home page
│   │   │   ├── search/           # Search page
│   │   │   ├── deckbuilder/      # Deck builder pages
│   │   │   ├── cart/             # Hand/collection page
│   │   │   ├── proxy-printer/    # Proxy printing page
│   │   │   └── api/              # Frontend API routes
│   │   ├── components/            # React components
│   │   │   ├── app/              # App-level components
│   │   │   ├── shared/           # Shared components
│   │   │   └── features/         # Feature-specific components
│   │   ├── lib/                  # Utilities and hooks
│   │   ├── stores/               # Zustand state management
│   │   └── types/                # TypeScript type definitions
│   ├── public/                   # Static assets
│   ├── package.json              # Node.js dependencies
│   └── next.config.js            # Next.js configuration
├── templates/                     # Legacy HTML templates (backend)
├── static/                       # Legacy static assets (backend)
├── README.md                     # This file
└── GOOGLE_CLOUD_DEPLOYMENT.md    # Cloud deployment guide
```

## Technical Details

### Backend (Flask)
- **Web Framework**: Flask for API endpoints and data management
- **Database**: SQLite for storing card data and metadata
- **Scraping**: BeautifulSoup4 for HTML parsing from TCGPlayer
- **Requests**: HTTP library for fetching web pages
- **Threading**: Background processing for scraping operations

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: Zustand for client-side state
- **Data Fetching**: React Query for server state management
- **Icons**: Heroicons for consistent iconography
- **Responsive Design**: Mobile-first approach with Tailwind

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

### Backend (Flask - Port 5000)
- `GET /api/search` - Search cards with filters and pagination
- `GET /api/filter-values/<field>` - Get filter values for dropdowns
- `GET /api/card-by-url` - Get card data by URL
- `POST /scrape` - Start scraping operation
- `GET /games` - List of available games
- `GET /stats` - Database statistics

### Frontend (Next.js - Port 3000)
- `GET /` - Home page
- `GET /search` - Card search page
- `GET /deckbuilder` - Deck list page
- `GET /deckbuilder/[id]` - Individual deck builder
- `GET /cart` - Hand/collection management
- `GET /proxy-printer` - Proxy printing page
- `GET /api/*` - Frontend API routes (proxies to backend)

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
