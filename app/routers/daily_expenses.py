from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
import os
import uuid
import json

from app.database import get_db
from app.models import DailyExpense, User, AuditLog, ExpenseCategoryEnum
from app.routers.auth import get_current_user, require_owner

router = APIRouter(prefix="/api/expenses", tags=["Daily Expenses"])

UPLOAD_DIR = "app/static/uploads/receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

EXPENSE_CATEGORIES = [{"value": cat.value, "label": cat.value} for cat in ExpenseCategoryEnum]

PAYMENT_METHODS = [
    {"value": "cash", "label": "Cash"},
    {"value": "bank", "label": "Bank"},
]


def expense_to_dict(expense: DailyExpense) -> dict:
    return {
        "id": expense.id,
        "date": expense.date.isoformat() if expense.date else None,
        "category": expense.category,
        "description": expense.description,
        "amount": str(expense.amount) if expense.amount else "0.000",
        "payment_method": expense.payment_method,
        "employee_id": expense.employee_id,
        "employee_name": expense.employee.full_name if expense.employee else None,
        "note": expense.note,
        "receipt_photo": expense.receipt_photo,
        "created_at": expense.created_at.isoformat() if expense.created_at else None,
        "updated_at": expense.updated_at.isoformat() if expense.updated_at else None,
        "created_by": expense.creator.full_name if expense.creator else None,
        "updated_by": expense.updater.full_name if expense.updater else None,
    }


def log_audit(db: Session, record_id: int, action: str, user: User,
              old_values: Optional[dict] = None, new_values: Optional[dict] = None):
    log = AuditLog(
        table_name="daily_expenses",
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
    return EXPENSE_CATEGORIES


@router.get("/payment-methods")
def get_payment_methods():
    return PAYMENT_METHODS


@router.get("")
def list_expenses(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    category: Optional[str] = None,
    payment_method: Optional[str] = None,
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(DailyExpense)

    if current_user.role == "employee":
        query = query.filter(DailyExpense.employee_id == current_user.id)
    elif employee_id:
        query = query.filter(DailyExpense.employee_id == employee_id)

    if date_from:
        query = query.filter(DailyExpense.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(DailyExpense.date <= date.fromisoformat(date_to))
    if category:
        query = query.filter(DailyExpense.category == category)
    if payment_method:
        query = query.filter(DailyExpense.payment_method == payment_method)
    if search:
        query = query.filter(DailyExpense.description.ilike(f"%{search}%"))

    expenses = query.order_by(DailyExpense.date.desc(), DailyExpense.id.desc()).limit(500).all()
    return [expense_to_dict(e) for e in expenses]


@router.get("/{expense_id}")
def get_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if current_user.role == "employee" and expense.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return expense_to_dict(expense)


@router.post("")
def create_expense(
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

    category = data.get("category", "")
    if not category:
        raise HTTPException(status_code=400, detail="Category is required")

    expense_date = data.get("date", date.today().isoformat())

    expense = DailyExpense(
        date=date.fromisoformat(expense_date),
        category=category,
        description=data.get("description", "").strip() or None,
        amount=amount,
        payment_method=data.get("payment_method", "cash"),
        employee_id=current_user.id,
        note=data.get("note", "").strip() or None,
        created_by=current_user.id,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    log_audit(db, expense.id, "create", current_user, new_values={
        "date": expense_date, "amount": amount_str, "category": category,
        "description": expense.description,
    })

    return expense_to_dict(expense)


@router.put("/{expense_id}")
def update_expense(
    expense_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if current_user.role == "employee" and expense.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_values = expense_to_dict(expense)

    if "date" in data:
        expense.date = date.fromisoformat(data["date"])
    if "category" in data:
        expense.category = data["category"]
    if "description" in data:
        expense.description = data["description"].strip() or None
    if "amount" in data:
        try:
            expense.amount = Decimal(str(data["amount"]))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid amount")
    if "payment_method" in data:
        expense.payment_method = data["payment_method"]
    if "note" in data:
        expense.note = data["note"].strip() or None

    expense.updated_by = current_user.id
    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)

    new_values = expense_to_dict(expense)
    log_audit(db, expense.id, "update", current_user,
              old_values=old_values, new_values=new_values)

    return expense_to_dict(expense)


@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    old_values = expense_to_dict(expense)
    log_audit(db, expense.id, "delete", current_user, old_values=old_values)

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}


@router.post("/{expense_id}/upload-receipt")
async def upload_expense_receipt(
    expense_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    expense = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if current_user.role == "employee" and expense.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"expense_{expense_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    expense.receipt_photo = f"/static/uploads/receipts/{filename}"
    expense.updated_by = current_user.id
    db.commit()
    db.refresh(expense)

    return {"receipt_photo": expense.receipt_photo}
