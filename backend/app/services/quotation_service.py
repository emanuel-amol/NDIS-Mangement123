# backend/app/services/quotation_service.py - COMPLETE IMPLEMENTATION
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.models.care_plan import CarePlan
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
    return f"Q-{participant_id}-{ts}"


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
    
    Process:
    1. Get finalised care plan for participant
    2. Fetch pricing from dynamic data
    3. Match supports to pricing
    4. Calculate totals
    5. Create and persist quotation
    """
    try:
        # 1) Get finalised care plan
        cp: CarePlan | None = (
            db.query(CarePlan)
            .filter(CarePlan.participant_id == participant_id)
            .filter(CarePlan.is_finalised == True)
            .order_by(CarePlan.id.desc())
            .first()
        )
        if not cp:
            raise ValueError("Care plan must be finalised before generating a quotation")

        supports: List[dict] = (cp.supports or [])
        if not supports:
            raise ValueError("Care plan has no supports to price")

        # 2) Fetch pricing from dynamic data
        pricing_entries = DynamicDataService.list_by_type(db, "pricing_items", active_only=True)
        if not pricing_entries:
            raise ValueError("No pricing_items found in dynamic data. Please configure pricing.")

        # Convert to dicts with expected fields
        rows: List[dict] = []
        for e in pricing_entries:
            rows.append({
                "code": e.code,
                "label": e.label,
                "service_code": (e.meta or {}).get("service_code", e.code),
                "rate": (e.meta or {}).get("rate", 0),
                "unit": (e.meta or {}).get("unit", "hour"),
                "meta": e.meta or {},
            })
        px = _index_pricing(rows)

        # 3) Build items and calculate totals
        items: List[QuotationItem] = []
        subtotal = Decimal("0.00")
        pricing_snapshot: Dict[str, dict] = {}

        for s in supports:
            # Expected shape: {"code","label","quantity","unit","service_code"?}
            qty = _money(s.get("quantity", 0))
            if qty <= 0:
                continue  # Skip zero quantities
                
            try:
                p, rate, unit, service_code = _resolve_pricing_for_support(s, px)
                line_total = (rate * qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                
                items.append(QuotationItem(
                    service_code=service_code,
                    label=s.get("label") or p.get("label") or service_code,
                    unit=unit,
                    quantity=qty,
                    rate=rate,
                    line_total=line_total,
                    meta=p.get("meta") or {},
                ))
                
                pricing_snapshot[service_code] = p
                subtotal += line_total
                
            except ValueError as e:
                logger.warning(f"Skipping support item: {e}")
                continue

        if not items:
            raise ValueError("No billable items resolved from the care plan")

        # 4) Calculate tax and totals
        tax_total = (subtotal * GST_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        grand_total = subtotal + tax_total

        # 5) Create and persist quotation
        q = Quotation(
            participant_id=participant_id,
            quote_number=_quote_number(participant_id),
            version=1,
            status=QuotationStatus.draft,
            currency="AUD",
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
            pricing_snapshot=pricing_snapshot,
            care_plan_snapshot={
                "id": cp.id,
                "plan_name": cp.plan_name,
                "supports": cp.supports,
            },
            valid_from=datetime.utcnow().date(),
            valid_to=(datetime.utcnow() + timedelta(days=30)).date(),
        )
        
        db.add(q)
        db.flush()  # Get q.id

        # Add items
        for it in items:
            it.quotation_id = q.id
            db.add(it)

        db.commit()
        db.refresh(q)
        
        logger.info(f"Generated quotation {q.quote_number} for participant {participant_id}")
        return q
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error generating quotation: {str(e)}")
        raise