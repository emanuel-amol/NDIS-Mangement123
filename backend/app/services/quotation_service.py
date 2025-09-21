# backend/app/services/quotation_service.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.services.support_mapping_service import SupportMappingService
from app.models.user import User  # if your repo doesn’t use this, it’s safe to remove
from app.models.referral import Referral  # same note as above
from app.models.quotation import Quotation, QuotationItem  # ORM models in your repo
from app.models.participant import Participant  # ORM model
from app.core.errors import NotFoundError  # if not present, replace with ValueError
from app.core.logging import logger  # if not present, replace with standard logging

# ---------- Helpers ----------

def _ensure_participant(db: Session, participant_id: int) -> Participant:
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise NotFoundError(f"Participant {participant_id} not found")  # or ValueError
    return participant


def _calc_rate_and_code(
    db: Session,
    support_type: str,
    frequency: Optional[str],
    duration: Optional[str],
) -> Tuple[Decimal, str, str]:
    """
    Returns (rate, unit, service_code) from dynamic catalogue.
    Raises if not found.
    """
    pricing = SupportMappingService.get_pricing_info(db, support_type)
    rate = SupportMappingService.get_rate(db, support_type, frequency, duration)

    unit = (pricing or {}).get("meta", {}).get("unit")
    code = (pricing or {}).get("meta", {}).get("service_code")

    if rate is None or code is None or unit is None:
        raise ValueError(
            f"No dynamic pricing available for support_type='{support_type}', "
            f"frequency='{frequency}', duration='{duration}'. Seed dynamic data first."
        )

    # Normalize to Decimal
    if not isinstance(rate, Decimal):
        rate = Decimal(str(rate))

    return rate, unit, code


def _build_description(
    support_type: str,
    duration: Optional[str],
    frequency: Optional[str],
    location: Optional[str],
    staff_ratio: Optional[str],
    notes: Optional[str],
) -> str:
    return SupportMappingService.get_service_description(
        support_type=support_type,
        duration=duration,
        frequency=frequency,
        location=location,
        staff_ratio=staff_ratio,
        notes=notes or "",
    )


def _to_quantity(duration_hours: Optional[str]) -> Decimal:
    """
    Converts duration like '6 hours' -> Decimal('2') when the UI already passes quantity,
    but if only 'duration' exists, estimate quantity from hours. Your UI passes quantity
    as 'number of hours', so map as follows:
      - '6 hours' => 2h used in screenshot (quantity column)
    This function defers to SupportMappingService if your mapping differs.
    """
    if not duration_hours:
        return Decimal("1")
    # pull numeric part
    try:
        hours = Decimal(str(duration_hours).split()[0])
    except Exception:
        return Decimal("1")
    # Quantity is hours for hourly units
    return hours


# ---------- Public API ----------

def create_quotation_from_supports(
    db: Session,
    *,
    participant_id: int,
    supports: List[Dict[str, Any]],
    created_by: Optional[int] = None,
    title: Optional[str] = None,
    notes: Optional[str] = None,
) -> Quotation:
    """
    Build a quotation from frontend-provided supports array (each support item comes
    from the Supports & Services widget). Uses ONLY dynamic catalogue (no fallbacks).
    """
    participant = _ensure_participant(db, participant_id)

    quotation = Quotation(
        participant_id=participant.id,
        title=title or "Quotation",
        notes=notes or "",
        status="draft",
    )
    db.add(quotation)
    db.flush()  # get quotation.id

    items: List[QuotationItem] = []

    for s in supports:
        support_type = s.get("support_type") or s.get("supportType")
        frequency = s.get("frequency")
        duration = s.get("duration")
        location = s.get("location")
        staff_ratio = s.get("staff_ratio") or s.get("staffRatio")
        quantity = s.get("quantity")

        # resolve rate and service code from dynamic data
        rate, unit, service_code = _calc_rate_and_code(db, support_type, frequency, duration)

        # derive quantity if UI didn’t pass explicit number
        if quantity is None:
            quantity = _to_quantity(duration)

        description = _build_description(
            support_type=support_type,
            duration=duration,
            frequency=frequency,
            location=location,
            staff_ratio=staff_ratio,
            notes=s.get("notes") or s.get("support_notes"),
        )

        total = (Decimal(str(quantity)) * rate).quantize(Decimal("0.01"))

        item = QuotationItem(
            quotation_id=quotation.id,
            service_code=service_code,
            description=description,
            quantity=Decimal(str(quantity)),
            unit=unit,
            rate=rate,
            total=total,
            meta={
                "original_support_data": s,
                "support_type": support_type,
                "frequency": frequency,
                "duration": duration,
                "location": location,
                "staff_ratio": staff_ratio,
            },
        )
        items.append(item)
        db.add(item)

    # compute quotation totals
    subtotal = sum((i.total for i in items), Decimal("0.00"))
    quotation.subtotal = subtotal
    quotation.total = subtotal  # add taxes/fees here if applicable

    db.commit()
    db.refresh(quotation)
    return quotation


def create_quotation_from_care_plan(
    db: Session,
    *,
    participant_id: int,
    created_by: Optional[int] = None,
    title: Optional[str] = None,
    notes: Optional[str] = None,
) -> Quotation:
    """
    Alternative path used by the endpoint:
    /api/v1/quotations/participants/{id}/generate-from-care-plan

    Pulls supports from the participant’s active care plan (where your existing
    code currently fed the old DEFAULT_RATES). The only difference here is that
    we route every line through dynamic catalogue resolution.
    """
    participant = _ensure_participant(db, participant_id)

    # Expect your care plan accessor to return a list of support dicts compatible with the UI.
    supports = SupportMappingService.get_supports_from_active_care_plan(db, participant_id)
    if not supports:
        raise ValueError("No supports found in active care plan")

    return create_quotation_from_supports(
        db,
        participant_id=participant.id,
        supports=supports,
        created_by=created_by,
        title=title or "Quotation from Care Plan",
        notes=notes or "",
    )
