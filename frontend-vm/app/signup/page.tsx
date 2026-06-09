"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resendEmailVerification,
  signup,
  startSignupGoogleIdentityVerification,
  verifyEmailCode,
} from "@/features/auth/api";
import type { UserRole } from "@/features/auth/types";

const LOGIN_ID_PATTERN = /^[a-z0-9_-]{4,20}$/;

function isEmailAlreadyExistsError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes("email already exists") ||
    lowerMessage.includes("email_already_in_use") ||
    message.includes("이미 사용 중인 이메일")
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [requestedRole, setRequestedRole] = useState<UserRole>("CONTROL_ADMIN");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerifyMessage, setEmailVerifyMessage] = useState("");
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isStartingGoogleIdentity, setIsStartingGoogleIdentity] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isEmailSendDisabled =
    !email || isSendingCode || isEmailVerified || emailResendCooldown > 0;

  const emailSendButtonLabel = isSendingCode
    ? "발송 중..."
    : isEmailVerified
      ? "인증 완료"
      : emailResendCooldown > 0
        ? `재발송 ${emailResendCooldown}초`
        : isCodeSent
          ? "인증번호 재발송"
          : "인증번호 발송";

  useEffect(() => {
    if (emailResendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setEmailResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailResendCooldown]);

  function handleEmailChange(nextEmail: string) {
    setEmail(nextEmail);
    setIsEmailVerified(false);
    setIsCodeSent(false);
    setEmailResendCooldown(0);
    setCode("");
    setEmailVerifyMessage("");
  }

  function getSignupValidationMessage() {
    if (!name || !loginId || !email || !password || !passwordConfirm) {
      return "인증번호 발송 전 이름, 아이디, 이메일, 비밀번호를 먼저 입력해주세요.";
    }

    if (!LOGIN_ID_PATTERN.test(loginId)) {
      return "아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다.";
    }

    if (password !== passwordConfirm) {
      return "비밀번호가 일치하지 않습니다.";
    }

    if (!agreed) {
      return "개인정보 수집 및 이용에 동의해주세요.";
    }

    return "";
  }

  async function handleSendVerificationCode() {
    if (!email) {
      setEmailVerifyMessage("이메일 주소를 입력해주세요.");
      return;
    }

    if (emailResendCooldown > 0) {
      return;
    }

    const requestVerification = async () => {
      if (isCodeSent) {
        return resendEmailVerification({ email });
      }

      const validationMessage = getSignupValidationMessage();

      if (validationMessage) {
        throw new Error(validationMessage);
      }

      try {
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
        if (isEmailAlreadyExistsError(error)) {
          return resendEmailVerification({ email });
        }

        throw error;
      }
    };

    try {
      setIsSendingCode(true);
      setEmailVerifyMessage("");

      const response = await requestVerification() as {
        retry_after?: number;
        data?: {
          email_verification?: {
            retry_after?: number;
          };
        };
      };

      const retryAfter =
        response.retry_after ??
        response.data?.email_verification?.retry_after ??
        60;

      setIsCodeSent(true);
      setIsEmailVerified(false);
      setEmailResendCooldown(Math.max(Number(retryAfter) || 60, 1));
      setCode("");
      setEmailVerifyMessage(
        isCodeSent
          ? "인증번호를 다시 전송했습니다. 이메일을 확인해주세요."
          : "인증번호를 전송했습니다. 이메일을 확인해주세요."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "인증번호 전송 중 오류가 발생했습니다.";

      const retryAfterMatch = message.match(/(\\d+)초/);
      const retryAfter = retryAfterMatch ? Number(retryAfterMatch[1]) : 60;

      setIsEmailVerified(false);

      if (
        message.includes("EMAIL_VERIFICATION_COOLDOWN") ||
        message.includes("후 다시 요청")
      ) {
        setIsCodeSent(true);
        setEmailResendCooldown(Math.max(retryAfter, 1));
        setEmailVerifyMessage(message);
        return;
      }

      if (isEmailAlreadyExistsError(error)) {
        setIsCodeSent(false);
        setEmailVerifyMessage("이미 사용 중인 이메일입니다.");
        return;
      }

      setEmailVerifyMessage(message);
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (code.length !== 6) {
      setEmailVerifyMessage("6자리 인증번호를 입력해주세요.");
      return;
    }

    try {
      setIsVerifyingCode(true);
      setEmailVerifyMessage("");
      await verifyEmailCode(email, code);
      setIsEmailVerified(true);
      setEmailVerifyMessage("이메일 인증이 완료되었습니다. 이제 회원가입 신청을 진행할 수 있습니다.");
    } catch {
      setIsEmailVerified(false);
      setEmailVerifyMessage("인증번호가 올바르지 않습니다.");
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function handleStartGoogleIdentity() {
    const validationMessage = getSignupValidationMessage();

    if (validationMessage) {
      setEmailVerifyMessage(validationMessage);
      return;
    }

    try {
      setIsStartingGoogleIdentity(true);
      setEmailVerifyMessage("");

      try {
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
        if (!isEmailAlreadyExistsError(error)) {
          throw error;
        }
      }

      const response = await startSignupGoogleIdentityVerification(email.trim());
      const authorizationUrl = response.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error("Google 인증 URL을 찾을 수 없습니다.");
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      setEmailVerifyMessage(
        error instanceof Error
          ? error.message
          : "Google 본인인증 시작 중 오류가 발생했습니다."
      );
    } finally {
      setIsStartingGoogleIdentity(false);
    }
  }

  const handleSubmitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !loginId || !email || !password) {
      alert("이름, 아이디, 이메일, 비밀번호를 입력해주세요.");
      return;
    }

    if (!LOGIN_ID_PATTERN.test(loginId)) {
      alert("아이디는 영문 소문자, 숫자, _, -만 사용해 4~20자로 입력해주세요. @는 사용할 수 없습니다.");
      return;
    }

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agreed) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    if (!isEmailVerified) {
      setEmailVerifyMessage("회원가입 신청 전에 이메일 인증을 완료해주세요.");
      return;
    }

    if (isCodeSent) {
      router.push(`/pending-approval?email=${encodeURIComponent(email.trim())}`);
      return;
    }

    try {
      setIsSubmitting(true);

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

      router.push(`/pending-approval?email=${encodeURIComponent(email.trim())}`);
    } catch (error) {
      if (isEmailAlreadyExistsError(error)) {
        setEmailVerifyMessage("이미 가입 신청된 이메일입니다. 로그인 또는 승인 상태를 확인해주세요.");
        return;
      }

      alert(
        error instanceof Error
          ? error.message
          : "회원가입 신청 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
