from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.routers.auth import get_current_user, require_owner

router = APIRouter(prefix="/api/users", tags=["User Management"])


def user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("")
def list_users(
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.full_name).all()
    return [user_to_dict(u) for u in users]


@router.get("/employees")
def list_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List active employees (available to all authenticated users for dropdowns)."""
    users = db.query(User).filter(User.is_active == True).order_by(User.full_name).all()
    return [{"id": u.id, "full_name": u.full_name, "role": u.role} for u in users]


@router.post("")
def create_user(
    data: dict,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    username = data.get("username", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    role = data.get("role", "employee")

    if not username or not password or not full_name:
        raise HTTPException(status_code=400, detail="Username, password, and full name required")

    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    if role not in ("owner", "employee"):
        raise HTTPException(status_code=400, detail="Role must be 'owner' or 'employee'")

    user = User(username=username, full_name=full_name, role=role)
    user.set_password(password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return user_to_dict(user)


@router.put("/{user_id}")
def update_user(
    user_id: int,
    data: dict,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "full_name" in data:
        user.full_name = data["full_name"].strip()
    if "role" in data and data["role"] in ("owner", "employee"):
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        if len(data["password"]) < 4:
            raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
        user.set_password(data["password"])

    db.commit()
    db.refresh(user)
    return user_to_dict(user)


@router.delete("/{user_id}")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    return {"message": f"User {user.full_name} deactivated"}
