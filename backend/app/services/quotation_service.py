# backend/app/services/quotation_service.py - COMPLETE VERSION WITH MISSING FUNCTION
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

import logging

logger = logging.getLogger(__name__)

# ==========================================
# QUOTATION SERVICE FUNCTIONS
# ==========================================

def generate_from_care_plan(db: Session, participant_id: int) -> Dict[str, Any]:
    """
    Generate a quotation from a participant's care plan using your dynamic data
    """
    try:
        # Import models here to avoid circular imports
        from app.models.participant import Participant
        from app.models.care_plan import CarePlan
        from app.models.quotation import Quotation, QuotationItem
        from sqlalchemy import desc
        
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError(f"Participant {participant_id} not found")
        
        # Get the latest finalised care plan
        care_plan = db.query(CarePlan).filter(
            CarePlan.participant_id == participant_id
        ).order_by(desc(CarePlan.created_at)).first()
        
        if not care_plan:
            raise ValueError("No care plan found for participant")
        
        # Check if care plan is finalised (required for quotation generation)
        if not getattr(care_plan, 'is_finalised', False):
            raise ValueError("Care plan must be finalised before generating quotation")
        
        # Get supports from care plan
        supports = care_plan.supports or []
        if not supports:
            raise ValueError("No supports found in care plan")
        
        # Validate supports is a list
        if not isinstance(supports, list):
            raise ValueError("Care plan supports must be a list")
        
        logger.info(f"Generating quotation for participant {participant_id} with {len(supports)} supports")
        
        # Generate unique quote number
        quote_number = _generate_quote_number(db, participant_id)
        
        # Create quotation using the actual database columns
        quotation = Quotation(
            participant_id=participant_id,
            quote_number=quote_number,
            version=1,
            status="draft",
            currency="AUD",
            subtotal=Decimal("0.00"),
            tax_total=Decimal("0.00"),
            grand_total=Decimal("0.00")
        )
        db.add(quotation)
        db.flush()  # Get the ID
        
        # Process each support and create quotation items
        items = []
        total_amount = Decimal("0.00")
        
        for support in supports:
            try:
                item_data = _process_support_item(db, support, quotation.id)
                if item_data:
                    item = QuotationItem(**item_data)
                    items.append(item)
                    db.add(item)
                    total_amount += item.line_total
                    
            except Exception as e:
                logger.error(f"Error processing support item: {str(e)}")
                # Continue with other items rather than failing completely
                continue
        
        if not items:
            db.rollback()
            raise ValueError("No valid quotation items could be created from care plan supports")
        
        # Update quotation totals using correct field names
        quotation.subtotal = total_amount
        quotation.tax_total = Decimal("0.00")  # Add tax calculation here if needed
        quotation.grand_total = total_amount
        
        # Commit the transaction
        db.commit()
        db.refresh(quotation)
        
        # Return formatted quotation data
        return _format_quotation_response(quotation, items, participant)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating quotation from care plan: {str(e)}")
        raise


def get_by_id(db: Session, quotation_id: int) -> Optional[Dict[str, Any]]:
    """Get a quotation by ID"""
    try:
        from app.models.quotation import Quotation
        from app.models.participant import Participant
        
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            return None
        
        participant = db.query(Participant).filter(Participant.id == quotation.participant_id).first()
        
        return _format_quotation_response(quotation, quotation.items, participant)
        
    except Exception as e:
        logger.error(f"Error getting quotation {quotation_id}: {str(e)}")
        return None


def list_by_participant(db: Session, participant_id: int) -> List[Dict[str, Any]]:
    """Get all quotations for a participant"""
    try:
        from app.models.quotation import Quotation
        from app.models.participant import Participant
        from sqlalchemy import desc
        
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            return []
        
        quotations = db.query(Quotation).filter(
            Quotation.participant_id == participant_id
        ).order_by(desc(Quotation.created_at)).all()
        
        return [
            _format_quotation_response(quotation, quotation.items, participant)
            for quotation in quotations
        ]
        
    except Exception as e:
        logger.error(f"Error listing quotations for participant {participant_id}: {str(e)}")
        return []


