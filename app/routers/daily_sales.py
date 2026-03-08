from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import os
import uuid
import json

from app.database import get_db
from app.models import DailySale, User, AuditLog
from app.routers.auth import get_current_user, require_owner

router = APIRouter(prefix="/api/sales", tags=["Daily Sales"])

UPLOAD_DIR = "app/static/uploads/receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

SALE_TYPES = [
    {"value": "sofa_sale", "label": "Sofa Sale"},
    {"value": "repair", "label": "Repair"},
    {"value": "service", "label": "Service"},
    {"value": "other", "label": "Other"},
]

PAYMENT_METHODS = [
    {"value": "cash", "label": "Cash"},
    {"value": "bank", "label": "Bank"},
    {"value": "transfer", "label": "Transfer"},
]


def sale_to_dict(sale: DailySale) -> dict:
    return {
        "id": sale.id,
        "date": sale.date.isoformat() if sale.date else None,
        "customer_name": sale.customer_name,
        "sale_type": sale.sale_type,
        "description": sale.description,
        "amount": str(sale.amount) if sale.amount else "0.000",
        "payment_method": sale.payment_method,
        "employee_id": sale.employee_id,
        "employee_name": sale.employee.full_name if sale.employee else None,
        "note": sale.note,
        "receipt_photo": sale.receipt_photo,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "updated_at": sale.updated_at.isoformat() if sale.updated_at else None,
        "created_by": sale.creator.full_name if sale.creator else None,
        "updated_by": sale.updater.full_name if sale.updater else None,
    }


def log_audit(db: Session, record_id: int, action: str, user: User,
              old_values: Optional[dict] = None, new_values: Optional[dict] = None):
    log = AuditLog(
        table_name="daily_sales",
        record_id=record_id,
        action=action,
        old_values=json.dumps(old_values) if old_values else None,
        new_values=json.dumps(new_values) if new_values else None,
        user_id=user.id,
        user_name=user.full_name,
    )
    db.add(log)
    db.commit()


@router.get("/types")
def get_sale_types():
    return SALE_TYPES


@router.get("/payment-methods")
def get_payment_methods():
    return PAYMENT_METHODS


@router.get("")
def list_sales(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    sale_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(DailySale)

    # Employees can only see their own sales
    if current_user.role == "employee":
        query = query.filter(DailySale.employee_id == current_user.id)
    elif employee_id:
        query = query.filter(DailySale.employee_id == employee_id)

    if date_from:
        query = query.filter(DailySale.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(DailySale.date <= date.fromisoformat(date_to))
    if sale_type:
        query = query.filter(DailySale.sale_type == sale_type)
    if payment_method:
        query = query.filter(DailySale.payment_method == payment_method)
    if search:
        query = query.filter(
            (DailySale.customer_name.ilike(f"%{search}%"))
            | (DailySale.description.ilike(f"%{search}%"))
        )

    sales = query.order_by(DailySale.date.desc(), DailySale.id.desc()).limit(500).all()
    return [sale_to_dict(s) for s in sales]


@router.get("/{sale_id}")
def get_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sale = db.query(DailySale).filter(DailySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if current_user.role == "employee" and sale.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return sale_to_dict(sale)


@router.post("")
def create_sale(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    amount_str = str(data.get("amount", "0"))
    try:
        amount = Decimal(amount_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid amount")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    sale_date = data.get("date", date.today().isoformat())

    sale = DailySale(
        date=date.fromisoformat(sale_date),
        customer_name=data.get("customer_name", "").strip() or None,
        sale_type=data.get("sale_type", "sofa_sale"),
        description=data.get("description", "").strip() or None,
        amount=amount,
        payment_method=data.get("payment_method", "cash"),
        employee_id=current_user.id,
        note=data.get("note", "").strip() or None,
        created_by=current_user.id,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    log_audit(db, sale.id, "create", current_user, new_values={
        "date": sale_date, "amount": amount_str, "sale_type": sale.sale_type,
        "customer_name": sale.customer_name, "description": sale.description,
    })

    return sale_to_dict(sale)


@router.put("/{sale_id}")
def update_sale(
    sale_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sale = db.query(DailySale).filter(DailySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    # Only owner or the employee who created it can edit
    if current_user.role == "employee" and sale.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_values = sale_to_dict(sale)

    if "date" in data:
        sale.date = date.fromisoformat(data["date"])
    if "customer_name" in data:
        sale.customer_name = data["customer_name"].strip() or None
    if "sale_type" in data:
        sale.sale_type = data["sale_type"]
    if "description" in data:
        sale.description = data["description"].strip() or None
    if "amount" in data:
        try:
            sale.amount = Decimal(str(data["amount"]))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid amount")
    if "payment_method" in data:
        sale.payment_method = data["payment_method"]
    if "note" in data:
        sale.note = data["note"].strip() or None

    sale.updated_by = current_user.id
    sale.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sale)

    new_values = sale_to_dict(sale)
    log_audit(db, sale.id, "update", current_user,
              old_values=old_values, new_values=new_values)

    return sale_to_dict(sale)


@router.delete("/{sale_id}")
def delete_sale(
    sale_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    sale = db.query(DailySale).filter(DailySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    old_values = sale_to_dict(sale)
    log_audit(db, sale.id, "delete", current_user, old_values=old_values)

    db.delete(sale)
    db.commit()
    return {"message": "Sale deleted"}


@router.post("/{sale_id}/upload-receipt")
async def upload_sale_receipt(
    sale_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sale = db.query(DailySale).filter(DailySale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if current_user.role == "employee" and sale.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"sale_{sale_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    sale.receipt_photo = f"/static/uploads/receipts/{filename}"
    sale.updated_by = current_user.id
    db.commit()
    db.refresh(sale)

    return {"receipt_photo": sale.receipt_photo}
