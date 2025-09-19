# backend/app/schemas/care_workflow.py
from pydantic import BaseModel, validator
from datetime import date, datetime
from typing import Optional, List, Dict, Any

# Care Plan Schemas
class CarePlanBase(BaseModel):
    plan_name: str
    plan_version: str = "1.0"
    plan_period: str = "12 months"
    start_date: date
    end_date: date
    summary: str
    participant_strengths: Optional[str] = None
    participant_preferences: Optional[str] = None
    family_goals: Optional[str] = None
    short_goals: Optional[List[Dict[str, Any]]] = None
    long_goals: Optional[List[Dict[str, Any]]] = None
    supports: Optional[List[Dict[str, Any]]] = None
    monitoring: Optional[Dict[str, Any]] = None
    risk_considerations: Optional[str] = None
    emergency_contacts: Optional[str] = None
    cultural_considerations: Optional[str] = None
    communication_preferences: Optional[str] = None
    status: str = "draft"

class CarePlanCreate(CarePlanBase):
    pass

class CarePlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    plan_version: Optional[str] = None
    plan_period: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    summary: Optional[str] = None
    participant_strengths: Optional[str] = None
    participant_preferences: Optional[str] = None
    family_goals: Optional[str] = None
    short_goals: Optional[List[Dict[str, Any]]] = None
    long_goals: Optional[List[Dict[str, Any]]] = None
    supports: Optional[List[Dict[str, Any]]] = None
    monitoring: Optional[Dict[str, Any]] = None
    risk_considerations: Optional[str] = None
    emergency_contacts: Optional[str] = None
    cultural_considerations: Optional[str] = None
    communication_preferences: Optional[str] = None
    status: Optional[str] = None

class CarePlanResponse(CarePlanBase):
    id: int
    participant_id: int
    created_at: str
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# Risk Assessment Schemas
class RiskAssessmentBase(BaseModel):
    assessment_date: date
    assessor_name: str
    assessor_role: Optional[str] = None
    review_date: date
    context: Optional[Dict[str, Any]] = None
    risks: Optional[List[Dict[str, Any]]] = None
    overall_risk_rating: Optional[str] = None
    emergency_procedures: Optional[str] = None
    monitoring_requirements: Optional[str] = None
    staff_training_needs: Optional[str] = None
    equipment_requirements: Optional[str] = None
    environmental_modifications: Optional[str] = None
    communication_plan: Optional[str] = None
    family_involvement: Optional[str] = None
    external_services: Optional[str] = None
    review_schedule: str = "Monthly"
    approval_status: str = "draft"
    notes: Optional[str] = None

class RiskAssessmentCreate(RiskAssessmentBase):
    pass

class RiskAssessmentUpdate(BaseModel):
    assessment_date: Optional[date] = None
    assessor_name: Optional[str] = None
    assessor_role: Optional[str] = None
    review_date: Optional[date] = None
    context: Optional[Dict[str, Any]] = None
    risks: Optional[List[Dict[str, Any]]] = None
    overall_risk_rating: Optional[str] = None
    emergency_procedures: Optional[str] = None
    monitoring_requirements: Optional[str] = None
    staff_training_needs: Optional[str] = None
    equipment_requirements: Optional[str] = None
    environmental_modifications: Optional[str] = None
    communication_plan: Optional[str] = None
    family_involvement: Optional[str] = None
    external_services: Optional[str] = None
    review_schedule: Optional[str] = None
    approval_status: Optional[str] = None
    notes: Optional[str] = None

class RiskAssessmentResponse(RiskAssessmentBase):
    id: int
    participant_id: int
    created_at: str
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True

# Prospective Workflow Schemas
class ProspectiveWorkflowResponse(BaseModel):
    id: int
    participant_id: int
    care_plan_completed: bool
    risk_assessment_completed: bool
    ai_review_completed: bool
    quotation_generated: bool
    ready_for_onboarding: bool
    care_plan_id: Optional[int] = None
    risk_assessment_id: Optional[int] = None
    workflow_notes: Optional[str] = None
    manager_comments: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    
    # Additional context
    participant_name: str
    participant_status: str
    
    class Config:
        from_attributes = True