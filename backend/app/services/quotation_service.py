# backend/app/services/quotation_service.py - CLEAN VERSION WITH NO CIRCULAR IMPORTS

from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger(__name__)

class QuotationServiceError(Exception):
    """Custom exception for quotation service errors"""
    pass

def generate_from_care_plan(db: Session, participant_id: int):
    """
    Generate a quotation from a participant's finalised care plan.
    Returns a response dict to avoid circular imports.
    """
    try:
        # Import models locally to avoid circular imports
        from app.models.quotation import Quotation, QuotationItem
        from app.models.participant import Participant
        from app.models.care_plan import CarePlan
        
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError(f"Participant {participant_id} not found")
        
        # Get the most recent finalised care plan
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id,
            CarePlan.is_finalised == True
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise ValueError(f"No finalised care plan found for participant {participant_id}")
        
        # Check if care plan has supports
        supports = care_plan.supports or []
        if not supports:
            raise ValueError("Care plan has no support items to quote")
        
        logger.info(f"Generating quotation for participant {participant_id} from care plan {care_plan.id}")
        
        # Generate quote number
        quote_number = f"QUO-{participant_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        # Calculate totals (simplified for demo)
        subtotal = 1000.00
        tax_total = subtotal * 0.10
        grand_total = subtotal + tax_total
        
        # Create quotation
        quotation = Quotation(
            participant_id=participant_id,
            quote_number=quote_number,
            version=1,
            status="draft",
            currency="AUD",
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
            valid_from=date.today(),
            valid_to=date.today() + timedelta(days=90),
            care_plan_snapshot={
                "care_plan_id": care_plan.id,
                "plan_name": care_plan.plan_name,
                "supports_count": len(supports)
            },
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(quotation)
        db.flush()
        
        # Create sample quotation items
        for i, support in enumerate(supports[:3]):
            item = QuotationItem(
                quotation_id=quotation.id,
                service_code=f"SVC_{i+1:03d}",
                label=f"Support Service {i+1}",
                unit="hour",
                quantity=10.0,
                rate=75.00,
                line_total=750.00,
                meta={"support_data": support}
            )
            db.add(item)
        
        db.commit()
        db.refresh(quotation)
        
        logger.info(f"Successfully generated quotation {quote_number}")
        
        # Return response dict (convert to schema later)
        return _convert_to_response_dict(quotation)
        
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating quotation: {str(e)}")
        db.rollback()
        raise QuotationServiceError(f"Failed to generate quotation: {str(e)}")

def list_by_participant(db: Session, participant_id: int):
    """Get all quotations for a participant"""
    try:
        from app.models.quotation import Quotation
        
        quotations = db.query(Quotation).filter(
            Quotation.participant_id == participant_id
        ).order_by(desc(Quotation.created_at)).all()
        
        return [_convert_to_response_dict(q) for q in quotations]
        
    except Exception as e:
        logger.error(f"Error listing quotations for participant {participant_id}: {str(e)}")
        raise QuotationServiceError(f"Failed to list quotations: {str(e)}")

def get_by_id(db: Session, quotation_id: int):
    """Get a specific quotation by ID"""
    try:
        from app.models.quotation import Quotation
        
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if quotation:
            return _convert_to_response_dict(quotation)
        return None
        
    except Exception as e:
        logger.error(f"Error getting quotation {quotation_id}: {str(e)}")
        raise QuotationServiceError(f"Failed to get quotation: {str(e)}")

def finalise(db: Session, quotation_id: int):
    """Mark a quotation as final"""
    try:
        from app.models.quotation import Quotation
        
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise ValueError("Quotation not found")
        
        if quotation.status == "final":
            raise ValueError("Quotation is already finalised")
        
        quotation.status = "final"
        quotation.finalised_at = datetime.now()
        quotation.finalised_by = "System User"
        quotation.updated_at = datetime.now()
        
        db.commit()
        db.refresh(quotation)
        
        logger.info(f"Finalised quotation {quotation.quote_number}")
        
        return _convert_to_response_dict(quotation)
        
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error finalising quotation {quotation_id}: {str(e)}")
        db.rollback()
        raise QuotationServiceError(f"Failed to finalise quotation: {str(e)}")

def _convert_to_response_dict(quotation):
    """Convert quotation model to response dict to avoid circular imports"""
    items = []
    for item in quotation.items:
        items.append({
            "id": item.id,
            "quotation_id": item.quotation_id,
            "service_code": item.service_code,
            "label": item.label,
            "unit": item.unit,
            "quantity": float(item.quantity),
            "rate": float(item.rate),
            "line_total": float(item.line_total),
            "meta": item.meta
        })
    
    return {
        "id": quotation.id,
        "participant_id": quotation.participant_id,
        "quote_number": quotation.quote_number,
        "version": quotation.version,
        "status": quotation.status,
        "currency": quotation.currency,
        "subtotal": float(quotation.subtotal),
        "tax_total": float(quotation.tax_total),
        "grand_total": float(quotation.grand_total),
        "valid_from": quotation.valid_from,
        "valid_to": quotation.valid_to,
        "finalised_at": quotation.finalised_at,
        "finalised_by": quotation.finalised_by,
        "created_at": quotation.created_at,
        "updated_at": quotation.updated_at,
        "items": items
    }