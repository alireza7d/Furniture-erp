from sqlalchemy import (
    Column, Integer, String, Float, Text, Boolean, DateTime, Date,
    ForeignKey, Enum as SAEnum, Table
)
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base
import enum


# ── Enums ──────────────────────────────────────────────────────────────────────

class LeadStatus(str, enum.Enum):
    NEW = "new"
    QUALIFIED = "qualified"
    PROPOSITION = "proposition"
    WON = "won"
    LOST = "lost"


class OrderStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    DELIVERED = "delivered"
    INVOICED = "invoiced"
    CANCELLED = "cancelled"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class POStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    RECEIVED = "received"
    CANCELLED = "cancelled"


class MOStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    CANCELLED = "cancelled"


class ProductCategory(str, enum.Enum):
    SOFA = "Sofa"
    TABLE = "Table"
    CHAIR = "Chair"
    BED = "Bed"
    CABINET = "Cabinet"
    SHELF = "Shelf"
    DESK = "Desk"
    OUTDOOR = "Outdoor"
    ACCESSORY = "Accessory"
    RAW_MATERIAL = "Raw Material"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    CHECK = "check"


# ── Contacts (shared across modules) ──────────────────────────────────────────

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200))
    phone = Column(String(50))
    mobile = Column(String(50))
    company = Column(String(200))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    zip_code = Column(String(20))
    country = Column(String(100))
    is_customer = Column(Boolean, default=True)
    is_vendor = Column(Boolean, default=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    opt_in_email = Column(Boolean, default=True)
    opt_in_sms = Column(Boolean, default=True)

    leads = relationship("Lead", back_populates="contact")
    sale_orders = relationship("SaleOrder", back_populates="customer")
    purchase_orders = relationship("PurchaseOrder", back_populates="vendor")
    invoices = relationship("Invoice", back_populates="contact")
    pos_orders = relationship("POSOrder", back_populates="customer")


# ── Products ──────────────────────────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True)
    category = Column(String(50), default=ProductCategory.CHAIR.value)
    description = Column(Text)
    sale_price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)
    weight = Column(Float, default=0.0)
    dimensions = Column(String(100))  # e.g. "120x80x75 cm"
    material = Column(String(100))  # e.g. "Oak Wood", "Steel + Fabric"
    color = Column(String(50))
    is_active = Column(Boolean, default=True)
    can_be_sold = Column(Boolean, default=True)
    can_be_purchased = Column(Boolean, default=True)
    image_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    stock_moves = relationship("StockMove", back_populates="product")
    bom_lines = relationship("BOMLine", back_populates="product")


# ── CRM Module ────────────────────────────────────────────────────────────────

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    status = Column(String(20), default=LeadStatus.NEW.value)
    source = Column(String(100))  # website, referral, ad, etc.
    expected_revenue = Column(Float, default=0.0)
    probability = Column(Integer, default=10)  # percentage
    assigned_to = Column(String(100))
    notes = Column(Text)
    next_action = Column(String(200))
    next_action_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contact = relationship("Contact", back_populates="leads")
    activities = relationship("Activity", back_populates="lead")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    type = Column(String(50))  # call, email, meeting, note
    summary = Column(String(500))
    date = Column(DateTime, default=datetime.utcnow)
    done = Column(Boolean, default=False)

    lead = relationship("Lead", back_populates="activities")


# ── Sales Module ──────────────────────────────────────────────────────────────

class SaleOrder(Base):
    __tablename__ = "sale_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True)
    customer_id = Column(Integer, ForeignKey("contacts.id"))
    status = Column(String(20), default=OrderStatus.DRAFT.value)
    order_date = Column(Date, default=date.today)
    delivery_date = Column(Date)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Contact", back_populates="sale_orders")
    lines = relationship("SaleOrderLine", back_populates="order", cascade="all, delete-orphan")


class SaleOrderLine(Base):
    __tablename__ = "sale_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("sale_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    description = Column(String(300))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)

    order = relationship("SaleOrder", back_populates="lines")
    product = relationship("Product")


# ── POS Module ────────────────────────────────────────────────────────────────

class POSOrder(Base):
    __tablename__ = "pos_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True)
    customer_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    session_date = Column(Date, default=date.today)
    payment_method = Column(String(20), default=PaymentMethod.CASH.value)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String(20), default="completed")
    cashier = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Contact", back_populates="pos_orders")
    lines = relationship("POSOrderLine", back_populates="order", cascade="all, delete-orphan")


class POSOrderLine(Base):
    __tablename__ = "pos_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("pos_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String(200))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)

    order = relationship("POSOrder", back_populates="lines")
    product = relationship("Product")


