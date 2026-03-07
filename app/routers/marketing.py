from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime
from app.database import get_db
from app.models import (
    MailingList, MailingListContact, EmailCampaign, SMSCampaign, Contact
)

router = APIRouter(prefix="/api/marketing", tags=["marketing"])


# ── Mailing Lists ─────────────────────────────────────────────────────────────

@router.get("/lists")
def list_mailing_lists(db: Session = Depends(get_db)):
    lists = db.query(MailingList).filter(MailingList.is_active == True).all()
    result = []
    for ml in lists:
        count = db.query(func.count(MailingListContact.id)).filter(
            MailingListContact.mailing_list_id == ml.id, MailingListContact.is_active == True).scalar()
        result.append({
            "id": ml.id, "name": ml.name, "description": ml.description,
            "subscriber_count": count, "created_at": ml.created_at.isoformat() if ml.created_at else None,
        })
    return result


@router.post("/lists")
async def create_mailing_list(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    ml = MailingList(**{k: v for k, v in data.items() if hasattr(MailingList, k)})
    db.add(ml)
    db.commit()
    db.refresh(ml)
    return ml


@router.post("/lists/{list_id}/subscribers")
async def add_subscriber(list_id: int, request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    contact_id = data.get("contact_id")
    existing = db.query(MailingListContact).filter(
        MailingListContact.mailing_list_id == list_id,
        MailingListContact.contact_id == contact_id,
    ).first()
    if existing:
        existing.is_active = True
        db.commit()
        return existing
    sub = MailingListContact(mailing_list_id=list_id, contact_id=contact_id)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/lists/{list_id}/subscribers")
def list_subscribers(list_id: int, db: Session = Depends(get_db)):
    subs = db.query(MailingListContact).options(joinedload(MailingListContact.contact)).filter(
        MailingListContact.mailing_list_id == list_id, MailingListContact.is_active == True).all()
    return [{"id": s.id, "contact_id": s.contact_id,
             "name": s.contact.name if s.contact else "", "email": s.contact.email if s.contact else "",
             "phone": s.contact.mobile or (s.contact.phone if s.contact else ""),
             } for s in subs]


@router.delete("/lists/{list_id}")
def delete_mailing_list(list_id: int, db: Session = Depends(get_db)):
    ml = db.query(MailingList).filter(MailingList.id == list_id).first()
    if not ml:
        raise HTTPException(404)
    ml.is_active = False
    db.commit()
    return {"ok": True}


# ── Email Campaigns ───────────────────────────────────────────────────────────

@router.get("/email/campaigns")
def list_email_campaigns(db: Session = Depends(get_db)):
    return db.query(EmailCampaign).options(joinedload(EmailCampaign.mailing_list)).order_by(
        EmailCampaign.created_at.desc()).all()


@router.get("/email/campaigns/{campaign_id}")
def get_email_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(EmailCampaign).options(joinedload(EmailCampaign.mailing_list)).filter(
        EmailCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    return c


@router.post("/email/campaigns")
async def create_email_campaign(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    campaign = EmailCampaign(**{k: v for k, v in data.items() if hasattr(EmailCampaign, k)})
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.put("/email/campaigns/{campaign_id}")
async def update_email_campaign(campaign_id: int, request: Request, db: Session = Depends(get_db)):
    c = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    data = await request.json()
    for k, v in data.items():
        if hasattr(c, k) and k != "id":
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.post("/email/campaigns/{campaign_id}/send")
def send_email_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(EmailCampaign).filter(EmailCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    # Simulate sending
    count = db.query(func.count(MailingListContact.id)).filter(
        MailingListContact.mailing_list_id == c.mailing_list_id,
        MailingListContact.is_active == True).scalar()
    c.status = "sent"
    c.sent_date = datetime.utcnow()
    c.total_sent = count
    c.total_opened = int(count * 0.25)  # simulated
    c.total_clicked = int(count * 0.08)  # simulated
    db.commit()
    db.refresh(c)
    return c


# ── SMS Campaigns ─────────────────────────────────────────────────────────────

@router.get("/sms/campaigns")
def list_sms_campaigns(db: Session = Depends(get_db)):
    return db.query(SMSCampaign).order_by(SMSCampaign.created_at.desc()).all()


@router.get("/sms/campaigns/{campaign_id}")
def get_sms_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(SMSCampaign).filter(SMSCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    return c


@router.post("/sms/campaigns")
async def create_sms_campaign(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    campaign = SMSCampaign(**{k: v for k, v in data.items() if hasattr(SMSCampaign, k)})
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.put("/sms/campaigns/{campaign_id}")
async def update_sms_campaign(campaign_id: int, request: Request, db: Session = Depends(get_db)):
    c = db.query(SMSCampaign).filter(SMSCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    data = await request.json()
    for k, v in data.items():
        if hasattr(c, k) and k != "id":
            setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


@router.post("/sms/campaigns/{campaign_id}/send")
def send_sms_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(SMSCampaign).filter(SMSCampaign.id == campaign_id).first()
    if not c:
        raise HTTPException(404)
    count = db.query(func.count(MailingListContact.id)).filter(
        MailingListContact.mailing_list_id == c.mailing_list_id,
        MailingListContact.is_active == True).scalar()
    c.status = "sent"
    c.sent_date = datetime.utcnow()
    c.total_sent = count
    c.total_delivered = int(count * 0.95)  # simulated
    c.total_failed = count - c.total_delivered
    db.commit()
    db.refresh(c)
    return c


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
def marketing_dashboard(db: Session = Depends(get_db)):
    email_campaigns = db.query(func.count(EmailCampaign.id)).scalar()
    sms_campaigns = db.query(func.count(SMSCampaign.id)).scalar()
    total_sent_email = db.query(func.coalesce(func.sum(EmailCampaign.total_sent), 0)).scalar()
    total_sent_sms = db.query(func.coalesce(func.sum(SMSCampaign.total_sent), 0)).scalar()
    total_opened = db.query(func.coalesce(func.sum(EmailCampaign.total_opened), 0)).scalar()
    total_clicked = db.query(func.coalesce(func.sum(EmailCampaign.total_clicked), 0)).scalar()
    mailing_lists = db.query(func.count(MailingList.id)).filter(MailingList.is_active == True).scalar()
    total_subscribers = db.query(func.count(MailingListContact.id)).filter(
        MailingListContact.is_active == True).scalar()
    return {
        "email_campaigns": email_campaigns,
        "sms_campaigns": sms_campaigns,
        "total_emails_sent": total_sent_email,
        "total_sms_sent": total_sent_sms,
        "email_open_rate": round(total_opened / total_sent_email * 100, 1) if total_sent_email > 0 else 0,
        "email_click_rate": round(total_clicked / total_sent_email * 100, 1) if total_sent_email > 0 else 0,
        "mailing_lists": mailing_lists,
        "total_subscribers": total_subscribers,
    }
