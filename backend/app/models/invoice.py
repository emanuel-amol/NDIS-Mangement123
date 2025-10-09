# backend/app/models/invoice.py
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class PaymentMethod(str, enum.Enum):
    ndis_direct = "ndis_direct"
    plan_managed = "plan_managed"
    self_managed = "self_managed"

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)

    # Participant info
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    participant_name = Column(String(200), nullable=False)
    participant_ndis_number = Column(String(50), nullable=True)

    # Billing period
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)

    # Invoice dates
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=True)

    # Status and payment
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft)
    payment_method = Column(Enum(PaymentMethod), nullable=False, default=PaymentMethod.ndis_direct)

    # Amounts
    subtotal = Column(Numeric(10, 2), nullable=False)
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False, default=0)
    amount_outstanding = Column(Numeric(10, 2), nullable=False)

    # Payment tracking
    payment_date = Column(Date, nullable=True)

    # External references
    xero_invoice_id = Column(String(100), nullable=True)

    # Additional info
    notes = Column(Text, nullable=True)

    # Audit
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    participant = relationship("Participant")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)

    # Link to roster/appointment
    appointment_id = Column(Integer, nullable=True)

    # Service details
    service_type = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    hours = Column(Numeric(10, 2), nullable=False)
    hourly_rate = Column(Numeric(10, 2), nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)

    # Support worker
    support_worker_name = Column(String(200), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationship
    invoice = relationship("Invoice", back_populates="items")
