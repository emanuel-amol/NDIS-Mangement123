# backend/app/api/v1/endpoints/document_generation.py - FIXED WITH FILE_PATH
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.participant import Participant
from app.models.document import Document
from app.services.document_generation_service import DocumentGenerationService
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from pathlib import Path
import logging
import io
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)

class DocumentGenerationRequest(BaseModel):
    template_id: str
    additional_data: Optional[Dict[str, Any]] = None
    save_to_database: bool = True

class TemplatePreviewRequest(BaseModel):
    template_id: str

class DocumentTemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    template_available: bool

@router.get("/templates", response_model=List[DocumentTemplateResponse])
def get_available_templates(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of available document templates"""
    try:
        service = DocumentGenerationService()
        templates = service.get_available_templates(category)
        
        return [
            DocumentTemplateResponse(
                id=template["id"],
                name=template["name"],
                category=template["category"],
                description=template["description"],
                template_available=template["template_available"]
            )
            for template in templates
        ]
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch templates")

@router.post("/participants/{participant_id}/generate-document")
def generate_document(
    participant_id: int,
    request: DocumentGenerationRequest,
    db: Session = Depends(get_db)
):
    """Generate a document for a participant and optionally save to database"""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Generate PDF document
        pdf_bytes = service.generate_document(
            template_id=request.template_id,
            participant_id=participant_id,
            db=db,
            additional_data=request.additional_data
        )
        
        # Get template info for filename
        templates = service.get_available_templates()
        template_info = next((t for t in templates if t["id"] == request.template_id), None)
        template_name = template_info["name"] if template_info else request.template_id
        template_category = template_info["category"] if template_info else "general_documents"
        
        # Create filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{request.template_id}_{participant_id}_{timestamp}.pdf"
        safe_display_name = f"{template_name}_{participant.first_name}_{participant.last_name}.pdf"
        safe_display_name = safe_display_name.replace(" ", "_").replace("/", "_")
        
        # Save to database if requested
        document_id = None
        if request.save_to_database:
            try:
                # Save file to filesystem
                upload_dir = Path("app/uploads/documents")
                upload_dir.mkdir(parents=True, exist_ok=True)
                filepath = upload_dir / filename
                
                with open(filepath, "wb") as f:
                    f.write(pdf_bytes)
                
                # Create database record - FIXED: Now includes file_path
                document = Document(
                    participant_id=participant_id,
                    title=template_name,
                    filename=filename,
                    original_filename=safe_display_name,
                    file_id=f"gen_{uuid.uuid4().hex[:12]}",
                    file_path=str(filepath),  # ✅ FIXED: Added file_path
                    file_url=f"/api/v1/files/{filename}",
                    file_size=len(pdf_bytes),
                    mime_type="application/pdf",
                    category=template_category,
                    document_type=request.template_id,
                    status="ready",
                    is_active=True,
                    uploaded_by="system",
                    uploaded_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc),
                    extra_metadata={
                        "template_id": request.template_id,
                        "template_name": template_name,
                        "generated_at": datetime.now(timezone.utc).isoformat(),
                        "generation_type": "system"
                    }
                )
                
                db.add(document)
                db.commit()
                db.refresh(document)
                document_id = document.id
                
                logger.info(f"Document saved to database: ID={document_id}, Template={request.template_id}, Participant={participant_id}")
                
            except Exception as save_error:
                logger.error(f"Error saving document to database: {str(save_error)}")
                db.rollback()
        
        # Return PDF as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{safe_display_name}\"",
                "Content-Type": "application/pdf",
                "X-Document-ID": str(document_id) if document_id else "",
                "X-Document-Status": "ready"
            }
        )
        
    except ValueError as e:
        logger.error(f"Document generation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error generating document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate document")

@router.post("/participants/{participant_id}/preview-template-data")
def preview_template_data(
    participant_id: int,
    request: TemplatePreviewRequest,
    db: Session = Depends(get_db)
):
    """Preview the data that would be used for template generation"""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Get template data
        template_data = service.preview_template_data(
            template_id=request.template_id,
            participant_id=participant_id,
            db=db
        )
        
        return {
            "template_id": request.template_id,
            "participant_id": participant_id,
            "data": template_data
        }
        
    except ValueError as e:
        logger.error(f"Template preview error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error previewing template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview template")

@router.post("/initialize-templates")
def initialize_default_templates():
    """Initialize default document templates (admin only)"""
    try:
        service = DocumentGenerationService()
        service.create_default_templates()
        
        return {
            "message": "Default templates initialized successfully",
            "templates_created": [
                "NDIS Service Agreement",
                "Participant Handbook", 
                "Medical Information Consent",
                "SDA Service Agreement"
            ]
        }
    except Exception as e:
        logger.error(f"Error initializing templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize templates")

@router.get("/participants/{participant_id}/generate-document/{template_id}/preview")
def preview_document(
    participant_id: int,
    template_id: str,
    db: Session = Depends(get_db)
):
    """Generate and return document as inline preview (HTML)"""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Get template config
        if template_id not in service.templates_config:
            raise HTTPException(status_code=404, detail="Template not found")
        
        config = service.templates_config[template_id]
        
        # Gather template data
        context_data = service._gather_template_data(
            participant_id, db, config["required_data"], {}
        )
        
        # Get template content and render as HTML
        template_content = service._get_template_content(template_id)
        
        try:
            template = service.env.from_string(template_content)
            html_content = template.render(**context_data)
        except Exception as e:
            logger.error(f"Error rendering template {template_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Template rendering failed: {str(e)}")
        
        # Return HTML for preview
        return Response(
            content=html_content,
            media_type="text/html"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error previewing document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview document")

@router.get("/participants/{participant_id}/bulk-generate")
def bulk_generate_documents(
    participant_id: int,
    template_ids: str,
    save_to_database: bool = True,
    db: Session = Depends(get_db)
):
    """Generate multiple documents at once and return as ZIP"""
    try:
        import zipfile
        import tempfile
        import os
        
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Parse template IDs
        template_list = [tid.strip() for tid in template_ids.split(",")]
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Create temporary zip file
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, 'documents.zip')
        
        generated_documents = []
        
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                
                for template_id in template_list:
                    try:
                        # Generate PDF
                        pdf_bytes = service.generate_document(
                            template_id=template_id,
                            participant_id=participant_id,
                            db=db
                        )
                        
                        # Get template info
                        templates = service.get_available_templates()
                        template_info = next((t for t in templates if t["id"] == template_id), None)
                        template_name = template_info["name"] if template_info else template_id
                        template_category = template_info["category"] if template_info else "general_documents"
                        
                        # Create filename
                        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                        filename = f"{template_id}_{participant_id}_{timestamp}.pdf"
                        safe_display_name = f"{template_name}_{participant.first_name}_{participant.last_name}.pdf"
                        safe_display_name = safe_display_name.replace(" ", "_").replace("/", "_")
                        
                        # Add to zip
                        zip_file.writestr(safe_display_name, pdf_bytes)
                        
                        # Save to database if requested
                        if save_to_database:
                            try:
                                # Save file to filesystem
                                upload_dir = Path("app/uploads/documents")
                                upload_dir.mkdir(parents=True, exist_ok=True)
                                filepath = upload_dir / filename
                                
                                with open(filepath, "wb") as f:
                                    f.write(pdf_bytes)
                                
                                # Create database record - FIXED: Now includes file_path
                                document = Document(
                                    participant_id=participant_id,
                                    title=template_name,
                                    filename=filename,
                                    original_filename=safe_display_name,
                                    file_id=f"gen_{uuid.uuid4().hex[:12]}",
                                    file_path=str(filepath),  # ✅ FIXED: Added file_path
                                    file_url=f"/api/v1/files/{filename}",
                                    file_size=len(pdf_bytes),
                                    mime_type="application/pdf",
                                    category=template_category,
                                    document_type=template_id,
                                    status="ready",
                                    is_active=True,
                                    uploaded_by="system",
                                    uploaded_at=datetime.now(timezone.utc),
                                    created_at=datetime.now(timezone.utc),
                                    extra_metadata={
                                        "template_id": template_id,
                                        "template_name": template_name,
                                        "generated_at": datetime.now(timezone.utc).isoformat(),
                                        "generation_type": "bulk"
                                    }
                                )
                                
                                db.add(document)
                                db.commit()
                                db.refresh(document)
                                generated_documents.append(document.id)
                                
                                logger.info(f"Bulk document saved: ID={document.id}, Template={template_id}")
                                
                            except Exception as save_error:
                                logger.error(f"Error saving document to database: {str(save_error)}")
                                db.rollback()
                        
                    except Exception as e:
                        logger.warning(f"Failed to generate {template_id}: {str(e)}")
                        continue
            
            # Read the zip file
            with open(zip_path, 'rb') as zip_file:
                zip_data = zip_file.read()
            
            # Clean up
            os.unlink(zip_path)
            os.rmdir(temp_dir)
            
            # Return zip file
            zip_filename = f"Documents_{participant.first_name}_{participant.last_name}.zip"
            
            return StreamingResponse(
                io.BytesIO(zip_data),
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename=\"{zip_filename}\"",
                    "Content-Type": "application/zip",
                    "X-Generated-Document-IDs": ",".join(map(str, generated_documents))
                }
            )
            
        except Exception as e:
            # Clean up on error
            try:
                if os.path.exists(zip_path):
                    os.unlink(zip_path)
                os.rmdir(temp_dir)
            except:
                pass
            raise e
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk generation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate documents")

@router.get("/participants/{participant_id}/generated-documents")
def get_generated_documents(
    participant_id: int,
    template_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all generated documents for a participant"""
    try:
        query = db.query(Document).filter(
            Document.participant_id == participant_id,
            Document.uploaded_by == "system"
        )
        
        if template_id:
            query = query.filter(Document.document_type == template_id)
        
        if status:
            query = query.filter(Document.status == status)
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return {
            "participant_id": participant_id,
            "count": len(documents),
            "documents": [
                {
                    "id": doc.id,
                    "title": doc.title,
                    "template_id": doc.document_type,
                    "category": doc.category,
                    "status": doc.status,
                    "filename": doc.original_filename,
                    "file_size": doc.file_size,
                    "created_at": doc.created_at.isoformat(),
                    "file_url": doc.file_url
                }
                for doc in documents
            ]
        }
        
    except Exception as e:
        logger.error(f"Error fetching generated documents: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch generated documents")