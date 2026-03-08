from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
import secrets

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Simple in-memory session store: token -> user_id
sessions: dict[str, int] = {}


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Extract current user from session token in cookie or header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token or token not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == sessions[token], User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_owner(current_user: User = Depends(get_current_user)) -> User:
    """Require the current user to be an owner."""
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


@router.post("/login")
def login(request_data: dict, response: Response, db: Session = Depends(get_db)):
    username = request_data.get("username", "").strip()
    password = request_data.get("password", "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user or not user.check_password(password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_hex(32)
    sessions[token] = user.id
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400 * 7,  # 7 days
    )
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
        },
    }


@router.post("/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token and token in sessions:
        del sessions[token]
    response.delete_cookie("session_token")
    return {"message": "Logged out"}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }
