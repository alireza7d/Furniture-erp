from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models import PurchaseOrder, PurchaseOrderLine, Product, StockMove, Invoice, InvoiceLine

router = APIRouter(prefix="/api/purchase", tags=["purchase"])


@router.get("/orders")
def list_po(status: str = None, db: Session = Depends(get_db)):
    q = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.vendor))
    if status:
        q = q.filter(PurchaseOrder.status == status)
    return q.order_by(PurchaseOrder.created_at.desc()).all()


@router.get("/orders/{po_id}")
def get_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).options(
        joinedload(PurchaseOrder.vendor),
        joinedload(PurchaseOrder.lines).joinedload(PurchaseOrderLine.product),
    ).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404)
    return po


@router.post("/orders")
async def create_po(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lines_data = data.pop("lines", [])
    last = db.query(PurchaseOrder).order_by(PurchaseOrder.id.desc()).first()
    num = (last.id + 1) if last else 1
    data["reference"] = f"PO-{num:05d}"

    po = PurchaseOrder(**{k: v for k, v in data.items() if hasattr(PurchaseOrder, k)})
    db.add(po)
    db.flush()

    subtotal = 0
    for ld in lines_data:
        product = db.query(Product).filter(Product.id == ld["product_id"]).first()
        line = PurchaseOrderLine(
            order_id=po.id,
            product_id=ld["product_id"],
            description=ld.get("description", product.name if product else ""),
            quantity=ld.get("quantity", 1),
            unit_price=ld.get("unit_price", product.cost_price if product else 0),
        )
        line.subtotal = line.quantity * line.unit_price
        subtotal += line.subtotal
        db.add(line)

    po.subtotal = subtotal
    po.tax = subtotal * 0.1
    po.total = po.subtotal + po.tax
    db.commit()
    db.refresh(po)
    return po


@router.post("/orders/{po_id}/send")
def send_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404)
    po.status = "sent"
    db.commit()
    return po


@router.post("/orders/{po_id}/receive")
def receive_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).options(joinedload(PurchaseOrder.lines)).filter(
        PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404)
    for line in po.lines:
        db.add(StockMove(product_id=line.product_id, warehouse_id=1, type="in",
                         quantity=line.quantity, reference=po.reference))
    po.status = "received"
    # Create vendor bill
    last_inv = db.query(Invoice).order_by(Invoice.id.desc()).first()
    inv_num = (last_inv.id + 1) if last_inv else 1
    inv = Invoice(
        reference=f"BILL-{inv_num:05d}", contact_id=po.vendor_id, type="vendor",
        invoice_date=date.today(), subtotal=po.subtotal, tax=po.tax, total=po.total,
    )
    db.add(inv)
    db.flush()
    for line in po.lines:
        db.add(InvoiceLine(
            invoice_id=inv.id, description=line.description,
            quantity=line.quantity, unit_price=line.unit_price, subtotal=line.subtotal,
        ))
    db.commit()
    return po


@router.delete("/orders/{po_id}")
def delete_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(404)
    if po.status not in ("draft", "cancelled"):
        raise HTTPException(400, "Can only delete draft orders")
    db.delete(po)
    db.commit()
    return {"ok": True}


@router.get("/dashboard")
def purchase_dashboard(db: Session = Depends(get_db)):
    total = db.query(func.count(PurchaseOrder.id)).scalar()
    total_spent = db.query(func.coalesce(func.sum(PurchaseOrder.total), 0)).filter(
        PurchaseOrder.status == "received").scalar()
    pending = db.query(func.count(PurchaseOrder.id)).filter(
        PurchaseOrder.status.in_(["draft", "sent"])).scalar()
    return {
        "total_orders": total,
        "total_spent": round(total_spent, 2),
        "pending_orders": pending,
    }
