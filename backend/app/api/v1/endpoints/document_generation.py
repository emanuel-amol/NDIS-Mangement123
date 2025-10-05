# backend/app/api/v1/endpoints/document_generation.py - ENHANCED COMPLIANT VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.participant import Participant
from app.services.document_generation_service import DocumentGenerationService
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import logging
import io
import zipfile
import tempfile
import os

router = APIRouter()
logger = logging.getLogger(__name__)

# ==========================================
# REQUEST/RESPONSE MODELS
# ==========================================

class DocumentGenerationRequest(BaseModel):
    template_id: str = Field(..., description="Template identifier")
    additional_data: Optional[Dict[str, Any]] = Field(None, description="Optional data overrides")
    format: str = Field("pdf", description="Output format: 'pdf' or 'html'")
    store_in_database: bool = Field(True, description="Whether to store in database")

class BulkGenerationRequest(BaseModel):
    template_ids: List[str] = Field(..., description="List of template IDs to generate")
    format: str = Field("pdf", description="Output format: 'pdf' or 'html'")

class TemplatePreviewRequest(BaseModel):
    template_id: str = Field(..., description="Template to preview")

class DocumentTemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    description: str
    template_available: bool
    version: str
    supports_bulk: bool
    estimated_pages: int
    required_data: List[str]
    optional_data: List[str]

class ValidationResponse(BaseModel):
    valid: bool
    errors: List[str]
    warnings: List[str]
    missing_data: List[str]

class GenerationStatusResponse(BaseModel):
    success: bool
    message: str
    document_id: Optional[int] = None
    filename: Optional[str] = None
    errors: Optional[List[str]] = None

# ==========================================
# CORE ENDPOINTS
# ==========================================

@router.get("/templates", response_model=List[DocumentTemplateResponse])
def get_available_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """
    Get list of all available document templates
    
    Categories:
    - service_agreements
    - medical_consent
    - intake_documents
    """
    try:
        service = DocumentGenerationService()
        templates = service.get_available_templates(category)
        
        return [DocumentTemplateResponse(**template) for template in templates]
        
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch templates"
        )

