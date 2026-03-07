from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date
from app.database import get_db
from app.models import BillOfMaterials, BOMLine, ManufacturingOrder, StockMove, Product

router = APIRouter(prefix="/api/manufacturing", tags=["manufacturing"])


# ── Bill of Materials ──────────────────────────────────────────────────────────

@router.get("/bom")
def list_bom(db: Session = Depends(get_db)):
    return db.query(BillOfMaterials).options(
        joinedload(BillOfMaterials.product),
        joinedload(BillOfMaterials.lines).joinedload(BOMLine.product),
    ).filter(BillOfMaterials.is_active == True).all()


@router.get("/bom/{bom_id}")
def get_bom(bom_id: int, db: Session = Depends(get_db)):
    bom = db.query(BillOfMaterials).options(
        joinedload(BillOfMaterials.product),
        joinedload(BillOfMaterials.lines).joinedload(BOMLine.product),
    ).filter(BillOfMaterials.id == bom_id).first()
    if not bom:
        raise HTTPException(404)
    return bom


@router.post("/bom")
async def create_bom(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    lines_data = data.pop("lines", [])
    bom = BillOfMaterials(**{k: v for k, v in data.items() if hasattr(BillOfMaterials, k)})
    db.add(bom)
    db.flush()
    for ld in lines_data:
        db.add(BOMLine(bom_id=bom.id, product_id=ld["product_id"],
                       quantity=ld.get("quantity", 1), notes=ld.get("notes", "")))
    db.commit()
    db.refresh(bom)
    return bom


@router.delete("/bom/{bom_id}")
def delete_bom(bom_id: int, db: Session = Depends(get_db)):
    bom = db.query(BillOfMaterials).filter(BillOfMaterials.id == bom_id).first()
    if not bom:
        raise HTTPException(404)
    bom.is_active = False
    db.commit()
    return {"ok": True}


# ── Manufacturing Orders ──────────────────────────────────────────────────────

@router.get("/orders")
def list_mo(status: str = None, db: Session = Depends(get_db)):
    q = db.query(ManufacturingOrder).options(joinedload(ManufacturingOrder.bom).joinedload(BillOfMaterials.product))
    if status:
        q = q.filter(ManufacturingOrder.status == status)
    return q.order_by(ManufacturingOrder.created_at.desc()).all()


@router.get("/orders/{mo_id}")
def get_mo(mo_id: int, db: Session = Depends(get_db)):
    mo = db.query(ManufacturingOrder).options(
        joinedload(ManufacturingOrder.bom).joinedload(BillOfMaterials.product),
        joinedload(ManufacturingOrder.bom).joinedload(BillOfMaterials.lines).joinedload(BOMLine.product),
    ).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(404)
    return mo


@router.post("/orders")
async def create_mo(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    last = db.query(ManufacturingOrder).order_by(ManufacturingOrder.id.desc()).first()
    num = (last.id + 1) if last else 1
    data["reference"] = f"MO-{num:05d}"
    mo = ManufacturingOrder(**{k: v for k, v in data.items() if hasattr(ManufacturingOrder, k)})
    db.add(mo)
    db.commit()
    db.refresh(mo)
    return mo


@router.post("/orders/{mo_id}/start")
def start_mo(mo_id: int, db: Session = Depends(get_db)):
    mo = db.query(ManufacturingOrder).options(
        joinedload(ManufacturingOrder.bom).joinedload(BillOfMaterials.lines)
    ).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(404)
    # Consume raw materials
    for line in mo.bom.lines:
        db.add(StockMove(
            product_id=line.product_id, warehouse_id=1, type="out",
            quantity=line.quantity * mo.quantity, reference=mo.reference,
        ))
    mo.status = "in_progress"
    mo.actual_start = date.today()
    db.commit()
    return mo


@router.post("/orders/{mo_id}/complete")
def complete_mo(mo_id: int, db: Session = Depends(get_db)):
    mo = db.query(ManufacturingOrder).options(
        joinedload(ManufacturingOrder.bom)
    ).filter(ManufacturingOrder.id == mo_id).first()
    if not mo:
        raise HTTPException(404)
    # Produce finished goods
    db.add(StockMove(
        product_id=mo.bom.product_id, warehouse_id=1, type="in",
        quantity=mo.quantity * mo.bom.quantity, reference=mo.reference,
    ))
    mo.status = "done"
    mo.actual_end = date.today()
    db.commit()
    return mo


@router.get("/dashboard")
def mfg_dashboard(db: Session = Depends(get_db)):
    total = db.query(func.count(ManufacturingOrder.id)).scalar()
    in_progress = db.query(func.count(ManufacturingOrder.id)).filter(
        ManufacturingOrder.status == "in_progress").scalar()
    done = db.query(func.count(ManufacturingOrder.id)).filter(
        ManufacturingOrder.status == "done").scalar()
    bom_count = db.query(func.count(BillOfMaterials.id)).filter(BillOfMaterials.is_active == True).scalar()
    return {
        "total_orders": total,
        "in_progress": in_progress,
        "completed": done,
        "active_boms": bom_count,
    }
