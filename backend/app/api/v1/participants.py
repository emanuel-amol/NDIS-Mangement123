# backend/app/api/v1/participants.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import Dict, List
from datetime import datetime
import uuid

# IMPORTANT:
# This file should NOT manage referrals.
# Referrals are handled by app/api/v1/referrals.py using DB + ReferralService.

from app.schemas.participant import (
    CarePlanCreate,
    CarePlanResponse,
    RiskAssessmentCreate,
    RiskAssessmentResponse,
    ParticipantCreate,
    ParticipantResponse,
    ParticipantStatus,
)

router = APIRouter()

# -----------------------------
# In-memory storage (temporary)
# -----------------------------
care_plans_db: Dict[str, dict] = {}
risk_assessments_db: Dict[str, dict] = {}
participants_db: Dict[str, dict] = {}

# ====== CARE PLANS ======

@router.post(
    "/care-plans",
    response_model=CarePlanResponse,
    status_code=201,
    name="create_care_plan",
)
async def create_care_plan(care_plan: CarePlanCreate) -> CarePlanResponse:
    """
    Create a care plan for a participant.
    NOTE: This is an in-memory stub. Replace with DB when ready.
    """
    care_plan_id = str(uuid.uuid4())
    now = datetime.now()

    data = {
        "id": care_plan_id,
        **care_plan.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    care_plans_db[care_plan_id] = data
    return CarePlanResponse(**data)


@router.get(
    "/care-plans",
    response_model=List[CarePlanResponse],
    name="list_care_plans",
)
async def list_care_plans() -> List[CarePlanResponse]:
    """Get all care plans (in-memory)."""
    return [CarePlanResponse(**cp) for cp in care_plans_db.values()]

# ====== RISK ASSESSMENTS ======

@router.post(
    "/risk-assessments",
    response_model=RiskAssessmentResponse,
    status_code=201,
    name="create_risk_assessment",
)
async def create_risk_assessment(risk_assessment: RiskAssessmentCreate) -> RiskAssessmentResponse:
    """
    Create a risk assessment for a participant.
    NOTE: This is an in-memory stub. Replace with DB when ready.
    """
    assessment_id = str(uuid.uuid4())
    now = datetime.now()

    data = {
        "id": assessment_id,
        **risk_assessment.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    risk_assessments_db[assessment_id] = data
    return RiskAssessmentResponse(**data)


@router.get(
    "/risk-assessments",
    response_model=List[RiskAssessmentResponse],
    name="list_risk_assessments",
)
async def list_risk_assessments() -> List[RiskAssessmentResponse]:
    """Get all risk assessments (in-memory)."""
    return [RiskAssessmentResponse(**ra) for ra in risk_assessments_db.values()]

# ====== PARTICIPANT ONBOARDING ======

@router.post(
    "/onboard",
    response_model=ParticipantResponse,
    status_code=201,
    name="onboard_participant",
)
async def onboard_participant(participant_data: ParticipantCreate) -> ParticipantResponse:
    """
    Convert a PROSPECTIVE referral into an ONBOARDED participant.
    NOTE: This uses in-memory storage. Replace with DB service when ready.
    """
    # In the real flow, you'd verify the referral exists and is PROSPECTIVE in the DB.
    participant_id = str(uuid.uuid4())
    now = datetime.now()

    participant = {
        "id": participant_id,
        "referral_id": participant_data.referral_id,
        "status": ParticipantStatus.ONBOARDED,
        "care_plan_id": None,
        "risk_assessment_id": None,
        "created_at": now,
        "updated_at": now,
    }
    participants_db[participant_id] = participant
    return ParticipantResponse(**participant)


@router.get(
    "/participants",
    response_model=List[ParticipantResponse],
    name="list_participants",
)
async def list_participants() -> List[ParticipantResponse]:
    """Get all onboarded participants (in-memory)."""
    return [ParticipantResponse(**p) for p in participants_db.values()]