def finalise(db: Session, quotation_id: int) -> Dict[str, Any]:
    """Mark a quotation as final"""
    try:
        from app.models.quotation import Quotation
        from app.models.participant import Participant
        
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quotation:
            raise ValueError("Quotation not found")
        
        if quotation.status == "final":
            raise ValueError("Quotation is already finalised")
        
        # Update status
        quotation.status = "final"
        quotation.finalised_at = datetime.now()
        quotation.finalised_by = "System User"
        quotation.updated_at = datetime.now()
        
        db.commit()
        db.refresh(quotation)
        
        participant = db.query(Participant).filter(Participant.id == quotation.participant_id).first()
        
        return _format_quotation_response(quotation, quotation.items, participant)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error finalising quotation {quotation_id}: {str(e)}")
        raise


# ==========================================
# PRIVATE HELPER FUNCTIONS
# ==========================================

def _generate_quote_number(db: Session, participant_id: int) -> str:
    """Generate a unique quote number"""
    try:
        from app.models.quotation import Quotation
        
        # Get count of existing quotations for this participant
        count = db.query(Quotation).filter(Quotation.participant_id == participant_id).count()
        
        # Generate quote number: Q-{participant_id}-{count+1}-{timestamp}
        timestamp = datetime.now().strftime("%Y%m")
        quote_number = f"Q-{participant_id}-{count + 1}-{timestamp}"
        
        return quote_number
        
    except Exception as e:
        logger.error(f"Error generating quote number: {str(e)}")
        return f"Q-{participant_id}-{datetime.now().strftime('%Y%m%d%H%M')}"


