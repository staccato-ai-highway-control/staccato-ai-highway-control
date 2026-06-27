/**
 * 파일 역할: 공통 UI 영역에서 사용하는 ErrorPage UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ArrowLeft, LayoutDashboard } from "lucide-react";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { ReactNode } from "react";

// 코드 설명: ErrorPageProps 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
export type ErrorPageProps = {
  statusCode?: number;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
};

// 코드 설명: ActionButton 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function ActionButton({
  children,
  href,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  // 코드 설명: className 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const className =
    variant === "primary"
      ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-staccato px-4 text-sm font-bold text-white no-underline transition hover:bg-staccato-dark"
      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline transition hover:bg-slate-50";

  // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: href
  if (href) {
    // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

// 코드 설명: ErrorPage 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function ErrorPage({
  statusCode,
  title,
  description,
  actionLabel = "대시보드로 이동",
  actionHref,
  onAction,
  secondaryActionLabel = "이전 페이지로 돌아가기",
  secondaryActionHref,
  onSecondaryAction,
}: ErrorPageProps) {
  // 코드 설명: primaryHref 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const primaryHref = actionHref ?? (onAction ? undefined : "/dashboard");

  // 코드 설명: handleBack 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const handleBack = () => {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: onSecondaryAction
    if (onSecondaryAction) {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: onSecondaryAction();
      onSecondaryAction();
      // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
      return;
    }

    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: typeof window !== "undefined"
    if (typeof window !== "undefined") {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.history.back();
      window.history.back();
    }
  };

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-5 py-12">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        {statusCode ? <p className="text-6xl font-black tracking-tight text-staccato">{statusCode}</p> : null}
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-500">{description}</p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <ActionButton href={primaryHref} onClick={onAction} variant="primary">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </ActionButton>
          {secondaryActionLabel ? (
            <ActionButton href={secondaryActionHref} onClick={secondaryActionHref ? undefined : handleBack} variant="secondary">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {secondaryActionLabel}
            </ActionButton>
          ) : null}
        </div>
      </section>
    </main>
  );
}
