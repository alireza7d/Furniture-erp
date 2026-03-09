from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import json

from app.database import get_db
from app.models import InventoryItem, DailySale, User, AuditLog
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/pos", tags=["Point of Sale"])


def log_audit(db: Session, table: str, record_id: int, action: str, user: User,
              old_values=None, new_values=None):
    log = AuditLog(
        table_name=table,
        record_id=record_id,
        action=action,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        user_id=user.id,
        user_name=user.full_name,
    )
    db.add(log)
    db.commit()


@router.get("/available-items")
def get_available_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryItem).filter(InventoryItem.status == "available")
    if search:
        query = query.filter(
            (InventoryItem.name.ilike(f"%{search}%"))
            | (InventoryItem.description.ilike(f"%{search}%"))
        )
    if category:
        query = query.filter(InventoryItem.category == category)

    items = query.order_by(InventoryItem.name).all()
    return [{
        "id": i.id,
        "name": i.name,
        "category": i.category,
        "description": i.description,
        "selling_price": str(i.selling_price) if i.selling_price else "0.000",
        "quantity": i.quantity,
        "location": i.location,
    } for i in items]


@router.post("/checkout")
def checkout(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="No items in cart")

    customer_name = (data.get("customer_name") or "").strip() or None
    payment_method = data.get("payment_method", "cash")
    note = (data.get("note") or "").strip() or None
    discount = Decimal(str(data.get("discount", "0")))

    # Validate all items exist and are available
    cart_items = []
    for cart_entry in items:
        item_id = cart_entry.get("id")
        qty = int(cart_entry.get("qty", 1))
        item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item #{item_id} not found")
        if item.status != "available":
            raise HTTPException(status_code=400, detail=f"'{item.name}' is no longer available")
        if qty > item.quantity:
            raise HTTPException(status_code=400, detail=f"Only {item.quantity} '{item.name}' in stock")
        cart_items.append({"item": item, "qty": qty})

    # Calculate total
    subtotal = sum(float(ci["item"].selling_price) * ci["qty"] for ci in cart_items)
    total = max(0, subtotal - float(discount))

    # Build description from items
    desc_parts = []
    for ci in cart_items:
        name = ci["item"].name
        if ci["qty"] > 1:
            desc_parts.append(f"{name} x{ci['qty']}")
        else:
            desc_parts.append(name)
    description = "POS Sale: " + ", ".join(desc_parts)

    # Create the sale record
    sale = DailySale(
        date=date.today(),
        customer_name=customer_name,
        sale_type="sofa_sale",
        description=description,
        amount=Decimal(str(round(total, 3))),
        payment_method=payment_method,
        employee_id=current_user.id,
        note=note,
        created_by=current_user.id,
    )
    db.add(sale)
    db.flush()

    # Update inventory
    for ci in cart_items:
        item = ci["item"]
        qty_sold = ci["qty"]
        if qty_sold >= item.quantity:
            item.status = "sold"
            item.quantity = 0
        else:
            item.quantity -= qty_sold
        item.updated_by = current_user.id
        item.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(sale)

    # Audit logs
    log_audit(db, "daily_sales", sale.id, "create", current_user, new_values={
        "source": "pos", "description": description,
        "amount": str(round(total, 3)), "customer": customer_name,
    })
    for ci in cart_items:
        log_audit(db, "inventory_items", ci["item"].id, "update", current_user, new_values={
            "action": "sold_via_pos", "sale_id": sale.id,
            "qty_sold": ci["qty"],
        })

    return {
        "message": "Sale completed!",
        "sale_id": sale.id,
        "total": str(round(total, 3)),
        "items_sold": len(cart_items),
    }
