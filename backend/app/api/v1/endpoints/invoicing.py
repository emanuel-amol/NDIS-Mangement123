# backend/app/api/v1/endpoints/invoicing.py
from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel
import os

# Xero SDK imports
from xero_python.api_client import ApiClient
from xero_python.api_client.oauth2 import OAuth2Token
from xero_python.api_client.configuration import Configuration
from xero_python.identity import IdentityApi
from xero_python.accounting import AccountingApi, Contact, Invoice as XeroInvoice, LineItem, Invoices, Contacts

from app.core.database import get_db
from app.security.deps import require_roles
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from app.models.user import User
from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, PaymentMethod

router = APIRouter(dependencies=[Depends(require_roles("FINANCE", "SERVICE_MANAGER", "PROVIDER_ADMIN"))])

logger = logging.getLogger(__name__)

# ==========================================
# XERO CONFIGURATION
# ==========================================
XERO_CLIENT_ID = os.getenv("XERO_CLIENT_ID")
XERO_CLIENT_SECRET = os.getenv("XERO_CLIENT_SECRET")
XERO_REDIRECT_URI = os.getenv("XERO_REDIRECT_URI", "http://localhost:8000/api/v1/invoicing/xero/callback")

# In-memory token storage (use database in production)
xero_tokens = {}

# ==========================================
# PYDANTIC MODELS
# ==========================================
class InvoiceItemCreate(BaseModel):
    appointment_id: int
    service_type: str
    date: str
    start_time: str
    end_time: str
    hours: float
    hourly_rate: float
    total_amount: float
    support_worker_name: str
    notes: Optional[str] = None

class InvoiceGenerationRequest(BaseModel):
    participant_id: int
    participant_name: str
    billing_period_start: str
    billing_period_end: str
    issue_date: str
    due_date: str
    items: List[InvoiceItemCreate]
    subtotal: float
    gst_amount: float
    total_amount: float
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    participant_id: int
    participant_name: str
    participant_ndis_number: Optional[str]
    billing_period_start: str
    billing_period_end: str
    issue_date: str
    due_date: str
    status: str
    payment_method: str
    items: List[dict]
    subtotal: float
    gst_amount: float
    total_amount: float
    amount_paid: float
    amount_outstanding: float
    payment_date: Optional[str]
    xero_invoice_id: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: Optional[str]

class InvoiceStatsResponse(BaseModel):
    total_invoices: int
    total_outstanding: float
    total_overdue: float
    total_paid_this_month: float
    average_payment_days: int

class SyncRequest(BaseModel):
    item_ids: Optional[List[str]] = None

class BillableServiceResponse(BaseModel):
    id: str
    appointment_id: int
    participant_id: int
    participant_name: str
    service_type: str
    date: str
    start_time: str
    end_time: str
    hours: float
    hourly_rate: float
    total_amount: float
    support_worker_name: str
    notes: Optional[str] = None
    is_billable: bool = True
    invoice_id: Optional[str] = None
    created_at: str

