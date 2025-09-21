# backend/app/services/quotation_service.py - FIXED SYNTAX ERROR
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta

from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas.quotation import QuotationResponse
from app.models.care_plan import CarePlan, ProspectiveWorkflow
from app.services.dynamic_data_service import DynamicDataService
import logging

logger = logging.getLogger(__name__)


def _generate_quote_number(db: Session, participant_id: int) -> str:
    """Simple sequential number, e.g., Q-000123. Replace with your own strategy if needed."""
    # Count existing quotations to increment
    count = db.execute(select(Quotation).where(Quotation.participant_id == participant_id)).scalars().all()
    seq = len(count) + 1
    return f"Q-{participant_id:06d}-{seq:02d}"


def _convert_dynamic_data_to_dict(pricing_items: List) -> List[Dict]:
    """Convert DynamicData objects to dictionaries for processing"""
    pricing_dicts = []
    for item in pricing_items:
        if hasattr(item, '__dict__'):
            # It's a SQLAlchemy model object
            pricing_dict = {
                'code': item.code,
                'label': item.label,
                'meta': item.meta or {}
            }
            # Extract rate and unit from meta if available
            if item.meta:
                pricing_dict['rate'] = item.meta.get('rate', 0)
                pricing_dict['unit'] = item.meta.get('unit', 'hour')  # FIXED: Added missing opening bracket
                pricing_dict['service_code'] = item.meta.get('service_code', item.code)
            else:
                pricing_dict['rate'] = 0
                pricing_dict['unit'] = 'hour'
                pricing_dict['service_code'] = item.code
        else:
            # It's already a dictionary
            pricing_dict = item
        
        pricing_dicts.append(pricing_dict)
    
    return pricing_dicts


def _index_pricing_by_code(pricing_rows: List[dict]) -> Dict[str, dict]:
    """
    Build an index mapping service_code -> pricing row.
    Expect each pricing row to include:
      - code (e.g., "01_011_0107_1_1")
      - label
      - unit
      - rate
      - meta (optional)
    """
    idx = {}
    for row in pricing_rows:
        code = (row.get("code") or "").strip()
        service_code = row.get("service_code") or code
        if code:
            idx[code] = row
        if service_code and service_code != code:
            idx[service_code] = row
    return idx


def _resolve_pricing_for_support(support: dict, pricing_index: Dict[str, dict]) -> Tuple[dict, Decimal, Decimal, str, str, str, Decimal]:
    """
    Map one Care Plan support to a pricing entry.
    Returns: (pricing, quantity, rate, unit, service_code, label, line_total)
    """
    quantity = Decimal(str(support.get("quantity", 0)))
    
    # Try multiple ways to match pricing
    pricing = None
    key = None
    
    # Try service_code first (most specific)
    if support.get("service_code"):
        key = support["service_code"]
        pricing = pricing_index.get(key)
    
    # Try code next
    if not pricing and support.get("code"):
        key = support["code"]
        pricing = pricing_index.get(key)
    
    # Try label-based matching (case-insensitive)
    if not pricing and support.get("label"):
        support_label = support["label"].strip().lower()
        for pricing_key, pricing_row in pricing_index.items():
            if (pricing_row.get("label") or "").strip().lower() == support_label:
                pricing = pricing_row
                key = pricing_key
                break
    
    # Try partial label matching as last resort
    if not pricing and support.get("label"):
        support_label = support["label"].strip().lower()
        for pricing_key, pricing_row in pricing_index.items():
            pricing_label = (pricing_row.get("label") or "").strip().lower()
            if support_label in pricing_label or pricing_label in support_label:
                pricing = pricing_row
                key = pricing_key
                logger.warning(f"Using partial match for support '{support_label}' -> '{pricing_label}'")
                break

    if not pricing:
        available_codes = list(pricing_index.keys())[:5]  # Show first 5 for debugging
        raise ValueError(f"Unable to resolve pricing for support: {support}. Available codes: {available_codes}")

    rate = Decimal(str(pricing.get("rate", 0)))
    unit = pricing.get("unit") or "hour"
    label = pricing.get("label") or (support.get("label") or "Item")
    service_code = pricing.get("service_code") or pricing.get("code") or key or "UNKNOWN"

    line_total = (quantity * rate).quantize(Decimal("0.01"))
    return pricing, quantity, rate, unit, service_code, label, line_total


