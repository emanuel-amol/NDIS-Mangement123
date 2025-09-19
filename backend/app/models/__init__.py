# backend/app/models/__init__.py - FIXED VERSION
from .participant import Participant
from .referral import Referral
from .care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow
from .document import Document, DocumentAccess, DocumentNotification, DocumentCategory
from .document_generation import DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable, DocumentSignature

# Make sure no model is imported twice!
# REMOVED DocumentTemplate from document.py to avoid conflict

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
    "DocumentSignature"
]