# ── Accounting Module ─────────────────────────────────────────────────────────

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    type = Column(String(20), default="customer")  # customer or vendor
    status = Column(String(20), default=InvoiceStatus.DRAFT.value)
    invoice_date = Column(Date, default=date.today)
    due_date = Column(Date)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    notes = Column(Text)
    sale_order_id = Column(Integer, ForeignKey("sale_orders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contact = relationship("Contact", back_populates="invoices")
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String(300))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="lines")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, default=date.today)
    method = Column(String(20), default=PaymentMethod.BANK_TRANSFER.value)
    reference = Column(String(100))
    notes = Column(Text)

    invoice = relationship("Invoice", back_populates="payments")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50))
    date = Column(Date, default=date.today)
    description = Column(Text)
    debit_account = Column(String(100))
    credit_account = Column(String(100))
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Inventory Module ──────────────────────────────────────────────────────────

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(10), unique=True)
    address = Column(Text)
    is_active = Column(Boolean, default=True)

    stock_moves = relationship("StockMove", back_populates="warehouse")


class StockMove(Base):
    __tablename__ = "stock_moves"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    type = Column(String(20))  # in, out, transfer, adjustment
    quantity = Column(Float, nullable=False)
    reference = Column(String(100))  # SO/PO/MO reference
    date = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

    product = relationship("Product", back_populates="stock_moves")
    warehouse = relationship("Warehouse", back_populates="stock_moves")


# ── Purchase Module ───────────────────────────────────────────────────────────

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True)
    vendor_id = Column(Integer, ForeignKey("contacts.id"))
    status = Column(String(20), default=POStatus.DRAFT.value)
    order_date = Column(Date, default=date.today)
    expected_date = Column(Date)
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Contact", back_populates="purchase_orders")
    lines = relationship("PurchaseOrderLine", back_populates="order", cascade="all, delete-orphan")


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("purchase_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    description = Column(String(300))
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)

    order = relationship("PurchaseOrder", back_populates="lines")
    product = relationship("Product")


# ── Manufacturing Module ──────────────────────────────────────────────────────

class BillOfMaterials(Base):
    __tablename__ = "bill_of_materials"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    name = Column(String(200))
    quantity = Column(Float, default=1.0)  # how many finished items this BOM produces
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")
    lines = relationship("BOMLine", back_populates="bom", cascade="all, delete-orphan")
    manufacturing_orders = relationship("ManufacturingOrder", back_populates="bom")


class BOMLine(Base):
    __tablename__ = "bom_lines"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("bill_of_materials.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Float, default=1.0)
    notes = Column(String(200))

    bom = relationship("BillOfMaterials", back_populates="lines")
    product = relationship("Product", back_populates="bom_lines")


class ManufacturingOrder(Base):
    __tablename__ = "manufacturing_orders"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(50), unique=True)
    bom_id = Column(Integer, ForeignKey("bill_of_materials.id"))
    quantity = Column(Float, default=1.0)
    status = Column(String(20), default=MOStatus.DRAFT.value)
    planned_start = Column(Date)
    planned_end = Column(Date)
    actual_start = Column(Date)
    actual_end = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    bom = relationship("BillOfMaterials", back_populates="manufacturing_orders")


# ── Email Marketing Module ────────────────────────────────────────────────────

class MailingList(Base):
    __tablename__ = "mailing_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subscribers = relationship("MailingListContact", back_populates="mailing_list", cascade="all, delete-orphan")
    campaigns = relationship("EmailCampaign", back_populates="mailing_list")


class MailingListContact(Base):
    __tablename__ = "mailing_list_contacts"

    id = Column(Integer, primary_key=True, index=True)
    mailing_list_id = Column(Integer, ForeignKey("mailing_lists.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    subscribed_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    mailing_list = relationship("MailingList", back_populates="subscribers")
    contact = relationship("Contact")


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(300))
    body_html = Column(Text)
    mailing_list_id = Column(Integer, ForeignKey("mailing_lists.id"))
    status = Column(String(20), default=CampaignStatus.DRAFT.value)
    scheduled_date = Column(DateTime)
    sent_date = Column(DateTime)
    total_sent = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    mailing_list = relationship("MailingList", back_populates="campaigns")


# ── SMS Marketing Module ──────────────────────────────────────────────────────

# ── To-do Module ─────────────────────────────────────────────────────────────

class TodoItem(Base):
    __tablename__ = "todo_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    stage = Column(String(20), default="inbox")  # inbox, today, this_week, this_month, later, done, cancelled
    priority = Column(Integer, default=0)  # 0=none, 1, 2, 3 stars
    deadline = Column(Date, nullable=True)
    assigned_to = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserRole(str, enum.Enum):
    ADMIN = "administrator"
    USER = "user"
    READONLY = "readonly"


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), default=UserRole.USER.value)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserInvite(Base):
    __tablename__ = "user_invites"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"))
    token = Column(String(100), unique=True, nullable=False)
    role = Column(String(20), default=UserRole.USER.value)
    status = Column(String(20), default=InviteStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)


class SMSCampaign(Base):
    __tablename__ = "sms_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    mailing_list_id = Column(Integer, ForeignKey("mailing_lists.id"))
    status = Column(String(20), default=CampaignStatus.DRAFT.value)
    scheduled_date = Column(DateTime)
    sent_date = Column(DateTime)
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    mailing_list = relationship("MailingList")