def generate_from_care_plan(db: Session, participant_id: int) -> Quotation:
    """
    Build and persist a quotation from a **finalised** care plan, using dynamic_data 'pricing_items'.
    """
    try:
        # 1) Fetch finalised care plan for participant
        care_plan = db.execute(
            select(CarePlan).where(
                CarePlan.participant_id == participant_id,
                CarePlan.is_finalised == True
            )
        ).scalars().first()

        if not care_plan:
            # Check if any care plan exists (even if not finalised)
            any_care_plan = db.execute(
                select(CarePlan).where(CarePlan.participant_id == participant_id)
            ).scalars().first()
            
            if any_care_plan:
                raise ValueError("Care plan exists but is not finalised. Please finalise the care plan before generating a quotation.")
            else:
                raise ValueError("No care plan found for participant.")

        # Expect care plan supports as structured JSON
        supports: List[dict] = care_plan.supports or []
        if not supports:
            raise ValueError("Care plan has no supports to quote.")

        # 2) Pull pricing from dynamic data
        pricing_items = DynamicDataService.get_pricing_items(db, active_only=True)
        if not pricing_items:
            raise ValueError("No pricing_items found in Dynamic Data. Please configure pricing in Admin > Dynamic Data.")

        # Convert to dictionaries for processing
        pricing_rows = _convert_dynamic_data_to_dict(pricing_items)
        pricing_index = _index_pricing_by_code(pricing_rows)

        # 3) Compute items and totals
        items: List[QuotationItem] = []
        subtotal = Decimal("0.00")
        pricing_snapshot = {}
        
        for support in supports:
            try:
                pricing, quantity, rate, unit, service_code, label, line_total = _resolve_pricing_for_support(support, pricing_index)

                items.append(QuotationItem(
                    service_code=service_code,
                    label=label,
                    unit=unit,
                    quantity=quantity,
                    rate=rate,
                    line_total=line_total,
                    meta=pricing.get("meta") or {}
                ))

                subtotal += line_total
                pricing_snapshot[service_code] = pricing
                
            except ValueError as e:
                logger.error(f"Error processing support {support}: {str(e)}")
                # Skip this support item but continue with others
                continue

        if not items:
            raise ValueError("No valid pricing found for any support items in the care plan.")

        subtotal = subtotal.quantize(Decimal("0.01"))

        # 4) Tax calculation — if not applicable, keep 0
        tax_total = Decimal("0.00")
        grand_total = (subtotal + tax_total).quantize(Decimal("0.01"))

        # 5) Determine version + quote number
        quote_number = _generate_quote_number(db, participant_id)

        # Optional validity window: 30 days from now
        valid_from = datetime.utcnow()
        valid_to = valid_from + timedelta(days=30)

        # 6) Persist quotation
        quotation = Quotation(
            participant_id=participant_id,
            care_plan_id=care_plan.id,
            quote_number=quote_number,
            version=1,  # bump if you regenerate logic supports versioning
            status=QuotationStatus.draft,
            currency="AUD",
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
            pricing_snapshot=pricing_snapshot,
            care_plan_snapshot={"supports": supports},
            valid_from=valid_from,
            valid_to=valid_to,
        )
        db.add(quotation)
        db.flush()  # get quotation.id

        for item in items:
            item.quotation_id = quotation.id
            db.add(item)

        # 7) Flip workflow flag (if present in your schema)
        workflow = db.execute(
            select(ProspectiveWorkflow).where(ProspectiveWorkflow.participant_id == participant_id)
        ).scalars().first()
        if workflow:
            workflow.quotation_generated = True
            workflow.quotation_generated_date = datetime.utcnow()
            db.add(workflow)

        db.commit()
        db.refresh(quotation)
        
        logger.info(f"Successfully generated quotation {quotation.quote_number} for participant {participant_id}")
        return quotation
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating quotation for participant {participant_id}: {str(e)}")
        raise


def list_by_participant(db: Session, participant_id: int) -> List[Quotation]:
    return db.execute(
        select(Quotation).where(Quotation.participant_id == participant_id).order_by(Quotation.created_at.desc())
    ).scalars().all()


def get_by_id(db: Session, quotation_id: int) -> Optional[Quotation]:
    return db.execute(select(Quotation).where(Quotation.id == quotation_id)).scalars().first()


def finalise(db: Session, quotation_id: int) -> Quotation:
    quotation = get_by_id(db, quotation_id)
    if not quotation:
        raise ValueError("Quotation not found.")
    quotation.status = QuotationStatus.final
    db.add(quotation)
    db.commit()
    db.refresh(quotation)
    return quotation


# Add the missing function that the quotation service expects
def get_entries_by_type(db: Session, type_code: str, active_only: bool = True) -> List[Dict]:
    """
    Get dynamic data entries by type and return as list of dictionaries.
    This function is specifically for the quotation service compatibility.
    """
    entries = DynamicDataService.list_by_type(db, type_code, active_only)
    
    # Convert SQLAlchemy objects to dictionaries
    result = []
    for entry in entries:
        entry_dict = {
            'id': entry.id,
            'type': entry.type,
            'code': entry.code,
            'label': entry.label,
            'is_active': entry.is_active,
            'meta': entry.meta or {}
        }
        
        # For pricing items, extract common fields from meta
        if entry.type == 'pricing_items' and entry.meta:
            entry_dict['rate'] = entry.meta.get('rate', 0)
            entry_dict['unit'] = entry.meta.get('unit', 'hour')
            entry_dict['service_code'] = entry.meta.get('service_code', entry.code)
        else:
            # Default values if not in meta
            entry_dict['rate'] = 0
            entry_dict['unit'] = 'hour'
            entry_dict['service_code'] = entry.code
            
        result.append(entry_dict)
    
    return result