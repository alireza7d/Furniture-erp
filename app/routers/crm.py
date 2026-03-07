from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app.models import Lead, Activity, LeadStatus

router = APIRouter(prefix="/api/crm", tags=["crm"])


@router.get("/leads")
def list_leads(status: str = None, search: str = None, db: Session = Depends(get_db)):
    q = db.query(Lead).options(joinedload(Lead.contact))
    if status:
        q = q.filter(Lead.status == status)
    if search:
        q = q.filter(Lead.title.ilike(f"%{search}%"))
    return q.order_by(Lead.created_at.desc()).all()


@router.get("/pipeline")
def pipeline(db: Session = Depends(get_db)):
    result = {}
    for s in LeadStatus:
        leads = db.query(Lead).options(joinedload(Lead.contact)).filter(Lead.status == s.value).all()
        result[s.value] = {
            "leads": leads,
            "count": len(leads),
            "revenue": sum(l.expected_revenue or 0 for l in leads),
        }
    return result


@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).options(
        joinedload(Lead.contact), joinedload(Lead.activities)
    ).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return lead


@router.post("/leads")
async def create_lead(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lead = Lead(**data)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/leads/{lead_id}")
async def update_lead(lead_id: int, request: Request, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    data = await request.json()
    for key, val in data.items():
        if hasattr(lead, key):
            setattr(lead, key, val)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
    return {"ok": True}


@router.post("/leads/{lead_id}/activities")
async def add_activity(lead_id: int, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    data["lead_id"] = lead_id
    activity = Activity(**data)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.get("/dashboard")
def crm_dashboard(db: Session = Depends(get_db)):
    total = db.query(func.count(Lead.id)).scalar()
    won = db.query(func.count(Lead.id)).filter(Lead.status == "won").scalar()
    total_revenue = db.query(func.coalesce(func.sum(Lead.expected_revenue), 0)).filter(Lead.status == "won").scalar()
    by_status = {}
    for s in LeadStatus:
        by_status[s.value] = db.query(func.count(Lead.id)).filter(Lead.status == s.value).scalar()
    return {
        "total_leads": total,
        "won_deals": won,
        "conversion_rate": round(won / total * 100, 1) if total > 0 else 0,
        "total_revenue": total_revenue,
        "by_status": by_status,
    }
