# backend/app/services/document_generation_service.py - FIXED WITH WORKFLOW UPDATES
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment, ProspectiveWorkflow
from app.models.document_generation import DocumentGenerationTemplate, GeneratedDocument
from app.models.document import Document
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import json
import re
from jinja2 import Environment, FileSystemLoader, Template
import logging
import os
from pathlib import Path
import hashlib
import uuid

# Try to import WeasyPrint, but make it optional
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
    print("✅ WeasyPrint loaded successfully")
except ImportError as e:
    WEASYPRINT_AVAILABLE = False
    print(f"⚠️  WeasyPrint not available: {e}")
    print("📄 Document generation will work in HTML-only mode")

logger = logging.getLogger(__name__)

class DocumentGenerationService:
    """Enhanced document generation service with workflow updates"""
    
    def __init__(self):
        # Set up Jinja2 environment
        self.template_dir = Path(__file__).parent.parent / "templates" / "documents"
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=True
        )
        
        # Template configuration with complete metadata
        self.templates_config = {
            "basic_service_agreement": {
                "name": "NDIS Service Agreement",
                "category": "service_agreements",
                "description": "Standard NDIS service agreement for core supports",
                "template_file": "basic_service_agreement.html",
                "required_data": ["participant", "organization"],
                "optional_data": ["care_plan"],
                "template_available": True,
                "version": "1.0",
                "supports_bulk": True,
                "estimated_pages": 3
            },
            "sda_service_agreement": {
                "name": "SDA Service Agreement",
                "category": "service_agreements",
                "description": "Specialist Disability Accommodation agreement",
                "template_file": "sda_service_agreement.html",
                "required_data": ["participant", "organization"],
                "optional_data": ["care_plan", "risk_assessment"],
                "template_available": True,
                "version": "1.0",
                "supports_bulk": True,
                "estimated_pages": 4
            },
            "participant_handbook": {
                "name": "Participant Handbook",
                "category": "intake_documents",
                "description": "Welcome handbook for new participants",
                "template_file": "participant_handbook.html",
                "required_data": ["participant", "organization"],
                "optional_data": ["care_plan"],
                "template_available": True,
                "version": "1.0",
                "supports_bulk": True,
                "estimated_pages": 5
            },
            "medical_consent_form": {
                "name": "Medical Information Consent Form",
                "category": "medical_consent",
                "description": "Medical information consent and authorization",
                "template_file": "medical_consent_form.html",
                "required_data": ["participant", "organization"],
                "optional_data": [],
                "template_available": True,
                "version": "1.0",
                "supports_bulk": True,
                "estimated_pages": 2
            },
            "medication_management_form": {
                "name": "Medication Management Form",
                "category": "medical_consent",
                "description": "Comprehensive medication tracking and administration form",
                "template_file": "medication_management_form.html",
                "required_data": ["participant", "organization"],
                "optional_data": ["care_plan"],
                "template_available": True,
                "version": "1.0",
                "supports_bulk": True,
                "estimated_pages": 3
            }
        }
        
        # Ensure default templates exist
        self.create_default_templates()
    
    # ==========================================
    # PUBLIC API METHODS
    # ==========================================
    
    def get_available_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all available document templates with metadata"""
        templates = []
        
        for template_id, config in self.templates_config.items():
            if category and config["category"] != category:
                continue
            
            template_path = self.template_dir / config["template_file"]
            config["template_available"] = template_path.exists()
            
            templates.append({
                "id": template_id,
                "name": config["name"],
                "category": config["category"],
                "description": config["description"],
                "template_available": config["template_available"],
                "version": config.get("version", "1.0"),
                "supports_bulk": config.get("supports_bulk", True),
                "estimated_pages": config.get("estimated_pages", 1),
                "required_data": config["required_data"],
                "optional_data": config.get("optional_data", [])
            })
        
        return templates
    
    def validate_generation_requirements(
        self,
        template_id: str,
        participant_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Validate that all requirements are met for document generation"""
        result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "missing_data": []
        }
        
        if template_id not in self.templates_config:
            result["valid"] = False
            result["errors"].append(f"Template '{template_id}' not found")
            return result
        
        config = self.templates_config[template_id]
        
        template_path = self.template_dir / config["template_file"]
        if not template_path.exists():
            result["valid"] = False
            result["errors"].append(f"Template file '{config['template_file']}' not found")
            return result
        
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            result["valid"] = False
            result["errors"].append(f"Participant {participant_id} not found")
            return result
        
        if "care_plan" in config["required_data"]:
            care_plan = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if not care_plan:
                result["valid"] = False
                result["errors"].append("Care Plan is required but not found")
        
        if "risk_assessment" in config["required_data"]:
            risk_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.participant_id == participant_id
            ).order_by(desc(RiskAssessment.created_at)).first()
            
            if not risk_assessment:
                result["valid"] = False
                result["errors"].append("Risk Assessment is required but not found")
        
        if "care_plan" in config.get("optional_data", []):
            care_plan = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if not care_plan:
                result["warnings"].append("Care Plan not found - some fields will be empty")
                result["missing_data"].append("care_plan")
        
        critical_fields = ["first_name", "last_name", "ndis_number"]
        for field in critical_fields:
            if not getattr(participant, field, None):
                result["warnings"].append(f"Participant {field} is not set")
        
        return result
    
    def generate_document(
        self,
        template_id: str,
        participant_id: int,
        db: Session,
        additional_data: Optional[Dict[str, Any]] = None,
        format: str = "pdf",
        store_in_database: bool = True,
        created_by: str = "System User"
    ) -> bytes:
        """Generate a document from template and update workflow"""
        validation = self.validate_generation_requirements(template_id, participant_id, db)
        if not validation["valid"]:
            raise ValueError(f"Validation failed: {', '.join(validation['errors'])}")
        
        for warning in validation["warnings"]:
            logger.warning(f"Document generation warning: {warning}")
        
        config = self.templates_config[template_id]
        
        try:
            context_data = self._gather_template_data(
                participant_id, db, config["required_data"], additional_data or {}
            )
            
            template_content = self._get_template_content(template_id)
            template = self.env.from_string(template_content)
            html_content = template.render(**context_data)
            
            if format.lower() == "pdf":
                document_bytes = self._generate_pdf_from_html(html_content)
            else:
                document_bytes = self._generate_html_output(html_content, template_id)
            
            if store_in_database:
                self._store_generated_document(
                    db=db,
                    template_id=template_id,
                    participant_id=participant_id,
                    document_bytes=document_bytes,
                    format=format,
                    context_data=context_data,
                    created_by=created_by
                )
            
            logger.info(f"Successfully generated {template_id} for participant {participant_id}")
            return document_bytes
            
        except Exception as e:
            logger.error(f"Error generating document {template_id}: {str(e)}")
            raise ValueError(f"Document generation failed: {str(e)}")
    
    def generate_document_bundle(
        self,
        template_ids: List[str],
        participant_id: int,
        db: Session,
        created_by: str = "System User"
    ) -> Dict[str, bytes]:
        """Generate multiple documents in a single operation"""
        results = {}
        errors = {}
        
        for template_id in template_ids:
            try:
                document_bytes = self.generate_document(
                    template_id=template_id,
                    participant_id=participant_id,
                    db=db,
                    store_in_database=True,
                    created_by=created_by
                )
                results[template_id] = document_bytes
            except Exception as e:
                logger.error(f"Failed to generate {template_id}: {str(e)}")
                errors[template_id] = str(e)
        
        if errors:
            logger.warning(f"Bundle generation had errors: {errors}")
        
        return results
    
    def preview_template_data(
        self,
        template_id: str,
        participant_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """Preview the data that would be used for template generation"""
        if template_id not in self.templates_config:
            raise ValueError(f"Template '{template_id}' not found")
        
        config = self.templates_config[template_id]
        
        context_data = self._gather_template_data(
            participant_id, db, config["required_data"], {}
        )
        
        return {
            "template_id": template_id,
            "template_name": config["name"],
            "participant_id": participant_id,
            "data": context_data,
            "missing_fields": self._identify_missing_fields(context_data)
        }
    
    def regenerate_document(
        self,
        document_id: int,
        db: Session,
        reason: str = "Manual regeneration",
        created_by: str = "System User"
    ) -> bytes:
        """Regenerate an existing document with current data"""
        original_doc = db.query(Document).filter(Document.id == document_id).first()
        if not original_doc:
            raise ValueError(f"Document {document_id} not found")
        
        template_id = self._extract_template_id_from_document(original_doc)
        
        if not template_id:
            raise ValueError("Cannot determine template for regeneration")
        
        new_document_bytes = self.generate_document(
            template_id=template_id,
            participant_id=original_doc.participant_id,
            db=db,
            store_in_database=True,
            created_by=created_by
        )
        
        original_doc.status = "superseded"
        original_doc.updated_at = datetime.now()
        db.commit()
        
        logger.info(f"Regenerated document {document_id} as new version")
        return new_document_bytes
    
    # ==========================================
    # INTERNAL HELPER METHODS
    # ==========================================
    
    def _gather_template_data(
        self,
        participant_id: int,
        db: Session,
        required_data: List[str],
        additional_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gather all data needed for template rendering"""
        context_data = {}
        
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError("Participant not found")
        
        context_data.update(self._get_participant_data(participant))
        
        if "care_plan" in required_data:
            care_plan = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if care_plan:
                context_data.update(self._get_care_plan_data(care_plan))
        
        if "risk_assessment" in required_data:
            risk_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.participant_id == participant_id
            ).order_by(desc(RiskAssessment.created_at)).first()
            
            if risk_assessment:
                context_data.update(self._get_risk_assessment_data(risk_assessment))
        
        context_data.update(self._get_organization_data())
        context_data.update(self._get_system_data())
        context_data.update(additional_data)
        
        return context_data
    
    def _get_participant_data(self, participant: Participant) -> Dict[str, Any]:
        """Extract participant data for template"""
        return {
            'participant_id': participant.id,
            'participant_first_name': participant.first_name or '',
            'participant_last_name': participant.last_name or '',
            'participant_full_name': f"{participant.first_name or ''} {participant.last_name or ''}".strip(),
            'participant_date_of_birth': participant.date_of_birth.strftime('%d/%m/%Y') if participant.date_of_birth else '',
            'participant_age': self._calculate_age(participant.date_of_birth) if participant.date_of_birth else '',
            'participant_phone': participant.phone_number or '',
            'participant_email': participant.email_address or '',
            'participant_ndis_number': participant.ndis_number or '',
            'participant_plan_type': participant.plan_type or '',
            'participant_support_category': participant.support_category or '',
            'participant_disability_type': participant.disability_type or '',
            'participant_status': participant.status or '',
            'participant_risk_level': participant.risk_level or '',
            'participant_address_street': getattr(participant, 'street_address', '') or '',
            'participant_address_city': getattr(participant, 'city', '') or '',
            'participant_address_state': getattr(participant, 'state', '') or '',
            'participant_address_postcode': getattr(participant, 'postcode', '') or '',
            'participant_address_full': self._format_address(participant),
            'representative_first_name': participant.rep_first_name or '',
            'representative_last_name': participant.rep_last_name or '',
            'representative_full_name': f"{participant.rep_first_name or ''} {participant.rep_last_name or ''}".strip(),
            'representative_relationship': participant.rep_relationship or '',
            'representative_phone': participant.rep_phone_number or '',
            'representative_email': participant.rep_email_address or '',
            'plan_start_date': participant.plan_start_date.strftime('%d/%m/%Y') if participant.plan_start_date else '',
            'plan_review_date': participant.plan_review_date.strftime('%d/%m/%Y') if participant.plan_review_date else '',
            'plan_manager_name': participant.plan_manager_name or '',
            'plan_manager_agency': participant.plan_manager_agency or '',
            'available_funding': participant.available_funding or '',
            'client_goals': participant.client_goals or '',
            'support_goals': participant.support_goals or '',
            'current_supports': participant.current_supports or '',
            'accessibility_needs': participant.accessibility_needs or '',
            'cultural_considerations': participant.cultural_considerations or '',
        }
    
    def _get_care_plan_data(self, care_plan: CarePlan) -> Dict[str, Any]:
        """Extract care plan data for template"""
        return {
            'care_plan_name': care_plan.plan_name or '',
            'care_plan_version': care_plan.plan_version or '',
            'care_plan_period': care_plan.plan_period or '',
            'care_plan_summary': care_plan.summary or '',
            'care_plan_strengths': care_plan.participant_strengths or '',
            'care_plan_preferences': care_plan.participant_preferences or '',
            'care_plan_family_goals': care_plan.family_goals or '',
            'care_plan_emergency_contacts': care_plan.emergency_contacts or '',
            'care_plan_cultural_considerations': care_plan.cultural_considerations or '',
            'care_plan_communication_preferences': care_plan.communication_preferences or '',
            'care_plan_start_date': care_plan.start_date.strftime('%d/%m/%Y') if care_plan.start_date else '',
            'care_plan_end_date': care_plan.end_date.strftime('%d/%m/%Y') if care_plan.end_date else '',
        }
    
    def _get_risk_assessment_data(self, risk_assessment: RiskAssessment) -> Dict[str, Any]:
        """Extract risk assessment data for template"""
        return {
            'risk_assessment_date': risk_assessment.assessment_date.strftime('%d/%m/%Y') if risk_assessment.assessment_date else '',
            'risk_assessor_name': risk_assessment.assessor_name or '',
            'risk_assessor_role': risk_assessment.assessor_role or '',
            'risk_overall_rating': risk_assessment.overall_risk_rating or '',
            'risk_emergency_procedures': risk_assessment.emergency_procedures or '',
            'risk_monitoring_requirements': risk_assessment.monitoring_requirements or '',
            'risk_staff_training_needs': risk_assessment.staff_training_needs or '',
            'risk_equipment_requirements': risk_assessment.equipment_requirements or '',
            'risk_environmental_modifications': risk_assessment.environmental_modifications or '',
        }
    
    def _get_organization_data(self) -> Dict[str, Any]:
        """Get organization/provider data from settings"""
        return {
            'organization_name': os.getenv('ORGANIZATION_NAME', 'Your NDIS Service Provider'),
            'organization_abn': os.getenv('ORGANIZATION_ABN', 'XX XXX XXX XXX'),
            'organization_address': os.getenv('ORGANIZATION_ADDRESS', '123 Service Street, City, State, Postcode'),
            'organization_phone': os.getenv('ORGANIZATION_PHONE', '1300 XXX XXX'),
            'organization_email': os.getenv('ORGANIZATION_EMAIL', 'info@yourprovider.com.au'),
            'organization_website': os.getenv('ORGANIZATION_WEBSITE', 'www.yourprovider.com.au'),
        }
    
    def _get_system_data(self) -> Dict[str, Any]:
        """Get system/date data"""
        return {
            'current_date': datetime.now().strftime('%d/%m/%Y'),
            'current_datetime': datetime.now().strftime('%d/%m/%Y %H:%M'),
            'financial_year': self._get_financial_year(),
            'generation_timestamp': datetime.now().isoformat(),
        }
    
    def _calculate_age(self, birth_date: date) -> int:
        """Calculate age from birth date"""
        today = date.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    
    def _format_address(self, participant: Participant) -> str:
        """Format participant address as a single string"""
        address_parts = []
        
        if hasattr(participant, 'street_address') and participant.street_address:
            address_parts.append(participant.street_address)
        
        city_state_postcode = []
        if hasattr(participant, 'city') and participant.city:
            city_state_postcode.append(participant.city)
        if hasattr(participant, 'state') and participant.state:
            city_state_postcode.append(participant.state)
        if hasattr(participant, 'postcode') and participant.postcode:
            city_state_postcode.append(participant.postcode)
        
        if city_state_postcode:
            address_parts.append(' '.join(city_state_postcode))
        
        return ', '.join(address_parts)
    
    def _get_financial_year(self) -> str:
        """Get current Australian financial year"""
        now = datetime.now()
        if now.month >= 7:
            return f"{now.year}-{now.year + 1}"
        else:
            return f"{now.year - 1}-{now.year}"
    
    def _get_template_content(self, template_id: str) -> str:
        """Get template content from file"""
        config = self.templates_config[template_id]
        template_path = self.template_dir / config["template_file"]
        
        if template_path.exists():
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            raise ValueError(f"Template file not found: {template_path}")
    
    def _generate_pdf_from_html(self, html_content: str) -> bytes:
        """Generate PDF using WeasyPrint"""
        if not WEASYPRINT_AVAILABLE:
            logger.warning("WeasyPrint not available, returning HTML instead")
            return self._generate_html_output(html_content, "fallback")
        
        try:
            css_content = self._get_default_css()
            css = CSS(string=css_content)
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf(stylesheets=[css])
            return pdf_bytes
        except Exception as e:
            logger.error(f"PDF generation failed: {str(e)}")
            logger.info("Falling back to HTML generation")
            return self._generate_html_output(html_content, "fallback")
    
    def _generate_html_output(self, html_content: str, template_id: str) -> bytes:
        """Generate HTML file as fallback"""
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Document - {template_id}</title>
            <style>
                {self._get_default_css()}
                @media print {{
                    body {{ margin: 0; }}
                    .no-print {{ display: none; }}
                }}
                @media screen {{
                    body {{ max-width: 8.5in; margin: 0 auto; padding: 1in; }}
                    .print-notice {{
                        background: #e3f2fd;
                        border: 1px solid #2196f3;
                        padding: 10px;
                        margin-bottom: 20px;
                        border-radius: 4px;
                        text-align: center;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="print-notice no-print">
                <strong>Tip:</strong> Use your browser's Print function (Ctrl+P) to save as PDF.
            </div>
            {html_content}
        </body>
        </html>
        """
        return styled_html.encode('utf-8')
    
    def _get_default_css(self) -> str:
        """Get default CSS for document styling"""
        return """
        @page {
            size: A4;
            margin: 2.5cm;
            @bottom-center {
                content: 'Page ' counter(page) ' of ' counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        body {
            font-family: 'Helvetica', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
        }
        h1 {
            font-size: 18pt;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 20pt;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1pt;
        }
        h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #34495e;
            margin-top: 20pt;
            margin-bottom: 10pt;
            border-bottom: 1pt solid #bdc3c7;
            padding-bottom: 5pt;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            color: #2c3e50;
            margin-top: 15pt;
            margin-bottom: 8pt;
        }
        p {
            margin-bottom: 8pt;
            text-align: justify;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15pt;
        }
        th, td {
            border: 1pt solid #bdc3c7;
            padding: 8pt;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #ecf0f1;
            font-weight: bold;
            color: #2c3e50;
        }
        .header {
            text-align: center;
            margin-bottom: 30pt;
            border-bottom: 2pt solid #3498db;
            padding-bottom: 15pt;
        }
        .section {
            margin-bottom: 20pt;
        }
        .signature-section {
            margin-top: 40pt;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 200pt;
            text-align: center;
        }
        .signature-line {
            border-bottom: 1pt solid #333;
            margin-bottom: 5pt;
            height: 30pt;
        }
        """
    
    def _store_generated_document(
        self,
        db: Session,
        template_id: str,
        participant_id: int,
        document_bytes: bytes,
        format: str,
        context_data: Dict[str, Any],
        created_by: str
    ) -> Document:
        """Store generated document in database and filesystem, then update workflow"""
        try:
            config = self.templates_config[template_id]
            
            participant = db.query(Participant).filter(Participant.id == participant_id).first()
            safe_name = f"{config['name']}_{participant.first_name}_{participant.last_name}".replace(" ", "_")
            filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}"
            
            upload_dir = Path("uploads/documents") / str(participant_id)
            upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = upload_dir / filename
            
            with open(file_path, 'wb') as f:
                f.write(document_bytes)
            
            document = Document(
                participant_id=participant_id,
                title=config["name"],
                filename=filename,
                original_filename=filename,
                file_path=str(file_path.absolute()),
                file_size=len(document_bytes),
                mime_type='application/pdf' if format == 'pdf' else 'text/html',
                category=config["category"],
                description=f"Generated from template: {template_id}",
                status="active",
                uploaded_by=created_by,
                extra_metadata={
                    'template_id': template_id,
                    'template_version': config.get('version', '1.0'),
                    'generation_timestamp': datetime.now().isoformat(),
                    'format': format
                }
            )
            
            db.add(document)
            db.commit()
            db.refresh(document)
            
            # ========== WORKFLOW UPDATE - CRITICAL FIX ==========
            workflow = db.query(ProspectiveWorkflow).filter(
                ProspectiveWorkflow.participant_id == participant_id
            ).first()
            
            if workflow and not workflow.documents_generated:
                workflow.documents_generated = True
                workflow.documents_generated_date = datetime.now()
                workflow.updated_at = datetime.now()
                db.commit()
                logger.info(f"✅ Updated workflow for participant {participant_id} - documents generated")
            elif not workflow:
                logger.warning(f"⚠️ No workflow found for participant {participant_id} - creating one")
                workflow = ProspectiveWorkflow(
                    participant_id=participant_id,
                    documents_generated=True,
                    documents_generated_date=datetime.now()
                )
                db.add(workflow)
                db.commit()
                logger.info(f"✅ Created workflow for participant {participant_id} with documents_generated=True")
            # ===================================================
            
            logger.info(f"Stored generated document {document.id}")
            return document
            
        except Exception as e:
            logger.error(f"Error storing generated document: {str(e)}")
            db.rollback()
            raise e
    
    def _identify_missing_fields(self, context_data: Dict[str, Any]) -> List[str]:
        """Identify empty or missing fields in context data"""
        missing = []
        for key, value in context_data.items():
            if value == '' or value is None:
                missing.append(key)
        return missing
    
    def _extract_template_id_from_document(self, document: Document) -> Optional[str]:
        """Extract template ID from document metadata"""
        if hasattr(document, 'extra_metadata') and document.extra_metadata:
            return document.extra_metadata.get('template_id')
        return None
    
    def create_default_templates(self):
        """Create default HTML templates if they don't exist"""
        self.template_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Template directory ready: {self.template_dir}")