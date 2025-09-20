# backend/app/services/enhanced_notification_service.py - COMPLETE NOTIFICATION SYSTEM
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models.document import Document, DocumentNotification
from app.models.participant import Participant
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os
from jinja2 import Environment, BaseLoader
import json
import requests  # For SMS integration

logger = logging.getLogger(__name__)

class NotificationSchedule:
    """Configuration for notification schedules"""
    def __init__(self):
        self.schedules = {
            'document_expiry': [
                {'days_before': 30, 'notification_type': 'email', 'priority': 'normal'},
                {'days_before': 14, 'notification_type': 'email', 'priority': 'high'},
                {'days_before': 7, 'notification_type': 'email_sms', 'priority': 'urgent'},
                {'days_before': 3, 'notification_type': 'email_sms', 'priority': 'critical'},
                {'days_before': 0, 'notification_type': 'email_sms_call', 'priority': 'critical'}  # Day of expiry
            ],
            'approval_pending': [
                {'days_after': 1, 'notification_type': 'email', 'priority': 'normal'},
                {'days_after': 3, 'notification_type': 'email', 'priority': 'high'},
                {'days_after': 7, 'notification_type': 'email_sms', 'priority': 'urgent'}
            ],
            'missing_documents': [
                {'days_after': 7, 'notification_type': 'email', 'priority': 'normal'},
                {'days_after': 14, 'notification_type': 'email_sms', 'priority': 'high'},
                {'days_after': 30, 'notification_type': 'email_sms', 'priority': 'urgent'}
            ]
        }

