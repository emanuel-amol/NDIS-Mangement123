# backend/app/services/email_service.py - COMPLETE EMAIL SERVICE
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from jinja2 import Environment, BaseLoader
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    """
    Complete email service for NDIS document management system
    Supports document expiry notifications, approval notifications, and general messaging
    """
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.organization_name = os.getenv('ORGANIZATION_NAME', 'NDIS Service Provider')
        self.organization_phone = os.getenv('ORGANIZATION_PHONE', '1300 XXX XXX')
        self.organization_email = os.getenv('ORGANIZATION_EMAIL', 'info@yourprovider.com.au')
        self.organization_address = os.getenv('ORGANIZATION_ADDRESS', '123 Service Street, City, State')
        
        # Check if email is configured
        self.is_configured = bool(self.smtp_username and self.smtp_password)
        if not self.is_configured:
            logger.warning("Email service not configured - SMTP credentials missing")
    
    def send_expiry_notification(self, participant, document, days_until_expiry: int) -> bool:
        """Send document expiry notification"""
        if not self.is_configured:
            logger.warning("Cannot send expiry notification - email not configured")
            return False
        
        try:
            # Determine urgency and template
            if days_until_expiry <= 0:
                subject = f"🚨 URGENT: Document Expired - {document.title}"
                template = self._get_expired_template()
                urgency = "expired"
            elif days_until_expiry <= 7:
                subject = f"⚠️ URGENT: Document Expires in {days_until_expiry} Days - {document.title}"
                template = self._get_urgent_template()
                urgency = "urgent"
            else:
                subject = f"📋 Document Expiry Reminder - {document.title}"
                template = self._get_reminder_template()
                urgency = "reminder"
            
            # Prepare template data
            template_data = {
                'participant_name': f"{participant.first_name} {participant.last_name}",
                'participant_first_name': participant.first_name,
                'document_title': document.title,
                'document_category': self._format_category(document.category),
                'days_until_expiry': days_until_expiry,
                'expiry_date': document.expiry_date.strftime('%d/%m/%Y') if document.expiry_date else 'Not set',
                'organization_name': self.organization_name,
                'organization_phone': self.organization_phone,
                'organization_email': self.organization_email,
                'organization_address': self.organization_address,
                'urgency': urgency,
                'current_date': datetime.now().strftime('%d/%m/%Y')
            }
            
            recipients_notified = 0
            
            # Send to participant
            if participant.email_address:
                if self._send_email(
                    to_email=participant.email_address,
                    subject=subject,
                    html_content=template.format(**template_data),
                    recipient_name=template_data['participant_name']
                ):
                    recipients_notified += 1
            
            # Send to representative if different
            if (participant.rep_email_address and 
                participant.rep_email_address != participant.email_address):
                
                rep_template_data = template_data.copy()
                rep_template_data['participant_name'] = f"{participant.rep_first_name} {participant.rep_last_name}"
                
                if self._send_email(
                    to_email=participant.rep_email_address,
                    subject=f"[For {participant.first_name} {participant.last_name}] {subject}",
                    html_content=template.format(**rep_template_data),
                    recipient_name=rep_template_data['participant_name']
                ):
                    recipients_notified += 1
            
            # Send to admin for critical notifications
            admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
            if urgency in ['urgent', 'expired'] and admin_email:
                admin_subject = f"[ADMIN ALERT] {subject} - {participant.first_name} {participant.last_name}"
                admin_template = self._get_admin_alert_template()
                
                admin_data = template_data.copy()
                admin_data.update({
                    'admin_message': f"This is an automated alert for urgent document expiry.",
                    'participant_full_name': f"{participant.first_name} {participant.last_name}",
                    'participant_ndis': participant.ndis_number or 'Pending',
                    'participant_phone': participant.phone_number or 'Not provided',
                    'participant_email': participant.email_address or 'Not provided'
                })
                
                self._send_email(
                    to_email=admin_email,
                    subject=admin_subject,
                    html_content=admin_template.format(**admin_data),
                    recipient_name="Administrator"
                )
            
            logger.info(f"Expiry notification sent to {recipients_notified} recipients for document {document.id}")
            return recipients_notified > 0
            
        except Exception as e:
            logger.error(f"Failed to send expiry notification for document {document.id}: {str(e)}")
            return False
    
    def send_approval_notification(self, participant, document, approver_name: str, approved: bool = True, comments: Optional[str] = None) -> bool:
        """Send document approval/rejection notification"""
        if not self.is_configured:
            logger.warning("Cannot send approval notification - email not configured")
            return False
        
        try:
            if approved:
                subject = f"✅ Document Approved - {document.title}"
                template = self._get_approval_template()
                status = "approved"
                status_color = "#16a34a"
                status_bg = "#f0fdf4"
                icon = "✅"
            else:
                subject = f"❌ Document Rejected - {document.title}"
                template = self._get_rejection_template()
                status = "rejected"
                status_color = "#dc2626"
                status_bg = "#fef2f2"
                icon = "❌"
            
            template_data = {
                'participant_name': f"{participant.first_name} {participant.last_name}",
                'participant_first_name': participant.first_name,
                'document_title': document.title,
                'document_category': self._format_category(document.category),
                'approver_name': approver_name,
                'status': status,
                'status_color': status_color,
                'status_bg': status_bg,
                'icon': icon,
                'comments': comments or ("Your document has been approved and is now active." if approved else "Please contact us for more information about the required changes."),
                'organization_name': self.organization_name,
                'organization_phone': self.organization_phone,
                'organization_email': self.organization_email,
                'current_date': datetime.now().strftime('%d/%m/%Y'),
                'next_steps': self._get_next_steps(approved)
            }
            
            recipients_notified = 0
            
            # Send to participant
            if participant.email_address:
                if self._send_email(
                    to_email=participant.email_address,
                    subject=subject,
                    html_content=template.format(**template_data),
                    recipient_name=template_data['participant_name']
                ):
                    recipients_notified += 1
            
            # Send to representative if different
            if (participant.rep_email_address and 
                participant.rep_email_address != participant.email_address):
                
                rep_template_data = template_data.copy()
                rep_template_data['participant_name'] = f"{participant.rep_first_name} {participant.rep_last_name}"
                
                if self._send_email(
                    to_email=participant.rep_email_address,
                    subject=f"[For {participant.first_name} {participant.last_name}] {subject}",
                    html_content=template.format(**rep_template_data),
                    recipient_name=rep_template_data['participant_name']
                ):
                    recipients_notified += 1
            
            logger.info(f"Approval notification sent to {recipients_notified} recipients for document {document.id}")
            return recipients_notified > 0
            
        except Exception as e:
            logger.error(f"Failed to send approval notification for document {document.id}: {str(e)}")
            return False
    
    def send_new_document_notification(self, participant, document, uploaded_by: str) -> bool:
        """Send notification when a new document is uploaded"""
        if not self.is_configured:
            logger.warning("Cannot send new document notification - email not configured")
            return False
        
        try:
            subject = f"📄 New Document Uploaded - {document.title}"
            template = self._get_new_document_template()
            
            template_data = {
                'participant_name': f"{participant.first_name} {participant.last_name}",
                'participant_first_name': participant.first_name,
                'document_title': document.title,
                'document_category': self._format_category(document.category),
                'uploaded_by': uploaded_by,
                'upload_date': document.created_at.strftime('%d/%m/%Y at %I:%M %p') if hasattr(document, 'created_at') else datetime.now().strftime('%d/%m/%Y at %I:%M %p'),
                'organization_name': self.organization_name,
                'organization_phone': self.organization_phone,
                'organization_email': self.organization_email,
                'current_date': datetime.now().strftime('%d/%m/%Y')
            }
            
            # Send to admin/staff only for new document notifications
            admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
            if admin_email:
                admin_subject = f"[NEW UPLOAD] {subject} - {participant.first_name} {participant.last_name}"
                
                return self._send_email(
                    to_email=admin_email,
                    subject=admin_subject,
                    html_content=template.format(**template_data),
                    recipient_name="Administrator"
                )
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send new document notification for document {document.id}: {str(e)}")
            return False
    
    def send_bulk_expiry_report(self, expiring_documents: List[Dict], expired_documents: List[Dict], recipient_email: str) -> bool:
        """Send bulk expiry report to administrators"""
        if not self.is_configured:
            logger.warning("Cannot send bulk expiry report - email not configured")
            return False
        
        try:
            subject = f"📊 Document Expiry Report - {datetime.now().strftime('%d/%m/%Y')}"
            template = self._get_bulk_report_template()
            
            template_data = {
                'report_date': datetime.now().strftime('%d/%m/%Y'),
                'expiring_count': len(expiring_documents),
                'expired_count': len(expired_documents),
                'total_issues': len(expiring_documents) + len(expired_documents),
                'expiring_documents': expiring_documents[:10],  # Limit for email size
                'expired_documents': expired_documents[:10],    # Limit for email size
                'organization_name': self.organization_name,
                'has_more_expiring': len(expiring_documents) > 10,
                'has_more_expired': len(expired_documents) > 10
            }
            
            return self._send_email(
                to_email=recipient_email,
                subject=subject,
                html_content=template.format(**template_data),
                recipient_name="Administrator"
            )
            
        except Exception as e:
            logger.error(f"Failed to send bulk expiry report: {str(e)}")
            return False
    
    def test_email_configuration(self) -> Dict[str, Any]:
        """Test email configuration and connectivity"""
        if not self.is_configured:
            return {
                "success": False,
                "error": "Email not configured - missing SMTP credentials"
            }
        
        try:
            # Test SMTP connection
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.quit()
            
            return {
                "success": True,
                "message": "Email configuration is working correctly",
                "smtp_server": self.smtp_server,
                "smtp_port": self.smtp_port,
                "from_email": self.from_email
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Email configuration test failed: {str(e)}"
            }
    
    def _send_email(self, to_email: str, subject: str, html_content: str, recipient_name: str = "", attachments: Optional[List[str]] = None) -> bool:
        """Send email using SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.organization_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Add attachments if any
            if attachments:
                for attachment_path in attachments:
                    if os.path.exists(attachment_path):
                        with open(attachment_path, "rb") as file:
                            part = MIMEBase('application', 'octet-stream')
                            part.set_payload(file.read())
                            encoders.encode_base64(part)
                            part.add_header(
                                'Content-Disposition',
                                f'attachment; filename= {os.path.basename(attachment_path)}'
                            )
                            msg.attach(part)
            
            # Send email
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _format_category(self, category: str) -> str:
        """Format category for display"""
        category_names = {
            'service_agreements': 'Service Agreements',
            'medical_consent': 'Medical Consent',
            'intake_documents': 'Intake Documents',
            'care_plans': 'Care Plans',
            'risk_assessments': 'Risk Assessments',
            'medical_reports': 'Medical Reports',
            'general_documents': 'General Documents',
            'reporting_documents': 'Reporting Documents'
        }
        return category_names.get(category, category.replace('_', ' ').title())
    
    def _get_next_steps(self, approved: bool) -> str:
        """Get next steps text based on approval status"""
        if approved:
            return "Your document is now active and ready for use. No further action is required from you at this time."
        else:
            return "Please review the comments above and contact us to discuss the required changes. You can then resubmit your document for approval."
    
    # Email Templates
    def _get_reminder_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Expiry Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">NDIS Service Provider</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px;">📋 Document Expiry Reminder</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {participant_first_name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                This is a friendly reminder that your document <strong>"{document_title}"</strong> will expire in <strong>{days_until_expiry} days</strong> on <strong>{expiry_date}</strong>.
            </p>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Expires:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{expiry_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Days Remaining:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{days_until_expiry} days</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                To ensure uninterrupted service delivery, please contact us to renew or update this document before it expires.
            </p>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">What you need to do:</h4>
                <ul style="color: #374151; margin: 10px 0; padding-left: 20px;">
                    <li>Review your current document</li>
                    <li>Prepare any updated information</li>
                    <li>Contact us to schedule a renewal appointment</li>
                    <li>Submit the renewed document before the expiry date</li>
                </ul>
            </div>
        </div>
        
        <!-- Contact Section -->
        <div style="background: #f9fafb; padding: 30px 20px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Contact Us</h3>
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; vertical-align: top; width: 50%;">
                    <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;"><strong>Phone:</strong></p>
                    <p style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">{organization_phone}</p>
                    
                    <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;"><strong>Email:</strong></p>
                    <p style="color: #1f2937; margin: 0; font-size: 16px;">{organization_email}</p>
                </div>
                <div style="display: table-cell; vertical-align: top; width: 50%; padding-left: 20px;">
                    <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;"><strong>Address:</strong></p>
                    <p style="color: #1f2937; margin: 0; font-size: 14px; line-height: 1.4;">{organization_address}</p>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                This is an automated message from {organization_name}. Please do not reply to this email.<br>
                If you have any questions, please contact us using the details above.
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_urgent_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>URGENT: Document Expires Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px;">URGENT NOTIFICATION</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
                <h2 style="color: #92400e; margin: 0 0 10px 0; font-size: 20px;">⚠️ URGENT: Document Expires Soon</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {participant_first_name},
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 2px solid #fca5a5; margin: 20px 0;">
                <p style="color: #991b1b; font-size: 18px; line-height: 1.6; margin: 0; font-weight: bold; text-align: center;">
                    ⚠️ URGENT ACTION REQUIRED ⚠️
                </p>
                <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6; margin: 15px 0 0 0; text-align: center;">
                    Your document <strong>"{document_title}"</strong><br>
                    expires in only <strong style="font-size: 20px; color: #991b1b;">{days_until_expiry} DAYS</strong>
                </p>
            </div>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Expires:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{expiry_date}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Immediate Action Required:</h4>
                <ul style="color: #7f1d1d; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Call us immediately</strong> at {organization_phone}</li>
                    <li style="margin-bottom: 8px;"><strong>Email us urgently</strong> at {organization_email}</li>
                    <li style="margin-bottom: 8px;"><strong>Prepare your renewal documents</strong> today</li>
                    <li><strong>Schedule an appointment</strong> before the expiry date</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc2626; color: #ffffff; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold;">📞 CALL NOW: {organization_phone}</p>
                </div>
            </div>
        </div>
        
        <!-- Contact Section -->
        <div style="background: #fef2f2; padding: 30px 20px; border-top: 1px solid #fecaca;">
            <h3 style="color: #991b1b; margin: 0 0 15px 0; font-size: 18px;">Emergency Contact Information</h3>
            <div style="text-align: center;">
                <p style="color: #7f1d1d; margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">
                    📞 {organization_phone}
                </p>
                <p style="color: #7f1d1d; margin: 0 0 10px 0; font-size: 16px;">
                    ✉️ {organization_email}
                </p>
                <p style="color: #7f1d1d; margin: 0; font-size: 14px;">
                    🏢 {organization_address}
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #fca5a5; margin: 0; font-size: 12px;">
                ⚠️ URGENT NOTIFICATION - Immediate action required to avoid service disruption
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_expired_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRITICAL: Document Has Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #fca5a5; margin: 5px 0 0 0; font-size: 14px;">CRITICAL ALERT</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 3px solid #dc2626; margin-bottom: 20px;">
                <h2 style="color: #7f1d1d; margin: 0 0 10px 0; font-size: 20px; text-align: center;">🚨 CRITICAL: Document Has Expired</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {participant_first_name},
            </p>
            
            <div style="background: #7f1d1d; color: #ffffff; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 24px; font-weight: bold;">⚠️ EXPIRED ⚠️</p>
                <p style="margin: 10px 0 0 0; font-size: 18px;">
                    "{document_title}" expired on {expiry_date}
                </p>
            </div>
            
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <p style="color: #7f1d1d; font-size: 16px; line-height: 1.6; margin: 0; font-weight: bold;">
                    IMMEDIATE ACTION REQUIRED:
                </p>
                <p style="color: #991b1b; font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
                    Your document has now expired and this may affect your service delivery. 
                    You must contact us immediately to renew this document and prevent any interruption to your services.
                </p>
            </div>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Expired Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Expired On:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{expiry_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">EXPIRED - RENEWAL REQUIRED</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #dc2626; color: #ffffff; padding: 20px 30px; border-radius: 8px; display: inline-block; border: 3px solid #991b1b;">
                    <p style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">📞 CALL IMMEDIATELY</p>
                    <p style="margin: 0; font-size: 24px; font-weight: bold;">{organization_phone}</p>
                </div>
            </div>
            
            <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">What happens now:</h4>
                <ol style="color: #7f1d1d; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;"><strong>Call us immediately</strong> - don't delay</li>
                    <li style="margin-bottom: 8px;"><strong>Schedule an urgent appointment</strong> to renew your document</li>
                    <li style="margin-bottom: 8px;"><strong>Bring all required documentation</strong> to your appointment</li>
                    <li><strong>Submit your renewed document</strong> as soon as possible</li>
                </ol>
            </div>
        </div>
        
        <!-- Emergency Contact Section -->
        <div style="background: #7f1d1d; color: #ffffff; padding: 30px 20px;">
            <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 18px; text-align: center;">🚨 EMERGENCY CONTACT 🚨</h3>
            <div style="text-align: center;">
                <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">
                    📞 {organization_phone}
                </p>
                <p style="color: #fca5a5; margin: 0 0 10px 0; font-size: 16px;">
                    ✉️ {organization_email}
                </p>
                <p style="color: #fca5a5; margin: 0; font-size: 14px;">
                    🏢 {organization_address}
                </p>
            </div>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #991b1b; text-align: center;">
                <p style="color: #fca5a5; margin: 0; font-size: 14px; font-weight: bold;">
                    This document expired {days_until_expiry} days ago - Immediate renewal required
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #dc2626; margin: 0; font-size: 12px; font-weight: bold;">
                🚨 CRITICAL ALERT - Document expired - Service disruption possible
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_approval_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #a7f3d0; margin: 5px 0 0 0; font-size: 14px;">Document Approved</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 20px;">
                <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">✅ Document Approved</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {participant_first_name},
            </p>
            
            <div style="background: #059669; color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; font-size: 24px;">🎉 GREAT NEWS! 🎉</p>
                <p style="margin: 10px 0 0 0; font-size: 18px;">
                    Your document has been approved and is now active
                </p>
            </div>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Approved Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Approved By:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{approver_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Approval Date:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{current_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
                        <td style="padding: 8px 0; color: #059669; font-weight: bold;">✅ APPROVED & ACTIVE</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">Approval Comments:</h4>
                <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.5;">
                    {comments}
                </p>
            </div>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #15803d; margin: 0 0 10px 0; font-size: 16px;">Next Steps:</h4>
                <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.5;">
                    {next_steps}
                </p>
            </div>
        </div>
        
        <!-- Contact Section -->
        <div style="background: #f9fafb; padding: 30px 20px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Questions?</h3>
            <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px;">
                If you have any questions about your approved document, feel free to contact us:
            </p>
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; vertical-align: top; width: 50%;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;"><strong>Phone:</strong></p>
                    <p style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">{organization_phone}</p>
                </div>
                <div style="display: table-cell; vertical-align: top; width: 50%; padding-left: 20px;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;"><strong>Email:</strong></p>
                    <p style="color: #1f2937; margin: 0; font-size: 16px;">{organization_email}</p>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #10b981; margin: 0; font-size: 12px; font-weight: bold;">
                ✅ Document approved and active
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_rejection_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Requires Changes</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #fecaca; margin: 5px 0 0 0; font-size: 14px;">Document Review</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
                <h2 style="color: #991b1b; margin: 0 0 10px 0; font-size: 20px;">📋 Document Requires Changes</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear {participant_first_name},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We have reviewed your document <strong>"{document_title}"</strong>, and it requires some changes before it can be approved. Don't worry - this is a normal part of the process, and we're here to help you get it right.
            </p>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Reviewed By:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{approver_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Review Date:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{current_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Status:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">📝 CHANGES REQUIRED</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                <h4 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">Required Changes:</h4>
                <p style="color: #7f1d1d; margin: 0; font-size: 16px; line-height: 1.5;">
                    {comments}
                </p>
            </div>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">What to do next:</h4>
                <ol style="color: #374151; margin: 10px 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Review the required changes listed above</li>
                    <li style="margin-bottom: 8px;">Make the necessary updates to your document</li>
                    <li style="margin-bottom: 8px;">Contact us if you need help or clarification</li>
                    <li>Resubmit your updated document for approval</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background: #2563eb; color: #ffffff; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                    <p style="margin: 0; font-size: 16px; font-weight: bold;">Need Help? Call us: {organization_phone}</p>
                </div>
            </div>
        </div>
        
        <!-- Contact Section -->
        <div style="background: #f9fafb; padding: 30px 20px; border-top: 1px solid #e5e7eb;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">We're Here to Help</h3>
            <p style="color: #6b7280; margin: 0 0 15px 0; font-size: 14px;">
                Don't worry - we're here to support you through this process. Contact us if you need any assistance:
            </p>
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; vertical-align: top; width: 50%;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;"><strong>Phone:</strong></p>
                    <p style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">{organization_phone}</p>
                </div>
                <div style="display: table-cell; vertical-align: top; width: 50%; padding-left: 20px;">
                    <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;"><strong>Email:</strong></p>
                    <p style="color: #1f2937; margin: 0; font-size: 16px;">{organization_email}</p>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #fbbf24; margin: 0; font-size: 12px;">
                📝 Document requires changes - Please review and resubmit
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_new_document_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Document Uploaded</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0; font-size: 14px;">Document Management System</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px;">📄 New Document Uploaded</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                A new document has been uploaded to the system for participant <strong>{participant_name}</strong>.
            </p>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Participant:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{participant_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Document:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Uploaded By:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{uploaded_by}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Upload Time:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{upload_date}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Action Required:</h4>
                <p style="color: #78350f; margin: 0; font-size: 16px; line-height: 1.5;">
                    Please review this document in the management system and process any required approvals.
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #93c5fd; margin: 0; font-size: 12px;">
                📄 New document notification - Please review in the management system
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_admin_alert_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Alert - Document Expiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c2d12 0%, #92400e 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #fed7aa; margin: 5px 0 0 0; font-size: 14px;">ADMINISTRATOR ALERT</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #ea580c; margin-bottom: 20px;">
                <h2 style="color: #9a3412; margin: 0 0 10px 0; font-size: 20px;">Document Expiry Alert</h2>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                {admin_message}
            </p>
            
            <!-- Participant Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Participant Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Name:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{participant_full_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">NDIS Number:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{participant_ndis}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Phone:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{participant_phone}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Email:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{participant_email}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Document Details -->
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Document Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold; width: 30%;">Title:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_title}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Category:</td>
                        <td style="padding: 8px 0; color: #1f2937;">{document_category}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Expires:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{expiry_date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Days Until Expiry:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">{days_until_expiry}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">Action Required:</h4>
                <ul style="color: #78350f; margin: 10px 0; padding-left: 20px;">
                    <li>Contact the participant immediately</li>
                    <li>Schedule document renewal appointment</li>
                    <li>Follow up to ensure document is updated</li>
                    <li>Update system once new document is received</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #fed7aa; margin: 0; font-size: 12px;">
                Administrator Alert - Immediate attention required
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {current_date}
            </p>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_bulk_report_template(self) -> str:
        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Expiry Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{organization_name}</h1>
            <p style="color: #d1d5db; margin: 5px 0 0 0; font-size: 14px;">Document Expiry Management Report</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 20px;">
                <h2 style="color: #1e40af; margin: 0 0 10px 0; font-size: 20px;">Document Expiry Report</h2>
                <p style="color: #1e40af; margin: 0; font-size: 16px;">Generated on {report_date}</p>
            </div>
            
            <!-- Summary Section -->
            <div style="display: table; width: 100%; margin: 20px 0;">
                <div style="display: table-cell; width: 33.33%; padding: 0 10px;">
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #f59e0b;">
                        <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 32px; font-weight: bold;">{expiring_count}</h3>
                        <p style="color: #78350f; margin: 0; font-size: 14px; font-weight: bold;">Expiring Soon</p>
                    </div>
                </div>
                <div style="display: table-cell; width: 33.33%; padding: 0 10px;">
                    <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #dc2626;">
                        <h3 style="color: #991b1b; margin: 0 0 8px 0; font-size: 32px; font-weight: bold;">{expired_count}</h3>
                        <p style="color: #7f1d1d; margin: 0; font-size: 14px; font-weight: bold;">Already Expired</p>
                    </div>
                </div>
                <div style="display: table-cell; width: 33.33%; padding: 0 10px;">
                    <div style="background: #e5e7eb; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #6b7280;">
                        <h3 style="color: #374151; margin: 0 0 8px 0; font-size: 32px; font-weight: bold;">{total_issues}</h3>
                        <p style="color: #4b5563; margin: 0; font-size: 14px; font-weight: bold;">Total Issues</p>
                    </div>
                </div>
            </div>
            
            <!-- Expired Documents Section -->
            <div style="margin: 30px 0;">
                <div style="background: #fef2f2; padding: 15px 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #dc2626;">
                    <h3 style="color: #991b1b; margin: 0; font-size: 18px;">Expired Documents ({expired_count})</h3>
                </div>
                <div style="background: #ffffff; border: 1px solid #fecaca; border-top: none; border-radius: 0 0 8px 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #fef2f2;">
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca; color: #991b1b; font-size: 14px;">Participant</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca; color: #991b1b; font-size: 14px;">Document</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca; color: #991b1b; font-size: 14px;">Category</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fecaca; color: #991b1b; font-size: 14px;">Expired</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fecaca; color: #991b1b; font-size: 14px;">Days Ago</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{% for doc in expired_documents %}}
                            <tr style="border-bottom: 1px solid #fee2e2;">
                                <td style="padding: 12px; color: #1f2937; font-size: 14px;">{{{{ doc.participant_name }}}}</td>
                                <td style="padding: 12px; color: #1f2937; font-size: 14px;">{{{{ doc.document_title }}}}</td>
                                <td style="padding: 12px; color: #6b7280; font-size: 14px;">{{{{ doc.category }}}}</td>
                                <td style="padding: 12px; color: #dc2626; font-size: 14px; font-weight: bold;">{{{{ doc.expiry_date }}}}</td>
                                <td style="padding: 12px; color: #dc2626; font-size: 14px; font-weight: bold; text-align: center;">{{{{ doc.days_overdue }}}}</td>
                            </tr>
                            {{% endfor %}}
                        </tbody>
                    </table>
                    {{% if has_more_expired %}}
                    <div style="padding: 15px 20px; background: #fef2f2; border-top: 1px solid #fecaca; text-align: center;">
                        <p style="color: #991b1b; margin: 0; font-size: 14px; font-style: italic;">
                            ... and more expired documents. Please check the system for complete details.
                        </p>
                    </div>
                    {{% endif %}}
                </div>
            </div>
            
            <!-- Expiring Soon Documents Section -->
            <div style="margin: 30px 0;">
                <div style="background: #fef3c7; padding: 15px 20px; border-radius: 8px 8px 0 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin: 0; font-size: 18px;">Expiring Soon ({expiring_count})</h3>
                </div>
                <div style="background: #ffffff; border: 1px solid #fde68a; border-top: none; border-radius: 0 0 8px 8px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #fef3c7;">
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 14px;">Participant</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 14px;">Document</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 14px;">Category</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 14px;">Expires</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 1px solid #fde68a; color: #92400e; font-size: 14px;">Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{% for doc in expiring_documents %}}
                            <tr style="border-bottom: 1px solid #fef3c7;">
                                <td style="padding: 12px; color: #1f2937; font-size: 14px;">{{{{ doc.participant_name }}}}</td>
                                <td style="padding: 12px; color: #1f2937; font-size: 14px;">{{{{ doc.document_title }}}}</td>
                                <td style="padding: 12px; color: #6b7280; font-size: 14px;">{{{{ doc.category }}}}</td>
                                <td style="padding: 12px; color: #f59e0b; font-size: 14px; font-weight: bold;">{{{{ doc.expiry_date }}}}</td>
                                <td style="padding: 12px; color: #f59e0b; font-size: 14px; font-weight: bold; text-align: center;">{{{{ doc.days_remaining }}}}</td>
                            </tr>
                            {{% endfor %}}
                        </tbody>
                    </table>
                    {{% if has_more_expiring %}}
                    <div style="padding: 15px 20px; background: #fef3c7; border-top: 1px solid #fde68a; text-align: center;">
                        <p style="color: #92400e; margin: 0; font-size: 14px; font-style: italic;">
                            ... and more expiring documents. Please check the system for complete details.
                        </p>
                    </div>
                    {{% endif %}}
                </div>
            </div>
            
            <!-- Action Items -->
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 30px 0;">
                <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">Recommended Actions:</h4>
                <ul style="color: #374151; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Contact participants with expired documents immediately</li>
                    <li style="margin-bottom: 8px;">Schedule renewal appointments for expiring documents</li>
                    <li style="margin-bottom: 8px;">Update document management system with new documents</li>
                    <li>Review notification settings to prevent future expirations</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Automated Document Expiry Report - {organization_name}
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">
                Generated on {report_date}
            </p>
        </div>
    </div>
</body>
</html>
        """