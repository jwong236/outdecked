#!/bin/bash

# Ensure we're in the right directory
cd /app

# Initialize database if needed (Cloud SQL will be used in production)
echo "Initializing database if needed..."
python -c "
from database import init_db
init_db()
print('Database initialization completed')
"

# Start the Flask application
exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 outdecked:app
