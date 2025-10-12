# backend/app/api/v1/endpoints/onboarding.py
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
import uuid
import logging

from app.core.database import get_db
from app.models.participant import Participant
from app.models.document import Document
from app.services.document_generation_service import DocumentGenerationService
from app.services.signing_service import SigningService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/participants/{participant_id}/onboarding/status")
def get_onboarding_status(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """
    Get onboarding status for a participant
    
    Returns:
    - Generated documents count
    - Pending signatures
    - Completion status
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Get onboarding documents - Filter in Python to avoid SQLAlchemy issues
    all_docs = db.query(Document).filter(
        Document.participant_id == participant_id
    ).all()
    
    # Filter for onboarding pack documents
    onboarding_docs = [
        doc for doc in all_docs 
        if doc.extra_metadata and doc.extra_metadata.get('onboarding_pack') == True
    ]
    
    # Get signing envelopes
    from app.models.signing import SigningEnvelope
    
    # Get all envelopes for this participant
    envelopes = db.query(SigningEnvelope).filter(
        SigningEnvelope.participant_id == participant_id
    ).all()
    
    # PERMANENT FIX: Properly categorize envelopes by status
    pending_envelopes = [e for e in envelopes if e.status in ['pending', 'viewed']]
    completed_envelopes = [e for e in envelopes if e.status == 'signed']
    
    # PERMANENT FIX: Get signed timestamp from events if needed
    def get_signed_timestamp(envelope):
        """Get when envelope was signed from events"""
        try:
            signing_svc = SigningService(db)
            events = signing_svc.get_envelope_events(envelope.id)
            signed_event = next((e for e in events if e.event_type == 'signed'), None)
            if signed_event:
                return signed_event.created_at.isoformat()
        except:
            pass
        return None
    
    return {
        "participant_id": participant_id,
        "participant_name": f"{participant.first_name} {participant.last_name}",
        "onboarding_documents_generated": len(onboarding_docs),
        "documents": [
            {
                "id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "status": doc.status,
                "created_at": doc.created_at.isoformat() if doc.created_at else None
            }
            for doc in onboarding_docs
        ],
        "total_envelopes": len(envelopes),
        "pending_signatures": len(pending_envelopes),
        "completed_signatures": len(completed_envelopes),
        "envelopes": [
            {
                "id": e.id,
                "signer_name": e.signer_name,
                "signer_email": e.signer_email,
                "signer_role": e.signer_role,
                "status": e.status,
                "created_at": e.created_at.isoformat() if e.created_at else None,
                "signed_at": get_signed_timestamp(e),  # PERMANENT FIX: Get from events
                "expires_at": e.expires_at.isoformat() if e.expires_at else None,
                "document_count": len(e.document_ids_json) if e.document_ids_json else 0
            }
            for e in envelopes
        ],
        "onboarding_complete": len(pending_envelopes) == 0 and len(completed_envelopes) > 0
    }

@router.post("/participants/{participant_id}/onboarding/generate-documents")
def generate_onboarding_documents(
    participant_id: int,
    template_ids: Optional[List[str]] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Generate onboarding documents without sending for signature
    
    Use this to preview or generate documents before creating a signing envelope
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    doc_gen = DocumentGenerationService()
    
    # Default onboarding templates if none specified
    if not template_ids:
        template_ids = [
            "ndis_service_agreement",
            "participant_handbook",
            "medical_consent_form"
        ]
    
    generated_docs = []
    generation_errors = []
    
    for template_id in template_ids:
        try:
            pdf_bytes = doc_gen.generate_document(
                template_id=template_id,
                participant_id=participant_id,
                db=db
            )
            
            templates = doc_gen.get_available_templates()
            template_info = next((t for t in templates if t["id"] == template_id), None)
            template_name = template_info["name"] if template_info else template_id
            template_category = template_info["category"] if template_info else "intake_documents"
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{template_id}_{participant_id}_{timestamp}.pdf"
            safe_display_name = f"{template_name}_{participant.first_name}_{participant.last_name}.pdf"
            safe_display_name = safe_display_name.replace(" ", "_").replace("/", "_")
            
            upload_dir = Path("app/uploads/documents")
            upload_dir.mkdir(parents=True, exist_ok=True)
            filepath = upload_dir / filename
            
            with open(filepath, "wb") as f:
                f.write(pdf_bytes)
            
            document = Document(
                participant_id=participant_id,
                title=template_name,
                filename=filename,
                original_filename=safe_display_name,
                file_id=f"onb_{uuid.uuid4().hex[:12]}",
                file_path=str(filepath),
                file_url=f"/api/v1/files/{filename}",
                file_size=len(pdf_bytes),
                mime_type="application/pdf",
                category=template_category,
                document_type=template_id,
                status="ready",
                is_active=True,
                uploaded_by="system_onboarding",
                uploaded_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
                extra_metadata={
                    "template_id": template_id,
                    "template_name": template_name,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "generation_type": "onboarding",
                    "onboarding_pack": True
                }
            )
            
            db.add(document)
            db.flush()
            
            generated_docs.append({
                "id": document.id,
                "title": document.title,
                "filename": document.filename,
                "template_id": template_id,
                "file_size": document.file_size,
                "file_url": document.file_url
            })
            
            logger.info(f"Generated onboarding document: {template_name} (ID: {document.id})")
            
        except Exception as e:
            error_msg = f"Failed to generate {template_id}: {str(e)}"
            logger.error(error_msg)
            generation_errors.append(error_msg)
    
    if not generated_docs:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate any documents. Errors: {'; '.join(generation_errors)}"
        )
    
    db.commit()
    
    return {
        "message": "Onboarding documents generated successfully",
        "participant_id": participant_id,
        "participant_name": f"{participant.first_name} {participant.last_name}",
        "documents_generated": len(generated_docs),
        "documents": generated_docs,
        "generation_errors": generation_errors if generation_errors else None
    }


@router.post("/participants/{participant_id}/onboarding/send-pack")
def send_onboarding_pack(
    participant_id: int,
    signer_name: str = Body(...),
    signer_email: str = Body(...),
    signer_role: str = Body(..., regex="^(participant|guardian)$"),
    db: Session = Depends(get_db)
):
    """
    Generate onboarding documents and send signing pack via email
    
    - Generates standard onboarding documents
    - Creates signing envelope
    - Sends invitation email to signer
    - Returns envelope details and signing URL
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Generate onboarding documents
    doc_gen = DocumentGenerationService()
    
    onboarding_templates = [
        "ndis_service_agreement",
        "participant_handbook",
        "medical_consent_form"
    ]
    
    generated_doc_ids = []
    generation_errors = []
    
    for template_id in onboarding_templates:
        try:
            pdf_bytes = doc_gen.generate_document(
                template_id=template_id,
                participant_id=participant_id,
                db=db
            )
            
            templates = doc_gen.get_available_templates()
            template_info = next((t for t in templates if t["id"] == template_id), None)
            template_name = template_info["name"] if template_info else template_id
            template_category = template_info["category"] if template_info else "intake_documents"
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{template_id}_{participant_id}_{timestamp}.pdf"
            safe_display_name = f"{template_name}_{participant.first_name}_{participant.last_name}.pdf"
            safe_display_name = safe_display_name.replace(" ", "_").replace("/", "_")
            
            upload_dir = Path("app/uploads/documents")
            upload_dir.mkdir(parents=True, exist_ok=True)
            filepath = upload_dir / filename
            
            with open(filepath, "wb") as f:
                f.write(pdf_bytes)
            
            document = Document(
                participant_id=participant_id,
                title=template_name,
                filename=filename,
                original_filename=safe_display_name,
                file_id=f"onb_{uuid.uuid4().hex[:12]}",
                file_path=str(filepath),
                file_url=f"/api/v1/files/{filename}",
                file_size=len(pdf_bytes),
                mime_type="application/pdf",
                category=template_category,
                document_type=template_id,
                status="ready",
                is_active=True,
                uploaded_by="system_onboarding",
                uploaded_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
                extra_metadata={
                    "template_id": template_id,
                    "template_name": template_name,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "generation_type": "onboarding",
                    "onboarding_pack": True
                }
            )
            
            db.add(document)
            db.flush()
            generated_doc_ids.append(document.id)
            
            logger.info(f"Generated onboarding document: {template_name} (ID: {document.id})")
            
        except Exception as e:
            error_msg = f"Failed to generate {template_id}: {str(e)}"
            logger.error(error_msg)
            generation_errors.append(error_msg)
    
    if not generated_doc_ids:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate any documents. Errors: {'; '.join(generation_errors)}"
        )
    
    db.commit()
    
    # Create signing envelope with email
    signing_svc = SigningService(db)
    
    try:
        envelope = signing_svc.create_envelope(
            participant_id=participant_id,
            document_ids=generated_doc_ids,
            signer_name=signer_name,
            signer_email=signer_email,
            signer_role=signer_role,
            ttl_days=14,
            send_email=True
        )
        
        # Check if email was sent by looking at the events
        events = signing_svc.get_envelope_events(envelope.id)
        email_sent = any(e.event_type == "sent" for e in events)
        email_failed = any(e.event_type in ["email_failed", "email_error"] for e in events)
        
        signing_url = signing_svc._get_signing_url(envelope.token)
        
        return {
            "message": "Onboarding pack created and sent successfully",
            "envelope_id": envelope.id,
            "participant_id": participant_id,
            "participant_name": f"{participant.first_name} {participant.last_name}",
            "signer_name": signer_name,
            "signer_email": signer_email,
            "signer_role": signer_role,
            "token": envelope.token,
            "public_url": signing_url,
            "status": envelope.status,
            "expires_at": envelope.expires_at.isoformat(),
            "documents_generated": len(generated_doc_ids),
            "document_ids": generated_doc_ids,
            "email_sent": email_sent,
            "email_status": "sent" if email_sent else ("failed" if email_failed else "pending"),
            "generation_errors": generation_errors if generation_errors else None
        }
        
    except Exception as e:
        logger.error(f"Error creating signing envelope: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Documents generated but failed to create signing envelope: {str(e)}"
        )