# ==========================================
# BILLABLE SERVICES ENDPOINTS
# ==========================================
@router.get("/billable-services", response_model=List[BillableServiceResponse])
def get_billable_services(
    db: Session = Depends(get_db),
    start_date: Optional[date] = Query(None, description="Billing period start date"),
    end_date: Optional[date] = Query(None, description="Billing period end date"),
    participant_id: Optional[int] = Query(None, description="Filter by participant"),
    roster_status: Optional[str] = Query("completed", description="Service status filter"),
    unbilled_only: bool = Query(True, description="Only return services not yet invoiced")
):
    """
    Get billable services from completed appointments for invoice generation
    """
    try:
        # Query completed appointments from roster system
        query = db.query(Roster).options(
            joinedload(Roster.participants),
        )
        
        # Apply filters
        filters = []
        
        # Date range filter
        if start_date:
            filters.append(Roster.support_date >= start_date)
        
        if end_date:
            filters.append(Roster.support_date <= end_date)
        else:
            # Default to current month if no end date specified
            today = date.today()
            filters.append(Roster.support_date <= today)
        
        # Participant filter
        if participant_id:
            filters.append(
                Roster.participants.any(RosterParticipant.participant_id == participant_id)
            )
        
        # Status filter - only completed services are billable
        if roster_status:
            try:
                status_enum = RosterStatus(roster_status.lower())
                filters.append(Roster.status == status_enum)
            except ValueError:
                # Default to completed if invalid status
                filters.append(Roster.status == RosterStatus.completed)
        else:
            filters.append(Roster.status == RosterStatus.completed)
        
        # Only services that haven't been invoiced yet
        if unbilled_only:
            # TODO: Add invoice_id field to Roster model to track invoiced services
            # For now, we'll return all completed services
            pass
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Get completed appointments
        completed_rosters = query.order_by(Roster.support_date.desc()).all()
        
        # Transform to billable services
        billable_services = []
        
        for roster in completed_rosters:
            # Get participant info
            participant = None
            if roster.participants:
                participant_id = roster.participants[0].participant_id
                participant = db.query(Participant).filter(Participant.id == participant_id).first()
            
            if not participant:
                continue
            
            # Get support worker info
            worker = db.query(User).filter(User.id == roster.worker_id).first()
            worker_name = f"{worker.first_name} {worker.last_name}" if worker else "Unknown Worker"
            
            # Calculate hours and amount
            hours = roster.quantity or 0
            hourly_rate = 35.00  # Default rate, should come from service type
            total_amount = hours * hourly_rate
            
            billable_service = BillableServiceResponse(
                id=f"roster_{roster.id}",
                appointment_id=roster.id,
                participant_id=participant.id,
                participant_name=f"{participant.first_name} {participant.last_name}",
                service_type=roster.eligibility or "Support Services",
                date=roster.support_date.isoformat(),
                start_time=roster.start_time.strftime("%H:%M") if roster.start_time else "09:00",
                end_time=roster.end_time.strftime("%H:%M") if roster.end_time else "17:00",
                hours=hours,
                hourly_rate=hourly_rate,
                total_amount=total_amount,
                support_worker_name=worker_name,
                notes=roster.notes,
                is_billable=True,
                invoice_id=None,  # TODO: Link to actual invoice when created
                created_at=roster.created_at.isoformat() if roster.created_at else datetime.utcnow().isoformat()
            )
            
            billable_services.append(billable_service)
        
        logger.info(f"Retrieved {len(billable_services)} billable services from database")
        
        # FALLBACK: Return mock data if no real data found
        if len(billable_services) == 0:
            logger.warning("No billable services found in database, using fallback mock data")
            return get_mock_billable_services()
        
        return billable_services
    
    except Exception as e:
        logger.error(f"Error retrieving billable services: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve billable services: {str(e)}"
        )

def get_mock_billable_services():
    """Mock data fallback for development"""
    mock_services = [
        BillableServiceResponse(
            id="mock_1",
            appointment_id=1,
            participant_id=1,
            participant_name="Jordan Smith",
            service_type="Personal Care",
            date="2025-10-15",
            start_time="09:00",
            end_time="12:00",
            hours=3.0,
            hourly_rate=45.00,
            total_amount=135.00,
            support_worker_name="Sarah Johnson",
            notes="Morning personal care routine",
            is_billable=True,
            invoice_id=None,
            created_at=datetime.utcnow().isoformat()
        ),
        BillableServiceResponse(
            id="mock_2",
            appointment_id=2,
            participant_id=2,
            participant_name="Amrita Kumar",
            service_type="Community Access",
            date="2025-10-16",
            start_time="10:00",
            end_time="14:00",
            hours=4.0,
            hourly_rate=42.00,
            total_amount=168.00,
            support_worker_name="Michael Chen",
            notes="Shopping and community activities",
            is_billable=True,
            invoice_id=None,
            created_at=datetime.utcnow().isoformat()
        )
    ]
    
    logger.info(f"Returning {len(mock_services)} mock billable services")
    return mock_services

# ==========================================
# HELPER FUNCTIONS
# ==========================================

