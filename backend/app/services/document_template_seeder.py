# backend/app/services/document_template_seeder.py
from sqlalchemy.orm import Session
from app.models.document_generation import DocumentTemplate, DocumentVariable
from typing import List

class DocumentTemplateSeeder:
    
    @staticmethod
    def seed_default_templates(db: Session):
        """Seed the database with default NDIS document templates"""
        
        templates = [
            DocumentTemplateSeeder._create_service_agreement_template(),
            DocumentTemplateSeeder._create_participant_handbook_template(),
            DocumentTemplateSeeder._create_medical_consent_template(),
            DocumentTemplateSeeder._create_sda_service_agreement_template(),
            DocumentTemplateSeeder._create_medication_management_form(),
            DocumentTemplateSeeder._create_information_consent_form(),
            DocumentTemplateSeeder._create_rental_sublease_agreement(),
        ]
        
        for template_data in templates:
            existing = db.query(DocumentTemplate).filter(
                DocumentTemplate.template_type == template_data['template_type']
            ).first()
            
            if not existing:
                template = DocumentTemplate(**template_data)
                db.add(template)
        
        db.commit()
        
        # Seed variables
        DocumentTemplateSeeder.seed_document_variables(db)
    
    @staticmethod
    def seed_document_variables(db: Session):
        """Seed document variables"""
        
        variables = [
            # Participant variables
            {
                'variable_name': 'participant_full_name',
                'display_name': 'Participant Full Name',
                'description': 'Complete name of the participant',
                'data_type': 'string',
                'source_table': 'participants',
                'source_field': 'first_name,last_name',
                'is_required': True,
                'category': 'participant'
            },
            {
                'variable_name': 'participant_date_of_birth',
                'display_name': 'Date of Birth',
                'description': 'Participant\'s date of birth',
                'data_type': 'date',
                'source_table': 'participants',
                'source_field': 'date_of_birth',
                'is_required': True,
                'category': 'participant'
            },
            {
                'variable_name': 'participant_ndis_number',
                'display_name': 'NDIS Number',
                'description': 'Participant\'s NDIS number',
                'data_type': 'string',
                'source_table': 'participants',
                'source_field': 'ndis_number',
                'is_required': False,
                'category': 'participant'
            },
            {
                'variable_name': 'participant_address_full',
                'display_name': 'Full Address',
                'description': 'Complete address of the participant',
                'data_type': 'string',
                'source_table': 'participants',
                'source_field': 'street_address,city,state,postcode',
                'is_required': False,
                'category': 'participant'
            },
            # Organization variables
            {
                'variable_name': 'organization_name',
                'display_name': 'Organization Name',
                'description': 'Name of the service provider organization',
                'data_type': 'string',
                'default_value': 'Your NDIS Service Provider',
                'is_required': True,
                'category': 'organization'
            },
            {
                'variable_name': 'organization_abn',
                'display_name': 'Organization ABN',
                'description': 'Australian Business Number',
                'data_type': 'string',
                'default_value': 'XX XXX XXX XXX',
                'is_required': True,
                'category': 'organization'
            },
            # Date variables
            {
                'variable_name': 'current_date',
                'display_name': 'Current Date',
                'description': 'Today\'s date',
                'data_type': 'date',
                'is_required': False,
                'category': 'system'
            },
        ]
        
        for var_data in variables:
            existing = db.query(DocumentVariable).filter(
                DocumentVariable.variable_name == var_data['variable_name']
            ).first()
            
            if not existing:
                variable = DocumentVariable(**var_data)
                db.add(variable)
        
        db.commit()
    
    @staticmethod
    def _create_service_agreement_template() -> dict:
        return {
            'template_type': 'service_agreement',
            'name': 'NDIS Service Agreement',
            'description': 'Standard NDIS service agreement between participant and provider',
            'category': 'service_agreements',
            'is_default': True,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>NDIS Service Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { width: 250px; border-bottom: 1px solid black; text-align: center; margin-top: 50px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
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
                <th>Address:</th>
                <td>{{ participant_address_full }}</td>
            </tr>
            <tr>
                <th>Phone:</th>
                <td>{{ participant_phone }}</td>
            </tr>
            <tr>
                <th>Support Category:</th>
                <td>{{ participant_support_category }}</td>
            </tr>
            {% if representative_full_name %}
            <tr>
                <th>Representative:</th>
                <td>{{ representative_full_name }} ({{ representative_relationship }})</td>
            </tr>
            {% endif %}
        </table>
    </div>
    
    <div class="section">
        <h2>SERVICE DETAILS</h2>
        <p><strong>Plan Type:</strong> {{ participant_plan_type }}</p>
        <p><strong>Plan Period:</strong> {{ plan_start_date }} to {{ plan_review_date }}</p>
        {% if plan_manager_name %}
        <p><strong>Plan Manager:</strong> {{ plan_manager_name }}{% if plan_manager_agency %} ({{ plan_manager_agency }}){% endif %}</p>
        {% endif %}
    </div>
    
    <div class="section">
        <h2>GOALS AND OUTCOMES</h2>
        {% if client_goals %}
        <p><strong>Client Goals:</strong></p>
        <p>{{ client_goals }}</p>
        {% endif %}
        
        {% if support_goals %}
        <p><strong>Support Goals:</strong></p>
        <p>{{ support_goals }}</p>
        {% endif %}
    </div>
    
    <div class="section">
        <h2>TERMS AND CONDITIONS</h2>
        <ol>
            <li><strong>Service Provision:</strong> {{ organization_name }} agrees to provide support services in accordance with the participant's NDIS plan and this service agreement.</li>
            <li><strong>Quality and Safety:</strong> All services will be provided in accordance with NDIS Quality and Safeguarding Framework requirements.</li>
            <li><strong>Complaints and Feedback:</strong> The participant has the right to make complaints and provide feedback through our established procedures.</li>
            <li><strong>Privacy and Confidentiality:</strong> All personal information will be handled in accordance with the Privacy Act 1988 and NDIS requirements.</li>
            <li><strong>Service Changes:</strong> Any changes to services must be agreed upon by both parties and documented.</li>
            <li><strong>Termination:</strong> Either party may terminate this agreement with 14 days written notice.</li>
        </ol>
    </div>
    
    {% if accessibility_needs %}
    <div class="section">
        <h2>ACCESSIBILITY REQUIREMENTS</h2>
        <p>{{ accessibility_needs }}</p>
    </div>
    {% endif %}
    
    {% if cultural_considerations %}
    <div class="section">
        <h2>CULTURAL CONSIDERATIONS</h2>
        <p>{{ cultural_considerations }}</p>
    </div>
    {% endif %}
    
    <div class="signature-section">
        <div>
            <div class="signature-box">Participant Signature</div>
            <p>{{ participant_full_name }}</p>
            <p>Date: _______________</p>
        </div>
        
        <div>
            <div class="signature-box">Provider Representative</div>
            <p>{{ organization_name }}</p>
            <p>Date: _______________</p>
        </div>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_date_of_birth': 'date',
                'participant_ndis_number': 'string',
                'participant_address_full': 'string',
                'participant_phone': 'string',
                'participant_support_category': 'string',
                'organization_name': 'string',
                'organization_abn': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_participant_handbook_template() -> dict:
        return {
            'template_type': 'participant_handbook',
            'name': 'Participant Handbook',
            'description': 'Welcome handbook for new participants',
            'category': 'intake_documents',
            'is_default': True,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>Participant Handbook</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0066cc; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .welcome-box { background-color: #f0f8ff; padding: 20px; border-left: 4px solid #0066cc; margin: 20px 0; }
        .contact-info { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
        .highlight { background-color: #ffffcc; padding: 2px 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PARTICIPANT HANDBOOK</h1>
        <h2>{{ organization_name }}</h2>
        <p>Prepared for: <strong>{{ participant_full_name }}</strong></p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="welcome-box">
        <h2>Welcome {{ participant_first_name }}!</h2>
        <p>We are delighted to welcome you to {{ organization_name }}. This handbook contains important information about our services, your rights, and how we work together to achieve your goals.</p>
    </div>
    
    <div class="section">
        <h2>ABOUT YOUR SERVICES</h2>
        <p><strong>Your Support Category:</strong> {{ participant_support_category }}</p>
        <p><strong>Plan Type:</strong> {{ participant_plan_type }}</p>
        <p><strong>Plan Period:</strong> {{ plan_start_date }} to {{ plan_review_date }}</p>
        {% if client_goals %}
        <p><strong>Your Goals:</strong></p>
        <p>{{ client_goals }}</p>
        {% endif %}
    </div>
    
    <div class="section">
        <h2>YOUR RIGHTS AND RESPONSIBILITIES</h2>
        <h3>Your Rights:</h3>
        <ul>
            <li>To be treated with dignity and respect</li>
            <li>To have your privacy and confidentiality protected</li>
            <li>To make choices about your support</li>
            <li>To access information about your services</li>
            <li>To make complaints and provide feedback</li>
            <li>To have your cultural needs respected</li>
        </ul>
        
        <h3>Your Responsibilities:</h3>
        <ul>
            <li>Treat staff and other participants with respect</li>
            <li>Follow health and safety guidelines</li>
            <li>Communicate any changes in your needs or circumstances</li>
            <li>Participate actively in your support planning</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>COMPLAINTS AND FEEDBACK</h2>
        <p>We value your feedback and take complaints seriously. You can:</p>
        <ul>
            <li>Speak directly to your support worker or manager</li>
            <li>Call our feedback line: {{ organization_phone }}</li>
            <li>Email us: {{ organization_email }}</li>
            <li>Contact the NDIS Quality and Safeguards Commission: 1800 035 544</li>
        </ul>
        <p class="highlight">All complaints are handled confidentially and without fear of retaliation.</p>
    </div>
    
    <div class="section">
        <h2>EMERGENCY PROCEDURES</h2>
        <p><strong>In case of emergency:</strong></p>
        <ul>
            <li><strong>Life-threatening emergency:</strong> Call 000</li>
            <li><strong>After hours support:</strong> {{ organization_phone }}</li>
            <li><strong>Your emergency contact:</strong> {{ representative_full_name }} - {{ representative_phone }}</li>
        </ul>
        {% if care_plan_emergency_contacts %}
        <p><strong>Additional Emergency Contacts:</strong></p>
        <p>{{ care_plan_emergency_contacts }}</p>
        {% endif %}
    </div>
    
    {% if cultural_considerations %}
    <div class="section">
        <h2>CULTURAL CONSIDERATIONS</h2>
        <p>We respect and support your cultural needs:</p>
        <p>{{ cultural_considerations }}</p>
    </div>
    {% endif %}
    
    {% if accessibility_needs %}
    <div class="section">
        <h2>ACCESSIBILITY SUPPORT</h2>
        <p>We provide the following accessibility support for you:</p>
        <p>{{ accessibility_needs }}</p>
    </div>
    {% endif %}
    
    <div class="contact-info">
        <h2>CONTACT INFORMATION</h2>
        <p><strong>{{ organization_name }}</strong></p>
        <p>Address: {{ organization_address }}</p>
        <p>Phone: {{ organization_phone }}</p>
        <p>Email: {{ organization_email }}</p>
        <p>Website: www.yourprovider.com.au</p>
        
        <p><strong>Business Hours:</strong> Monday to Friday, 9:00 AM - 5:00 PM</p>
        <p><strong>After Hours:</strong> Emergency support available 24/7</p>
    </div>
    
    <div class="section">
        <p><em>This handbook was prepared specifically for {{ participant_full_name }} on {{ current_date }}. Please keep this document for your records and refer to it whenever you have questions about your services.</em></p>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_first_name': 'string',
                'participant_support_category': 'string',
                'organization_name': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_medical_consent_template() -> dict:
        return {
            'template_type': 'medical_consent',
            'name': 'Medical Information Consent Form',
            'description': 'Consent form for medical information sharing',
            'category': 'medical_consent',
            'is_default': True,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>Medical Information Consent Form</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .consent-box { border: 2px solid #333; padding: 20px; margin: 20px 0; }
        .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { width: 250px; border-bottom: 1px solid black; text-align: center; margin-top: 30px; }
        .checkbox { display: inline-block; width: 15px; height: 15px; border: 1px solid #333; margin-right: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MEDICAL INFORMATION CONSENT FORM</h1>
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
            {% if representative_full_name %}
            <tr>
                <th>Representative:</th>
                <td>{{ representative_full_name }} ({{ representative_relationship }})</td>
            </tr>
            {% endif %}
        </table>
    </div>
    
    <div class="consent-box">
        <h2>CONSENT FOR MEDICAL INFORMATION</h2>
        <p>I, {{ participant_full_name }}{% if representative_full_name %} / {{ representative_full_name }}{% endif %}, give my consent for {{ organization_name }} to:</p>
        
        <p><span class="checkbox">☐</span> Access my medical information relevant to the provision of support services</p>
        <p><span class="checkbox">☐</span> Communicate with my healthcare providers regarding my care and support needs</p>
        <p><span class="checkbox">☐</span> Share my medical information with relevant support workers involved in my care</p>
        <p><span class="checkbox">☐</span> Store my medical information securely in accordance with privacy laws</p>
        <p><span class="checkbox">☐</span> Act on my behalf in medical emergencies when I cannot provide consent</p>
    </div>
    
    <div class="section">
        <h2>HEALTHCARE PROVIDERS</h2>
        <p>I authorize {{ organization_name }} to communicate with the following healthcare providers:</p>
        
        <table>
            <tr>
                <th>Provider Type</th>
                <th>Name</th>
                <th>Phone</th>
            </tr>
            <tr>
                <td>General Practitioner</td>
                <td>_______________________________</td>
                <td>_________________</td>
            </tr>
            <tr>
                <td>Specialist</td>
                <td>_______________________________</td>
                <td>_________________</td>
            </tr>
            <tr>
                <td>Allied Health Professional</td>
                <td>_______________________________</td>
                <td>_________________</td>
            </tr>
            <tr>
                <td>Pharmacy</td>
                <td>_______________________________</td>
                <td>_________________</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h2>LIMITATIONS AND CONDITIONS</h2>
        <ul>
            <li>This consent applies only to medical information necessary for the provision of NDIS support services</li>
            <li>Medical information will be shared only with authorized support workers directly involved in my care</li>
            <li>All medical information will be stored securely and in accordance with privacy laws</li>
            <li>I can withdraw this consent at any time by providing written notice</li>
            <li>This consent remains valid until withdrawn or until my services with {{ organization_name }} end</li>
        </ul>
    </div>
    
    <div class="signature-section">
        <div>
            <div class="signature-box">Participant/Representative Signature</div>
            <p>{{ participant_full_name }}{% if representative_full_name %}<br>{{ representative_full_name }}{% endif %}</p>
            <p>Date: _______________</p>
        </div>
        
        <div>
            <div class="signature-box">Witness Signature</div>
            <p>{{ organization_name }} Representative</p>
            <p>Date: _______________</p>
        </div>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_date_of_birth': 'date',
                'participant_ndis_number': 'string',
                'organization_name': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_sda_service_agreement_template() -> dict:
        return {
            'template_type': 'sda_service_agreement',
            'name': 'SDA Service Agreement',
            'description': 'Specialist Disability Accommodation Service Agreement',
            'category': 'service_agreements',
            'is_default': False,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>SDA Service Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .signature-section { margin-top: 50px; }
        .signature-box { width: 250px; border-bottom: 1px solid black; text-align: center; margin-top: 50px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .sda-features { background-color: #f0f8ff; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SPECIALIST DISABILITY ACCOMMODATION (SDA) SERVICE AGREEMENT</h1>
        <p><strong>{{ organization_name }}</strong></p>
        <p>ABN: {{ organization_abn }}</p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="section">
        <h2>PARTICIPANT INFORMATION</h2>
        <table>
            <tr><th>Name:</th><td>{{ participant_full_name }}</td></tr>
            <tr><th>Date of Birth:</th><td>{{ participant_date_of_birth }}</td></tr>
            <tr><th>NDIS Number:</th><td>{{ participant_ndis_number }}</td></tr>
            <tr><th>Disability Type:</th><td>{{ participant_disability_type }}</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>SDA ACCOMMODATION DETAILS</h2>
        <div class="sda-features">
            <p><strong>Property Address:</strong> [To be filled]</p>
            <p><strong>SDA Category:</strong> [High Physical Support/Improved Liveability/Robust/Fully Accessible]</p>
            <p><strong>Accommodation Type:</strong> [Apartment/Villa/Group Home]</p>
            <p><strong>Maximum Occupancy:</strong> [Number] residents</p>
            <p><strong>Accessibility Features:</strong> [List specific features]</p>
        </div>
    </div>
    
    <div class="section">
        <h2>SUPPORT COORDINATION</h2>
        {% if plan_manager_name %}
        <p><strong>Support Coordinator:</strong> {{ plan_manager_name }}</p>
        {% if plan_manager_agency %}
        <p><strong>Agency:</strong> {{ plan_manager_agency }}</p>
        {% endif %}
        {% endif %}
        <p><strong>On-site Support:</strong> [24/7 or scheduled hours]</p>
    </div>
    
    <div class="signature-section">
        <div class="signature-box">Participant Signature</div>
        <p>{{ participant_full_name }} - Date: _______________</p>
        
        <div class="signature-box">Provider Representative</div>
        <p>{{ organization_name }} - Date: _______________</p>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_date_of_birth': 'date',
                'participant_ndis_number': 'string',
                'participant_disability_type': 'string',
                'organization_name': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_medication_management_form() -> dict:
        return {
            'template_type': 'medication_management_form',
            'name': 'Medication Management Form',
            'description': 'Form for managing participant medications',
            'category': 'medical_consent',
            'is_default': True,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>Medication Management Form</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .med-table th { background-color: #e6f3ff; }
        .signature-section { margin-top: 50px; }
        .signature-box { width: 200px; border-bottom: 1px solid black; text-align: center; margin: 30px 20px; }
        .important { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MEDICATION MANAGEMENT FORM</h1>
        <p><strong>{{ organization_name }}</strong></p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="section">
        <h2>PARTICIPANT INFORMATION</h2>
        <table>
            <tr><th>Name:</th><td>{{ participant_full_name }}</td></tr>
            <tr><th>Date of Birth:</th><td>{{ participant_date_of_birth }}</td></tr>
            <tr><th>NDIS Number:</th><td>{{ participant_ndis_number }}</td></tr>
            <tr><th>Emergency Contact:</th><td>{{ representative_full_name }} - {{ representative_phone }}</td></tr>
            <tr><th>GP Name:</th><td>_______________________________</td></tr>
            <tr><th>GP Phone:</th><td>_______________________________</td></tr>
            <tr><th>Pharmacy:</th><td>_______________________________</td></tr>
        </table>
    </div>
    
    <div class="important">
        <h3>IMPORTANT INFORMATION</h3>
        <p><strong>Allergies/Adverse Reactions:</strong> ________________________________________________</p>
        <p><strong>Medical Conditions:</strong> _________________________________________________________________</p>
        <p><strong>Special Instructions:</strong> ________________________________________________________________</p>
    </div>
    
    <div class="section">
        <h2>CURRENT MEDICATIONS</h2>
        <table class="med-table">
            <tr>
                <th>Medication Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Time(s)</th>
                <th>Route</th>
                <th>Prescriber</th>
                <th>Date Started</th>
            </tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>PRN (AS NEEDED) MEDICATIONS</h2>
        <table class="med-table">
            <tr>
                <th>Medication</th>
                <th>Indication</th>
                <th>Dosage</th>
                <th>Maximum Dose/24hrs</th>
                <th>Special Instructions</th>
            </tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
            <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>ADMINISTRATION AUTHORIZATION</h2>
        <p>I authorize {{ organization_name }} support workers to:</p>
        <ul>
            <li>Administer medications as prescribed and documented above</li>
            <li>Observe and record medication administration</li>
            <li>Contact healthcare providers regarding medication concerns</li>
            <li>Safely store and dispose of medications as required</li>
        </ul>
    </div>
    
    <div class="signature-section">
        <div style="display: flex; justify-content: space-around;">
            <div>
                <div class="signature-box">Participant/Representative</div>
                <p>{{ participant_full_name }}{% if representative_full_name %}<br>{{ representative_full_name }}{% endif %}</p>
                <p>Date: _______________</p>
            </div>
            <div>
                <div class="signature-box">Healthcare Professional</div>
                <p>Name: ______________________</p>
                <p>Date: _______________</p>
            </div>
        </div>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_date_of_birth': 'date',
                'participant_ndis_number': 'string',
                'organization_name': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_information_consent_form() -> dict:
        return {
            'template_type': 'information_consent',
            'name': 'Participant Information Consent Form',
            'description': 'General information sharing consent form',
            'category': 'intake_documents',
            'is_default': True,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>Information Consent Form</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .consent-items { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        .signature-section { margin-top: 50px; }
        .signature-box { width: 250px; border-bottom: 1px solid black; text-align: center; margin: 30px 0; }
        .checkbox { display: inline-block; width: 15px; height: 15px; border: 1px solid #333; margin-right: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PARTICIPANT INFORMATION CONSENT FORM</h1>
        <p><strong>{{ organization_name }}</strong></p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="section">
        <table>
            <tr><th>Participant Name:</th><td>{{ participant_full_name }}</td></tr>
            <tr><th>Date of Birth:</th><td>{{ participant_date_of_birth }}</td></tr>
            <tr><th>NDIS Number:</th><td>{{ participant_ndis_number }}</td></tr>
            {% if representative_full_name %}
            <tr><th>Representative:</th><td>{{ representative_full_name }} ({{ representative_relationship }})</td></tr>
            {% endif %}
        </table>
    </div>
    
    <div class="consent-items">
        <h2>CONSENT FOR INFORMATION SHARING</h2>
        <p>I consent to {{ organization_name }} collecting, using, and disclosing my personal information for the following purposes:</p>
        
        <p><span class="checkbox">☐</span> <strong>Service Delivery:</strong> Planning, coordinating, and providing support services</p>
        <p><span class="checkbox">☐</span> <strong>Communication:</strong> Sharing information with my support team members</p>
        <p><span class="checkbox">☐</span> <strong>Emergency Situations:</strong> Sharing information in medical or safety emergencies</p>
        <p><span class="checkbox">☐</span> <strong>Quality Improvement:</strong> Using de-identified information to improve services</p>
        <p><span class="checkbox">☐</span> <strong>Compliance:</strong> Meeting NDIS and regulatory reporting requirements</p>
        <p><span class="checkbox">☐</span> <strong>Photography/Video:</strong> Taking photos or videos for service documentation</p>
        <p><span class="checkbox">☐</span> <strong>Marketing Materials:</strong> Using photos or testimonials in promotional materials</p>
    </div>
    
    <div class="section">
        <h2>INFORMATION SHARING LIMITS</h2>
        <p>My information may be shared with:</p>
        <ul>
            <li>Support workers directly involved in my care</li>
            <li>Healthcare professionals involved in my treatment</li>
            <li>NDIS and government agencies as required by law</li>
            <li>Emergency services in case of medical emergency</li>
            <li>Family members or representatives as authorized by me</li>
        </ul>
        
        <p><strong>Special Restrictions:</strong></p>
        <p>I do NOT consent to sharing information about: ________________________________</p>
        <p>_____________________________________________________________________</p>
    </div>
    
    <div class="section">
        <h2>YOUR RIGHTS</h2>
        <ul>
            <li>You can withdraw this consent at any time by notifying us in writing</li>
            <li>You can request access to your personal information</li>
            <li>You can request corrections to your information</li>
            <li>You can make a complaint about how your information is handled</li>
        </ul>
    </div>
    
    <div class="signature-section">
        <div style="display: flex; justify-content: space-between;">
            <div>
                <div class="signature-box">Participant/Representative Signature</div>
                <p>{{ participant_full_name }}{% if representative_full_name %}<br>{{ representative_full_name }}{% endif %}</p>
                <p>Date: _______________</p>
            </div>
            <div>
                <div class="signature-box">Witness</div>
                <p>{{ organization_name }} Representative</p>
                <p>Date: _______________</p>
            </div>
        </div>
    </div>
</body>
</html>
            ''',
            'template_variables': {
                'participant_full_name': 'string',
                'participant_date_of_birth': 'date',
                'participant_ndis_number': 'string',
                'organization_name': 'string',
                'current_date': 'date'
            }
        }
    
    @staticmethod
    def _create_rental_sublease_agreement() -> dict:
        return {
            'template_type': 'rental_sublease_agreement',
            'name': 'Rental Sublease Agreement',
            'description': 'Sublease agreement for SIL accommodation',
            'category': 'service_agreements',
            'is_default': False,
            'template_content': '''
<!DOCTYPE html>
<html>
<head>
    <title>Rental Sublease Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .financial-table { background-color: #f0f8ff; }
        .signature-section { margin-top: 50px; }
        .signature-box { width: 250px; border-bottom: 1px solid black; text-align: center; margin: 30px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RENTAL SUBLEASE AGREEMENT</h1>
        <p><strong>{{ organization_name }}</strong></p>
        <p>Date: {{ current_date }}</p>
    </div>
    
    <div class="section">
        <h2>PARTIES TO AGREEMENT</h2>
        <table>
            <tr><th>Tenant (Sublessor):</th><td>{{ organization_name }}</td></tr>
            <tr><th>Subtenant:</th><td>{{ participant_full_name }}</td></tr>
            <tr><th>Date of Birth:</th><td>{{ participant_date_of_birth }}</td></tr>
            <tr><th>NDIS Number:</th><td>{{ participant_ndis_number }}</td></tr>
            {% if representative_full_name %}
            <tr><th>Representative:</th><td>{{ representative_full_name }} ({{ representative_relationship }})</td></tr>
            {% endif %}
        </table>
    </div>
    
    <div class="section">
        <h2>PROPERTY DETAILS</h2>
        <table>
            <tr><th>Property Address:</th><td>[To be filled]</td></tr>
            <tr><th>Room Number:</th><td>[To be filled]</td></tr>
            <tr><th>Property Type:</th><td>[House/Apartment/Unit]</td></tr>
            <tr><th>Shared/Private Areas:</th><td>[To be specified]</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>FINANCIAL ARRANGEMENTS</h2>
        <table class="financial-table">
            <tr><th>Weekly Rent:</th><td>$________ per week</td></tr>
            <tr><th>Bond Amount:</th><td>$________ (equivalent to ___ weeks rent)</td></tr>
            <tr><th>Utilities (if separate):</th><td>$________ per week</td></tr>
            <tr><th>Other Charges:</th><td>$________ per week</td></tr>
            <tr><th><strong>Total Weekly Payment:</strong></th><td><strong>$________ per week</strong></td></tr>
        </table>
        
        <p><strong>Payment Method:</strong> [Direct Debit/NDIS Payment/Other]</p>
        <p><strong>Payment Due:</strong> [Weekly/Fortnightly] in advance</p>
    </div>
    
    <div class="section">
        <h2>TERM OF AGREEMENT</h2>
        <table>
            <tr><th>Commencement Date:</th><td>{{ plan_start_date }}</td></tr>
            <tr><th>Initial Term:</th><td>________ months</td></tr>
            <tr><th>Notice Period:</th><td>14 days written notice</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>SUPPORT SERVICES INCLUDED</h2>
        <ul>
            <li>24/7 on-call support (if applicable)</li>
            <li>Scheduled support visits as per NDIS plan</li>
            <li>Property maintenance and repairs</li>
            <li>Assistance with tenancy obligations</li>
            <li>Emergency response procedures</li>
        </ul>