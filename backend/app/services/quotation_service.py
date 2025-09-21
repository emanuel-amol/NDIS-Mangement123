# backend/app/services/quotation_service.py - IMPROVED WITH BETTER VALIDATION
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.care_plan import CarePlan
from app.models.participant import Participant
from app.services.dynamic_data_service import DynamicDataService
import logging

logger = logging.getLogger(__name__)

GST_RATE = Decimal("0.10")  # 10% GST


def _money(x: Decimal | float | int) -> Decimal:
    """Convert to money with proper decimal precision"""
    return (Decimal(str(x))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _quote_number(participant_id: int) -> str:
    """Generate unique quote number"""
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    return f"Q-{participant_id:06d}-{ts[-6:]}"


def _index_pricing(entries: List[dict]) -> Dict[str, dict]:
    """Index pricing entries for fast lookup"""
    index: Dict[str, dict] = {}
    for e in entries:
        key = (e.get("service_code") or e.get("code") or e.get("label") or "").strip()
        if key:
            index[key] = e
    return index


def _resolve_pricing_for_support(support: dict, pricing_index: Dict[str, dict]) -> Tuple[dict, Decimal, str, str]:
    """
    Map a care plan support to pricing.
    Returns: (pricing_entry, rate, unit, service_code)
    """
    # Try multiple ways to match pricing
    candidates = []
    
    # 1. Try service_code first (most specific)
    for k in (support.get("service_code"), support.get("code")):
        if k and k in pricing_index:
            candidates.append(pricing_index[k])
    
    # 2. Try label-based matching (case-insensitive)
    if not candidates and support.get("label"):
        sl = support["label"].strip().lower()
        for v in pricing_index.values():
            if (v.get("label") or "").strip().lower() == sl:
                candidates.append(v)
                break
    
    # 3. Try partial label matching
    if not candidates and support.get("label"):
        sl = support["label"].strip().lower()
        for v in pricing_index.values():
            vl = (v.get("label") or "").strip().lower()
            if sl in vl or vl in sl:
                candidates.append(v)
                break

    if not candidates:
        available_codes = list(pricing_index.keys())[:5]
        raise ValueError(f"No pricing found for support: {support}. Available: {available_codes}")

    p = candidates[0]
    rate = _money(p.get("rate", 0))
    unit = p.get("unit", support.get("unit", "hour"))
    service_code = p.get("service_code") or p.get("code") or ""
    
    return p, rate, unit, service_code


def list_by_participant(db: Session, participant_id: int) -> List[Quotation]:
    """Get all quotations for a participant"""
    return (
        db.query(Quotation)
        .filter(Quotation.participant_id == participant_id)
        .order_by(Quotation.created_at.desc())
        .all()
    )


def get_by_id(db: Session, quotation_id: int) -> Optional[Quotation]:
    """Get quotation by ID"""
    return db.query(Quotation).filter(Quotation.id == quotation_id).first()


def finalise(db: Session, quotation_id: int, by_user: str = "system") -> Quotation:
    """Mark quotation as final and lock it"""
    q = get_by_id(db, quotation_id)
    if not q:
        raise ValueError("Quotation not found")
    if q.status == QuotationStatus.final:
        return q
    
    q.status = QuotationStatus.final
    q.finalised_at = datetime.utcnow()
    q.finalised_by = by_user
    db.add(q)
    db.commit()
    db.refresh(q)
    
    logger.info(f"Finalised quotation {q.quote_number}")
    return q


def generate_from_care_plan(db: Session, participant_id: int) -> Quotation:
    """
    Generate quotation from a finalised care plan.
    
    IMPROVED VALIDATION:
    1. Verify participant exists and is valid
    2. Get finalised care plan (strict checking)
    3. Validate care plan has supports
    4. Fetch and validate pricing data
    5. Match supports to pricing
    6. Calculate totals
    7. Create and persist quotation
    """
    try:
        # 1) Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError(f"Participant with ID {participant_id} not found")
        
        logger.info(f"Generating quotation for participant {participant_id} ({participant.first_name} {participant.last_name})")

        # 2) Get finalised care plan with strict validation
        care_plans = (
            db.query(CarePlan)
            .filter(CarePlan.participant_id == participant_id)
            .order_by(CarePlan.id.desc())
            .all()
        )
        
        if not care_plans:
            raise ValueError(f"No care plan found for participant {participant_id}. A care plan must be created and finalised before generating a quotation.")
        
        # Find the most recent finalized care plan
        finalized_plan = None
        for plan in care_plans:
            if getattr(plan, 'is_finalised', False):
                finalized_plan = plan
                break
        
        if not finalized_plan:
            most_recent = care_plans[0]
            raise ValueError(
                f"Care plan must be finalised before generating a quotation. "
                f"Found care plan '{most_recent.plan_name}' (ID: {most_recent.id}) but it is not finalised. "
                f"Please finalise the care plan first."
            )
        
        logger.info(f"Using finalised care plan: {finalized_plan.plan_name} (ID: {finalized_plan.id})")

        # 3) Validate care plan has supports
        supports: List[dict] = (finalized_plan.supports or [])
        if not supports:
            raise ValueError(
                f"Care plan '{finalized_plan.plan_name}' has no support items to price. "
                f"Please add support items to the care plan before generating a quotation."
            )

        logger.info(f"Care plan has {len(supports)} support items")

        # 4) Fetch and validate pricing from dynamic data
        pricing_entries = DynamicDataService.list_by_type(db, "pricing_items", active_only=True)
        if not pricing_entries:
            raise ValueError(
                "No pricing items found in the system. "
                "Please configure pricing items in the dynamic data before generating quotations. "
                "Contact your system administrator."
            )

        logger.info(f"Found {len(pricing_entries)} pricing items")

        # Convert pricing entries to expected format
        pricing_rows: List[dict] = []
        for e in pricing_entries:
            pricing_rows.append({
                "code": e.code,
                "label": e.label,
                "service_code": (e.meta or {}).get("service_code", e.code),
                "rate": (e.meta or {}).get("rate", 0),
                "unit": (e.meta or {}).get("unit", "hour"),
                "meta": e.meta or {},
            })
        
        pricing_index = _index_pricing(pricing_rows)
        logger.info(f"Indexed pricing for {len(pricing_index)} service codes")

        # 5) Build quotation items and calculate totals
        items: List[QuotationItem] = []
        subtotal = Decimal("0.00")
        pricing_snapshot: Dict[str, dict] = {}
        skipped_items = []

        for i, support in enumerate(supports):
            logger.debug(f"Processing support item {i+1}: {support}")
            
            # Validate support item structure
            if not isinstance(support, dict):
                logger.warning(f"Skipping invalid support item {i+1}: not a dictionary")
                skipped_items.append(f"Item {i+1}: Invalid format")
                continue
            
            # Check quantity
            qty = support.get("quantity", 0)
            try:
                qty = _money(qty)
            except (ValueError, TypeError):
                logger.warning(f"Skipping support item {i+1}: invalid quantity '{qty}'")
                skipped_items.append(f"Item {i+1}: Invalid quantity")
                continue
                
            if qty <= 0:
                logger.debug(f"Skipping support item {i+1}: zero quantity")
                skipped_items.append(f"Item {i+1}: Zero quantity")
                continue
                
            try:
                pricing_entry, rate, unit, service_code = _resolve_pricing_for_support(support, pricing_index)
                
                if rate <= 0:
                    logger.warning(f"Skipping support item {i+1}: zero rate for {service_code}")
                    skipped_items.append(f"Item {i+1}: Zero rate")
                    continue
                
                line_total = (rate * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                
                item = QuotationItem(
                    service_code=service_code,
                    label=support.get("label") or pricing_entry.get("label") or service_code,
                    unit=unit,
                    quantity=qty,
                    rate=rate,
                    line_total=line_total,
                    meta=pricing_entry.get("meta") or {},
                )
                
                items.append(item)
                pricing_snapshot[service_code] = pricing_entry
                subtotal += line_total
                
                logger.debug(f"Added item: {service_code} x {qty} @ ${rate} = ${line_total}")
                
            except ValueError as e:
                logger.warning(f"Skipping support item {i+1}: {str(e)}")
                skipped_items.append(f"Item {i+1}: {str(e)}")
                continue

        # Check if we have any billable items
        if not items:
            error_msg = f"No billable items could be resolved from the care plan. "
            if skipped_items:
                error_msg += f"Issues found: {'; '.join(skipped_items[:3])}"
                if len(skipped_items) > 3:
                    error_msg += f" and {len(skipped_items) - 3} more"
            else:
                error_msg += "All support items were invalid or had zero quantities."
            raise ValueError(error_msg)

        logger.info(f"Created {len(items)} billable items, subtotal: ${subtotal}")
        if skipped_items:
            logger.info(f"Skipped {len(skipped_items)} items: {'; '.join(skipped_items[:3])}")

        # 6) Calculate tax and totals
        tax_total = (subtotal * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        grand_total = subtotal + tax_total

        logger.info(f"Calculated totals - Subtotal: ${subtotal}, Tax: ${tax_total}, Total: ${grand_total}")

        # 7) Create and persist quotation
        quote_number = _quote_number(participant_id)
        
        quotation = Quotation(
            participant_id=participant_id,
            quote_number=quote_number,
            version=1,
            status=QuotationStatus.draft,
            currency="AUD",
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
            pricing_snapshot=pricing_snapshot,
            care_plan_snapshot={
                "id": finalized_plan.id,
                "plan_name": finalized_plan.plan_name,
                "plan_version": finalized_plan.plan_version,
                "supports": finalized_plan.supports,
                "finalised_at": finalized_plan.finalised_at.isoformat() if finalized_plan.finalised_at else None,
            },
            valid_from=datetime.utcnow().date(),
            valid_to=(datetime.utcnow() + timedelta(days=30)).date(),
        )
        
        db.add(quotation)
        db.flush()  # Get quotation.id

        # Add items with quotation_id
        for item in items:
            item.quotation_id = quotation.id
            db.add(item)

        db.commit()
        db.refresh(quotation)
        
        logger.info(f"Successfully generated quotation {quote_number} (ID: {quotation.id}) for participant {participant_id}")
        return quotation
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating quotation for participant {participant_id}: {str(e)}")
        raise