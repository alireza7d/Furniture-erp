#!/bin/bash
cd "$(dirname "$0")"

echo "========================================="
echo "  FurnitureERP - Starting up..."
echo "========================================="
echo ""

# Install dependencies if needed
pip install -q fastapi uvicorn sqlalchemy jinja2 aiofiles python-multipart 2>/dev/null

echo "Starting server on http://localhost:8000"
echo ""
echo "  Open in your browser:  http://localhost:8000"
echo ""
echo "  Press Ctrl+C to stop the server"
echo "========================================="
echo ""

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
