# backend/app/models/__init__.py - UPDATED
from .participant import Participant
from .referral import Referral
from .care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow
from .document import Document, DocumentAccess, DocumentNotification, DocumentCategory
from .document_generation import DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable, DocumentSignature
from .document_workflow import DocumentWorkflow, DocumentVersion, DocumentApproval

__all__ = [
    "Participant",
    "Referral", 
    "CarePlan",
    "RiskAssessment",
    "ProspectiveWorkflow",
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
    "DocumentApproval"
]