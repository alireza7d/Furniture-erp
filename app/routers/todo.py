from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TodoItem

router = APIRouter(prefix="/api/todo", tags=["todo"])


@router.get("/")
def list_todos(stage: str = None, db: Session = Depends(get_db)):
    q = db.query(TodoItem)
    if stage:
        q = q.filter(TodoItem.stage == stage)
    return q.order_by(TodoItem.priority.desc(), TodoItem.created_at.desc()).all()


@router.post("/")
async def create_todo(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    item = TodoItem(**{k: v for k, v in data.items() if hasattr(TodoItem, k)})
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{todo_id}")
async def update_todo(todo_id: int, request: Request, db: Session = Depends(get_db)):
    item = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Todo not found")
    data = await request.json()
    for k, v in data.items():
        if hasattr(item, k) and k != "id":
            setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    item = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}
