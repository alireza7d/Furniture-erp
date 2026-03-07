from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Warehouse, StockMove, Product

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/warehouses")
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).filter(Warehouse.is_active == True).all()


@router.post("/warehouses")
async def create_warehouse(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    wh = Warehouse(**data)
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.get("/stock")
def stock_levels(warehouse_id: int = None, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    result = []
    for p in products:
        q_in = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
            StockMove.product_id == p.id, StockMove.type == "in")
        q_out = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
            StockMove.product_id == p.id, StockMove.type == "out")
        if warehouse_id:
            q_in = q_in.filter(StockMove.warehouse_id == warehouse_id)
            q_out = q_out.filter(StockMove.warehouse_id == warehouse_id)
        on_hand = q_in.scalar() - q_out.scalar()
        result.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "category": p.category,
            "on_hand": on_hand,
            "cost_value": round(on_hand * p.cost_price, 2),
        })
    return result


@router.post("/moves")
async def create_stock_move(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    move = StockMove(**{k: v for k, v in data.items() if hasattr(StockMove, k)})
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


@router.get("/moves")
def list_moves(product_id: int = None, db: Session = Depends(get_db)):
    q = db.query(StockMove)
    if product_id:
        q = q.filter(StockMove.product_id == product_id)
    return q.order_by(StockMove.date.desc()).limit(200).all()


@router.get("/dashboard")
def inventory_dashboard(db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.is_active == True).all()
    total_products = len(products)
    total_value = 0
    low_stock = []
    for p in products:
        q_in = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
            StockMove.product_id == p.id, StockMove.type == "in").scalar()
        q_out = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
            StockMove.product_id == p.id, StockMove.type == "out").scalar()
        on_hand = q_in - q_out
        total_value += on_hand * p.cost_price
        if on_hand <= 5 and p.category != "Raw Material":
            low_stock.append({"product": p.name, "on_hand": on_hand})
    warehouses = db.query(func.count(Warehouse.id)).filter(Warehouse.is_active == True).scalar()
    return {
        "total_products": total_products,
        "total_stock_value": round(total_value, 2),
        "low_stock_items": low_stock,
        "warehouses": warehouses,
    }
