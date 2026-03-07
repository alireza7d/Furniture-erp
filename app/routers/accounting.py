from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models import Invoice, InvoiceLine, Payment, JournalEntry

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


@router.get("/invoices")
def list_invoices(type: str = None, status: str = None, db: Session = Depends(get_db)):
    q = db.query(Invoice).options(joinedload(Invoice.contact))
    if type:
        q = q.filter(Invoice.type == type)
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).all()


@router.get("/invoices/{inv_id}")
def get_invoice(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).options(
        joinedload(Invoice.contact), joinedload(Invoice.lines), joinedload(Invoice.payments)
    ).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404)
    return inv


@router.post("/invoices")
async def create_invoice(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lines_data = data.pop("lines", [])
    last = db.query(Invoice).order_by(Invoice.id.desc()).first()
    num = (last.id + 1) if last else 1
    prefix = "INV" if data.get("type", "customer") == "customer" else "BILL"
    data["reference"] = f"{prefix}-{num:05d}"

    inv = Invoice(**{k: v for k, v in data.items() if hasattr(Invoice, k)})
    db.add(inv)
    db.flush()

    subtotal = 0
    for ld in lines_data:
        line = InvoiceLine(
            invoice_id=inv.id,
            description=ld.get("description", ""),
            quantity=ld.get("quantity", 1),
            unit_price=ld.get("unit_price", 0),
            tax_rate=ld.get("tax_rate", 10),
        )
        line.subtotal = line.quantity * line.unit_price
        subtotal += line.subtotal
        db.add(line)

    inv.subtotal = subtotal
    inv.tax = subtotal * 0.1
    inv.total = inv.subtotal + inv.tax
    db.commit()
    db.refresh(inv)
    return inv


@router.put("/invoices/{inv_id}")
async def update_invoice(inv_id: int, request: Request, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404)
    data = await request.json()
    for k, v in data.items():
        if hasattr(inv, k) and k not in ("id", "reference"):
            setattr(inv, k, v)
    db.commit()
    db.refresh(inv)
    return inv


@router.post("/invoices/{inv_id}/send")
def send_invoice(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404)
    inv.status = "sent"
    db.commit()
    return inv


@router.post("/invoices/{inv_id}/payments")
async def register_payment(inv_id: int, request: Request, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(404)
    data = await request.json()
    payment = Payment(invoice_id=inv_id, **{k: v for k, v in data.items() if hasattr(Payment, k)})
    db.add(payment)
    inv.amount_paid += payment.amount
    if inv.amount_paid >= inv.total:
        inv.status = "paid"
    # Journal entry
    db.add(JournalEntry(
        reference=f"PAY-{inv.reference}",
        date=date.today(),
        description=f"Payment for {inv.reference}",
        debit_account="Bank",
        credit_account="Accounts Receivable" if inv.type == "customer" else "Accounts Payable",
        amount=payment.amount,
    ))
    db.commit()
    db.refresh(inv)
    return inv


@router.get("/journal")
def list_journal(db: Session = Depends(get_db)):
    return db.query(JournalEntry).order_by(JournalEntry.date.desc()).limit(200).all()


@router.get("/dashboard")
def accounting_dashboard(db: Session = Depends(get_db)):
    receivable = db.query(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).filter(
        Invoice.type == "customer", Invoice.status.in_(["sent", "overdue"])).scalar()
    payable = db.query(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0)).filter(
        Invoice.type == "vendor", Invoice.status.in_(["sent", "overdue"])).scalar()
    total_income = db.query(func.coalesce(func.sum(Invoice.amount_paid), 0)).filter(
        Invoice.type == "customer").scalar()
    total_expenses = db.query(func.coalesce(func.sum(Invoice.amount_paid), 0)).filter(
        Invoice.type == "vendor").scalar()
    overdue = db.query(func.count(Invoice.id)).filter(
        Invoice.status == "overdue").scalar()
    return {
        "accounts_receivable": round(receivable, 2),
        "accounts_payable": round(payable, 2),
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_profit": round(total_income - total_expenses, 2),
        "overdue_invoices": overdue,
    }
