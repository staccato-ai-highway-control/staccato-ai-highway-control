/**
 * 파일 역할: signup 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useEffect, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  resendEmailVerification,
  signup,
  startSignupGoogleIdentityVerification,
  verifyEmailCode,
} from "@/features/auth/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { UserRole } from "@/features/auth/types";

// 코드 설명: LOGIN_ID_PATTERN 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
const LOGIN_ID_PATTERN = /^[a-z0-9_-]{4,20}$/;

// 코드 설명: isEmailAlreadyExistsError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isEmailAlreadyExistsError(error: unknown) {
  // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const message = error instanceof Error ? error.message : "";
  // 코드 설명: lowerMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const lowerMessage = message.toLowerCase();

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    lowerMessage.includes("email already exists") ||
    lowerMessage.includes("email_already_in_use") ||
    message.includes("이미 사용 중인 이메일")
  );
}

// 코드 설명: SignupPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function SignupPage() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();

  // 코드 설명: [name, setName] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [name, setName] = useState("");
  // 코드 설명: [loginId, setLoginId] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loginId, setLoginId] = useState("");
  // 코드 설명: [phone, setPhone] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [phone, setPhone] = useState("");
  // 코드 설명: [email, setEmail] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [email, setEmail] = useState("");
  // 코드 설명: [code, setCode] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [code, setCode] = useState("");
  // 코드 설명: [password, setPassword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [password, setPassword] = useState("");
  // 코드 설명: [passwordConfirm, setPasswordConfirm] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [passwordConfirm, setPasswordConfirm] = useState("");
  // 코드 설명: [requestedRole, setRequestedRole] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [requestedRole, setRequestedRole] = useState<UserRole>("CONTROL_ADMIN");
  // 코드 설명: [reason, setReason] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [reason, setReason] = useState("");
  // 코드 설명: [agreed, setAgreed] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [agreed, setAgreed] = useState(false);
  // 코드 설명: [isCodeSent, setIsCodeSent] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isCodeSent, setIsCodeSent] = useState(false);
  // 코드 설명: [isEmailVerified, setIsEmailVerified] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  // 코드 설명: [emailVerifyMessage, setEmailVerifyMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [emailVerifyMessage, setEmailVerifyMessage] = useState("");
  // 코드 설명: [emailResendCooldown, setEmailResendCooldown] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  // 코드 설명: [isSendingCode, setIsSendingCode] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSendingCode, setIsSendingCode] = useState(false);
  // 코드 설명: [isVerifyingCode, setIsVerifyingCode] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  // 코드 설명: [isStartingGoogleIdentity, setIsStartingGoogleIdentity] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isStartingGoogleIdentity, setIsStartingGoogleIdentity] = useState(false);
  // 코드 설명: [isSubmitting, setIsSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 코드 설명: canSubmit 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const canSubmit =
    Boolean(
      loginId &&
        email &&
        password &&
        passwordConfirm &&
        name &&
        agreed &&
        isEmailVerified
    ) &&
    !isSubmitting;

  // 코드 설명: isEmailSendDisabled 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isEmailSendDisabled =
    !email || isSendingCode || isEmailVerified || emailResendCooldown > 0;

  // 코드 설명: emailSendButtonLabel 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const emailSendButtonLabel = isSendingCode
    ? "발송 중..."
    : isEmailVerified
      ? "인증 완료"
      : emailResendCooldown > 0
        ? `재발송 ${emailResendCooldown}초`
        : isCodeSent
          ? "인증번호 재발송"
          : "인증번호 발송";

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: emailResendCooldown <= 0
    if (emailResendCooldown <= 0) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: timer 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const timer = window.setInterval(() => {
      // 코드 설명: setEmailResendCooldown 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => window.clearInterval(timer)
    return () => window.clearInterval(timer);
  }, [emailResendCooldown]);

  // 코드 설명: handleEmailChange 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleEmailChange(nextEmail: string) {
    // 코드 설명: setEmail 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setEmail(nextEmail);
    // 코드 설명: setIsEmailVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsEmailVerified(false);
    // 코드 설명: setIsCodeSent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setIsCodeSent(false);
    // 코드 설명: setEmailResendCooldown 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setEmailResendCooldown(0);
    // 코드 설명: setCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setCode("");
    // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setEmailVerifyMessage("");
  }

  // 코드 설명: getSignupValidationMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function getSignupValidationMessage() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !name || !loginId || !email || !password || !passwordConfirm
    if (!name || !loginId || !email || !password || !passwordConfirm) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "인증번호 발송 전 이름, 아이디, 이메일, 비밀번호를 먼저 입력해주세요."
      return "인증번호 발송 전 이름, 아이디, 이메일, 비밀번호를 먼저 입력해주세요.";
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !LOGIN_ID_PATTERN.test(loginId)
    if (!LOGIN_ID_PATTERN.test(loginId)) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다."
      return "아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다.";
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: password !== passwordConfirm
    if (password !== passwordConfirm) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "비밀번호가 일치하지 않습니다."
      return "비밀번호가 일치하지 않습니다.";
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !agreed
    if (!agreed) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "개인정보 수집 및 이용에 동의해주세요."
      return "개인정보 수집 및 이용에 동의해주세요.";
    }

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: ""
    return "";
  }

  // 코드 설명: handleSendVerificationCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSendVerificationCode() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !email
    if (!email) {
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("이메일 주소를 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: emailResendCooldown > 0
    if (emailResendCooldown > 0) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: requestVerification 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const requestVerification = async () => {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isCodeSent
      if (isCodeSent) {
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: resendEmailVerification({ email })
        return resendEmailVerification({ email });
      }

      // 코드 설명: validationMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const validationMessage = getSignupValidationMessage();

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: validationMessage
      if (validationMessage) {
        // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error(validationMessage)
        throw new Error(validationMessage);
      }

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: await signup({ name, login_id: loginId, phone, email, password, request…
        return await signup({
          name,
          login_id: loginId,
          phone,
          email,
          password,
          requestedRole,
          reason,
          agreed,
        });
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEmailAlreadyExistsError(error)
        if (isEmailAlreadyExistsError(error)) {
          // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: resendEmailVerification({ email })
          return resendEmailVerification({ email });
        }

        // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: error
        throw error;
      }
    };

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsSendingCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSendingCode(true);
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("");

      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await requestVerification() as {
        retry_after?: number;
        data?: {
          email_verification?: {
            retry_after?: number;
          };
        };
      };

      // 코드 설명: retryAfter 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const retryAfter =
        response.retry_after ??
        response.data?.email_verification?.retry_after ??
        60;

      // 코드 설명: setIsCodeSent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsCodeSent(true);
      // 코드 설명: setIsEmailVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEmailVerified(false);
      // 코드 설명: setEmailResendCooldown 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailResendCooldown(Math.max(Number(retryAfter) || 60, 1));
      // 코드 설명: setCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setCode("");
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage(
        isCodeSent
          ? "인증번호를 다시 전송했습니다. 이메일을 확인해주세요."
          : "인증번호를 전송했습니다. 이메일을 확인해주세요."
      );
    } catch (error) {
      // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 전송 중 오류가 발생했습니다.";

      // 코드 설명: retryAfterMatch 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const retryAfterMatch = message.match(/(\\d+)초/);
      // 코드 설명: retryAfter 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const retryAfter = retryAfterMatch ? Number(retryAfterMatch[1]) : 60;

      // 코드 설명: setIsEmailVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEmailVerified(false);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message.includes("EMAIL_VERIFICATION_COOLDOWN") || message.includes("후 …
      if (
        message.includes("EMAIL_VERIFICATION_COOLDOWN") ||
        message.includes("후 다시 요청")
      ) {
        // 코드 설명: setIsCodeSent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsCodeSent(true);
        // 코드 설명: setEmailResendCooldown 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setEmailResendCooldown(Math.max(retryAfter, 1));
        // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setEmailVerifyMessage(message);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEmailAlreadyExistsError(error)
      if (isEmailAlreadyExistsError(error)) {
        // 코드 설명: setIsCodeSent 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setIsCodeSent(false);
        // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setEmailVerifyMessage("이미 사용 중인 이메일입니다.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage(message);
    } finally {
      // 코드 설명: setIsSendingCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSendingCode(false);
    }
  }

  // 코드 설명: handleVerifyEmailCode 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleVerifyEmailCode() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: code.length !== 6
    if (code.length !== 6) {
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("6자리 인증번호를 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsVerifyingCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsVerifyingCode(true);
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("");
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await verifyEmailCode(email, code);
      await verifyEmailCode(email, code);
      // 코드 설명: setIsEmailVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEmailVerified(true);
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("이메일 인증이 완료되었습니다. 이제 회원가입 신청을 진행할 수 있습니다.");
    } catch {
      // 코드 설명: setIsEmailVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsEmailVerified(false);
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("인증번호가 올바르지 않습니다.");
    } finally {
      // 코드 설명: setIsVerifyingCode 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsVerifyingCode(false);
    }
  }

  // 코드 설명: handleStartGoogleIdentity 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleStartGoogleIdentity() {
    // 코드 설명: validationMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const validationMessage = getSignupValidationMessage();

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: validationMessage
    if (validationMessage) {
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage(validationMessage);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsStartingGoogleIdentity 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsStartingGoogleIdentity(true);
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("");

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await signup({ name, login_id: loginId, phone, email, password, request…
        await signup({
          name,
          login_id: loginId,
          phone,
          email,
          password,
          requestedRole,
          reason,
          agreed,
          identityMethod: "GOOGLE",
        });
      } catch (error) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isEmailAlreadyExistsError(error)
        if (!isEmailAlreadyExistsError(error)) {
          // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: error
          throw error;
        }
      }

      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await startSignupGoogleIdentityVerification(email.trim());
      // 코드 설명: authorizationUrl 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const authorizationUrl = response.data?.authorization_url;

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !authorizationUrl
      if (!authorizationUrl) {
        // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("Google 인증 URL을 찾을 수 없습니다.")
        throw new Error("Google 인증 URL을 찾을 수 없습니다.");
      }

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.location.href = authorizationUrl;
      window.location.href = authorizationUrl;
    } catch (error) {
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage(
        error instanceof Error
          ? error.message
          : "Google 본인인증 시작 중 오류가 발생했습니다."
      );
    } finally {
      // 코드 설명: setIsStartingGoogleIdentity 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsStartingGoogleIdentity(false);
    }
  }

  // 코드 설명: handleSubmitSignup 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const handleSubmitSignup = async (event: FormEvent<HTMLFormElement>) => {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !name || !loginId || !email || !password
    if (!name || !loginId || !email || !password) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: alert("이름, 아이디, 이메일, 비밀번호를 입력해주세요.");
      alert("이름, 아이디, 이메일, 비밀번호를 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !LOGIN_ID_PATTERN.test(loginId)
    if (!LOGIN_ID_PATTERN.test(loginId)) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: alert("아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다.");
      alert("아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: password !== passwordConfirm
    if (password !== passwordConfirm) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: alert("비밀번호가 일치하지 않습니다.");
      alert("비밀번호가 일치하지 않습니다.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !agreed
    if (!agreed) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: alert("개인정보 수집 및 이용에 동의해주세요.");
      alert("개인정보 수집 및 이용에 동의해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isEmailVerified
    if (!isEmailVerified) {
      // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmailVerifyMessage("회원가입 신청 전에 이메일 인증을 완료해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isCodeSent
    if (isCodeSent) {
      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push(`/pending-approval?email=${encodeURIComponent(email.trim())}`);
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(true);

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await signup({ name, login_id: loginId, phone, email, password, request…
      await signup({
        name,
        login_id: loginId,
        phone,
        email,
        password,
        requestedRole,
        reason,
        agreed,
      });

      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push(`/pending-approval?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isEmailAlreadyExistsError(error)
      if (isEmailAlreadyExistsError(error)) {
        // 코드 설명: setEmailVerifyMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setEmailVerifyMessage("이미 가입 신청된 이메일입니다. 로그인 또는 승인 상태를 확인해주세요.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: alert( error instanceof Error ? error.message : "회원가입 신청 중 오류가 발생했습니다."…
      alert(
        error instanceof Error
          ? error.message
          : "회원가입 신청 중 오류가 발생했습니다."
      );
    } finally {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
    }
  };

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-950 px-6 py-10 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/75" />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        <Link href="/" className="block no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          />
        </Link>

        <p className="mt-6 text-sm font-bold tracking-[0.24em] text-sky-300">
          STAFF ACCESS REQUEST
        </p>

        <h1 className="mt-3 text-3xl font-black">회원가입 신청</h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          회원가입 신청 후 최고관리자 승인을 거쳐 관제 시스템을 사용할 수 있습니다.
        </p>

        <form onSubmit={handleSubmitSignup} className="mt-8 grid gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-300">이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">아이디</label>
            <input
              type="text"
              name="login_id"
              autoComplete="username"
              placeholder="영문 소문자, 숫자, _, -"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value.trim())}
              pattern="[a-z0-9_-]{4,20}"
              minLength={4}
              maxLength={20}
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />

            <p className="mt-2 text-xs text-slate-400">
              4~20자의 영문 소문자, 숫자, _, -만 사용할 수 있습니다. @는 사용할 수 없습니다.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">연락처</label>
            <input
              type="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">이메일</label>
            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="이메일 주소를 입력하세요"
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />

              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isEmailSendDisabled}
                className="rounded-lg border border-sky-400/60 px-4 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
              >
                {emailSendButtonLabel}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              회원가입 신청 전에 이메일 인증을 먼저 완료해주세요.
            </p>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-bold text-slate-100">
                본인인증 방법
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                이메일 인증 또는 Google 본인인증 중 하나를 선택해 진행할 수 있습니다.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={!email || isSendingCode || isEmailVerified}
                  className="rounded-lg border border-sky-400/60 px-4 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
                >
                  {isEmailVerified ? "이메일 인증 완료" : "이메일 인증하기"}
                </button>

                <button
                  type="button"
                  onClick={handleStartGoogleIdentity}
                  disabled={isStartingGoogleIdentity || isEmailVerified}
                  className="rounded-lg border border-emerald-400/60 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
                >
                  {isStartingGoogleIdentity
                    ? "Google 인증 이동 중..."
                    : isEmailVerified
                      ? "이메일 인증 완료"
                      : "Google로 본인인증"}
                </button>
              </div>
            </div>

            {isCodeSent && !isEmailVerified ? (
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6자리 인증번호"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                />

                <button
                  type="button"
                  onClick={handleVerifyEmailCode}
                  disabled={code.length !== 6 || isVerifyingCode}
                  className="rounded-lg bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                >
                  {isVerifyingCode ? "확인 중..." : "인증 확인"}
                </button>
              </div>
            ) : null}

            {emailVerifyMessage ? (
              <p
                className={`mt-2 text-xs font-semibold ${
                  isEmailVerified
                    ? "text-emerald-300"
                    : "text-sky-200"
                }`}
              >
                {emailVerifyMessage}
              </p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              요청 권한
            </label>
            <select
              value={requestedRole}
              onChange={(event) => setRequestedRole(event.target.value as UserRole)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            >
              <option value="CONTROL_ADMIN">관제 관리자</option>
              <option value="DISPATCH_ADMIN">출동 관리자</option>
              <option value="VIEWER">일반 조회 계정</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              신청 사유
            </label>
            <textarea
              placeholder="관제 시스템 사용 신청 사유를 입력해주세요."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                비밀번호
              </label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                비밀번호 확인
              </label>
              <input
                type="password"
                placeholder="비밀번호 재입력"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1"
            />
            <span>
              개인정보 수집 및 이용에 동의합니다. 입력한 정보는 내부 직원 승인
              및 계정 관리를 위해 사용됩니다.
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isSubmitting ? "신청 중..." : "회원가입 신청"}
          </button>

          {!isEmailVerified ? (
            <p className="text-center text-xs font-semibold text-slate-400">
              이메일 인증을 완료하면 회원가입 신청 버튼이 활성화됩니다.
            </p>
          ) : null}
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            메인으로
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            로그인
          </Link>
        </div>
      </section>
    </main>
  );
}
