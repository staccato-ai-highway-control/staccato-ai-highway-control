"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/features/auth/api";
import type { AuthResponse } from "@/features/auth/types";
import {
  getUserFromAuthResponse,
  setStoredAccessToken,
  setStoredAuthUser,
} from "@/lib/authStorage";

function getAccessToken(response: AuthResponse) {
  return (
    response.access_token ??
    response.accessToken ??
    response.token ??
    response.data?.access_token ??
    response.data?.accessToken ??
    response.data?.token
  );
}

function getFriendlyLoginError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("email") && lowerMessage.includes("verified")) {
    return "이메일 인증이 필요합니다. 이메일로 받은 6자리 인증번호를 입력해주세요.";
  }

  if (lowerMessage.includes("pending")) {
    return "이메일 인증은 완료되었지만 관리자 승인 대기 중입니다.";
  }

  if (lowerMessage.includes("not active") || lowerMessage.includes("inactive")) {
    return "아직 활성화되지 않은 계정입니다. 관리자 승인 상태를 확인해주세요.";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      setIsSubmitting(true);
      const response = await login({ login_id: loginId, password });
      const accessToken = getAccessToken(response);
      const user = getUserFromAuthResponse(response);

      if (!accessToken) {
        throw new Error("로그인 응답에서 access_token을 찾을 수 없습니다.");
      }

      setStoredAccessToken(accessToken);
      setStoredAuthUser(user);

      if (user?.is_email_verified === false) {
        router.push(
          `/verify-email${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`
        );
        return;
      }

      if (user?.account_status?.toUpperCase() === "PENDING") {
        router.push("/pending-approval");
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getFriendlyLoginError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      {/* Background image */}
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full object-cover opacity-50 blur-sm scale-105"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-slate-950/75" />

      {/* Login card */}
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        <Link href="/" className="block no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          />
        </Link>

        <p className="mt-6 text-sm font-bold tracking-[0.24em] text-sky-300">
          CONTROL CENTER LOGIN
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          AI 기반 고속도로 정차 차량 탐지 및 관제 시스템에 접속합니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-slate-300">
              아이디
            </label>
            <input
              type="text"
              name="login_id"
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="아이디를 입력하세요"
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              required
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isSubmitting ? "로그인 중..." : "관제 시스템 로그인"}
          </button>
        </form>

       <div className="mt-5 flex items-center justify-center gap-3 text-sm text-slate-400">
          <Link href="/find-id" className="hover:text-white">
            아이디 찾기
          </Link>

          <span className="text-slate-600">|</span>

          <Link href="/find-password" className="hover:text-white">
            비밀번호 찾기
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            메인으로
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            회원가입 신청
          </Link>
        </div>
      </section>
    </main>
  );
}
