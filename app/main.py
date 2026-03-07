from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from app.database import engine, Base
from app.routers import contacts, products, crm, sales, pos, accounting, inventory, purchase, manufacturing, marketing, todo
from app.seed import seed

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FurnitureERP", version="1.0.0")

# Static files & templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Register routers
app.include_router(contacts.router)
app.include_router(products.router)
app.include_router(crm.router)
app.include_router(sales.router)
app.include_router(pos.router)
app.include_router(accounting.router)
app.include_router(inventory.router)
app.include_router(purchase.router)
app.include_router(manufacturing.router)
app.include_router(marketing.router)
app.include_router(todo.router)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.on_event("startup")
def startup():
    seed()
