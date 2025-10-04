# Super simple development setup - no external dependencies needed!
# Uses SQLite for local development (already included with Python)

Write-Host "🚀 Setting up OutDecked for local development" -ForegroundColor Green
Write-Host ""

# Install Python dependencies
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Blue
pip install -r requirements.txt

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Initialize database (this will create SQLite database automatically)
Write-Host "🗄️  Initializing database..." -ForegroundColor Blue
python -c "
from database import init_db, create_default_owner, create_test_user
init_db()
create_default_owner()
create_test_user()
print('Database initialized successfully!')
"

Write-Host "✅ Database initialized with default data" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Development setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the development server:" -ForegroundColor Cyan
Write-Host "   python outdecked.py" -ForegroundColor White
Write-Host ""
Write-Host "Your app will use SQLite for local development" -ForegroundColor Cyan
Write-Host "Default admin account: owner / admin123" -ForegroundColor Yellow
Write-Host "Test account: testuser / testpass123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Production deployment will automatically use Cloud SQL" -ForegroundColor Green
