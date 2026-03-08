from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal
from typing import Optional
import json

from app.database import get_db
from app.models import InventoryItem, User, AuditLog
from app.routers.auth import get_current_user, require_owner

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

ITEM_CATEGORIES = [
    {"value": "sofa", "label": "Sofa"},
    {"value": "chair", "label": "Chair"},
    {"value": "table", "label": "Table"},
    {"value": "bed", "label": "Bed"},
    {"value": "curtain", "label": "Curtain"},
    {"value": "carpet", "label": "Carpet"},
    {"value": "accessory", "label": "Accessory"},
    {"value": "other", "label": "Other"},
]

ITEM_STATUSES = [
    {"value": "available", "label": "Available"},
    {"value": "sold", "label": "Sold"},
    {"value": "reserved", "label": "Reserved"},
]

ITEM_LOCATIONS = [
    {"value": "shop", "label": "Shop"},
    {"value": "workshop", "label": "Workshop"},
    {"value": "warehouse", "label": "Warehouse"},
]


def item_to_dict(item: InventoryItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "description": item.description,
        "selling_price": str(item.selling_price) if item.selling_price else "0.000",
        "cost_price": str(item.cost_price) if item.cost_price else None,
        "quantity": item.quantity,
        "status": item.status,
        "location": item.location,
        "note": item.note,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
        "created_by": item.creator.full_name if item.creator else None,
        "updated_by": item.updater.full_name if item.updater else None,
    }


def log_audit(db: Session, record_id: int, action: str, user: User,
              old_values: Optional[dict] = None, new_values: Optional[dict] = None):
    log = AuditLog(
        table_name="inventory_items",
        record_id=record_id,
        action=action,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        user_id=user.id,
        user_name=user.full_name,
    )
    db.add(log)
    db.commit()


@router.get("/categories")
def get_categories():
    return ITEM_CATEGORIES


@router.get("/statuses")
def get_statuses():
    return ITEM_STATUSES


@router.get("/locations")
def get_locations():
    return ITEM_LOCATIONS


@router.get("")
def list_items(
    category: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(InventoryItem)

    if category:
        query = query.filter(InventoryItem.category == category)
    if status:
        query = query.filter(InventoryItem.status == status)
    if location:
        query = query.filter(InventoryItem.location == location)
    if search:
        query = query.filter(
            (InventoryItem.name.ilike(f"%{search}%"))
            | (InventoryItem.description.ilike(f"%{search}%"))
        )

    items = query.order_by(InventoryItem.created_at.desc()).limit(500).all()
    return [item_to_dict(i) for i in items]


@router.get("/summary")
def inventory_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(InventoryItem).all()
    total = len(items)
    available = sum(1 for i in items if i.status == "available")
    sold = sum(1 for i in items if i.status == "sold")
    reserved = sum(1 for i in items if i.status == "reserved")
    total_value = sum(float(i.selling_price or 0) * (i.quantity or 1) for i in items if i.status == "available")
    return {
        "total_items": total,
        "available": available,
        "sold": sold,
        "reserved": reserved,
        "total_stock_value": round(total_value, 3),
    }


@router.get("/{item_id}")
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_to_dict(item)


@router.post("")
def create_item(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Item name is required")

    try:
        selling_price = Decimal(str(data.get("selling_price", "0")))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid selling price")
    if selling_price < 0:
        raise HTTPException(status_code=400, detail="Price must be positive")

    cost_price = None
    if data.get("cost_price"):
        try:
            cost_price = Decimal(str(data["cost_price"]))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid cost price")

    item = InventoryItem(
        name=name,
        category=data.get("category", "sofa"),
        description=(data.get("description") or "").strip() or None,
        selling_price=selling_price,
        cost_price=cost_price,
        quantity=int(data.get("quantity", 1)),
        status=data.get("status", "available"),
        location=(data.get("location") or "").strip() or None,
        note=(data.get("note") or "").strip() or None,
        created_by=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    log_audit(db, item.id, "create", current_user, new_values={
        "name": item.name, "selling_price": str(item.selling_price),
        "category": item.category, "status": item.status,
    })

    return item_to_dict(item)


@router.put("/{item_id}")
def update_item(
    item_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_values = item_to_dict(item)

    if "name" in data:
        item.name = data["name"].strip()
    if "category" in data:
        item.category = data["category"]
    if "description" in data:
        item.description = data["description"].strip() or None
    if "selling_price" in data:
        try:
            item.selling_price = Decimal(str(data["selling_price"]))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid selling price")
    if "cost_price" in data:
        if data["cost_price"]:
            try:
                item.cost_price = Decimal(str(data["cost_price"]))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid cost price")
        else:
            item.cost_price = None
    if "quantity" in data:
        item.quantity = int(data["quantity"])
    if "status" in data:
        item.status = data["status"]
    if "location" in data:
        item.location = data["location"].strip() or None
    if "note" in data:
        item.note = data["note"].strip() or None

    item.updated_by = current_user.id
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    new_values = item_to_dict(item)
    log_audit(db, item.id, "update", current_user,
              old_values=old_values, new_values=new_values)

    return item_to_dict(item)


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_values = item_to_dict(item)
    log_audit(db, item.id, "delete", current_user, old_values=old_values)

    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}
