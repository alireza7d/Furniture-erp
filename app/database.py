import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Use /data directory on Railway for persistent storage, fallback to local
# Railway: set DATA_DIR=/data and attach a persistent volume at /data
data_dir = os.environ.get("DATA_DIR", "")
if not data_dir:
    # Auto-detect persistent volume on Railway/Render
    if os.path.isdir("/data"):
        data_dir = "/data"
    else:
        data_dir = "."

# Ensure directory exists
os.makedirs(data_dir, exist_ok=True)

DATABASE_URL = f"sqlite:///{data_dir}/furniture_erp.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