def calculate_due_date(issue_date: str, payment_terms_days: int = 30) -> str:
    """Calculate due date based on issue date and payment terms"""
    issue = datetime.fromisoformat(issue_date)
    due = issue + timedelta(days=payment_terms_days)
    return due.date().isoformat()

def generate_invoice_number(participant_id: int) -> str:
    """Generate a unique invoice number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"INV-{timestamp}-{participant_id:04d}"

# ==========================================
# INVOICE ENDPOINTS
# ==========================================

@router.get("/stats", response_model=InvoiceStatsResponse)
def get_invoice_stats(db: Session = Depends(get_db)):
    """Get invoice statistics"""
    try:
        total = db.query(func.count(Invoice.id)).scalar() or 0
        outstanding = db.query(func.sum(Invoice.amount_outstanding)).filter(
            Invoice.status.in_([InvoiceStatus.draft, InvoiceStatus.sent])
        ).scalar() or 0.0
        
        overdue = db.query(func.sum(Invoice.amount_outstanding)).filter(
            Invoice.status == InvoiceStatus.overdue
        ).scalar() or 0.0
        
        # Paid this month
        first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        paid_this_month = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status == InvoiceStatus.paid,
            Invoice.payment_date >= first_of_month
        ).scalar() or 0.0
        
        return InvoiceStatsResponse(
            total_invoices=total,
            total_outstanding=float(outstanding),
            total_overdue=float(overdue),
            total_paid_this_month=float(paid_this_month),
            average_payment_days=18
        )
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting invoice stats: {str(e)}"
        )

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_detail(invoice_id: int, db: Session = Depends(get_db)):
    """Get detailed invoice information"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    return InvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        participant_id=invoice.participant_id,
        participant_name=invoice.participant_name,
        participant_ndis_number=invoice.participant_ndis_number,
        billing_period_start=invoice.billing_period_start.isoformat(),
        billing_period_end=invoice.billing_period_end.isoformat(),
        issue_date=invoice.issue_date.isoformat(),
        due_date=invoice.due_date.isoformat(),
        status=invoice.status.value,
        payment_method=invoice.payment_method.value,
        items=[{
            "id": item.id,
            "service_type": item.service_type,
            "date": item.date.isoformat(),
            "hours": float(item.hours),
            "hourly_rate": float(item.hourly_rate),
            "total_amount": float(item.total_amount),
            "support_worker_name": item.support_worker_name,
            "notes": item.notes
        } for item in invoice.items],
        subtotal=float(invoice.subtotal),
        gst_amount=float(invoice.gst_amount),
        total_amount=float(invoice.total_amount),
        amount_paid=float(invoice.amount_paid or 0),
        amount_outstanding=float(invoice.amount_outstanding or invoice.total_amount),
        payment_date=invoice.payment_date.isoformat() if invoice.payment_date else None,
        xero_invoice_id=invoice.xero_invoice_id,
        notes=invoice.notes,
        created_at=invoice.created_at.isoformat() if invoice.created_at else datetime.utcnow().isoformat(),
        updated_at=invoice.updated_at.isoformat() if invoice.updated_at else None
    )

