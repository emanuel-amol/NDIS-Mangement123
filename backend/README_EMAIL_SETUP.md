# 📧 Email Notification System Setup Guide

This guide will help you configure and test the automatic email notification system for NDIS referrals.

## 🎯 System Overview

The email system automatically sends three types of notifications when a referral is submitted:

1. **Provider Notification** - Detailed referral information sent to healthcare providers
2. **Participant Confirmation** - Confirmation email sent to the participant (if email provided)
3. **Referrer Notification** - Simple confirmation sent to the referring professional

## 📋 Prerequisites

1. **Python packages** - Already added to `requirements.txt`
2. **Redis server** - For background task processing
3. **Email account** - Gmail recommended for SMTP

## 🔧 Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## 🗄️ Step 2: Install and Start Redis

### Windows
1. Download Redis from: https://redis.io/download
2. Install and start Redis server
3. Or use Windows Subsystem for Linux (WSL)

### macOS
```bash
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Verify Redis is running
```bash
redis-cli ping
# Should return: PONG
```

## 📧 Step 3: Configure Email Settings

### For Gmail (Recommended)

1. **Enable 2-Factor Authentication** on your Google account

2. **Create App Password**:
   - Go to Google Account settings → Security → App passwords
   - Generate new app password for "Mail"
   - Copy the 16-character password

3. **Update .env file**:
```env
# Email Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-16-char-app-password
MAIL_FROM=your-email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
MAIL_FROM_NAME=NDIS Management System
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
USE_CREDENTIALS=True
VALIDATE_CERTS=True
```

### For Other Email Providers

#### Outlook/Hotmail
```env
MAIL_SERVER=smtp.live.com
MAIL_PORT=587
MAIL_STARTTLS=True
```

#### Yahoo Mail
```env
MAIL_SERVER=smtp.mail.yahoo.com
MAIL_PORT=587
MAIL_STARTTLS=True
```

#### Custom SMTP Server
```env
MAIL_SERVER=your-smtp-server.com
MAIL_PORT=587  # or 465 for SSL
MAIL_STARTTLS=True  # or False for SSL
MAIL_SSL_TLS=False  # or True for SSL
```

## ⚙️ Step 4: Start Celery Worker

The email system uses Celery for background processing to avoid blocking the API.

```bash
cd backend
celery -A celery_worker worker --loglevel=info
```

Keep this running in a separate terminal window.

## 🧪 Step 5: Test the System

Run the test script to verify everything is working:

```bash
cd backend
python test_email_system.py
```

This will test:
- ✅ Email configuration
- ✅ Template rendering
- ✅ Celery task queueing
- ⏭️ Email sending (disabled by default to prevent test emails)

## 🎮 Step 6: Update Provider Emails

Edit `backend/app/api/v1/referrals.py` and update the provider email addresses:

```python
# Define provider emails (line ~29)
provider_emails = [
    "provider@your-clinic.com",      # Replace with actual provider email
    "admin@your-organization.com"    # Replace with admin email
]
```

## 🚀 Step 7: Start the System

1. **Start Redis** (if not already running)
2. **Start Celery Worker** (in one terminal):
   ```bash
   cd backend
   celery -A celery_worker worker --loglevel=info
   ```
3. **Start FastAPI Server** (in another terminal):
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

## 📧 Email Templates

The system includes beautiful, responsive HTML email templates:

- `provider_notification.html` - Detailed referral information for providers
- `participant_confirmation.html` - Friendly confirmation for participants

Templates are located in: `backend/app/templates/email/`

## 🔍 Monitoring and Debugging

### Check Celery Tasks

```bash
# View active tasks
celery -A celery_worker inspect active

# View task history
celery -A celery_worker events
```

### Check Redis Queue

```bash
redis-cli
> LLEN celery  # Check queue length
> KEYS *       # View all keys
```

### Enable Email Sending Test

To test actual email sending, edit `test_email_system.py`:

1. Uncomment line with `email_ok = await test_email_sending(test_referral)`
2. Update test email addresses in the function
3. Run: `python test_email_system.py`

## ⚠️ Troubleshooting

### Common Issues

1. **"Redis connection error"**
   - Ensure Redis server is running: `redis-cli ping`
   - Check Redis is on default port 6379

2. **"SMTP authentication failed"**
   - Use App Password, not regular password for Gmail
   - Check email/password in .env file
   - Verify 2FA is enabled for Gmail

3. **"Template not found"**
   - Check template files exist in `backend/app/templates/email/`
   - Verify file permissions

4. **"Task not executing"**
   - Ensure Celery worker is running
   - Check Celery worker logs for errors
   - Verify Redis connection

### Debug Mode

Add to .env for more verbose logging:
```env
DEBUG=True
CELERY_LOG_LEVEL=DEBUG
```

## 🔐 Security Notes

- Never commit real email credentials to version control
- Use environment variables for all sensitive data
- Consider using email service APIs (SendGrid, AWS SES) for production
- Regularly rotate app passwords

## 📈 Production Considerations

For production deployment:

1. **Use Professional Email Service**:
   - SendGrid
   - AWS SES
   - Mailgun

2. **Scale Celery**:
   - Multiple worker processes
   - Redis Cluster for high availability
   - Monitor task queues

3. **Error Handling**:
   - Dead letter queues for failed emails
   - Alert administrators on failures
   - Email delivery status tracking

## 🎉 Success!

Once configured, the system will automatically:
- ✅ Send provider notifications when referrals are submitted
- ✅ Send confirmation emails to participants
- ✅ Send acknowledgments to referring professionals
- ✅ Handle failures gracefully with retries
- ✅ Process emails in the background without blocking the API

The referral form will show the success screen with referral ID, and all stakeholders will receive appropriate email notifications!