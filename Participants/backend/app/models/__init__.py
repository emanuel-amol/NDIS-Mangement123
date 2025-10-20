# backend/app/models/__init__.py - FIXED IMPORT ORDER
from .dynamic_data import DynamicData
from .settings import ApplicationSettings, ProviderSettings, UserPreferences
from .user import User, Role, UserSession

from .referral import Referral
from .participant import Participant
from .care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow

from .quotation import Quotation, QuotationItem

from .document import Document, DocumentAccess, DocumentNotification, DocumentCategory
from .document_generation import DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable, DocumentSignature
from .document_workflow import DocumentWorkflow, DocumentVersion, DocumentApproval

from .roster import (
    Roster,
    RosterParticipant,
    RosterTask,
    RosterWorkerNote,
    RosterRecurrence,
    RosterInstance,
    RosterStatusHistory,
    RosterStatus,
)

from .support_worker_assignment import SupportWorkerAssignment
from .ai_suggestion import AISuggestion

__all__ = [
    "DynamicData",
    "ApplicationSettings",
    "ProviderSettings", 
    "UserPreferences",
    "User",
    "Role",
    "UserSession",
    "Referral",
    "Participant",
    "CarePlan",
    "RiskAssessment",
    "ProspectiveWorkflow",
    "Quotation",
    "QuotationItem",
    "Document",
    "DocumentAccess",
    "DocumentNotification",
    "DocumentCategory",
    "DocumentGenerationTemplate",
    "GeneratedDocument",
    "DocumentGenerationVariable",
    "DocumentSignature",
    "DocumentWorkflow",
    "DocumentVersion",
    "DocumentApproval",
    "Roster",
    "RosterParticipant",
    "RosterTask",
    "RosterWorkerNote",
    "RosterRecurrence",
    "RosterInstance",
    "RosterStatusHistory",
    "RosterStatus",
    "SupportWorkerAssignment",
    "AISuggestion",
]
from app.models.care_plan_version import CarePlanVersion
