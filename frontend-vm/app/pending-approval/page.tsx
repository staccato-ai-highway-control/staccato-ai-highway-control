"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getStoredAuthUser } from "@/lib/authStorage";

function isIdentityVerified(user: ReturnType<typeof getStoredAuthUser>) {
  return Boolean(user?.is_email_verified || user?.email_verified_at);
}

function PendingApprovalContent() {
  const searchParams = useSearchParams();
  const [authUser, setAuthUser] = useState(() => getStoredAuthUser());
  const [email, setEmail] = useState("");

  const queryEmail = searchParams.get("email");
  const isVerified = isIdentityVerified(authUser);

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
        description: "관리자 승인 후 서비스를 이용할 수 있습니다.",
      };
    }

    return {
      tone: "info",
      title: "본인인증 방법을 선택해주세요.",
      description: "MVP에서는 이메일 인증으로 본인인증을 진행합니다.",
    };
  }, [isVerified]);

  const emailVerificationHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : "/verify-email";

  const noticeClassName =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : notice.tone === "error"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
        : "border-amber-400/30 bg-amber-400/10 text-amber-100";

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
                disabled
                className="rounded-lg border border-white/10 bg-slate-800/70 px-4 py-3 text-sm font-bold text-slate-400 disabled:cursor-not-allowed"
              >
                Google 본인인증은 추후 지원 예정입니다.
              </button>
            </div>
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
