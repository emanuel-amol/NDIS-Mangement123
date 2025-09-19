# backend/app/services/document_notification_service.py - AUTOMATED EXPIRY NOTIFICATIONS
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models.document import Document, DocumentNotification
from app.models.participant import Participant
from typing import List, Optional
from datetime import datetime, timedelta
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os
from jinja2 import Environment, BaseLoader

logger = logging.getLogger(__name__)

class DocumentNotificationService:
    
    def __init__(self):
        # Email configuration from environment variables
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.organization_name = os.getenv('ORGANIZATION_NAME', 'NDIS Service Provider')
        
        # Jinja2 environment for email templates
        self.jinja_env = Environment(loader=BaseLoader())
    
    def process_expiry_notifications(self, db: Session) -> dict:
        """Process all pending document expiry notifications"""
        try:
            results = {
                'processed': 0,
                'sent': 0,
                'failed': 0,
                'errors': []
            }
            
            # Get documents expiring within 30 days that haven't been notified
            thirty_days_from_now = datetime.now() + timedelta(days=30)
            seven_days_from_now = datetime.now() + timedelta(days=7)
            
            # Documents expiring in 30 days (first warning)
            expiring_30_days = db.query(Document).filter(
                and_(
                    Document.expiry_date <= thirty_days_from_now,
                    Document.expiry_date >= datetime.now(),
                    Document.status == "active",
                    ~Document.expiry_notification_sent
                )
            ).all()
            
            # Documents expiring in 7 days (urgent warning) 
            expiring_7_days = db.query(Document).filter(
                and_(
                    Document.expiry_date <= seven_days_from_now,
                    Document.expiry_date >= datetime.now(),
                    Document.status == "active"
                )
            ).all()
            
            # Documents already expired
            expired_docs = db.query(Document).filter(
                and_(
                    Document.expiry_date < datetime.now(),
                    Document.status == "active"
                )
            ).all()
            
            # Process 30-day warnings
            for doc in expiring_30_days:
                results['processed'] += 1
                if self._send_expiry_notification(db, doc, 'expiry_warning_30'):
                    results['sent'] += 1
                    doc.expiry_notification_sent = True
                else:
                    results['failed'] += 1
            
            # Process 7-day warnings
            for doc in expiring_7_days:
                results['processed'] += 1
                if self._send_expiry_notification(db, doc, 'expiry_warning_7'):
                    results['sent'] += 1
                else:
                    results['failed'] += 1
            
            # Process expired documents
            for doc in expired_docs:
                results['processed'] += 1
                if self._send_expiry_notification(db, doc, 'expired'):
                    results['sent'] += 1
                else:
                    results['failed'] += 1
            
            db.commit()
            logger.info(f"Processed {results['processed']} notifications, sent {results['sent']}, failed {results['failed']}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing expiry notifications: {str(e)}")
            db.rollback()
            return {'processed': 0, 'sent': 0, 'failed': 1, 'errors': [str(e)]}
    
    def _send_expiry_notification(self, db: Session, document: Document, notification_type: str) -> bool:
        """Send expiry notification for a specific document"""
        try:
            # Get participant information
            participant = db.query(Participant).filter(Participant.id == document.participant_id).first()
            if not participant:
                logger.warning(f"Participant not found for document {document.id}")
                return False
            
            # Calculate days until expiry
            if document.expiry_date:
                days_until_expiry = (document.expiry_date - datetime.now()).days
            else:
                days_until_expiry = 0
            
            # Prepare notification data
            notification_data = {
                'document': document,
                'participant': participant,
                'days_until_expiry': days_until_expiry,
                'organization_name': self.organization_name,
                'notification_type': notification_type
            }
            
            # Recipients - managers, case managers, and participant (if email provided)
            recipients = self._get_notification_recipients(db, document, participant)
            
            if not recipients:
                logger.warning(f"No recipients found for document {document.id}")
                return False
            
            # Send notifications
            success = True
            for recipient in recipients:
                try:
                    if self._send_email_notification(notification_data, recipient):
                        # Log successful notification
                        self._log_notification(db, document, recipient, notification_type, True)
                    else:
                        success = False
                        self._log_notification(db, document, recipient, notification_type, False)
                except Exception as e:
                    logger.error(f"Error sending notification to {recipient['email']}: {str(e)}")
                    success = False
                    self._log_notification(db, document, recipient, notification_type, False, str(e))
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending expiry notification for document {document.id}: {str(e)}")
            return False
    
    def _get_notification_recipients(self, db: Session, document: Document, participant: Participant) -> List[dict]:
        """Get list of recipients for document notifications"""
        recipients = []
        
        # Always notify managers/admins (you would get this from your user/staff table)
        # For now, using environment variable for admin email
        admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL', 'admin@yourprovider.com.au')
        if admin_email:
            recipients.append({
                'email': admin_email,
                'name': 'System Administrator',
                'role': 'admin'
            })
        
        # Notify participant if email provided
        if participant.email_address:
            recipients.append({
                'email': participant.email_address,
                'name': f"{participant.first_name} {participant.last_name}",
                'role': 'participant'
            })
        
        # Notify representative if different from participant
        if participant.rep_email_address and participant.rep_email_address != participant.email_address:
            recipients.append({
                'email': participant.rep_email_address,
                'name': f"{participant.rep_first_name} {participant.rep_last_name}",
                'role': 'representative'
            })
        
        return recipients
    
    def _send_email_notification(self, notification_data: dict, recipient: dict) -> bool:
        """Send email notification to a specific recipient"""
        try:
            if not self.smtp_username or not self.smtp_password:
                logger.warning("SMTP credentials not configured - skipping email notification")
                return False
            
            # Generate email content based on notification type
            subject, body = self._generate_email_content(notification_data, recipient)
            
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = recipient['email']
            msg['Subject'] = subject
            
            # Add body
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email sent successfully to {recipient['email']}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {recipient['email']}: {str(e)}")
            return False
    
    def _generate_email_content(self, notification_data: dict, recipient: dict) -> tuple:
        """Generate email subject and body based on notification type"""
        document = notification_data['document']
        participant = notification_data['participant']
        days_until_expiry = notification_data['days_until_expiry']
        org_name = notification_data['organization_name']
        notification_type = notification_data['notification_type']
        
        # Subject line
        if notification_type == 'expired':
            subject = f"URGENT: Document Expired - {document.title}"
        elif notification_type == 'expiry_warning_7':
            subject = f"URGENT: Document Expires in {days_until_expiry} Days - {document.title}"
        else:
            subject = f"Document Expiry Reminder - {document.title}"
        
        # Email body template
        body_template = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                .urgent { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                .expired { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
                .info { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>{{ org_name }}</h2>
                    <p>Document Management System</p>
                </div>
                
                {% if notification_type == 'expired' %}
                <div class="expired">
                    <h3>⚠️ URGENT: Document Has Expired</h3>
                    <p>The following document has passed its expiry date and requires immediate attention:</p>
                </div>
                {% elif days_until_expiry <= 7 %}
                <div class="urgent">
                    <h3>🚨 URGENT: Document Expires Soon</h3>
                    <p>The following document will expire in <strong>{{ days_until_expiry }}</strong> day(s):</p>
                </div>
                {% else %}
                <div class="info">
                    <h3>📋 Document Expiry Reminder</h3>
                    <p>This is a reminder that the following document will expire in {{ days_until_expiry }} days:</p>
                </div>
                {% endif %}
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Document Title:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{ document.title }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Category:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{ document.category }}</td>
                    </tr>
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Participant:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{ participant.first_name }} {{ participant.last_name }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>NDIS Number:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{ participant.ndis_number or 'Pending' }}</td>
                    </tr>
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Expiry Date:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{{ document.expiry_date.strftime('%d/%m/%Y') if document.expiry_date else 'Not set' }}</td>
                    </tr>
                </table>
                
                <h4>Required Action:</h4>
                <ul>
                    {% if notification_type == 'expired' %}
                    <li>Review the expired document immediately</li>
                    <li>Upload a renewed or updated version if required</li>
                    <li>Update the participant's records as necessary</li>
                    <li>Contact the participant or their representative if needed</li>
                    {% else %}
                    <li>Review the document before expiry date</li>
                    <li>Prepare renewal or replacement if necessary</li>
                    <li>Schedule any required assessments or meetings</li>
                    <li>Notify participant or representative as appropriate</li>
                    {% endif %}
                </ul>
                
                {% if recipient.role == 'participant' or recipient.role == 'representative' %}
                <p><strong>Note:</strong> If you have any questions or need assistance, please contact our office at your earliest convenience.</p>
                {% endif %}
                
                <div class="footer">
                    <p>This is an automated notification from the {{ org_name }} Document Management System.</p>
                    <p>Please do not reply to this email. For assistance, contact your case manager or our main office.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Render template
        template = self.jinja_env.from_string(body_template)
        body = template.render(
            org_name=org_name,
            notification_type=notification_type,
            document=document,
            participant=participant,
            days_until_expiry=days_until_expiry,
            recipient=recipient
        )
        
        return subject, body
    
    def _log_notification(self, db: Session, document: Document, recipient: dict, 
                         notification_type: str, success: bool, error_message: str = None):
        """Log notification attempt to database"""
        try:
            notification = DocumentNotification(
                document_id=document.id,
                participant_id=document.participant_id,
                notification_type=notification_type,
                recipient_email=recipient['email'],
                recipient_role=recipient['role'],
                is_sent=success,
                sent_at=datetime.now() if success else None,
                error_message=error_message,
                scheduled_for=datetime.now()
            )
            
            db.add(notification)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging notification: {str(e)}")
    
    def send_new_document_notification(self, db: Session, document: Document) -> bool:
        """Send notification when a new document is uploaded"""
        try:
            participant = db.query(Participant).filter(Participant.id == document.participant_id).first()
            if not participant:
                return False
            
            notification_data = {
                'document': document,
                'participant': participant,
                'organization_name': self.organization_name,
                'notification_type': 'new_upload'
            }
            
            # Get relevant staff members who should be notified
            recipients = self._get_staff_notification_recipients(db, document, participant)
            
            success = True
            for recipient in recipients:
                if not self._send_new_document_email(notification_data, recipient):
                    success = False
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending new document notification: {str(e)}")
            return False
    
    def _get_staff_notification_recipients(self, db: Session, document: Document, participant: Participant) -> List[dict]:
        """Get staff members who should be notified about new documents"""
        recipients = []
        
        # Admin notification
        admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
        if admin_email:
            recipients.append({
                'email': admin_email,
                'name': 'Document Manager',
                'role': 'admin'
            })
        
        # You could extend this to include specific case managers, support workers, etc.
        # based on your user/staff management system
        
        return recipients
    
    def _send_new_document_email(self, notification_data: dict, recipient: dict) -> bool:
        """Send email notification for new document upload"""
        try:
            if not self.smtp_username or not self.smtp_password:
                return False
            
            document = notification_data['document']
            participant = notification_data['participant']
            org_name = notification_data['organization_name']
            
            subject = f"New Document Uploaded - {document.title}"
            
            body_template = """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h2>{{ org_name }}</h2>
                        <p>Document Management System</p>
                    </div>
                    
                    <div style="background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
                        <h3>📄 New Document Uploaded</h3>
                        <p>A new document has been uploaded for participant {{ participant.first_name }} {{ participant.last_name }}.</p>
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Document:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{{ document.title }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Category:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{{ document.category }}</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Uploaded By:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{{ document.uploaded_by }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Upload Date:</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{{ document.created_at.strftime('%d/%m/%Y %H:%M') }}</td>
                        </tr>
                    </table>
                    
                    <p>Please review the document in the management system as appropriate.</p>
                </div>
            </body>
            </html>
            """
            
            template = self.jinja_env.from_string(body_template)
            body = template.render(
                org_name=org_name,
                document=document,
                participant=participant
            )
            
            # Send email
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = recipient['email']
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending new document email: {str(e)}")
            return False