@router.post("/participants/{participant_id}/onboarding/resend-invitation")
def resend_signing_invitation(
    participant_id: int,
    envelope_id: int = Body(...),
    db: Session = Depends(get_db)
):
    """
    Resend signing invitation email for an existing envelope
    
    Useful if:
    - Email was not received
    - Email expired
    - Signer needs reminder
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    signing_svc = SigningService(db)
    
    try:
        # Get the envelope
        from app.models.signing import SigningEnvelope
        envelope = db.query(SigningEnvelope).filter(
            SigningEnvelope.id == envelope_id,
            SigningEnvelope.participant_id == participant_id
        ).first()
        
        if not envelope:
            raise HTTPException(status_code=404, detail="Envelope not found")
        
        if envelope.status == "signed":
            raise HTTPException(status_code=400, detail="Envelope already signed")
        
        if envelope.status == "expired":
            raise HTTPException(status_code=400, detail="Envelope has expired")
        
        # Send email
        from app.services.email_service import EmailService
        email_svc = EmailService()
        
        signing_url = signing_svc._get_signing_url(envelope.token)
        email_sent = email_svc.send_signing_invitation(envelope, participant, signing_url)
        
        if email_sent:
            # Log the resend event
            signing_svc._log_event(envelope.id, "resent", {
                "resent_at": datetime.now(timezone.utc).isoformat(),
                "resent_to": envelope.signer_email
            })
            
            return {
                "message": "Signing invitation resent successfully",
                "envelope_id": envelope.id,
                "signer_email": envelope.signer_email,
                "email_sent": True,
                "signing_url": signing_url
            }
        else:
            # Log the failure
            signing_svc._log_event(envelope.id, "email_failed", {
                "failed_at": datetime.now(timezone.utc).isoformat(),
                "recipient": envelope.signer_email,
                "reason": "Email service error"
            })
            
            raise HTTPException(
                status_code=500,
                detail="Failed to send email. Please check email configuration."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending invitation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resend invitation: {str(e)}"
        )


@router.get("/participants/{participant_id}/onboarding/templates")
def get_available_onboarding_templates(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """
    Get list of available onboarding document templates
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    doc_gen = DocumentGenerationService()
    all_templates = doc_gen.get_available_templates()
    
    # Filter for onboarding-related templates
    onboarding_categories = ["service_agreements", "intake_documents", "medical_consent"]
    onboarding_templates = [
        t for t in all_templates 
        if t.get("category") in onboarding_categories
    ]
    
    return {
        "participant_id": participant_id,
        "participant_name": f"{participant.first_name} {participant.last_name}",
        "available_templates": onboarding_templates,
        "total_templates": len(onboarding_templates)
    }


