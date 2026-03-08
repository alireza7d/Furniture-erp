from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, Table, Numeric
)
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base
import enum
import hashlib
import secrets


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    OWNER = "owner"
    EMPLOYEE = "employee"


class SaleType(str, enum.Enum):
    SOFA_SALE = "sofa_sale"
    REPAIR = "repair"
    SERVICE = "service"
    OTHER = "other"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    BANK = "bank"
    TRANSFER = "transfer"


class ExpenseCategoryEnum(str, enum.Enum):
    FOAM_SPONGE = "Foam / Sponge"
    FABRIC = "Fabric"
    GLUE = "Glue"
    WOOD = "Wood"
    TOOLS = "Tools"
    WORKSHOP_SUPPLIES = "Workshop Supplies"
    PETROL_TRANSPORT = "Petrol / Transport"
    SALARIES = "Salaries"
    SHOP_RENT = "Shop Rent"
    WORKSHOP_RENT = "Workshop Rent"
    ELECTRICITY = "Electricity"
    WATER = "Water"
    FOOD = "Food"
    MAINTENANCE = "Maintenance"
    OTHER = "Other Expenses"


# ── Users ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    password_salt = Column(String(64), nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(20), default=UserRole.EMPLOYEE.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sales = relationship("DailySale", back_populates="employee", foreign_keys="DailySale.employee_id")
    expenses = relationship("DailyExpense", back_populates="employee", foreign_keys="DailyExpense.employee_id")

    def set_password(self, password: str):
        self.password_salt = secrets.token_hex(32)
        self.password_hash = hashlib.sha256(
            (password + self.password_salt).encode()
        ).hexdigest()

    def check_password(self, password: str) -> bool:
        return hashlib.sha256(
            (password + self.password_salt).encode()
        ).hexdigest() == self.password_hash


# ── Daily Sales ────────────────────────────────────────────────────────────────

class DailySale(Base):
    __tablename__ = "daily_sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today, index=True)
    customer_name = Column(String(200))
    sale_type = Column(String(50), default=SaleType.SOFA_SALE.value)
    description = Column(Text)
    amount = Column(Numeric(12, 3), nullable=False)  # OMR 3 decimal places
    payment_method = Column(String(20), default=PaymentMethod.CASH.value)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text)
    receipt_photo = Column(String(500))  # file path
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    employee = relationship("User", back_populates="sales", foreign_keys=[employee_id])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])


# ── Daily Expenses ─────────────────────────────────────────────────────────────

class DailyExpense(Base):
    __tablename__ = "daily_expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, default=date.today, index=True)
    category = Column(String(100), nullable=False)
    description = Column(Text)
    amount = Column(Numeric(12, 3), nullable=False)  # OMR 3 decimal places
    payment_method = Column(String(20), default=PaymentMethod.CASH.value)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text)
    receipt_photo = Column(String(500))  # file path
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))
    updated_by = Column(Integer, ForeignKey("users.id"))

    employee = relationship("User", back_populates="expenses", foreign_keys=[employee_id])
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])


# ── Money Summary ─────────────────────────────────────────────────────────────

class MoneySummary(Base):
    __tablename__ = "money_summary"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(String(100), nullable=False)  # e.g. "10 days Jan + Feb 2026"
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 3), nullable=False)  # OMR 3 decimal places
    entry_type = Column(String(50), nullable=False)  # bank_balance, cash, received, etc.
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))

    creator = relationship("User", foreign_keys=[created_by])


# ── Audit Log ──────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(100), nullable=False, index=True)
    record_id = Column(Integer, nullable=False)
    action = Column(String(20), nullable=False)  # create, update, delete
    old_values = Column(Text)  # JSON string
    new_values = Column(Text)  # JSON string
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")
