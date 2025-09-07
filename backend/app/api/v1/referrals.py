# backend/app/api/v1/referrals.py
from __future__ import annotations

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.schemas.referral import ReferralCreate, ReferralUpdate, ReferralResponse
from app.models.referral import Referral

router = APIRouter()
log = logging.getLogger(__name__)

def orm_to_response(obj: Referral) -> ReferralResponse:
    # Convert ORM (snake_case) → API schema (camelCase)
    return ReferralResponse(
        id=str(obj.id),
        firstName=obj.first_name,
        lastName=obj.last_name,
        dateOfBirth=obj.date_of_birth,
        phoneNumber=obj.phone_number,
        emailAddress=obj.email_address,
        streetAddress=obj.street_address,
        city=obj.city,
        state=obj.state,
        postcode=obj.postcode,
        
        # NDIS Information
        disabilityType=obj.disability_type,
        serviceTypes=obj.service_types or [],
        ndisNumber=obj.ndis_number,
        urgencyLevel=obj.urgency_level,
        preferredContactMethod=obj.preferred_contact_method,
        
        # Support Requirements
        currentSupports=obj.current_supports,
        supportGoals=obj.support_goals,
        accessibilityNeeds=obj.accessibility_needs,
        culturalConsiderations=obj.cultural_considerations,
        
        # Representative Details
        repFirstName=obj.rep_first_name,
        repLastName=obj.rep_last_name,
        repPhoneNumber=obj.rep_phone_number,
        repEmailAddress=obj.rep_email_address,
        repRelationship=obj.rep_relationship,
        
        status=obj.status,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )

@router.post(
    "/referral",
    response_model=ReferralResponse,
    status_code=201,
    name="submit_referral",
    operation_id="submit_referral",
)
def create_referral(payload: ReferralCreate, db: Session = Depends(get_db)) -> ReferralResponse:
    try:
        now = datetime.utcnow()
        rec = Referral(
            first_name=payload.firstName,
            last_name=payload.lastName,
            date_of_birth=payload.dateOfBirth,
            phone_number=payload.phoneNumber,
            email_address=payload.emailAddress,
            street_address=payload.streetAddress,
            city=payload.city,
            state=payload.state,
            postcode=payload.postcode,
            
            # NDIS Information
            disability_type=payload.disabilityType,
            service_types=payload.serviceTypes,
            ndis_number=payload.ndisNumber,
            urgency_level=payload.urgencyLevel,
            preferred_contact_method=payload.preferredContactMethod,
            
            # Support Requirements
            current_supports=payload.currentSupports,
            support_goals=payload.supportGoals,
            accessibility_needs=payload.accessibilityNeeds,
            cultural_considerations=payload.culturalConsiderations,
            
            # Representative Details
            rep_first_name=payload.repFirstName,
            rep_last_name=payload.repLastName,
            rep_phone_number=payload.repPhoneNumber,
            rep_email_address=payload.repEmailAddress,
            rep_relationship=payload.repRelationship,
            
            status="NEW",
            created_at=now,
            updated_at=now,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return orm_to_response(rec)

    except IntegrityError as ie:
        db.rollback()
        log.exception("IntegrityError while creating referral")
        raise HTTPException(status_code=409, detail="Referral violates a database constraint.")
    except Exception as e:
        db.rollback()
        log.exception("Create referral failed")
        raise HTTPException(status_code=500, detail=f"Referral creation failed: {e!s}")

@router.get(
    "/referrals",
    response_model=list[ReferralResponse],
    name="get_referrals",
    operation_id="get_referrals",
)
def get_referrals(db: Session = Depends(get_db)) -> list[ReferralResponse]:
    rows = db.query(Referral).order_by(Referral.created_at.desc()).all()
    return [orm_to_response(r) for r in rows]

@router.get(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    name="get_referral",
    operation_id="get_referral",
)
def get_referral(referral_id: str, db: Session = Depends(get_db)) -> ReferralResponse:
    r = db.get(Referral, referral_id)
    if not r:
        raise HTTPException(status_code=404, detail="Referral not found")
    return orm_to_response(r)

@router.put(
    "/referrals/{referral_id}",
    response_model=ReferralResponse,
    name="update_referral",
    operation_id="update_referral",
)
def update_referral(referral_id: str, body: ReferralUpdate, db: Session = Depends(get_db)) -> ReferralResponse:
    try:
        r = db.get(Referral, referral_id)
        if not r:
            raise HTTPException(status_code=404, detail="Referral not found")

        # Update only provided fields
        for api_key, value in body.model_dump(exclude_unset=True).items():
            if api_key == "firstName":                  r.first_name = value
            elif api_key == "lastName":                 r.last_name = value
            elif api_key == "dateOfBirth":              r.date_of_birth = value
            elif api_key == "phoneNumber":              r.phone_number = value
            elif api_key == "emailAddress":             r.email_address = value
            elif api_key == "streetAddress":            r.street_address = value
            elif api_key == "city":                     r.city = value
            elif api_key == "state":                    r.state = value
            elif api_key == "postcode":                 r.postcode = value
            elif api_key == "disabilityType":           r.disability_type = value
            elif api_key == "serviceTypes":             r.service_types = value
            elif api_key == "ndisNumber":               r.ndis_number = value
            elif api_key == "urgencyLevel":             r.urgency_level = value
            elif api_key == "preferredContactMethod":   r.preferred_contact_method = value
            elif api_key == "currentSupports":          r.current_supports = value
            elif api_key == "supportGoals":             r.support_goals = value
            elif api_key == "accessibilityNeeds":       r.accessibility_needs = value
            elif api_key == "culturalConsiderations":   r.cultural_considerations = value
            elif api_key == "repFirstName":             r.rep_first_name = value
            elif api_key == "repLastName":              r.rep_last_name = value
            elif api_key == "repPhoneNumber":           r.rep_phone_number = value
            elif api_key == "repEmailAddress":          r.rep_email_address = value
            elif api_key == "repRelationship":          r.rep_relationship = value

        r.updated_at = datetime.utcnow()
        db.add(r)
        db.commit()
        db.refresh(r)
        return orm_to_response(r)
    except Exception as e:
        db.rollback()
        log.exception("Update referral failed")
        raise HTTPException(status_code=500, detail=f"Referral update failed: {e!s}")

@router.delete(
    "/referrals/{referral_id}",
    name="delete_referral",
    operation_id="delete_referral",
)
def delete_referral(referral_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        r = db.get(Referral, referral_id)
        if not r:
            raise HTTPException(status_code=404, detail="Referral not found")
        db.delete(r)
        db.commit()
        return {"ok": True, "deleted": referral_id}
    except Exception as e:
        db.rollback()
        log.exception("Delete referral failed")
        raise HTTPException(status_code=500, detail=f"Referral delete failed: {e!s}")