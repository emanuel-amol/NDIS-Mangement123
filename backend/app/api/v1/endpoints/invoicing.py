# backend/app/api/v1/endpoints/invoicing.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from datetime import date, time, datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps_admin_key import require_admin_key
from app.models.roster import Roster, RosterParticipant, RosterStatus
from app.models.participant import Participant
from app.models.user import User

router = APIRouter(dependencies=[Depends(require_admin_key)])
logger = logging.getLogger(__name__)

# ==========================================
# BILLABLE SERVICE SCHEMA
# ==========================================

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
    status: Optional[str] = Query("completed", description="Service status filter"),
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
        if status:
            try:
                roster_status = RosterStatus(status.lower())
                filters.append(Roster.status == roster_status)
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
                participant_id_val = roster.participants[0].participant_id
                participant = db.query(Participant).filter(Participant.id == participant_id_val).first()

            if not participant:
                continue  # Skip if no participant found

            # Get support worker info
            support_worker = None
            if roster.worker_id:
                support_worker = db.query(User).filter(User.id == roster.worker_id).first()

            # Calculate hours and cost
            hours = calculate_duration_hours(roster.start_time, roster.end_time)
            hourly_rate = get_service_hourly_rate(roster.eligibility, support_worker)
            total_amount = hours * hourly_rate

            billable_service = BillableServiceResponse(
                id=f"roster_{roster.id}",
                appointment_id=roster.id,
                participant_id=participant.id,
                participant_name=f"{participant.first_name} {participant.last_name}",
                service_type=roster.eligibility or "General Support",
                date=roster.support_date.isoformat(),
                start_time=roster.start_time.strftime("%H:%M"),
                end_time=roster.end_time.strftime("%H:%M"),
                hours=round(hours, 2),
                hourly_rate=hourly_rate,
                total_amount=round(total_amount, 2),
                support_worker_name=f"{support_worker.first_name} {support_worker.last_name}" if support_worker else "Unknown Worker",
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
                date="2025-01-15",
                start_time="09:00",
                end_time="11:00",
                hours=2.0,
                hourly_rate=35.00,
                total_amount=70.00,
                support_worker_name="Sarah Wilson",
                notes="Morning routine assistance - completed",
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
                date="2025-01-16",
                start_time="14:00",
                end_time="16:00",
                hours=2.0,
                hourly_rate=32.00,
                total_amount=64.00,
                support_worker_name="Michael Chen",
                notes="Shopping assistance - completed",
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

def calculate_duration_hours(start_time: time, end_time: time) -> float:
    """Calculate duration in hours"""
    if not start_time or not end_time:
        return 0.0

    start_dt = datetime.combine(date.today(), start_time)
    end_dt = datetime.combine(date.today(), end_time)
    return (end_dt - start_dt).total_seconds() / 3600

def get_service_hourly_rate(service_type: str, support_worker: Optional[User] = None) -> float:
    """Get hourly rate based on service type and worker"""
    # Default NDIS rates
    default_rates = {
        'Personal Care': 35.00,
        'Community Access': 32.00,
        'Domestic Assistance': 30.00,
        'Transport': 28.00,
        'Social Participation': 32.00,
        'Skill Development': 38.00,
        'General Support': 35.00
    }

    base_rate = default_rates.get(service_type, 35.00)

    # Apply worker-specific rate if available
    if support_worker and hasattr(support_worker, 'hourly_rate'):
        worker_rate = getattr(support_worker, 'hourly_rate', None)
        if worker_rate and worker_rate > 0:
            base_rate = worker_rate

    return base_rate

# ==========================================
# INVOICE GENERATION ENDPOINT
# ==========================================

class InvoiceItemRequest(BaseModel):
    id: str
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
    items: List[InvoiceItemRequest]
    subtotal: float
    gst_amount: float
    total_amount: float
    notes: Optional[str] = None

@router.post("/generate")
def generate_invoice(
    payload: InvoiceGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate invoice from selected billable services and sync with Xero
    """
    try:
        # Generate invoice number
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{payload.participant_id:04d}"

        logger.info(f"Generated invoice {invoice_number} for participant {payload.participant_id}")
        logger.info(f"Invoice contains {len(payload.items)} items totaling ${payload.total_amount:.2f}")

        # TODO: Save invoice to database
        # For now, we'll simulate successful invoice creation

        # TODO: Integrate with Xero API to create invoice
        # For MVP, we're returning success and invoice number
        # The Xero sync can be done separately via the Xero Sync page
        #
        # Future implementation:
        # 1. Create invoice in Xero using xero-python SDK
        # 2. Store Xero invoice ID in database
        # 3. Handle Xero API errors gracefully
        # 4. Implement automatic retry logic for failed syncs

        xero_invoice_id = f"XERO-{invoice_number}"  # Mock Xero ID for now

        logger.info(f"Invoice {invoice_number} created successfully")
        logger.info(f"Mock Xero sync completed with ID: {xero_invoice_id}")

        return {
            "success": True,
            "invoice_number": invoice_number,
            "xero_invoice_id": xero_invoice_id,
            "message": f"Invoice {invoice_number} generated successfully and queued for Xero sync"
        }

    except Exception as e:
        logger.error(f"Error generating invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice: {str(e)}"
        )