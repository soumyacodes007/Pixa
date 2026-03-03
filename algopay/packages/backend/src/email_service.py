"""
Email service for sending OTP codes
Supports multiple email providers (SMTP, SendGrid, AWS SES)
"""
import os
import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib
from jinja2 import Template

logger = logging.getLogger(__name__)

# Email configuration from environment
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "smtp")  # smtp, sendgrid, ses
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@algopay.io")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Algopay")

# Email templates
OTP_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px dashed #667eea; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Algopay Verification</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your verification code for Algopay is:</p>
            <div class="otp-code">{{ otp_code }}</div>
            <p>This code will expire in <strong>{{ expiry_minutes }} minutes</strong>.</p>
            <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Algopay will never ask for your verification code.
            </div>
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2026 Algopay - Agentic Payment Wallet for Algorand</p>
            <p>Powered by Algorand Foundation & Intermezzo</p>
        </div>
    </div>
</body>
</html>
"""


class EmailService:
    """Email service for sending OTP codes"""
    
    def __init__(self):
        self.provider = EMAIL_PROVIDER
        self.smtp_host = SMTP_HOST
        self.smtp_port = SMTP_PORT
        self.smtp_username = SMTP_USERNAME
        self.smtp_password = SMTP_PASSWORD
        self.from_email = SMTP_FROM_EMAIL
        self.from_name = SMTP_FROM_NAME
    
    async def send_otp_email(
        self,
        to_email: str,
        otp_code: str,
        expiry_minutes: int = 10
    ) -> bool:
        """
        Send OTP code via email
        
        Args:
            to_email: Recipient email address
            otp_code: 6-digit OTP code
            expiry_minutes: OTP expiry time in minutes
        
        Returns:
            bool: True if email sent successfully
        
        Raises:
            Exception: If email sending fails
        """
        try:
            if self.provider == "smtp":
                return await self._send_via_smtp(to_email, otp_code, expiry_minutes)
            elif self.provider == "sendgrid":
                return await self._send_via_sendgrid(to_email, otp_code, expiry_minutes)
            elif self.provider == "ses":
                return await self._send_via_ses(to_email, otp_code, expiry_minutes)
            else:
                raise ValueError(f"Unknown email provider: {self.provider}")
        except Exception as e:
            logger.error(f"Failed to send OTP email to {to_email}: {e}")
            raise
    
    async def _send_via_smtp(
        self,
        to_email: str,
        otp_code: str,
        expiry_minutes: int
    ) -> bool:
        """Send email via SMTP"""
        # Render email template
        template = Template(OTP_EMAIL_TEMPLATE)
        html_content = template.render(
            otp_code=otp_code,
            expiry_minutes=expiry_minutes
        )
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = f"Your Algopay verification code: {otp_code}"
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = to_email
        
        # Add HTML content
        html_part = MIMEText(html_content, "html")
        message.attach(html_part)
        
        # Send via SMTP
        try:
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_username,
                password=self.smtp_password,
                start_tls=True
            )
            logger.info(f"OTP email sent successfully to {to_email}")
            return True
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            raise
    
    async def _send_via_sendgrid(
        self,
        to_email: str,
        otp_code: str,
        expiry_minutes: int
    ) -> bool:
        """Send email via SendGrid API"""
        # TODO: Implement SendGrid integration
        # Requires: pip install sendgrid
        raise NotImplementedError("SendGrid integration not yet implemented")
    
    async def _send_via_ses(
        self,
        to_email: str,
        otp_code: str,
        expiry_minutes: int
    ) -> bool:
        """Send email via AWS SES"""
        # TODO: Implement AWS SES integration
        # Requires: pip install boto3
        raise NotImplementedError("AWS SES integration not yet implemented")


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get email service singleton"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