@router.get("/templates/{template_id}/info", response_model=DocumentTemplateResponse)
def get_template_info(
    template_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific template"""
    try:
        service = DocumentGenerationService()
        templates = service.get_available_templates()
        
        template = next((t for t in templates if t["id"] == template_id), None)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template '{template_id}' not found"
            )
        
        return DocumentTemplateResponse(**template)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching template info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch template info"
        )

@router.post("/participants/{participant_id}/validate/{template_id}", response_model=ValidationResponse)
def validate_generation_requirements(
    participant_id: int,
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    Validate that all requirements are met for document generation
    
    This should be called before generation to check for missing data
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        service = DocumentGenerationService()
        validation = service.validate_generation_requirements(
            template_id=template_id,
            participant_id=participant_id,
            db=db
        )
        
        return ValidationResponse(**validation)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Validation failed"
        )

@router.post("/participants/{participant_id}/generate-document")
def generate_document(
    participant_id: int,
    request: DocumentGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a document for a participant
    
    Returns the generated document as a downloadable file (PDF or HTML)
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Generate document
        document_bytes = service.generate_document(
            template_id=request.template_id,
            participant_id=participant_id,
            db=db,
            additional_data=request.additional_data,
            format=request.format,
            store_in_database=request.store_in_database
        )
        
        # Get template info for filename
        templates = service.get_available_templates()
        template_info = next((t for t in templates if t["id"] == request.template_id), None)
        template_name = template_info["name"] if template_info else request.template_id
        
        # Create filename
        extension = "pdf" if request.format == "pdf" else "html"
        filename = f"{template_name}_{participant.first_name}_{participant.last_name}.{extension}"
        filename = filename.replace(" ", "_").replace("/", "_")
        
        # Determine media type
        media_type = "application/pdf" if request.format == "pdf" else "text/html"
        
        # Return document as streaming response
        return StreamingResponse(
            io.BytesIO(document_bytes),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": media_type
            }
        )
        
    except ValueError as e:
        logger.error(f"Document generation validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate document"
        )

@router.post("/participants/{participant_id}/preview-template-data")
def preview_template_data(
    participant_id: int,
    request: TemplatePreviewRequest,
    db: Session = Depends(get_db)
):
    """
    Preview the data that would be used for template generation
    
    Useful for debugging and verifying data before generation
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Get template data preview
        template_data = service.preview_template_data(
            template_id=request.template_id,
            participant_id=participant_id,
            db=db
        )
        
        return template_data
        
    except ValueError as e:
        logger.error(f"Template preview error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error previewing template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview template"
        )

@router.get("/participants/{participant_id}/generate-document/{template_id}/preview")
def preview_document_html(
    participant_id: int,
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate and return document as inline HTML preview
    
    This allows users to see the document before downloading as PDF
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Generate HTML version (don't store in database)
        html_bytes = service.generate_document(
            template_id=template_id,
            participant_id=participant_id,
            db=db,
            format="html",
            store_in_database=False
        )
        
        # Return HTML for preview
        return Response(
            content=html_bytes,
            media_type="text/html"
        )
        
    except ValueError as e:
        logger.error(f"Preview generation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error previewing document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview document"
        )

@router.post("/participants/{participant_id}/bulk-generate")
def bulk_generate_documents(
    participant_id: int,
    request: BulkGenerationRequest,
    db: Session = Depends(get_db)
):
    """
    Generate multiple documents at once and return as ZIP file
    
    This is useful for generating a complete document pack for a participant
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Generate all documents
        results = service.generate_document_bundle(
            template_ids=request.template_ids,
            participant_id=participant_id,
            db=db
        )
        
        if not results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No documents were successfully generated"
            )
        
        # Create temporary zip file
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, 'documents.zip')
        
        try:
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                templates = service.get_available_templates()
                
                for template_id, document_bytes in results.items():
                    # Get template name
                    template_info = next((t for t in templates if t["id"] == template_id), None)
                    template_name = template_info["name"] if template_info else template_id
                    
                    # Add to zip
                    extension = "pdf" if request.format == "pdf" else "html"
                    filename = f"{template_name}_{participant.first_name}_{participant.last_name}.{extension}"
                    filename = filename.replace(" ", "_").replace("/", "_")
                    zip_file.writestr(filename, document_bytes)
            
            # Read the zip file
            with open(zip_path, 'rb') as zip_file:
                zip_data = zip_file.read()
            
            # Clean up
            os.unlink(zip_path)
            os.rmdir(temp_dir)
            
            # Return zip file
            zip_filename = f"Documents_{participant.first_name}_{participant.last_name}.zip"
            zip_filename = zip_filename.replace(" ", "_")
            
            return StreamingResponse(
                io.BytesIO(zip_data),
                media_type="application/zip",
                headers={
                    "Content-Disposition": f'attachment; filename="{zip_filename}"',
                    "Content-Type": "application/zip"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate documents"
        )

@router.post("/participants/{participant_id}/regenerate-document/{document_id}")
def regenerate_document(
    participant_id: int,
    document_id: int,
    reason: str = Query("Manual regeneration", description="Reason for regeneration"),
    db: Session = Depends(get_db)
):
    """
    Regenerate an existing document with current data
    
    This creates a new version of the document with updated information
    """
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Participant not found"
            )
        
        # Initialize service
        service = DocumentGenerationService()
        
        # Regenerate document
        new_document_bytes = service.regenerate_document(
            document_id=document_id,
            db=db,
            reason=reason
        )
        
        return GenerationStatusResponse(
            success=True,
            message="Document regenerated successfully",
            document_id=document_id
        )
        
    except ValueError as e:
        logger.error(f"Regeneration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error regenerating document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate document"
        )

# ==========================================
# UTILITY ENDPOINTS
# ==========================================

@router.post("/initialize-templates")
def initialize_default_templates():
    """
    Initialize default document templates (admin only)
    
    This creates the default templates if they don't exist
    """
    try:
        service = DocumentGenerationService()
        service.create_default_templates()
        
        return {
            "message": "Default templates initialized successfully",
            "templates_created": [
                "NDIS Service Agreement",
                "Participant Handbook",
                "Medical Information Consent",
                "SDA Service Agreement",
                "Medication Management Form"
            ]
        }
    except Exception as e:
        logger.error(f"Error initializing templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize templates"
        )

@router.get("/categories")
def get_template_categories(db: Session = Depends(get_db)):
    """Get all available template categories"""
    try:
        service = DocumentGenerationService()
        templates = service.get_available_templates()
        
        # Extract unique categories
        categories = {}
        for template in templates:
            category = template["category"]
            if category not in categories:
                categories[category] = {
                    "id": category,
                    "name": category.replace("_", " ").title(),
                    "template_count": 0
                }
            categories[category]["template_count"] += 1
        
        return {
            "categories": list(categories.values()),
            "total_templates": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch categories"
        )

@router.get("/status")
def get_generation_service_status():
    """Get document generation service status and configuration"""
    try:
        service = DocumentGenerationService()
        
        from app.services.document_generation_service import WEASYPRINT_AVAILABLE
        
        return {
            "service_status": "operational",
            "pdf_generation_available": WEASYPRINT_AVAILABLE,
            "html_fallback_available": True,
            "template_directory": str(service.template_dir),
            "total_templates": len(service.templates_config),
            "organization_configured": bool(os.getenv('ORGANIZATION_NAME'))
        }
        
    except Exception as e:
        logger.error(f"Error checking service status: {str(e)}")
        return {
            "service_status": "error",
            "error": str(e)
        }