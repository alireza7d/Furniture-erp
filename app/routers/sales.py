from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models import SaleOrder, SaleOrderLine, Product, StockMove, Invoice, InvoiceLine

router = APIRouter(prefix="/api/sales", tags=["sales"])

_so_counter = 0


def next_so_ref(db: Session):
    global _so_counter
    last = db.query(SaleOrder).order_by(SaleOrder.id.desc()).first()
    num = (last.id + 1) if last else 1
    _so_counter = num
    return f"SO-{num:05d}"


@router.get("/orders")
def list_orders(status: str = None, db: Session = Depends(get_db)):
    q = db.query(SaleOrder).options(joinedload(SaleOrder.customer))
    if status:
        q = q.filter(SaleOrder.status == status)
    return q.order_by(SaleOrder.created_at.desc()).all()


@router.get("/orders/{order_id}")
def get_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).options(
        joinedload(SaleOrder.customer),
        joinedload(SaleOrder.lines).joinedload(SaleOrderLine.product)
    ).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    return o


@router.post("/orders")
async def create_order(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lines_data = data.pop("lines", [])
    data["reference"] = next_so_ref(db)
    order = SaleOrder(**data)
    db.add(order)
    db.flush()

    subtotal = 0
    for ld in lines_data:
        product = db.query(Product).filter(Product.id == ld["product_id"]).first()
        line = SaleOrderLine(
            order_id=order.id,
            product_id=ld["product_id"],
            description=ld.get("description", product.name if product else ""),
            quantity=ld.get("quantity", 1),
            unit_price=ld.get("unit_price", product.sale_price if product else 0),
            discount=ld.get("discount", 0),
        )
        line.subtotal = line.quantity * line.unit_price * (1 - line.discount / 100)
        subtotal += line.subtotal
        db.add(line)

    order.subtotal = subtotal
    order.tax = subtotal * 0.1  # 10% tax
    order.total = order.subtotal + order.tax - order.discount
    db.commit()
    db.refresh(order)
    return order


@router.put("/orders/{order_id}")
async def update_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    data = await request.json()
    for key, val in data.items():
        if hasattr(o, key) and key not in ("id", "reference", "lines"):
            setattr(o, key, val)
    db.commit()
    db.refresh(o)
    return o


@router.post("/orders/{order_id}/confirm")
def confirm_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).options(joinedload(SaleOrder.lines)).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404, "Order not found")
    o.status = "confirmed"
    db.commit()
    return o


@router.post("/orders/{order_id}/deliver")
def deliver_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).options(joinedload(SaleOrder.lines)).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404)
    for line in o.lines:
        move = StockMove(product_id=line.product_id, warehouse_id=1, type="out",
                         quantity=line.quantity, reference=o.reference)
        db.add(move)
    o.status = "delivered"
    db.commit()
    return o


@router.post("/orders/{order_id}/invoice")
def create_invoice_from_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).options(joinedload(SaleOrder.lines)).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404)
    last_inv = db.query(Invoice).order_by(Invoice.id.desc()).first()
    inv_num = (last_inv.id + 1) if last_inv else 1
    inv = Invoice(
        reference=f"INV-{inv_num:05d}", contact_id=o.customer_id, type="customer",
        invoice_date=date.today(), subtotal=o.subtotal, tax=o.tax, total=o.total,
        sale_order_id=o.id
    )
    db.add(inv)
    db.flush()
    for line in o.lines:
        db.add(InvoiceLine(
            invoice_id=inv.id, description=line.description,
            quantity=line.quantity, unit_price=line.unit_price, subtotal=line.subtotal
        ))
    o.status = "invoiced"
    db.commit()
    db.refresh(inv)
    return inv


@router.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    o = db.query(SaleOrder).filter(SaleOrder.id == order_id).first()
    if not o:
        raise HTTPException(404)
    if o.status not in ("draft", "cancelled"):
        raise HTTPException(400, "Can only delete draft or cancelled orders")
    db.delete(o)
    db.commit()
    return {"ok": True}


@router.get("/dashboard")
def sales_dashboard(db: Session = Depends(get_db)):
    total_orders = db.query(func.count(SaleOrder.id)).scalar()
    total_revenue = db.query(func.coalesce(func.sum(SaleOrder.total), 0)).filter(
        SaleOrder.status.in_(["confirmed", "delivered", "invoiced"])).scalar()
    avg_order = total_revenue / total_orders if total_orders > 0 else 0
    by_status = {}
    for s in ["draft", "confirmed", "delivered", "invoiced", "cancelled"]:
        by_status[s] = db.query(func.count(SaleOrder.id)).filter(SaleOrder.status == s).scalar()
    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(avg_order, 2),
        "by_status": by_status,
    }
