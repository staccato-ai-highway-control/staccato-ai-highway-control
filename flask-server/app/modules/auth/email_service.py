import os
import smtplib
from email.message import EmailMessage


class EmailService:
    @staticmethod
    def is_enabled():
        return os.getenv("MAIL_ENABLED", "false").lower() == "true"

    @staticmethod
    def send_verification_email(to_email, verification_link):
        if not EmailService.is_enabled():
            return {
                "sent": False,
                "reason": "MAIL_ENABLED is false.",
            }

        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
        mail_from = os.getenv("MAIL_FROM") or smtp_username

        if not smtp_host:
            return {
                "sent": False,
                "reason": "SMTP_HOST is not configured.",
            }

        if not mail_from:
            return {
                "sent": False,
                "reason": "MAIL_FROM or SMTP_USERNAME is not configured.",
            }

        message = EmailMessage()
        message["Subject"] = "[STACCATO] 이메일 인증 안내"
        message["From"] = mail_from
        message["To"] = to_email

        message.set_content(
            f"""STACCATO 이메일 인증 안내입니다.

아래 링크를 클릭하여 이메일 인증을 완료해 주세요.

{verification_link}

이 링크는 일정 시간이 지나면 만료될 수 있습니다.
본인이 요청하지 않았다면 이 메일을 무시해 주세요.
"""
        )

        try:
            if smtp_use_ssl:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)

            with server:
                if smtp_use_tls and not smtp_use_ssl:
                    server.starttls()

                if smtp_username and smtp_password:
                    server.login(smtp_username, smtp_password)

                server.send_message(message)

            return {
                "sent": True,
                "reason": None,
            }

        except Exception as error:
            return {
                "sent": False,
                "reason": str(error),
            }
