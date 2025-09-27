# backend/app/models/__init__.py - FIXED IMPORT ORDER
# Import base models first
from .dynamic_data import DynamicData
from .settings import ApplicationSettings, ProviderSettings, UserPreferences
from .user import User, Role, UserSession

# Import core models next
from .referral import Referral
from .participant import Participant
from .care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow

# Import quotation model AFTER participant
from .quotation import Quotation, QuotationItem

# Import document models
from .document import Document, DocumentAccess, DocumentNotification, DocumentCategory
from .document_generation import DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable, DocumentSignature
from .document_workflow import DocumentWorkflow, DocumentVersion, DocumentApproval

# Import roster models
from .roster import Roster, RosterParticipant, RosterTask, RosterWorkerNote, RosterRecurrence, RosterInstance, RosterStatusHistory, RosterStatus

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
    "RosterStatus"
]