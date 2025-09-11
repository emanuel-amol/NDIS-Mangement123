import os
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr, BaseModel
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import asyncio
from sqlalchemy.orm import Session
from app.models.referral import Referral
from app.models.email_log import EmailLog, EmailType, log_email_attempt, update_email_status


class EmailConfig(BaseModel):
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: EmailStr
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_STARTTLS: bool
    MAIL_SSL_TLS: bool
    USE_CREDENTIALS: bool
    VALIDATE_CERTS: bool


class EmailService:
    def __init__(self):
        self._setup_config()
        self._setup_templates()

    def _setup_config(self):
        """Setup email configuration from environment variables"""
        self.config = EmailConfig(
            MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
            MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
            MAIL_FROM=os.getenv("MAIL_FROM", ""),
            MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
            MAIL_SERVER=os.getenv("MAIL_SERVER", ""),
            MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "NDIS Management System"),
            MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
            MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
            USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() == "true",
            VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() == "true"
        )
        
        # Create FastMail configuration
        self.mail_config = ConnectionConfig(
            MAIL_USERNAME=self.config.MAIL_USERNAME,
            MAIL_PASSWORD=self.config.MAIL_PASSWORD,
            MAIL_FROM=self.config.MAIL_FROM,
            MAIL_PORT=self.config.MAIL_PORT,
            MAIL_SERVER=self.config.MAIL_SERVER,
            MAIL_FROM_NAME=self.config.MAIL_FROM_NAME,
            MAIL_STARTTLS=self.config.MAIL_STARTTLS,
            MAIL_SSL_TLS=self.config.MAIL_SSL_TLS,
            USE_CREDENTIALS=self.config.USE_CREDENTIALS,
            VALIDATE_CERTS=self.config.VALIDATE_CERTS,
            TEMPLATE_FOLDER=Path(__file__).parent.parent / "templates" / "email"
        )
        
        self.fastmail = FastMail(self.mail_config)

    def _setup_templates(self):
        """Setup Jinja2 template environment"""
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True
        )

    def _render_template(self, template_name: str, context: dict) -> str:
        """Render email template with context data"""
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)

    async def send_provider_notification(self, referral: Referral, provider_emails: List[str], db: Session = None) -> bool:
        """
        Send notification email to healthcare providers about new referral
        
        Args:
            referral: Referral object containing all referral details
            provider_emails: List of provider email addresses to notify
            db: Database session for logging
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = f"New NDIS Referral #{referral.id} - {referral.referred_for.title()}"
        email_logs = []
        
        try:
            # Log email attempts
            if db:
                for email in provider_emails:
                    email_log = log_email_attempt(
                        db, 
                        EmailType.PROVIDER_NOTIFICATION.value,
                        email,
                        subject,
                        referral_id=referral.id
                    )
                    email_logs.append(email_log)
            
            # Render the HTML template
            html_content = self._render_template(
                "provider_notification.html",
                {"referral": referral}
            )
            
            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=provider_emails,
                body=html_content,
                subtype=MessageType.html
            )
            
            # Send email
            await self.fastmail.send_message(message)
            
            # Update logs as sent
            if db:
                for email_log in email_logs:
                    update_email_status(db, email_log.id, "sent")
            
            print(f"Provider notification sent for referral #{referral.id} to {len(provider_emails)} recipients")
            return True
            
        except Exception as e:
            # Update logs as failed
            if db:
                for email_log in email_logs:
                    update_email_status(db, email_log.id, "failed", str(e))
            
            print(f"Failed to send provider notification for referral #{referral.id}: {str(e)}")
            return False

    async def send_participant_confirmation(self, referral: Referral, db: Session = None) -> bool:
        """
        Send confirmation email to participant about their referral submission
        
        Args:
            referral: Referral object containing all referral details
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Determine recipient email
            recipient_email = referral.email_address
            if not recipient_email and referral.rep_email_address:
                recipient_email = referral.rep_email_address
            
            if not recipient_email:
                print(f"No email address provided for referral #{referral.id} - skipping participant confirmation")
                return False
            
            # Render the HTML template
            html_content = self._render_template(
                "participant_confirmation.html",
                {"referral": referral}
            )
            
            # Create message
            message = MessageSchema(
                subject=f"✅ NDIS Referral Confirmation - ID #{referral.id}",
                recipients=[recipient_email],
                body=html_content,
                subtype=MessageType.html
            )
            
            # Send email
            await self.fastmail.send_message(message)
            print(f"Participant confirmation sent for referral #{referral.id} to {recipient_email}")
            return True
            
        except Exception as e:
            print(f"Failed to send participant confirmation for referral #{referral.id}: {str(e)}")
            return False

    async def send_referrer_notification(self, referral: Referral, db: Session = None) -> bool:
        """
        Send notification email to the referring professional
        
        Args:
            referral: Referral object containing all referral details
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            if not referral.referrer_email:
                print(f"No referrer email provided for referral #{referral.id} - skipping referrer notification")
                return False
            
            # Create a simple text-based notification for referrer
            subject = f"✅ Referral #{referral.id} Submitted Successfully"
            
            body = f"""
            Dear {referral.referrer_first_name} {referral.referrer_last_name},
            
            Your NDIS referral for {referral.first_name} {referral.last_name} has been successfully submitted.
            
            Referral Details:
            - Referral ID: #{referral.id}
            - Client: {referral.first_name} {referral.last_name}
            - Referred For: {referral.referred_for.title()}
            - Submitted: {referral.created_at.strftime('%B %d, %Y at %I:%M %p')}
            
            The client will be contacted within 2 business days using their preferred contact method ({referral.preferred_contact}).
            
            Thank you for your referral.
            
            Best regards,
            NDIS Management System
            
            ---
            This is an automated notification. Please do not reply to this email.
            """
            
            # Create message
            message = MessageSchema(
                subject=subject,
                recipients=[referral.referrer_email],
                body=body,
                subtype=MessageType.plain
            )
            
            # Send email
            await self.fastmail.send_message(message)
            print(f"Referrer notification sent for referral #{referral.id} to {referral.referrer_email}")
            return True
            
        except Exception as e:
            print(f"Failed to send referrer notification for referral #{referral.id}: {str(e)}")
            return False

    async def send_all_notifications(self, referral: Referral, provider_emails: List[str] = None, db: Session = None) -> dict:
        """
        Send all notification emails for a new referral
        
        Args:
            referral: Referral object containing all referral details
            provider_emails: List of provider email addresses (optional)
        
        Returns:
            dict: Status of each email type sent
        """
        # Default provider emails if none provided
        if not provider_emails:
            provider_emails = [
                os.getenv("DEFAULT_PROVIDER_EMAIL", "provider@example.com")
            ]
        
        results = {
            "provider_notification": False,
            "participant_confirmation": False,
            "referrer_notification": False
        }
        
        # Send all emails concurrently
        tasks = [
            self.send_provider_notification(referral, provider_emails, db),
            self.send_participant_confirmation(referral, db),
            self.send_referrer_notification(referral, db)
        ]
        
        try:
            task_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            results["provider_notification"] = task_results[0] if not isinstance(task_results[0], Exception) else False
            results["participant_confirmation"] = task_results[1] if not isinstance(task_results[1], Exception) else False
            results["referrer_notification"] = task_results[2] if not isinstance(task_results[2], Exception) else False
            
        except Exception as e:
            print(f"Error sending notifications for referral #{referral.id}: {str(e)}")
        
        return results

    def is_configured(self) -> bool:
        """
        Check if email service is properly configured
        
        Returns:
            bool: True if all required configuration is present
        """
        required_fields = [
            self.config.MAIL_USERNAME,
            self.config.MAIL_PASSWORD,
            self.config.MAIL_FROM,
            self.config.MAIL_SERVER
        ]
        
        return all(field.strip() != "" for field in required_fields)


# Global email service instance
email_service = EmailService()


def get_email_service() -> EmailService:
    """Dependency to get email service instance"""
    return email_service