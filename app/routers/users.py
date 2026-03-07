import hashlib
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserInvite

router = APIRouter(prefix="/api/users", tags=["users"])

# Simple session store (in-memory; for production use Redis or DB sessions)
_sessions = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("session_token")
    if not token or token not in _sessions:
        raise HTTPException(401, "Not authenticated")
    user_id = _sessions[token]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


def require_admin(request: Request, db: Session = Depends(get_db)) -> User:
    user = get_current_user(request, db)
    if user.role != "administrator":
        raise HTTPException(403, "Administrator access required")
    return user


# ── Auth endpoints ────────────────────────────────────────────────────────────

@router.post("/login")
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        raise HTTPException(400, "Email and password required")

    user = db.query(User).filter(User.email == email).first()
    if not user or user.password_hash != hash_password(password):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is disabled")

    token = secrets.token_hex(32)
    _sessions[token] = user.id
    user.last_login = datetime.utcnow()
    db.commit()

    response.set_cookie("session_token", token, httponly=True, max_age=86400 * 7)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token and token in _sessions:
        del _sessions[token]
    response.delete_cookie("session_token")
    return {"ok": True}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


# ── User management (admin only) ─────────────────────────────────────────────

@router.get("")
def list_users(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role,
             "is_active": u.is_active, "last_login": str(u.last_login) if u.last_login else None,
             "created_at": str(u.created_at)} for u in users]


@router.get("/invites")
def list_invites(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    invites = db.query(UserInvite).filter(UserInvite.status == "pending").order_by(UserInvite.created_at.desc()).all()
    return [{"id": i.id, "email": i.email, "role": i.role, "status": i.status,
             "created_at": str(i.created_at)} for i in invites]


@router.post("/invite")
async def invite_user(request: Request, db: Session = Depends(get_db),
                      admin: User = Depends(require_admin)):
    data = await request.json()
    email = data.get("email", "").strip().lower()
    role = data.get("role", "user")
    if not email:
        raise HTTPException(400, "Email is required")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "A user with this email already exists")

    pending = db.query(UserInvite).filter(
        UserInvite.email == email, UserInvite.status == "pending"
    ).first()
    if pending:
        raise HTTPException(400, "An invitation is already pending for this email")

    token = secrets.token_hex(32)
    invite = UserInvite(
        email=email, invited_by=admin.id, token=token, role=role,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invite)
    db.commit()
    return {"ok": True, "email": email, "token": token}


@router.delete("/invites/{invite_id}")
def cancel_invite(invite_id: int, db: Session = Depends(get_db),
                  admin: User = Depends(require_admin)):
    invite = db.query(UserInvite).filter(UserInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(404, "Invite not found")
    db.delete(invite)
    db.commit()
    return {"ok": True}


@router.post("/register")
async def register_with_invite(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    token = data.get("token", "")
    name = data.get("name", "").strip()
    password = data.get("password", "")

    if not token or not name or not password:
        raise HTTPException(400, "Token, name and password are required")

    invite = db.query(UserInvite).filter(
        UserInvite.token == token, UserInvite.status == "pending"
    ).first()
    if not invite:
        raise HTTPException(400, "Invalid or expired invitation")
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        raise HTTPException(400, "Invitation has expired")

    user = User(
        name=name, email=invite.email,
        password_hash=hash_password(password), role=invite.role
    )
    db.add(user)
    invite.status = "accepted"
    db.commit()
    return {"ok": True, "email": user.email}


@router.put("/{user_id}")
async def update_user(user_id: int, request: Request, db: Session = Depends(get_db),
                      admin: User = Depends(require_admin)):
    data = await request.json()
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    if "name" in data:
        user.name = data["name"]
    if "role" in data:
        # Prevent removing the last admin
        if user.role == "administrator" and data["role"] != "administrator":
            admin_count = db.query(User).filter(User.role == "administrator", User.is_active == True).count()
            if admin_count <= 1:
                raise HTTPException(400, "Cannot remove the last administrator")
        user.role = data["role"]
    if "is_active" in data:
        if user.id == admin.id and not data["is_active"]:
            raise HTTPException(400, "Cannot deactivate your own account")
        user.is_active = data["is_active"]
    if "password" in data and data["password"]:
        user.password_hash = hash_password(data["password"])
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db),
                admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"ok": True}
