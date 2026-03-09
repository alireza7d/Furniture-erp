from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pathlib import Path
import os

from app.database import engine, Base
from app.routers import auth, daily_sales, daily_expenses, dashboard, reports, users, audit
from app.routers import inventory_router
from app.routers import pos_router
from app.seed import seed

# Base directory (project root)
BASE_DIR = Path(__file__).resolve().parent

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FurnitureERP - Sales Tracker", version="2.0.0")

# Ensure upload directories exist
os.makedirs(BASE_DIR / "static" / "uploads" / "receipts", exist_ok=True)

# Static files & templates
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Register routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(daily_sales.router)
app.include_router(daily_expenses.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(inventory_router.router)
app.include_router(pos_router.router)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.on_event("startup")
def startup():
    seed()