class EnhancedNotificationService:
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.organization_name = os.getenv('ORGANIZATION_NAME', 'NDIS Service Provider')
        
        # SMS configuration
        self.sms_api_key = os.getenv('SMS_API_KEY', '')
        self.sms_api_url = os.getenv('SMS_API_URL', '')
        self.sms_from_number = os.getenv('SMS_FROM_NUMBER', '')
        
        # Notification configuration
        self.schedule = NotificationSchedule()
        
        # Email templates
        self.jinja_env = Environment(loader=BaseLoader())
        
        # Check if services are configured
        self.email_enabled = bool(self.smtp_username and self.smtp_password)
        self.sms_enabled = bool(self.sms_api_key and self.sms_api_url)
        
        if not self.email_enabled:
            logger.warning("Email notifications disabled - SMTP not configured")
        if not self.sms_enabled:
            logger.warning("SMS notifications disabled - SMS API not configured")
    
    def process_all_notifications(self, db: Session) -> Dict[str, Any]:
        """Process all types of notifications"""
        results = {
            'processed': 0,
            'sent': 0,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'by_type': {}
        }
        
        try:
            # Process expiry notifications
            expiry_results = self.process_expiry_notifications(db)
            self._merge_results(results, expiry_results, 'expiry')
            
            # Process approval notifications
            approval_results = self.process_approval_notifications(db)
            self._merge_results(results, approval_results, 'approval')
            
            # Process missing document notifications
            missing_results = self.process_missing_document_notifications(db)
            self._merge_results(results, missing_results, 'missing_docs')
            
            # Process custom scheduled notifications
            custom_results = self.process_custom_notifications(db)
            self._merge_results(results, custom_results, 'custom')
            
            logger.info(f"Notification processing completed: {results}")
            
        except Exception as e:
            logger.error(f"Error in notification processing: {str(e)}")
            results['errors'].append(str(e))
        
        return results
    
    def process_expiry_notifications(self, db: Session) -> Dict[str, Any]:
        """Process document expiry notifications with configurable schedules"""
        results = {'processed': 0, 'sent': 0, 'failed': 0, 'errors': []}
        
        try:
            current_date = datetime.now().date()
            
            for schedule_item in self.schedule.schedules['document_expiry']:
                days_before = schedule_item['days_before']
                notification_date = current_date + timedelta(days=days_before)
                
                # Find documents expiring on this notification date
                expiring_docs = db.query(Document).filter(
                    and_(
                        func.date(Document.expiry_date) == notification_date,
                        Document.status == 'active'
                    )
                ).all()
                
                for doc in expiring_docs:
                    results['processed'] += 1
                    
                    # Check if notification already sent for this schedule
                    existing_notification = db.query(DocumentNotification).filter(
                        and_(
                            DocumentNotification.document_id == doc.id,
                            DocumentNotification.notification_type == f'expiry_{days_before}d',
                            DocumentNotification.is_sent == True
                        )
                    ).first()
                    
                    if existing_notification:
                        continue  # Skip if already sent
                    
                    # Get participant
                    participant = db.query(Participant).filter(Participant.id == doc.participant_id).first()
                    if not participant:
                        continue
                    
                    # Send notification based on schedule
                    success = self._send_expiry_notification(
                        db, doc, participant, schedule_item, days_before
                    )
                    
                    if success:
                        results['sent'] += 1
                    else:
                        results['failed'] += 1
                        
        except Exception as e:
            logger.error(f"Error processing expiry notifications: {str(e)}")
            results['errors'].append(str(e))
        
        return results
    
    def process_approval_notifications(self, db: Session) -> Dict[str, Any]:
        """Process approval pending notifications"""
        results = {'processed': 0, 'sent': 0, 'failed': 0, 'errors': []}
        
        try:
            # Find documents pending approval
            pending_docs = db.query(Document).filter(
                Document.status == 'pending_approval'
            ).all()
            
            current_date = datetime.now()
            
            for doc in pending_docs:
                results['processed'] += 1
                
                # Calculate days since submission
                days_pending = (current_date - doc.created_at).days
                
                # Check if notification schedule matches
                for schedule_item in self.schedule.schedules['approval_pending']:
                    if days_pending == schedule_item['days_after']:
                        # Send notification
                        participant = db.query(Participant).filter(Participant.id == doc.participant_id).first()
                        if participant:
                            success = self._send_approval_reminder(db, doc, participant, schedule_item)
                            if success:
                                results['sent'] += 1
                            else:
                                results['failed'] += 1
                        break
                        
        except Exception as e:
            logger.error(f"Error processing approval notifications: {str(e)}")
            results['errors'].append(str(e))
        
        return results
    
    def process_missing_document_notifications(self, db: Session) -> Dict[str, Any]:
        """Process notifications for missing required documents"""
        results = {'processed': 0, 'sent': 0, 'failed': 0, 'errors': []}
        
        try:
            # This would require a system to track required documents per participant
            # For now, we'll implement a basic version
            
            # Get all active participants
            participants = db.query(Participant).filter(Participant.status == 'active').all()
            
            for participant in participants:
                results['processed'] += 1
                
                # Check for missing required documents
                missing_docs = self._check_missing_required_documents(db, participant.id)
                
                if missing_docs:
                    success = self._send_missing_documents_notification(db, participant, missing_docs)
                    if success:
                        results['sent'] += 1
                    else:
                        results['failed'] += 1
                        
        except Exception as e:
            logger.error(f"Error processing missing document notifications: {str(e)}")
            results['errors'].append(str(e))
        
        return results
    
    def process_custom_notifications(self, db: Session) -> Dict[str, Any]:
        """Process custom scheduled notifications"""
        results = {'processed': 0, 'sent': 0, 'failed': 0, 'errors': []}
        
        try:
            # Get pending custom notifications
            pending_notifications = db.query(DocumentNotification).filter(
                and_(
                    DocumentNotification.is_sent == False,
                    DocumentNotification.scheduled_for <= datetime.now()
                )
            ).all()
            
            for notification in pending_notifications:
                results['processed'] += 1
                
                success = self._send_custom_notification(db, notification)
                if success:
                    results['sent'] += 1
                    notification.is_sent = True
                    notification.sent_at = datetime.now()
                else:
                    results['failed'] += 1
                    notification.retry_count = (notification.retry_count or 0) + 1
            
            db.commit()
                        
        except Exception as e:
            logger.error(f"Error processing custom notifications: {str(e)}")
            results['errors'].append(str(e))
            db.rollback()
        
        return results
    
    def _send_expiry_notification(self, db: Session, document: Document, participant: Participant, 
                                schedule_item: Dict, days_before: int) -> bool:
        """Send expiry notification via configured channels"""
        success = False
        
        try:
            notification_types = schedule_item['notification_type'].split('_')
            
            # Prepare notification data
            notification_data = {
                'participant': participant,
                'document': document,
                'days_until_expiry': days_before,
                'priority': schedule_item['priority'],
                'expiry_date': document.expiry_date.strftime('%d/%m/%Y') if document.expiry_date else 'Unknown'
            }
            
            # Send email notification
            if 'email' in notification_types and self.email_enabled:
                email_success = self._send_email_notification(
                    participant.email_address,
                    f"Document Expiring in {days_before} days" if days_before > 0 else "Document Expired Today",
                    self._get_expiry_email_template(),
                    notification_data
                )
                if email_success:
                    success = True
            
            # Send SMS notification
            if 'sms' in notification_types and self.sms_enabled and participant.phone_number:
                sms_success = self._send_sms_notification(
                    participant.phone_number,
                    self._get_expiry_sms_message(notification_data)
                )
                if sms_success:
                    success = True
            
            # Log notification
            self._log_notification(db, document.id, participant.id, f'expiry_{days_before}d', success)
            
        except Exception as e:
            logger.error(f"Error sending expiry notification: {str(e)}")
        
        return success
    
    def _send_approval_reminder(self, db: Session, document: Document, participant: Participant, 
                              schedule_item: Dict) -> bool:
        """Send approval reminder notification"""
        try:
            notification_data = {
                'participant': participant,
                'document': document,
                'days_pending': (datetime.now() - document.created_at).days,
                'priority': schedule_item['priority']
            }
            
            # Send to admin/managers for approval
            admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
            if admin_email and self.email_enabled:
                return self._send_email_notification(
                    admin_email,
                    f"Approval Pending: {document.title}",
                    self._get_approval_reminder_template(),
                    notification_data
                )
                
        except Exception as e:
            logger.error(f"Error sending approval reminder: {str(e)}")
        
        return False
    
    def _send_missing_documents_notification(self, db: Session, participant: Participant, 
                                           missing_docs: List[str]) -> bool:
        """Send notification about missing required documents"""
        try:
            notification_data = {
                'participant': participant,
                'missing_documents': missing_docs,
                'missing_count': len(missing_docs)
            }
            
            success = False
            
            # Send email to participant
            if participant.email_address and self.email_enabled:
                success = self._send_email_notification(
                    participant.email_address,
                    "Missing Required Documents",
                    self._get_missing_documents_template(),
                    notification_data
                )
            
            # Send to admin
            admin_email = os.getenv('ADMIN_NOTIFICATION_EMAIL')
            if admin_email and self.email_enabled:
                admin_success = self._send_email_notification(
                    admin_email,
                    f"Missing Documents: {participant.first_name} {participant.last_name}",
                    self._get_missing_documents_admin_template(),
                    notification_data
                )
                if admin_success:
                    success = True
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending missing documents notification: {str(e)}")
        
        return False
    
    def _send_email_notification(self, to_email: str, subject: str, template: str, data: Dict) -> bool:
        """Send email notification"""
        try:
            if not self.email_enabled or not to_email:
                return False
            
            # Render template
            email_template = self.jinja_env.from_string(template)
            html_content = email_template.render(**data, organization_name=self.organization_name)
            
            # Create email
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.organization_name} <{self.from_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
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
    
    def _send_sms_notification(self, phone_number: str, message: str) -> bool:
        """Send SMS notification"""
        try:
            if not self.sms_enabled or not phone_number:
                return False
            
            # Clean phone number
            clean_phone = ''.join(filter(str.isdigit, phone_number))
            if not clean_phone.startswith('61'):  # Australian country code
                clean_phone = '61' + clean_phone.lstrip('0')
            
            # Send SMS via API
            payload = {
                'to': clean_phone,
                'from': self.sms_from_number,
                'message': message,
                'api_key': self.sms_api_key
            }
            
            response = requests.post(self.sms_api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                logger.info(f"SMS sent successfully to {phone_number}")
                return True
            else:
                logger.error(f"SMS API error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
            return False
    
    def _check_missing_required_documents(self, db: Session, participant_id: int) -> List[str]:
        """Check for missing required documents"""
        try:
            from app.models.document import DocumentCategory
            
            # Get required categories
            required_categories = db.query(DocumentCategory).filter(
                DocumentCategory.is_required == True,
                DocumentCategory.is_active == True
            ).all()
            
            missing_docs = []
            
            for category in required_categories:
                # Check if participant has document in this category
                existing_doc = db.query(Document).filter(
                    and_(
                        Document.participant_id == participant_id,
                        Document.category == category.category_id,
                        Document.status == 'active'
                    )
                ).first()
                
                if not existing_doc:
                    missing_docs.append(category.name)
            
            return missing_docs
            
        except Exception as e:
            logger.error(f"Error checking missing documents: {str(e)}")
            return []
    
    def _send_custom_notification(self, db: Session, notification: DocumentNotification) -> bool:
        """Send custom scheduled notification"""
        try:
            # Get participant
            participant = db.query(Participant).filter(Participant.id == notification.participant_id).first()
            if not participant:
                return False
            
            # Send based on notification type
            if notification.notification_type.startswith('email_') and self.email_enabled:
                return self._send_email_notification(
                    notification.recipient_email,
                    f"Notification: {notification.notification_type}",
                    self._get_custom_notification_template(),
                    {'participant': participant, 'message': notification}
                )
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending custom notification: {str(e)}")
            return False
    
    def _log_notification(self, db: Session, document_id: int, participant_id: int, 
                         notification_type: str, success: bool, error_message: str = None):
        """Log notification attempt"""
        try:
            notification = DocumentNotification(
                document_id=document_id,
                participant_id=participant_id,
                notification_type=notification_type,
                is_sent=success,
                sent_at=datetime.now() if success else None,
                error_message=error_message,
                scheduled_for=datetime.now()
            )
            
            db.add(notification)
            db.commit()
            
        except Exception as e:
            logger.error(f"Error logging notification: {str(e)}")
    
    def _merge_results(self, main_results: Dict, sub_results: Dict, result_type: str):
        """Merge notification results"""
        main_results['processed'] += sub_results['processed']
        main_results['sent'] += sub_results['sent']
        main_results['failed'] += sub_results['failed']
        main_results['errors'].extend(sub_results['errors'])
        main_results['by_type'][result_type] = sub_results
    
    # Email Templates
    def _get_expiry_email_template(self) -> str:
        return """
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px;">
                <h2 style="color: #dc3545;">Document Expiry Notice</h2>
                <p>Dear {{ participant.first_name }},</p>
                <p>Your document <strong>"{{ document.title }}"</strong> 
                {% if days_until_expiry > 0 %}
                will expire in <strong>{{ days_until_expiry }} days</strong> on {{ expiry_date }}.
                {% else %}
                has expired today ({{ expiry_date }}).
                {% endif %}
                </p>
                <p>Please contact us immediately to renew this document.</p>
                <p>Best regards,<br>{{ organization_name }}</p>
            </div>
        </body>
        </html>
        """
    
    def _get_expiry_sms_message(self, data: Dict) -> str:
        """Generate SMS message for expiry notification"""
        days = data['days_until_expiry']
        if days > 0:
            return f"NDIS Alert: Your document '{data['document'].title}' expires in {days} days. Please contact us to renew. -{data.get('organization_name', 'NDIS Provider')}"
        else:
            return f"URGENT: Your document '{data['document'].title}' expired today. Contact us immediately. -{data.get('organization_name', 'NDIS Provider')}"
    
    def _get_approval_reminder_template(self) -> str:
        return """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Approval Required</h2>
            <p>Document "{{ document.title }}" for {{ participant.first_name }} {{ participant.last_name }} 
            has been pending approval for {{ days_pending }} days.</p>
            <p>Please review and approve or reject this document.</p>
        </body>
        </html>
        """
    
    def _get_missing_documents_template(self) -> str:
        return """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Missing Required Documents</h2>
            <p>Dear {{ participant.first_name }},</p>
            <p>You are missing the following required documents:</p>
            <ul>
            {% for doc in missing_documents %}
                <li>{{ doc }}</li>
            {% endfor %}
            </ul>
            <p>Please upload these documents as soon as possible.</p>
        </body>
        </html>
        """
    
    def _get_missing_documents_admin_template(self) -> str:
        return """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Participant Missing Documents</h2>
            <p>{{ participant.first_name }} {{ participant.last_name }} is missing {{ missing_count }} required documents:</p>
            <ul>
            {% for doc in missing_documents %}
                <li>{{ doc }}</li>
            {% endfor %}
            </ul>
        </body>
        </html>
        """
    
    def _get_custom_notification_template(self) -> str:
        return """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Notification</h2>
            <p>{{ message }}</p>
        </body>
        </html>
        """
    
    def schedule_custom_notification(self, db: Session, document_id: int, participant_id: int,
                                   notification_type: str, scheduled_for: datetime,
                                   recipient_email: str, message: str) -> bool:
        """Schedule a custom notification"""
        try:
            notification = DocumentNotification(
                document_id=document_id,
                participant_id=participant_id,
                notification_type=notification_type,
                recipient_email=recipient_email,
                scheduled_for=scheduled_for,
                is_sent=False
            )
            
            db.add(notification)
            db.commit()
            
            logger.info(f"Scheduled notification for {scheduled_for}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling notification: {str(e)}")
            return False