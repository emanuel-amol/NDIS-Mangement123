# backend/app/services/quotation_service.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc
import logging

from app.services.support_mapping_service import SupportMappingService

logger = logging.getLogger(__name__)


def _D(x: Any) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"))


# ------------------------- Builders -------------------------

def _build_item_from_support(db: Session, qid: int, support: Dict[str, Any]):
    """
    support dict is expected to contain (as emitted by UI or CarePlan):
      support_type, frequency, duration, location, staff_ratio, notes, quantity?,
      pricing_code? (optional override)
    """
    st = support.get("support_type") or support.get("supportType") or support.get("service_name")
    freq = support.get("frequency")
    dur = support.get("duration")
    loc = support.get("location")
    ratio = support.get("staff_ratio") or support.get("staffRatio")
    notes = support.get("notes") or support.get("support_notes")
    explicit_qty = support.get("quantity")
    pricing_code = support.get("pricing_code")

    info = SupportMappingService.get_pricing_info(db, st, pricing_code=pricing_code, label_like=st)
    if not info:
        raise ValueError(f"No pricing item found for '{st}'")

    meta = info.get("meta", {}) or {}
    unit = meta.get("unit") or "hour"
    service_code = meta.get("service_code")
    if not service_code:
        raise ValueError(f"Pricing item for '{st}' missing service_code")

    rate = SupportMappingService.get_rate(db, st, freq, dur, pricing_code=pricing_code, label_like=st)
    if rate is None:
        raise ValueError(f"No rate found for '{st}'")

    qty = SupportMappingService.compute_quantity(quantity=explicit_qty, duration=dur, unit=unit)
    total = _D(Decimal(str(qty)) * Decimal(str(rate)))

    from app.models.quotation import QuotationItem  # local import to avoid cycles

    return QuotationItem(
        quotation_id=qid,
        service_code=service_code,
        description=SupportMappingService.get_service_description(
            support_type=st,
            duration=dur,
            frequency=freq,
            location=loc,
            staff_ratio=ratio,
            notes=notes,
            db=db,
            pricing_code=pricing_code,
        ),
        quantity=Decimal(str(qty)),
        unit=unit,
        rate=_D(rate),
        total=total,
        meta={
            "original_support_data": support,
            "support_type": st,
            "frequency": freq,
            "duration": dur,
            "location": loc,
            "staff_ratio": ratio,
        },
    )


# ------------------------- Public API -------------------------

def create_from_supports(
    db: Session,
    *,
    participant_id: int,
    supports: List[Dict[str, Any]],
    title: Optional[str] = None,
    notes: Optional[str] = None,
):
    from app.models.quotation import Quotation  # local import to avoid cycles
    from app.models.participant import Participant

    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise ValueError(f"Participant {participant_id} not found")

    quotation = Quotation(
        participant_id=participant.id,
        title=title or "Quotation",
        notes=notes or "",
        status="draft",
    )
    db.add(quotation)
    db.flush()

    items = []
    for s in supports or []:
        item = _build_item_from_support(db, quotation.id, s)
        items.append(item)
        db.add(item)

    subtotal = sum((i.total for i in items), Decimal("0.00"))
    quotation.subtotal = _D(subtotal)
    quotation.total = _D(subtotal)

    db.commit()
    db.refresh(quotation)
    return quotation


def generate_from_care_plan(
    db: Session,
    *,
    participant_id: int,
    title: Optional[str] = None,
    notes: Optional[str] = None,
):
    supports = SupportMappingService.get_supports_from_active_care_plan(db, participant_id)
    if not supports:
        raise ValueError("No supports found in active care plan")
    return create_from_supports(
        db,
        participant_id=participant_id,
        supports=supports,
        title=title or "Quotation from Care Plan",
        notes=notes or "",
    )


def get(db: Session, quotation_id: int):
    from app.models.quotation import Quotation
    q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not q:
        raise ValueError(f"Quotation {quotation_id} not found")
    return q


def list_by_participant(db: Session, *, participant_id: int):
    from app.models.quotation import Quotation
    return (
        db.query(Quotation)
        .filter(Quotation.participant_id == participant_id)
        .order_by(desc(Quotation.created_at))
        .all()
    )
