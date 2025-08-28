# backend/app/api/v1/participants.py
from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime

from app.schemas.participant import (
    ReferralCreate, 
    ReferralResponse, 
    CarePlanCreate, 
    CarePlanResponse,
    RiskAssessmentCreate,
    RiskAssessmentResponse,
    ParticipantCreate,
    ParticipantResponse,
    ParticipantStatus
)

router = APIRouter()

# In-memory storage (replace with database later)
referrals_db = {}
care_plans_db = {}
risk_assessments_db = {}
participants_db = {}

@router.post("/referrals", response_model=ReferralResponse)
async def create_referral(referral: ReferralCreate):
    """Submit a new participant referral"""
    referral_id = str(uuid.uuid4())
    now = datetime.now()
    
    referral_data = {
        "id": referral_id,
        **referral.dict(),
        "status": ParticipantStatus.REFERRAL,
        "created_at": now,
        "updated_at": now
    }
    
    referrals_db[referral_id] = referral_data
    return ReferralResponse(**referral_data)

@router.get("/referrals", response_model=List[ReferralResponse])
async def get_referrals():
    """Get all referrals"""
    return list(referrals_db.values())

@router.get("/referrals/{referral_id}", response_model=ReferralResponse)
async def get_referral(referral_id: str):
    """Get a specific referral"""
    if referral_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Referral not found")
    return ReferralResponse(**referrals_db[referral_id])

@router.put("/referrals/{referral_id}/validate")
async def validate_referral(referral_id: str):
    """Validate a referral and mark as prospective participant"""
    if referral_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    referrals_db[referral_id]["status"] = ParticipantStatus.PROSPECTIVE
    referrals_db[referral_id]["updated_at"] = datetime.now()
    
    return {"message": "Referral validated successfully", "status": "prospective"}

@router.post("/care-plans", response_model=CarePlanResponse)
async def create_care_plan(care_plan: CarePlanCreate):
    """Create a care plan for a participant"""
    if care_plan.participant_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    care_plan_id = str(uuid.uuid4())
    now = datetime.now()
    
    care_plan_data = {
        "id": care_plan_id,
        **care_plan.dict(),
        "created_at": now,
        "updated_at": now
    }
    
    care_plans_db[care_plan_id] = care_plan_data
    return CarePlanResponse(**care_plan_data)

@router.get("/care-plans", response_model=List[CarePlanResponse])
async def get_care_plans():
    """Get all care plans"""
    return list(care_plans_db.values())

@router.post("/risk-assessments", response_model=RiskAssessmentResponse)
async def create_risk_assessment(risk_assessment: RiskAssessmentCreate):
    """Create a risk assessment for a participant"""
    if risk_assessment.participant_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    assessment_id = str(uuid.uuid4())
    now = datetime.now()
    
    assessment_data = {
        "id": assessment_id,
        **risk_assessment.dict(),
        "created_at": now,
        "updated_at": now
    }
    
    risk_assessments_db[assessment_id] = assessment_data
    return RiskAssessmentResponse(**assessment_data)

@router.get("/risk-assessments", response_model=List[RiskAssessmentResponse])
async def get_risk_assessments():
    """Get all risk assessments"""
    return list(risk_assessments_db.values())

@router.post("/onboard", response_model=ParticipantResponse)
async def onboard_participant(participant_data: ParticipantCreate):
    """Convert a prospective participant to onboarded"""
    if participant_data.referral_id not in referrals_db:
        raise HTTPException(status_code=404, detail="Referral not found")
    
    referral = referrals_db[participant_data.referral_id]
    if referral["status"] != ParticipantStatus.PROSPECTIVE:
        raise HTTPException(status_code=400, detail="Referral must be prospective to onboard")
    
    participant_id = str(uuid.uuid4())
    now = datetime.now()
    
    participant = {
        "id": participant_id,
        "referral_id": participant_data.referral_id,
        "status": ParticipantStatus.ONBOARDED,
        "care_plan_id": None,
        "risk_assessment_id": None,
        "created_at": now,
        "updated_at": now
    }
    
    participants_db[participant_id] = participant
    referrals_db[participant_data.referral_id]["status"] = ParticipantStatus.ONBOARDED
    
    return ParticipantResponse(**participant)

@router.get("/participants", response_model=List[ParticipantResponse])
async def get_participants():
    """Get all onboarded participants"""
    return list(participants_db.values())