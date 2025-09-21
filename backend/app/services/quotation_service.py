from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta

from app.models.quotation import Quotation, QuotationItem, QuotationStatus
from app.schemas.quotation import QuotationResponse
from app.core import config

# === Imports you likely already have: ===
# Dynamic Data (pricing_items) — adjust to your actual model/service names:
# Common patterns seen in your repo history:
#   from app.models.dynamic_data import DynamicDataPoint, DynamicDataType
#   OR
#   from app.services.dynamic_data_service import get_entries_by_type
#
# Care Plan & Workflow — adjust to your actual names:
#   from app.models.care_plan import CarePlan, ProspectiveWorkflow
#
# Replace with the correct imports in your codebase.
from app.services.dynamic_data_service import get_entries_by_type  # TODO: confirm path/name
from app.models.care_plan import CarePlan, ProspectiveWorkflow      # TODO: confirm path/name


def _generate_quote_number(db: Session, participant_id: int) -> str:
    """Simple sequential number, e.g., Q-000123. Replace with your own strategy if needed."""
    # Count existing quotations to increment
    count = db.execute(select(Quotation).where(Quotation.participant_id == participant_id)).scalars().all()
    seq = len(count) + 1
    return f"Q-{participant_id:06d}-{seq:02d}"


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
        if code:
            idx[code] = row
    return idx


def _resolve_pricing_for_support(support: dict, pricing_index: Dict[str, dict]) -> Tuple[dict, Decimal, Decimal, str, str]:
    """
    Map one Care Plan support to a pricing entry.
    The support JSON should include either:
      - service_code   (preferred, exact code to match), or
      - code, or
      - label (fallback if code not present; you may implement a label-based search if needed)
    And a requested 'quantity' (hours/sessions).
    """
    quantity = Decimal(str(support.get("quantity", 0)))
    # Try strict code match first
    key = support.get("service_code") or support.get("code")
    pricing = None
    if key and key in pricing_index:
        pricing = pricing_index[key]

    # Optional: fallback by label (case-insensitive)
    if not pricing:
        label = (support.get("label") or "").strip().lower()
        if label:
            for row in pricing_index.values():
                if (row.get("label") or "").strip().lower() == label:
                    pricing = row
                    break

    if not pricing:
        raise ValueError(f"Unable to resolve pricing for support: {support}")

    rate = Decimal(str(pricing.get("rate", 0)))
    unit = pricing.get("unit") or "unit"
    label = pricing.get("label") or (support.get("label") or "Item")
    service_code = pricing.get("code") or key or "UNKNOWN"

    line_total = (quantity * rate).quantize(Decimal("0.01"))
    return pricing, quantity, rate, unit, service_code, label, line_total


def generate_from_care_plan(db: Session, participant_id: int) -> Quotation:
    """
    Build and persist a quotation from a **finalised** care plan, using dynamic_data 'pricing_items'.
    """
    # 1) Fetch finalised care plan for participant (adjust filter/field names to your schema)
    care_plan = db.execute(
        select(CarePlan).where(
            CarePlan.participant_id == participant_id,
            CarePlan.is_finalised == True  # TODO: adapt if your finalisation flag differs
        )
    ).scalars().first()

    if not care_plan:
        raise ValueError("No finalised care plan found for participant.")

    # Expect care plan supports as structured JSON (e.g., list of items with quantity and code/label)
    supports: List[dict] = care_plan.supports or []
    if not supports:
        raise ValueError("Care plan has no supports to quote.")

    # 2) Pull pricing from dynamic data (no mock; use your existing seed & admin-managed data)
    # The repo already seeds/maintains a type like 'pricing_items' — adjust type key if different.
    pricing_rows = get_entries_by_type(db, type_code="pricing_items")  # returns list[dict]
    if not pricing_rows:
        raise ValueError("No pricing_items found in Dynamic Data. Seed or configure Admin > Dynamic Data.")

    pricing_index = _index_pricing_by_code(pricing_rows)

    # 3) Compute items and totals
    items: List[QuotationItem] = []
    subtotal = Decimal("0.00")
    pricing_snapshot = {}
    for support in supports:
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
    return quotation


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