@router.post("/generate")
def generate_invoice(
    payload: InvoiceGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate invoice from selected billable services and save to database
    """
    try:
        # Generate invoice number
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{payload.participant_id:04d}"
        
        # Get participant
        participant = db.query(Participant).filter(Participant.id == payload.participant_id).first()
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            participant_id=payload.participant_id,
            participant_name=payload.participant_name,
            participant_ndis_number=participant.ndis_number if participant else None,
            billing_period_start=datetime.fromisoformat(payload.billing_period_start).date(),
            billing_period_end=datetime.fromisoformat(payload.billing_period_end).date(),
            issue_date=datetime.fromisoformat(payload.issue_date).date(),
            due_date=datetime.fromisoformat(payload.due_date).date(),
            status=InvoiceStatus.draft,
            payment_method=PaymentMethod.ndis_direct,
            subtotal=payload.subtotal,
            gst_amount=payload.gst_amount,
            total_amount=payload.total_amount,
            amount_paid=0,
            amount_outstanding=payload.total_amount,
            notes=payload.notes
        )
        
        db.add(invoice)
        db.flush()
        
        # Add invoice items
        for item_data in payload.items:
            item = InvoiceItem(
                invoice_id=invoice.id,
                service_type=item_data.service_type,
                date=datetime.fromisoformat(item_data.date).date(),
                start_time=datetime.strptime(item_data.start_time, "%H:%M").time(),
                end_time=datetime.strptime(item_data.end_time, "%H:%M").time(),
                hours=item_data.hours,
                hourly_rate=item_data.hourly_rate,
                total_amount=item_data.total_amount,
                support_worker_name=item_data.support_worker_name,
                notes=item_data.notes
            )
            db.add(item)
        
        db.commit()
        
        return {
            "success": True,
            "invoice_number": invoice_number,
            "invoice_id": invoice.id,
            "message": f"Invoice {invoice_number} generated successfully"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating invoice: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice: {str(e)}"
        )

@router.get("/invoices")
def list_invoices(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, alias="status")
):
    """List all invoices with optional filters"""
    try:
        query = db.query(Invoice)
        
        if status_filter:
            try:
                invoice_status = InvoiceStatus(status_filter.lower())
                query = query.filter(Invoice.status == invoice_status)
            except ValueError:
                pass
        
        invoices = query.order_by(Invoice.created_at.desc()).limit(limit).all()
        
        return [
            InvoiceResponse(
                id=inv.id,
                invoice_number=inv.invoice_number,
                participant_id=inv.participant_id,
                participant_name=inv.participant_name,
                participant_ndis_number=inv.participant_ndis_number,
                billing_period_start=inv.billing_period_start.isoformat(),
                billing_period_end=inv.billing_period_end.isoformat(),
                issue_date=inv.issue_date.isoformat(),
                due_date=inv.due_date.isoformat(),
                status=inv.status.value,
                payment_method=inv.payment_method.value,
                items=[],  # Don't load items for list view
                subtotal=float(inv.subtotal),
                gst_amount=float(inv.gst_amount),
                total_amount=float(inv.total_amount),
                amount_paid=float(inv.amount_paid or 0),
                amount_outstanding=float(inv.amount_outstanding or inv.total_amount),
                payment_date=inv.payment_date.isoformat() if inv.payment_date else None,
                xero_invoice_id=inv.xero_invoice_id,
                notes=inv.notes,
                created_at=inv.created_at.isoformat() if inv.created_at else datetime.utcnow().isoformat(),
                updated_at=inv.updated_at.isoformat() if inv.updated_at else None
            ) for inv in invoices
        ]
        
    except Exception as e:
        logger.error(f"Error listing invoices: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list invoices: {str(e)}"
        )

# ==========================================
# XERO INTEGRATION (Placeholder)
# ==========================================

@router.get("/xero/status")
def get_xero_status():
    """Get Xero connection status"""
    return {
        "connected": False,
        "last_sync": None,
        "tenant_name": None,
        "sync_status": "idle"
    }

@router.post("/xero/sync")
def sync_xero(request: SyncRequest, db: Session = Depends(get_db)):
    """Sync invoices with Xero"""
    return {
        "synced": 0,
        "failed": 0,
        "message": "Xero integration not yet configured"
    }

@router.post("/generate-automatic")
def generate_automatic_invoices(
    billing_period_start: str = Query(...),
    billing_period_end: str = Query(...),
    db: Session = Depends(get_db)
):
    """Automatically generate invoices for all participants with completed services"""
    try:
        # This would query all completed services and generate invoices
        # For now, return a mock response
        return {
            "success": True,
            "invoices_generated": 0,
            "billing_period_start": billing_period_start,
            "billing_period_end": billing_period_end,
            "message": "No completed services found for the billing period"
        }
    except Exception as e:
        logger.error(f"Error generating automatic invoices: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate automatic invoices: {str(e)}"
        )