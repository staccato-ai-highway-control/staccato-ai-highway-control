/**
 * 파일 역할: login 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { login } from "@/features/auth/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthResponse } from "@/features/auth/types";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  getUserFromAuthResponse,
  setStoredAccessToken,
  setStoredAuthUser,
} from "@/lib/authStorage";

// 코드 설명: getAccessToken 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getAccessToken(response: AuthResponse) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    response.access_token ??
    response.accessToken ??
    response.token ??
    response.data?.access_token ??
    response.data?.accessToken ??
    response.data?.token
  );
}

// 코드 설명: getTokenType 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getTokenType(response: AuthResponse) {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    response.token_type ??
    response.tokenType ??
    response.data?.token_type ??
    response.data?.tokenType
  );
}

// 코드 설명: getFriendlyLoginError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getFriendlyLoginError(error: unknown) {
  // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const message =
    error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.";
  // 코드 설명: lowerMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const lowerMessage = message.toLowerCase();

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: lowerMessage.includes("email") && lowerMessage.includes("verified")
  if (lowerMessage.includes("email") && lowerMessage.includes("verified")) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "이메일 인증이 필요합니다. 이메일로 받은 6자리 인증번호를 입력해주세요."
    return "이메일 인증이 필요합니다. 이메일로 받은 6자리 인증번호를 입력해주세요.";
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: lowerMessage.includes("pending")
  if (lowerMessage.includes("pending")) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "이메일 인증은 완료되었지만 관리자 승인 대기 중입니다."
    return "이메일 인증은 완료되었지만 관리자 승인 대기 중입니다.";
  }

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: lowerMessage.includes("not active") || lowerMessage.includes("inactive")
  if (lowerMessage.includes("not active") || lowerMessage.includes("inactive")) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "아직 활성화되지 않은 계정입니다. 관리자 승인 상태를 확인해주세요."
    return "아직 활성화되지 않은 계정입니다. 관리자 승인 상태를 확인해주세요.";
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: message
  return message;
}

// 코드 설명: LoginPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function LoginPage() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [loginId, setLoginId] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [loginId, setLoginId] = useState("");
  // 코드 설명: [password, setPassword] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [password, setPassword] = useState("");
  // 코드 설명: [errorMessage, setErrorMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [errorMessage, setErrorMessage] = useState("");
  // 코드 설명: [isSubmitting, setIsSubmitting] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 코드 설명: handleSubmit 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setErrorMessage("");

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(true);
      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await login({ login_id: loginId, password });
      // 코드 설명: accessToken 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const accessToken = getAccessToken(response);
      // 코드 설명: user 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const user = getUserFromAuthResponse(response);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !accessToken
      if (!accessToken) {
        // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error("로그인 응답에서 access_token을 찾을 수 없습니다.")
        throw new Error("로그인 응답에서 access_token을 찾을 수 없습니다.");
      }

      // 코드 설명: tokenType 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const tokenType = getTokenType(response);
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: tokenType && tokenType.toLowerCase() !== "bearer"
      if (tokenType && tokenType.toLowerCase() !== "bearer") {
        // 코드 설명: 현재 처리를 중단하고 호출부의 오류 처리 흐름으로 예외를 전달합니다: new Error(`지원하지 않는 토큰 타입입니다: ${tokenType}`)
        throw new Error(`지원하지 않는 토큰 타입입니다: ${tokenType}`);
      }

      // 코드 설명: setStoredAccessToken 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStoredAccessToken(accessToken);
      // 코드 설명: setStoredAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStoredAuthUser(user);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.is_email_verified === false
      if (user?.is_email_verified === false) {
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.push(
          `/verify-email${user.email ? `?email=${encodeURIComponent(user.email)}` : ""}`
        );
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: user?.account_status?.toUpperCase() === "PENDING"
      if (user?.account_status?.toUpperCase() === "PENDING") {
        // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
        router.push("/pending-approval");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
      router.push("/");
    } catch (error) {
      // 코드 설명: setErrorMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setErrorMessage(getFriendlyLoginError(error));
    } finally {
      // 코드 설명: setIsSubmitting 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsSubmitting(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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
