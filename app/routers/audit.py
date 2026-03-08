from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import AuditLog, User
from app.routers.auth import require_owner

router = APIRouter(prefix="/api/audit", tags=["Audit Log"])


@router.get("")
def list_audit_logs(
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "table_name": log.table_name,
            "record_id": log.record_id,
            "action": log.action,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "user_name": log.user_name,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
