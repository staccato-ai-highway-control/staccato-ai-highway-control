/**
 * 파일 역할: verify-email 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { FormEvent, useEffect, useState } from "react";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { resendEmailVerification, verifyEmailCode } from "@/features/auth/api";

// 코드 설명: VerifyStatus 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type VerifyStatus = "idle" | "submitting" | "success" | "error";

// 코드 설명: getFriendlyVerifyError 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getFriendlyVerifyError(error: unknown) {
  // 코드 설명: message 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const message =
    error instanceof Error ? error.message : "이메일 인증 중 오류가 발생했습니다.";

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: message.toLowerCase().includes("already verified")
  if (message.toLowerCase().includes("already verified")) {
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: "이미 인증된 이메일입니다."
    return "이미 인증된 이메일입니다.";
  }

  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: message
  return message;
}

// 코드 설명: VerifyEmailPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function VerifyEmailPage() {
  // 코드 설명: [email, setEmail] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [email, setEmail] = useState("");
  // 코드 설명: [code, setCode] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [code, setCode] = useState("");
  // 코드 설명: [status, setStatus] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [status, setStatus] = useState<VerifyStatus>("idle");
  // 코드 설명: [message, setMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [message, setMessage] = useState("이메일로 받은 6자리 인증번호를 입력해주세요.");
  // 코드 설명: [isResending, setIsResending] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isResending, setIsResending] = useState(false);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: emailFromQuery 쿼리 객체를 만들어 검색 조건을 안전한 URL 문자열로 직렬화합니다.
    const emailFromQuery = new URLSearchParams(window.location.search).get("email");

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: emailFromQuery
    if (emailFromQuery) {
      // 코드 설명: setEmail 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setEmail(emailFromQuery);
    }
  }, []);

  // 코드 설명: handleVerify 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: event.preventDefault();
    event.preventDefault();
    // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setStatus("submitting");
    // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setMessage("");

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !email || code.length !== 6
    if (!email || code.length !== 6) {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("이메일과 6자리 인증번호를 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await verifyEmailCode(email, code);
      await verifyEmailCode(email, code);
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("success");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("이메일 인증이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
    } catch (error) {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage(getFriendlyVerifyError(error));
    }
  }

  // 코드 설명: handleResend 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleResend() {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !email
    if (!email) {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("인증번호를 재발송할 이메일을 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsResending 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsResending(true);
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: await resendEmailVerification({ email });
      await resendEmailVerification({ email });
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("idle");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("인증번호를 다시 발송했습니다. 이메일을 확인해주세요.");
    } catch (error) {
      // 코드 설명: setStatus 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setStatus("error");
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage(getFriendlyVerifyError(error));
    } finally {
      // 코드 설명: setIsResending 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsResending(false);
    }
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
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

        <p
          className={`mt-8 text-sm font-bold tracking-[0.24em] ${
            status === "success" ? "text-emerald-300" : "text-sky-300"
          }`}
        >
          EMAIL VERIFICATION
        </p>

        <h1 className="mt-4 text-3xl font-black">
          {status === "success"
            ? "이메일 인증 완료"
            : "이메일 인증번호 입력"}
        </h1>

        <p className="mt-5 leading-7 text-slate-300">{message}</p>

        {status !== "success" ? (
          <form onSubmit={handleVerify} className="mt-8 grid gap-4 text-left">
            <div>
              <label className="text-sm font-semibold text-slate-300">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="user@example.com"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                인증번호
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                placeholder="6자리 인증번호"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-center text-lg font-bold tracking-[0.2em] text-white outline-none transition placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>

            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-lg bg-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              {status === "submitting" ? "인증 중..." : "이메일 인증 완료"}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {isResending ? "재발송 중..." : "인증번호 재발송"}
            </button>
          </form>
        ) : null}

        <div className="mt-8 flex justify-center gap-3">
          {status === "success" ? (
            <Link
              href="/pending-approval"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white no-underline transition hover:bg-sky-400"
            >
              승인 대기 화면
            </Link>
          ) : null}

          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            로그인 화면
          </Link>
        </div>
      </section>
    </main>
  );
}