@router.delete("/participants/{participant_id}/onboarding/envelope/{envelope_id}")
def cancel_onboarding_envelope(
    participant_id: int,
    envelope_id: int,
    reason: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """
    Cancel an onboarding signing envelope
    
    Use this to:
    - Cancel incorrect envelopes
    - Stop expired signing processes
    - Clean up pending envelopes
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    from app.models.signing import SigningEnvelope
    envelope = db.query(SigningEnvelope).filter(
        SigningEnvelope.id == envelope_id,
        SigningEnvelope.participant_id == participant_id
    ).first()
    
    if not envelope:
        raise HTTPException(status_code=404, detail="Envelope not found")
    
    if envelope.status == "signed":
        raise HTTPException(status_code=400, detail="Cannot cancel signed envelope")
    
    # Cancel the envelope - FIXED: Removed is_active attribute that doesn't exist
    envelope.status = "cancelled"
    
    # Log the cancellation
    signing_svc = SigningService(db)
    signing_svc._log_event(envelope.id, "cancelled", {
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancelled_by": "admin",
        "reason": reason or "Cancelled by administrator"
    })
    
    db.commit()
    
    return {
        "message": "Envelope cancelled successfully",
        "envelope_id": envelope.id,
        "status": envelope.status,
        "reason": reason
    }