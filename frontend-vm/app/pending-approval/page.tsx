/**
 * 파일 역할: pending-approval 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Suspense, useEffect, useMemo, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useSearchParams } from "next/navigation";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { startSignupGoogleIdentityVerification } from "@/features/auth/api";

// 코드 설명: isIdentityVerified 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isIdentityVerified(user: ReturnType<typeof getStoredAuthUser>) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: Boolean(user?.is_email_verified || user?.email_verified_at)
  return Boolean(user?.is_email_verified || user?.email_verified_at);
}

// 코드 설명: isAlreadyVerifiedMessage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function isAlreadyVerifiedMessage(message: string) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: message.toLowerCase().includes("identity is already verified")
  return message.toLowerCase().includes("identity is already verified");
}

// 코드 설명: PendingApprovalContent 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function PendingApprovalContent() {
  // 코드 설명: searchParams 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const searchParams = useSearchParams();
  // 코드 설명: [authUser, setAuthUser] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [authUser, setAuthUser] = useState(() => getStoredAuthUser());
  // 코드 설명: [email, setEmail] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [email, setEmail] = useState("");
  // 코드 설명: [message, setMessage] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [message, setMessage] = useState("");
  // 코드 설명: [manualIdentityVerified, setManualIdentityVerified] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [manualIdentityVerified, setManualIdentityVerified] = useState(false);
  // 코드 설명: [isStartingGoogleIdentity, setIsStartingGoogleIdentity] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isStartingGoogleIdentity, setIsStartingGoogleIdentity] = useState(false);

  // 코드 설명: queryEmail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const queryEmail = searchParams.get("email");
  // 코드 설명: identityStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const identityStatus = searchParams.get("status") ?? searchParams.get("identity_status");
  // 코드 설명: identityProvider 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const identityProvider = searchParams.get("provider") ?? searchParams.get("identity");
  // 코드 설명: identityMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const identityMessage = searchParams.get("message");

  // 코드 설명: normalizedIdentityStatus 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalizedIdentityStatus = (identityStatus ?? "").toLowerCase();
  // 코드 설명: normalizedIdentityProvider 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const normalizedIdentityProvider = identityProvider?.toLowerCase();

  // 코드 설명: isGoogleIdentitySuccess 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isGoogleIdentitySuccess =
    normalizedIdentityProvider === "google" &&
    ["success", "verified", "completed"].includes(normalizedIdentityStatus);

  // 코드 설명: isGoogleIdentityFailure 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isGoogleIdentityFailure =
    normalizedIdentityProvider === "google" &&
    ["failed", "error"].includes(normalizedIdentityStatus);

  // 코드 설명: isVerified 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const isVerified =
    isIdentityVerified(authUser) || isGoogleIdentitySuccess || manualIdentityVerified;

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: storedUser 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const storedUser = getStoredAuthUser();
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(storedUser);
    // 코드 설명: setEmail 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setEmail(queryEmail ?? storedUser?.email ?? "");
  }, [queryEmail]);

  // 코드 설명: notice 값을 의존성이 바뀔 때만 다시 계산해 불필요한 연산을 줄입니다.
  const notice = useMemo(() => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isVerified
    if (isVerified) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { tone: "success", title: "본인인증이 완료되었습니다.", description: normalizedIden…
      return {
        tone: "success",
        title: "본인인증이 완료되었습니다.",
        description:
          normalizedIdentityProvider === "google"
            ? "Google 본인인증이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다."
            : "관리자 승인 후 서비스를 이용할 수 있습니다.",
      };
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isGoogleIdentityFailure
    if (isGoogleIdentityFailure) {
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { tone: "error", title: "Google 본인인증에 실패했습니다.", description: identityMe…
      return {
        tone: "error",
        title: "Google 본인인증에 실패했습니다.",
        description:
          identityMessage || "회원가입 이메일과 Google 계정 이메일이 일치하지 않습니다.",
      };
    }

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { tone: "info", title: "본인인증 방법을 선택해주세요.", description: "이메일 인증 또는 Goog…
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

  // 코드 설명: emailVerificationHref 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const emailVerificationHref = email.trim()
    ? `/verify-email?email=${encodeURIComponent(email.trim())}`
    : "/verify-email";

  // 코드 설명: noticeClassName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const noticeClassName =
    notice.tone === "success"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : notice.tone === "error"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
        : "border-amber-400/30 bg-amber-400/10 text-amber-100";

  // 코드 설명: handleStartGoogleIdentity 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  async function handleStartGoogleIdentity() {
    // 코드 설명: targetEmail 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const targetEmail = email.trim();

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !targetEmail
    if (!targetEmail) {
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("가입 이메일을 입력해주세요.");
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
    try {
      // 코드 설명: setIsStartingGoogleIdentity 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsStartingGoogleIdentity(true);
      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage("");

      // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const response = await startSignupGoogleIdentityVerification(targetEmail);
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
      // 코드 설명: errorMessage 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Google 본인인증 시작 중 오류가 발생했습니다.";

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isAlreadyVerifiedMessage(errorMessage)
      if (isAlreadyVerifiedMessage(errorMessage)) {
        // 코드 설명: setManualIdentityVerified 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setManualIdentityVerified(true);
        // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setMessage("Google 본인인증이 이미 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setMessage 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setMessage(errorMessage);
    } finally {
      // 코드 설명: setIsStartingGoogleIdentity 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setIsStartingGoogleIdentity(false);
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

// 코드 설명: PendingApprovalPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function PendingApprovalPage() {
  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <Suspense fallback={null}>
      <PendingApprovalContent />
    </Suspense>
  );
}
