"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  resendEmailVerification,
  signup,
  verifyEmailCode,
} from "@/features/auth/api";

const LOGIN_ID_PATTERN = /^[a-z0-9_-]{4,20}$/;

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [requestedRole, setRequestedRole] = useState("CONTROL_ADMIN");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailVerifyMessage, setEmailVerifyMessage] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    Boolean(loginId && email && password && passwordConfirm && name && agreed) &&
    !isCodeSent &&
    !isSubmitting;

  function handleEmailChange(nextEmail: string) {
    setEmail(nextEmail);
    setIsEmailVerified(false);
    setIsCodeSent(false);
    setCode("");
    setEmailVerifyMessage("");
  }

  async function handleSendVerificationCode() {
    if (!email) {
      setEmailVerifyMessage("이메일 주소를 입력해주세요.");
      return;
    }

    if (!isCodeSent) {
      setEmailVerifyMessage("회원가입 신청 후 인증번호를 재발송할 수 있습니다.");
      return;
    }

    try {
      setIsSendingCode(true);
      setEmailVerifyMessage("");
      await resendEmailVerification({ email });
      setIsCodeSent(true);
      setIsEmailVerified(false);
      setCode("");
      setEmailVerifyMessage("인증번호를 다시 전송했습니다. 이메일을 확인해주세요.");
    } catch (error) {
      setIsCodeSent(false);
      setIsEmailVerified(false);
      setEmailVerifyMessage(
        error instanceof Error
          ? error.message
          : "인증번호 전송 중 오류가 발생했습니다."
      );
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
      setEmailVerifyMessage("이메일 인증이 완료되었습니다.");
      alert("이메일 인증이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
      router.push("/pending-approval");
    } catch {
      setIsEmailVerified(false);
      setEmailVerifyMessage("인증번호가 올바르지 않습니다.");
    } finally {
      setIsVerifyingCode(false);
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

      setIsCodeSent(true);
      setIsEmailVerified(false);
      setCode("");
      setEmailVerifyMessage("회원가입 신청이 접수되었습니다. 이메일로 받은 인증번호를 입력해주세요.");
    } catch (error) {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
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
                disabled={!email || !isCodeSent || isSendingCode || isEmailVerified}
                className="rounded-lg border border-sky-400/60 px-4 py-3 text-sm font-bold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
              >
                {isSendingCode
                  ? "재발송 중..."
                  : isEmailVerified
                    ? "인증 완료"
                    : "인증번호 재발송"}
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              회원가입 신청이 완료되면 인증번호가 이메일로 자동 발송됩니다.
            </p>

            {isCodeSent && !isEmailVerified ? (
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
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
                  isEmailVerified ? "text-emerald-300" : "text-sky-200"
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
              onChange={(event) => setRequestedRole(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            >
              <option value="CONTROL_ADMIN">관제관리자</option>
              <option value="MAINTENANCE_ADMIN">유지보수 담당자</option>
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
            {isSubmitting
              ? "신청 중..."
              : isCodeSent
                ? "인증번호 발송 완료"
                : "회원가입 신청"}
          </button>

          {!isCodeSent ? (
            <p className="text-center text-xs font-semibold text-slate-400">
              회원가입 신청 후 이메일로 받은 6자리 인증번호를 입력해주세요.
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
