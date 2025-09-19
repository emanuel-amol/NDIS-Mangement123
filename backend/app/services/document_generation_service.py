# backend/app/services/document_generation_service.py - FIXED VERSION WITH OPTIONAL WEASYPRINT
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models.participant import Participant
from app.models.care_plan import CarePlan, RiskAssessment
# FIXED: Import with correct class names
from app.models.document_generation import DocumentGenerationTemplate, GeneratedDocument, DocumentGenerationVariable
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import json
import re
from jinja2 import Environment, FileSystemLoader, Template
import logging
import os
from pathlib import Path


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
    
    def __init__(self):
        # Set up Jinja2 environment
        self.template_dir = Path(__file__).parent.parent / "templates" / "documents"
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        self.env = Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=True
        )
        
        # Create default templates if they don't exist
        self.create_default_templates()
        
        # Template configuration
        self.templates_config = {
            "basic_service_agreement": {
                "name": "Basic Service Agreement",
                "category": "service_agreements", 
                "description": "Standard NDIS service agreement",
                "template_file": "basic_service_agreement.html",
                "required_data": ["participant", "organization"],
                "template_available": True
            },
            "participant_handbook": {
                "name": "Participant Handbook",
                "category": "intake_documents",
                "description": "Welcome handbook for new participants", 
                "template_file": "participant_handbook.html",
                "required_data": ["participant", "organization"],
                "template_available": True
            },
            "medical_consent_form": {
                "name": "Medical Consent Form",
                "category": "medical_consent",
                "description": "Medical information consent form",
                "template_file": "medical_consent_form.html", 
                "required_data": ["participant", "organization"],
                "template_available": True
            },
            "sda_service_agreement": {
                "name": "SDA Service Agreement",
                "category": "service_agreements",
                "description": "Specialist Disability Accommodation agreement",
                "template_file": "sda_service_agreement.html",
                "required_data": ["participant", "organization"],
                "template_available": True
            },
            "medication_management_form": {
                "name": "Medication Management Form", 
                "category": "medical_consent",
                "description": "Form for managing participant medications",
                "template_file": "medication_management_form.html",
                "required_data": ["participant", "organization"],
                "template_available": True
            }
        }
    
    def get_available_templates(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all available document templates"""
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
                "template_available": config["template_available"]
            })
        
        return templates
    
    def generate_document(
        self, 
        template_id: str, 
        participant_id: int, 
        db: Session, 
        additional_data: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Generate a document from template - supports both PDF and HTML"""
        
        if template_id not in self.templates_config:
            raise ValueError(f"Template {template_id} not found")
        
        config = self.templates_config[template_id]
        
        if not config["template_available"]:
            raise ValueError(f"Template file {config['template_file']} not found")
        
        # Gather template data
        context_data = self._gather_template_data(
            participant_id, db, config["required_data"], additional_data or {}
        )
        
        # Get template content and render
        template_content = self._get_template_content(template_id)
        
        # Render template
        try:
            template = self.env.from_string(template_content)
            html_content = template.render(**context_data)
        except Exception as e:
            logger.error(f"Error rendering template {template_id}: {str(e)}")
            raise ValueError(f"Template rendering failed: {str(e)}")
        
        # Try to generate PDF if WeasyPrint is available, otherwise return HTML
        if WEASYPRINT_AVAILABLE:
            try:
                return self._generate_pdf_from_html(html_content)
            except Exception as e:
                logger.warning(f"PDF generation failed: {e}")
                logger.info("Falling back to HTML generation")
        
        # Fallback: return HTML as bytes
        return self._generate_html_fallback(html_content, template_id)
    
    def _generate_pdf_from_html(self, html_content: str) -> bytes:
        """Generate PDF using WeasyPrint"""
        try:
            # Create CSS for better styling
            css_content = self._get_default_css()
            css = CSS(string=css_content)
            
            # Generate PDF
            html_doc = HTML(string=html_content)
            pdf_bytes = html_doc.write_pdf(stylesheets=[css])
            
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise ValueError(f"PDF generation failed: {str(e)}")
    
    def _generate_html_fallback(self, html_content: str, template_id: str) -> bytes:
        """Generate HTML file as fallback when PDF is not available"""
        logger.info(f"Generating HTML fallback for template {template_id}")
        
        # Add some basic styling and make it print-friendly
        styled_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Document - {template_id}</title>
            <style>
                {self._get_default_css()}
                
                /* Print-friendly styles */
                @media print {{
                    body {{ margin: 0; }}
                    .no-print {{ display: none; }}
                }}
                
                /* Web view styles */
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
                <strong>💡 Tip:</strong> PDF generation is not available on this system. 
                Use your browser's Print function (Ctrl+P) to save as PDF.
            </div>
            {html_content}
        </body>
        </html>
        """
        
        return styled_html.encode('utf-8')
    
    def _get_template_content(self, template_id: str) -> str:
        """Get template content from file or database"""
        config = self.templates_config[template_id]
        template_path = self.template_dir / config["template_file"]
        
        if template_path.exists():
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            # If file doesn't exist, return a basic template
            return self._get_basic_template(template_id)
    
    def _get_basic_template(self, template_id: str) -> str:
        """Get a basic template if file doesn't exist"""
        config = self.templates_config[template_id]
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{config["name"]}</title>
</head>
<body>
    <div class="header">
        <h1>{config["name"]}</h1>
        <p><strong>{{{{ organization_name }}}}</strong></p>
        <p>Date: {{{{ current_date }}}}</p>
    </div>
    
    <div class="section">
        <h2>Participant Information</h2>
        <p><strong>Name:</strong> {{{{ participant_full_name }}}}</p>
        <p><strong>NDIS Number:</strong> {{{{ participant_ndis_number }}}}</p>
        <p><strong>Date of Birth:</strong> {{{{ participant_date_of_birth }}}}</p>
    </div>
    
    <div class="section">
        <p>This is a basic template for {config["name"]}. 
        Please customize this template according to your organization's needs.</p>
    </div>
</body>
</html>'''
    
    def preview_template_data(self, template_id: str, participant_id: int, db: Session) -> Dict[str, Any]:
        """Preview the data that would be used for template generation"""
        
        if template_id not in self.templates_config:
            raise ValueError(f"Template {template_id} not found")
        
        config = self.templates_config[template_id]
        
        return self._gather_template_data(
            participant_id, db, config["required_data"], {}
        )
    
    def _gather_template_data(
        self, 
        participant_id: int, 
        db: Session, 
        required_data: List[str], 
        additional_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Gather all data needed for template rendering"""
        
        context_data = {}
        
        # Get participant data
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise ValueError("Participant not found")
        
        # Add participant data
        context_data.update(self._get_participant_data(participant))
        
        # Get care plan data if needed
        if "care_plan" in required_data:
            care_plan = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if care_plan:
                context_data.update(self._get_care_plan_data(care_plan))
        
        # Get risk assessment data if needed  
        if "risk_assessment" in required_data:
            risk_assessment = db.query(RiskAssessment).filter(
                RiskAssessment.participant_id == participant_id
            ).order_by(desc(RiskAssessment.created_at)).first()
            
            if risk_assessment:
                context_data.update(self._get_risk_assessment_data(risk_assessment))
        
        # Add organization data
        context_data.update(self._get_organization_data())
        
        # Add system data
        context_data.update(self._get_system_data())
        
        # Add any additional data
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
            
            # Address information
            'participant_address_street': getattr(participant, 'street_address', '') or '',
            'participant_address_city': getattr(participant, 'city', '') or '',
            'participant_address_state': getattr(participant, 'state', '') or '',
            'participant_address_postcode': getattr(participant, 'postcode', '') or '',
            'participant_address_full': self._format_address(participant),
            
            # Representative information
            'representative_first_name': participant.rep_first_name or '',
            'representative_last_name': participant.rep_last_name or '',
            'representative_full_name': f"{participant.rep_first_name or ''} {participant.rep_last_name or ''}".strip(),
            'representative_relationship': participant.rep_relationship or '',
            'representative_phone': participant.rep_phone_number or '',
            'representative_email': participant.rep_email_address or '',
            
            # Plan information
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
        """Get organization/provider data - should come from settings/config"""
        
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
    
    def _get_default_css(self) -> str:
        """Get default CSS for PDF styling"""
        
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
    
    def create_default_templates(self):
        """Create default HTML templates if they don't exist"""
        
        # Check if templates directory exists, if not create basic templates
        if not self.template_dir.exists() or not any(self.template_dir.iterdir()):
            logger.info("Creating default document templates...")
            
            # Create a basic service agreement template
            basic_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NDIS Service Agreement</title>
</head>
<body>
    <div class="header">
        <h1>NDIS SERVICE AGREEMENT</h1>
        <p><strong>{{ organization_name }}</strong></p>
        <p>ABN: {{ organization_abn }}</p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="section">
        <h2>PARTICIPANT INFORMATION</h2>
        <table>
            <tr>
                <th>Name:</th>
                <td>{{ participant_full_name }}</td>
            </tr>
            <tr>
                <th>Date of Birth:</th>
                <td>{{ participant_date_of_birth }}</td>
            </tr>
            <tr>
                <th>NDIS Number:</th>
                <td>{{ participant_ndis_number }}</td>
            </tr>
            <tr>
                <th>Phone:</th>
                <td>{{ participant_phone }}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h2>SERVICE DETAILS</h2>
        <p><strong>Plan Type:</strong> {{ participant_plan_type }}</p>
        <p><strong>Support Category:</strong> {{ participant_support_category }}</p>
        {% if client_goals %}
        <p><strong>Client Goals:</strong> {{ client_goals }}</p>
        {% endif %}
    </div>
    
    <div class="signature-section">
        <div>
            <div class="signature-line"></div>
            <p><strong>Participant Signature</strong></p>
            <p>{{ participant_full_name }}</p>
            <p>Date: _______________</p>
        </div>
        
        <div>
            <div class="signature-line"></div>
            <p><strong>Provider Representative</strong></p>
            <p>{{ organization_name }}</p>
            <p>Date: _______________</p>
        </div>
    </div>
</body>
</html>'''
            
            # Save the template
            template_path = self.template_dir / "basic_service_agreement.html"
            try:
                with open(template_path, 'w', encoding='utf-8') as f:
                    f.write(basic_template)
                logger.info(f"Created template: {template_path}")
            except Exception as e:
                logger.error(f"Error creating template {template_path}: {str(e)}")

    def create_default_templates_db(self, db: Session):
        """Create default templates in database"""
        try:
            # Check if templates exist
            existing = db.query(DocumentGenerationTemplate).first()
            if existing:
                logger.info("Templates already exist in database")
                return
            
            # Create basic service agreement template
            template = DocumentGenerationTemplate(
                template_type="service_agreement",
                name="NDIS Service Agreement",
                description="Standard NDIS service agreement",
                category="service_agreements",
                template_content="""<!DOCTYPE html>
<html>
<head><title>NDIS Service Agreement</title></head>
<body>
<h1>{{ organization_name }}</h1>
<h2>Service Agreement</h2>
<p>Participant: {{ participant_full_name }}</p>
<p>NDIS Number: {{ participant_ndis_number }}</p>
<p>Date: {{ current_date }}</p>
</body>
</html>""",
                is_active=True,
                is_default=True,
                created_by="system"
            )
            
            db.add(template)
            db.commit()
            logger.info("Created default template in database")
            
        except Exception as e:
            logger.error(f"Error creating default templates in database: {e}")
            db.rollback()