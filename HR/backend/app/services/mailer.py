import os, ssl, smtplib
from email.message import EmailMessage
from typing import Optional, List
import certifi  # 使用 certifi 的 CA

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))

SMTP_USER = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS")

FROM_NAME = os.getenv("FROM_NAME", "NDIS HR")
FROM_EMAIL = os.getenv("FROM_EMAIL") or SMTP_USER 
FRONTEND_LOGIN_URL = os.getenv("FRONTEND_LOGIN_URL", "http://127.0.0.1:8000/portal/login")

# 构建 TLS 上下文并加载 certifi 根证书
TLS_CONTEXT = ssl.create_default_context()
TLS_CONTEXT.load_verify_locations(cafile=certifi.where())

def send_invite_email(to_email: str, first_name: str, temp_password: str):
    if not (SMTP_USER and SMTP_PASS):
        print("[mailer] missing SMTP creds: set SMTP_USERNAME/SMTP_PASSWORD (or SMTP_USER/SMTP_PASS) in .env")
        return

    # Clean up first name - avoid placeholder text
    clean_name = (first_name or "").strip()
    if not clean_name or clean_name.lower() in ["please", "enter", "name", "first"]:
        clean_name = ""
    
    greeting = f"Hi {clean_name}," if clean_name else "Hi there,"

    subject = "Your NDIS Candidate Portal Access"
    html = f"""
    <p>{greeting}</p>
    <p>Welcome! Your candidate account for the NDIS HR portal has been created.</p>
    <ol>
      <li><b>Access the system</b>: <a href="{FRONTEND_LOGIN_URL}">{FRONTEND_LOGIN_URL}</a></li>
      <li><b>Login details</b>: use your email <code>{to_email}</code> and the temporary password below.</li>
      <li><b>Complete your profile</b> and <b>upload pre-onboarding documents</b> (resume, photo, etc.).</li>
    </ol>
    <p><b>Temporary password:</b> <code>{temp_password}</code></p>
    <p>For security, please change your password after first login.</p>
    <p>— NDIS HR Team</p>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content("Please view this email in HTML.")
    msg.add_alternative(html, subtype="html")

    # 连接并发送（带超时 + TLS；支持 465/587）
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=TLS_CONTEXT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls(context=TLS_CONTEXT)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)


def send_initial_email(to_email: str, first_name: str):
    """Send initial onboarding email to a new candidate"""
    if not (SMTP_USER and SMTP_PASS):
        print("[mailer] missing SMTP creds: set SMTP_USERNAME/SMTP_PASSWORD (or SMTP_USER/SMTP_PASS) in .env")
        return

    # Clean up first name - avoid placeholder text
    clean_name = (first_name or "").strip()
    if not clean_name or clean_name.lower() in ["please", "enter", "name", "first"]:
        clean_name = ""
    
    greeting = f"Hi {clean_name}," if clean_name else "Hi there,"

    subject = "Welcome to NDIS - Next Steps for Your Application"
    html = f"""
    <p>{greeting}</p>
    <p>Thank you for applying with NDIS! We've received your application and are excited to begin the process with you.</p>
    
    <h3>What happens next:</h3>
    <ol>
      <li><b>Profile completion</b>: Please ensure your profile is complete with all required information</li>
      <li><b>Document submission</b>: Upload any required documents (resume, certifications, etc.)</li>
      <li><b>Reference checks</b>: We'll reach out to your references shortly</li>
      <li><b>Assessment process</b>: You'll be contacted for interviews and assessments</li>
    </ol>
    
    <p>You can access your application portal at: <a href="{FRONTEND_LOGIN_URL}">{FRONTEND_LOGIN_URL}</a></p>
    
    <p>If you have any questions, please don't hesitate to reach out to our HR team.</p>
    <p>— NDIS HR Team</p>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content("Please view this email in HTML.")
    msg.add_alternative(html, subtype="html")

    # Send email using same logic as invite email
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=TLS_CONTEXT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls(context=TLS_CONTEXT)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)


def send_reminder_email(to_email: str, first_name: str, missing_items: Optional[List[str]] = None):
    """Send reminder email about incomplete items"""
    if not (SMTP_USER and SMTP_PASS):
        print("[mailer] missing SMTP creds: set SMTP_USERNAME/SMTP_PASSWORD (or SMTP_USER/SMTP_PASS) in .env")
        return

    if missing_items is None:
        missing_items = ["Complete your profile", "Upload required documents", "Submit pending forms"]

    # Clean up first name - avoid placeholder text
    clean_name = (first_name or "").strip()
    if not clean_name or clean_name.lower() in ["please", "enter", "name", "first"]:
        clean_name = ""
    
    greeting = f"Hi {clean_name}," if clean_name else "Hi there,"

    subject = "NDIS Application - Action Required"
    items_html = "".join(f"<li>{item}</li>" for item in missing_items)
    
    html = f"""
    <p>{greeting}</p>
    <p>We're following up on your NDIS application. We've noticed there are a few items that still need your attention:</p>
    
    <ul>
        {items_html}
    </ul>
    
    <p>Please log in to your portal to complete these items: <a href="{FRONTEND_LOGIN_URL}">{FRONTEND_LOGIN_URL}</a></p>
    
    <p>Completing these steps will help us process your application more quickly. If you need assistance or have questions, please contact our HR team.</p>
    <p>— NDIS HR Team</p>
    """

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content("Please view this email in HTML.")
    msg.add_alternative(html, subtype="html")

    # Send email using same logic as invite email
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=TLS_CONTEXT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls(context=TLS_CONTEXT)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
