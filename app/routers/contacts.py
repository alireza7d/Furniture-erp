from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Contact

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("")
def list_contacts(type: str = None, search: str = None, db: Session = Depends(get_db)):
    q = db.query(Contact)
    if type == "customer":
        q = q.filter(Contact.is_customer == True)
    elif type == "vendor":
        q = q.filter(Contact.is_vendor == True)
    if search:
        q = q.filter(Contact.name.ilike(f"%{search}%"))
    return q.order_by(Contact.created_at.desc()).all()


@router.get("/{contact_id}")
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    return c


@router.post("")
async def create_contact(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    contact = Contact(**data)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.put("/{contact_id}")
async def update_contact(contact_id: int, request: Request, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    data = await request.json()
    for key, val in data.items():
        if hasattr(c, key):
            setattr(c, key, val)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    c = db.query(Contact).filter(Contact.id == contact_id).first()
    if not c:
        raise HTTPException(404, "Contact not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
