"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredAuthUser } from "@/lib/authStorage";
import { startSignupGoogleIdentityVerification } from "@/features/auth/api";

function isIdentityVerified(user: ReturnType<typeof getStoredAuthUser>) {
  return Boolean(user?.is_email_verified || user?.email_verified_at);
}

function isAlreadyVerifiedMessage(message: string) {
  return message.toLowerCase().includes("identity is already verified");
}

function PendingApprovalContent() {
  const searchParams = useSearchParams();
  const [authUser, setAuthUser] = useState(() => getStoredAuthUser());
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [manualIdentityVerified, setManualIdentityVerified] = useState(false);
  const [isStartingGoogleIdentity, setIsStartingGoogleIdentity] = useState(false);

  const queryEmail = searchParams.get("email");
  const identityStatus = searchParams.get("status") ?? searchParams.get("identity_status");
  const identityProvider = searchParams.get("provider") ?? searchParams.get("identity");
  const identityMessage = searchParams.get("message");

  const normalizedIdentityStatus = (identityStatus ?? "").toLowerCase();
  const normalizedIdentityProvider = identityProvider?.toLowerCase();

  const isGoogleIdentitySuccess =
    normalizedIdentityProvider === "google" &&
    ["success", "verified", "completed"].includes(normalizedIdentityStatus);

  const isGoogleIdentityFailure =
    normalizedIdentityProvider === "google" &&
    ["failed", "error"].includes(normalizedIdentityStatus);

  const isVerified =
    isIdentityVerified(authUser) || isGoogleIdentitySuccess || manualIdentityVerified;

  useEffect(() => {
    const storedUser = getStoredAuthUser();
    setAuthUser(storedUser);
    setEmail(queryEmail ?? storedUser?.email ?? "");
  }, [queryEmail]);

  const notice = useMemo(() => {
    if (isVerified) {
      return {
        tone: "success",
        title: "본인인증이 완료되었습니다.",
        description:
          normalizedIdentityProvider === "google"
            ? "Google 본인인증이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다."
            : "관리자 승인 후 서비스를 이용할 수 있습니다.",
      };
    }

    if (isGoogleIdentityFailure) {
      return {
        tone: "error",
        title: "Google 본인인증에 실패했습니다.",
        description:
          identityMessage || "회원가입 이메일과 Google 계정 이메일이 일치하지 않습니다.",
      };
    }

    return {
      tone: "info",
      title: "본인인증 방법을 선택해주세요.",
      description: "이메일 인증 또는 Google 본인인증 중 하나를 선택해 진행할 수 있습니다.",
    };
  }, [
    isVerified,
    isGoogleIdentityFailure,
    normalizedIdentityProvider,
    identityMessage,
  ]);

  const emailVerificationHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : "/verify-email";

  const noticeClassName =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : notice.tone === "error"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
        : "border-amber-400/30 bg-amber-400/10 text-amber-100";

  async function handleStartGoogleIdentity() {
    const targetEmail = email.trim();

    if (!targetEmail) {
      setMessage("가입 이메일을 입력해주세요.");
      return;
    }

    try {
      setIsStartingGoogleIdentity(true);
      setMessage("");

      const response = await startSignupGoogleIdentityVerification(targetEmail);
      const authorizationUrl = response.data?.authorization_url;

      if (!authorizationUrl) {
        throw new Error("Google 인증 URL을 찾을 수 없습니다.");
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Google 본인인증 시작 중 오류가 발생했습니다.";

      if (isAlreadyVerifiedMessage(errorMessage)) {
        setManualIdentityVerified(true);
        setMessage("Google 본인인증이 이미 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
        return;
      }

      setMessage(errorMessage);
    } finally {
      setIsStartingGoogleIdentity(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/80" />

      <section className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/75 p-8 text-center shadow-2xl backdrop-blur-md">
        <Link href="/" className="mx-auto block w-fit no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          />
        </Link>

        <p className="mt-8 text-sm font-bold tracking-[0.24em] text-amber-300">
          APPROVAL PENDING
        </p>

        <h1 className="mt-4 text-3xl font-black">관리자 승인 대기 중</h1>

        <div className={`mt-6 rounded-xl border p-4 text-left text-sm ${noticeClassName}`}>
          <p className="font-bold">{notice.title}</p>
          <p className="mt-2 leading-6 text-slate-200">{notice.description}</p>
        </div>

        {!isVerified ? (
          <div className="mt-8 grid gap-4 text-left">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                가입 이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={emailVerificationHref}
                className="rounded-lg border border-sky-400/60 px-4 py-3 text-center text-sm font-bold text-sky-100 no-underline transition hover:bg-sky-500/20"
              >
                이메일 인증하기
              </Link>

              <button
                type="button"
                onClick={handleStartGoogleIdentity}
                disabled={!email.trim() || isStartingGoogleIdentity}
                className="rounded-lg border border-emerald-400/60 px-4 py-3 text-sm font-bold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-slate-600 disabled:text-slate-500"
              >
                {isStartingGoogleIdentity ? "Google 인증 이동 중..." : "Google로 본인인증"}
              </button>
            </div>

            {message ? (
              <p className="text-sm font-semibold text-amber-200">{message}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-left text-sm">
          <p className="font-bold text-slate-100">승인 절차</p>

          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">
            <li>본인인증 완료</li>
            <li>회원가입 신청 접수</li>
            <li>최고관리자 계정 승인</li>
            <li>승인 후 로그인 가능</li>
          </ol>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            메인으로
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            로그인 화면
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={null}>
      <PendingApprovalContent />
    </Suspense>
  );
}
