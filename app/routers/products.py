from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Product, StockMove

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("")
def list_products(category: str = None, search: str = None, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.is_active == True)
    if category:
        q = q.filter(Product.category == category)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    return q.order_by(Product.name).all()


@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    return p


@router.get("/{product_id}/stock")
def get_product_stock(product_id: int, db: Session = Depends(get_db)):
    stock_in = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
        StockMove.product_id == product_id, StockMove.type == "in"
    ).scalar()
    stock_out = db.query(func.coalesce(func.sum(StockMove.quantity), 0)).filter(
        StockMove.product_id == product_id, StockMove.type == "out"
    ).scalar()
    return {"product_id": product_id, "on_hand": stock_in - stock_out}


@router.post("")
async def create_product(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    product = Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}")
async def update_product(product_id: int, request: Request, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    data = await request.json()
    for key, val in data.items():
        if hasattr(p, key):
            setattr(p, key, val)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = False
    db.commit()
    return {"ok": True}
