"""auth 도메인의 핵심 비즈니스 규칙과 데이터 처리를 구현한다.

권한 검증, 트랜잭션 경계, 외부 연동 및 응답 직렬화를 라우트와 분리해 관리한다."""

# 설명: os 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import os
# 설명: smtplib 모듈을 현재 파일에서 사용할 수 있도록 가져온다.
import smtplib
# 설명: email.message에서 EmailMessage 이름을 가져와 아래 로직에서 재사용한다.
from email.message import EmailMessage


# 설명: `EmailService` 클래스를 정의하고 기본 object의 동작 또는 계약을 확장한다.
class EmailService:
    # 설명: `is_enabled` 함수는 조건의 참/거짓을 판정하는 함수다.
    @staticmethod
    def is_enabled():
        # 설명: 호출자에게 os.getenv('MAIL_ENABLED', 'false').lower() == 'true' 값을 함수 결과로 반환한다.
        return os.getenv("MAIL_ENABLED", "false").lower() == "true"

    # 설명: `send_verification_email` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
    @staticmethod
    def send_verification_email(to_email, verification_code):
        # 설명: `not EmailService.is_enabled()` 조건 결과에 따라 실행 경로를 분기한다.
        if not EmailService.is_enabled():
            # 설명: 호출자에게 {'sent': False, 'reason': 'MAIL_ENABLED is false.'} 값을 함수 결과로 반환한다.
            return {
                "sent": False,
                "reason": "MAIL_ENABLED is false.",
            }

        # 설명: `smtp_host`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        smtp_host = os.getenv("SMTP_HOST")
        # 설명: `smtp_port`에 `int` 호출 결과를 저장해 다음 처리에서 사용한다.
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        # 설명: `smtp_username`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        smtp_username = os.getenv("SMTP_USERNAME")
        # 설명: `smtp_password`에 `os.getenv` 호출 결과를 저장해 다음 처리에서 사용한다.
        smtp_password = os.getenv("SMTP_PASSWORD")
        # 설명: `smtp_use_tls`에 os.getenv('SMTP_USE_TLS', 'true').lower() == 'true' 표현식의 계산 결과를 저장한다.
        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
        # 설명: `smtp_use_ssl`에 os.getenv('SMTP_USE_SSL', 'false').lower() == 'true' 표현식의 계산 결과를 저장한다.
        smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
        # 설명: `mail_from`에 os.getenv('MAIL_FROM') or smtp_username 표현식의 계산 결과를 저장한다.
        mail_from = os.getenv("MAIL_FROM") or smtp_username

        # 설명: `not smtp_host` 조건 결과에 따라 실행 경로를 분기한다.
        if not smtp_host:
            # 설명: 호출자에게 {'sent': False, 'reason': 'SMTP_HOST is not configured.'} 값을 함수 결과로 반환한다.
            return {
                "sent": False,
                "reason": "SMTP_HOST is not configured.",
            }

        # 설명: `not mail_from` 조건 결과에 따라 실행 경로를 분기한다.
        if not mail_from:
            # 설명: 호출자에게 {'sent': False, 'reason': 'MAIL_FROM or SMTP_USERNAME is not configured.'} 값을 함수 결과로 반환한다.
            return {
                "sent": False,
                "reason": "MAIL_FROM or SMTP_USERNAME is not configured.",
            }

        # 설명: `message`에 `EmailMessage` 호출 결과를 저장해 다음 처리에서 사용한다.
        message = EmailMessage()
        # 설명: `message['Subject']`의 기준값 또는 기본값을 '[STACCATO] 이메일 인증번호 안내'로 설정한다.
        message["Subject"] = "[STACCATO] 이메일 인증번호 안내"
        # 설명: `message['From']`에 mail_from 표현식의 계산 결과를 저장한다.
        message["From"] = mail_from
        # 설명: `message['To']`에 to_email 표현식의 계산 결과를 저장한다.
        message["To"] = to_email

        # 설명: `message.set_content`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        message.set_content(
            f"""STACCATO 이메일 인증 안내입니다.

아래 6자리 인증번호를 입력하여 이메일 인증을 완료해 주세요.

인증번호: {verification_code}

이 인증번호는 10분 후 만료됩니다.
본인이 요청하지 않았다면 이 메일을 무시해 주세요.
"""
        )

        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `smtp_use_ssl` 조건 결과에 따라 실행 경로를 분기한다.
            if smtp_use_ssl:
                # 설명: `server`에 `smtplib.SMTP_SSL` 호출 결과를 저장해 다음 처리에서 사용한다.
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
            else:
                # 설명: `server`에 `smtplib.SMTP` 호출 결과를 저장해 다음 처리에서 사용한다.
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)

            # 설명: `server` 컨텍스트의 자원 수명주기를 보장하며 내부 작업을 실행한다.
            with server:
                # 설명: `smtp_use_tls and (not smtp_use_ssl)` 조건 결과에 따라 실행 경로를 분기한다.
                if smtp_use_tls and not smtp_use_ssl:
                    # 설명: `server.starttls`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    server.starttls()

                # 설명: `smtp_username and smtp_password` 조건 결과에 따라 실행 경로를 분기한다.
                if smtp_username and smtp_password:
                    # 설명: `server.login`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                    server.login(smtp_username, smtp_password)

                # 설명: `server.send_message`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                server.send_message(message)

            # 설명: 호출자에게 {'sent': True, 'reason': None} 값을 함수 결과로 반환한다.
            return {
                "sent": True,
                "reason": None,
            }

        except Exception as error:
            # 설명: 호출자에게 {'sent': False, 'reason': str(error)} 값을 함수 결과로 반환한다.
            return {
                "sent": False,
                "reason": str(error),
            }