def _process_support_item(db: Session, support: Dict[str, Any], quotation_id: int) -> Optional[Dict[str, Any]]:
    """
    Process a single support item using your dynamic data system
    """
    try:
        # Extract support details
        support_type = support.get("support_type") or support.get("supportType")
        if not support_type:
            logger.warning("Support item missing support_type")
            return None
        
        # Get pricing information from your dynamic data system
        rate_info = _get_pricing_from_dynamic_data(db, support_type)
        if not rate_info:
            logger.warning(f"No pricing found for support type: {support_type}")
            return None
        
        # Calculate quantity from duration or use provided quantity
        quantity = support.get("quantity")
        if quantity is None:
            duration = support.get("duration", "1 hour")
            quantity = _calculate_quantity_from_duration(duration)
        else:
            quantity = Decimal(str(quantity))
        
        # Calculate total
        rate = rate_info["rate"]
        total = (quantity * rate).quantize(Decimal("0.01"))
        
        # Build description
        description = _build_support_description(support, rate_info["label"])
        
        return {
            "quotation_id": quotation_id,
            "service_code": rate_info["service_code"],
            "label": description,  # Use 'label' not 'description'
            "quantity": quantity,
            "unit": rate_info["unit"],
            "rate": rate,
            "line_total": total,  # Use 'line_total' not 'total'
            "meta": {
                "original_support_data": support,
                "support_type": support_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing support item: {str(e)}")
        return None


def _get_pricing_from_dynamic_data(db: Session, support_type: str) -> Optional[Dict[str, Any]]:
    """Get pricing information from your existing dynamic data system"""
    try:
        from app.services.dynamic_data_service import DynamicDataService
        
        # Use your existing service to get pricing data
        pricing_entry = DynamicDataService.get_by_type_and_code(db, "pricing_items", support_type)
        
        if not pricing_entry:
            logger.warning(f"No pricing entry found for support type: {support_type}")
            return None
        
        if not pricing_entry.meta:
            logger.warning(f"No pricing metadata found for support type: {support_type}")
            return None
        
        meta = pricing_entry.meta
        rate = meta.get("rate")
        service_code = meta.get("service_code")
        unit = meta.get("unit")
        
        if not all([rate, service_code, unit]):
            logger.warning(f"Incomplete pricing data for {support_type}: rate={rate}, code={service_code}, unit={unit}")
            return None
        
        return {
            "service_code": service_code,
            "unit": unit, 
            "rate": Decimal(str(rate)),
            "label": pricing_entry.label
        }
        
    except Exception as e:
        logger.error(f"Error getting pricing for {support_type}: {str(e)}")
        return None


def _calculate_quantity_from_duration(duration: str) -> Decimal:
    """Convert duration string to quantity using your dynamic data"""
    try:
        # Map to your existing duration codes from seed_dynamic_data.py
        duration_mappings = {
            "15_MIN": Decimal("0.25"),
            "30_MIN": Decimal("0.5"), 
            "45_MIN": Decimal("0.75"),
            "1_HOUR": Decimal("1"),
            "1_5_HOUR": Decimal("1.5"),
            "2_HOUR": Decimal("2"),
            "3_HOUR": Decimal("3"),
            "4_HOUR": Decimal("4"),
            "HALF_DAY": Decimal("4"),
            "FULL_DAY": Decimal("8"),
            "OVERNIGHT": Decimal("12"),
            "24_HOUR": Decimal("24"),
            "SESSION": Decimal("1"),
            "VISIT": Decimal("1"),
            "ASSESSMENT": Decimal("2")
        }
        
        # Convert common strings to your duration codes
        string_to_code = {
            "15 minutes": "15_MIN",
            "30 minutes": "30_MIN",
            "45 minutes": "45_MIN", 
            "1 hour": "1_HOUR",
            "1.5 hours": "1_5_HOUR",
            "2 hours": "2_HOUR",
            "3 hours": "3_HOUR",
            "4 hours": "4_HOUR",
            "Half day": "HALF_DAY",
            "Full day": "FULL_DAY",
            "Overnight": "OVERNIGHT",
            "24 hours": "24_HOUR",
            "Session": "SESSION",
            "Visit": "VISIT",
            "Assessment": "ASSESSMENT"
        }
        
        # Try direct mapping first
        if duration in string_to_code:
            code = string_to_code[duration]
            return duration_mappings.get(code, Decimal("1"))
        
        # Try code format
        duration_code = duration.upper().replace(" ", "_").replace("-", "_")
        if duration_code in duration_mappings:
            return duration_mappings[duration_code]
        
        # Extract numeric value as fallback
        import re
        numbers = re.findall(r'\d+\.?\d*', duration.lower())
        if numbers and "hour" in duration.lower():
            return Decimal(numbers[0])
        
        return Decimal("1")
        
    except Exception as e:
        logger.error(f"Error calculating quantity from duration '{duration}': {str(e)}")
        return Decimal("1")


def _build_support_description(support: Dict[str, Any], service_label: str) -> str:
    """Build a comprehensive description for the support item"""
    description_parts = [service_label]
    
    # Add duration if specified
    duration = support.get("duration")
    if duration and duration != "Not specified":
        description_parts.append(f"Duration: {duration}")
    
    # Add frequency if specified
    frequency = support.get("frequency")
    if frequency and frequency != "Not specified":
        description_parts.append(f"Frequency: {frequency}")
    
    # Add location if specified
    location = support.get("location")
    if location and location != "Not specified":
        description_parts.append(f"Location: {location}")
    
    # Add notes if provided
    notes = support.get("notes") or support.get("support_notes")
    if notes and notes.strip():
        description_parts.append(f"Notes: {notes.strip()}")
    
    return " | ".join(description_parts) if description_parts else service_label


def _format_quotation_response(quotation, items, participant) -> Dict[str, Any]:
    """Format quotation data for API response"""
    try:
        return {
            "id": quotation.id,
            "participant_id": quotation.participant_id,
            "quote_number": quotation.quote_number,
            "title": f"Quotation for {participant.first_name} {participant.last_name}" if participant else f"Quotation {quotation.quote_number}",
            "status": quotation.status,
            "subtotal": float(quotation.subtotal),
            "total": float(quotation.grand_total),  # Use grand_total for API compatibility
            "created_at": quotation.created_at.isoformat() if quotation.created_at else "",
            "updated_at": quotation.updated_at.isoformat() if quotation.updated_at else "",
            "participant_name": f"{participant.first_name} {participant.last_name}" if participant else "",
            "items": [
                {
                    "id": item.id,
                    "service_code": item.service_code,
                    "description": item.label,  # Map label to description for API compatibility
                    "quantity": float(item.quantity),
                    "unit": item.unit,
                    "rate": float(item.rate),
                    "total": float(item.line_total),  # Map line_total to total for API compatibility
                    "meta": item.meta
                }
                for item in items
            ]
        }
    except Exception as e:
        logger.error(f"Error formatting quotation response: {str(e)}")
        return {
            "id": quotation.id,
            "error": "Error formatting quotation data"
        }