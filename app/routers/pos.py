from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date, datetime
from app.database import get_db
from app.models import POSOrder, POSOrderLine, Product, StockMove

router = APIRouter(prefix="/api/pos", tags=["pos"])


@router.get("/orders")
def list_pos_orders(session_date: str = None, db: Session = Depends(get_db)):
    q = db.query(POSOrder).options(joinedload(POSOrder.customer))
    if session_date:
        q = q.filter(POSOrder.session_date == session_date)
    return q.order_by(POSOrder.created_at.desc()).limit(100).all()


@router.get("/orders/{order_id}")
def get_pos_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(POSOrder).options(
        joinedload(POSOrder.lines).joinedload(POSOrderLine.product),
        joinedload(POSOrder.customer),
    ).filter(POSOrder.id == order_id).first()
    if not o:
        raise HTTPException(404)
    return o


@router.post("/orders")
async def create_pos_order(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lines_data = data.pop("lines", [])
    last = db.query(POSOrder).order_by(POSOrder.id.desc()).first()
    num = (last.id + 1) if last else 1
    data["reference"] = f"POS-{num:05d}"
    data["session_date"] = date.today()

    order = POSOrder(**{k: v for k, v in data.items() if hasattr(POSOrder, k)})
    db.add(order)
    db.flush()

    subtotal = 0
    for ld in lines_data:
        product = db.query(Product).filter(Product.id == ld["product_id"]).first()
        if not product:
            continue
        line = POSOrderLine(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=ld.get("quantity", 1),
            unit_price=ld.get("unit_price", product.sale_price),
            discount=ld.get("discount", 0),
        )
        line.subtotal = line.quantity * line.unit_price * (1 - line.discount / 100)
        subtotal += line.subtotal
        db.add(line)
        # Deduct stock
        db.add(StockMove(product_id=product.id, warehouse_id=1, type="out",
                         quantity=line.quantity, reference=order.reference))

    order.subtotal = subtotal
    order.tax = subtotal * 0.1
    order.total = order.subtotal + order.tax - order.discount
    db.commit()
    db.refresh(order)
    return order


@router.get("/dashboard")
def pos_dashboard(db: Session = Depends(get_db)):
    today = date.today().isoformat()
    today_orders = db.query(func.count(POSOrder.id)).filter(POSOrder.session_date == today).scalar()
    today_revenue = db.query(func.coalesce(func.sum(POSOrder.total), 0)).filter(
        POSOrder.session_date == today).scalar()
    total_orders = db.query(func.count(POSOrder.id)).scalar()
    total_revenue = db.query(func.coalesce(func.sum(POSOrder.total), 0)).scalar()
    by_payment = {}
    for m in ["cash", "card", "bank_transfer", "check"]:
        by_payment[m] = db.query(func.coalesce(func.sum(POSOrder.total), 0)).filter(
            POSOrder.payment_method == m).scalar()
    return {
        "today_orders": today_orders,
        "today_revenue": round(today_revenue, 2),
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "by_payment_method": by_payment,
    }


@router.get("/products")
def pos_products(search: str = None, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.is_active == True, Product.can_be_sold == True)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    return q.order_by(Product.name).all()
