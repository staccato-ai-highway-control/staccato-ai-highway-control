/**
 * 파일 역할: 애플리케이션 레이아웃 영역에서 사용하는 Header UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { Bell, ChevronDown, LogOut, Menu, UserCircle, X } from "lucide-react";
// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/config/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRoleLabel } from "@/config/navigation";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { clearStoredAuth, getStoredAuthUser } from "@/lib/authStorage";

// 코드 설명: getDisplayName 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getDisplayName(user: AuthUser | null) {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: user?.name ?? user?.login_id ?? user?.email ?? "사용자"
  return user?.name ?? user?.login_id ?? user?.email ?? "사용자";
}

// 코드 설명: HeaderBadge 타입으로 데이터 구조와 허용 가능한 값의 범위를 고정합니다.
type HeaderBadge = {
  label: string;
  className: string;
  isRealtimeTrigger?: boolean;
};

// 코드 설명: getRoleHeader 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
function getRoleHeader(user: AuthUser | null, fallbackTitle: string): { title: string; badges: HeaderBadge[] } {
  // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: { title: fallbackTitle || "통합 관제", badges: [ { label: getRoleLabel(user…
  return {
    title: fallbackTitle || "통합 관제",
    badges: [
      { label: getRoleLabel(user?.role), className: "border-sky-200 bg-sky-50 text-sky-700" },
      { label: "실시간 이벤트", className: "border-amber-200 bg-amber-50 text-amber-700", isRealtimeTrigger: true },
      { label: "시스템 정상", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    ],
  };
}

// 코드 설명: Header 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function Header({
  title,
  isMobileMenuOpen,
  onMobileMenuToggle,
  onRealtimePreviewClick,
  isRealtimePreviewLoading = false,
}: {
  title: string;
  isMobileMenuOpen?: boolean;
  onMobileMenuToggle?: () => void;
  onRealtimePreviewClick?: () => void;
  isRealtimePreviewLoading?: boolean;
}) {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [isAccountMenuOpen, setIsAccountMenuOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: handleLogout 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleLogout() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
    clearStoredAuth();
    // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
    router.replace("/login");
  }

  // 코드 설명: displayName 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const displayName = getDisplayName(authUser);
  // 코드 설명: roleHeader 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const roleHeader = getRoleHeader(authUser, title);

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 xl:hidden"
          aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={Boolean(isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <h1 className="truncate text-lg font-black text-slate-950 md:text-xl">{roleHeader.title}</h1>
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          {roleHeader.badges.map((badge) =>
            badge.isRealtimeTrigger ? (
              <button
                key={badge.label}
                type="button"
                onClick={onRealtimePreviewClick}
                disabled={isRealtimePreviewLoading}
                className={"shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 " + badge.className}
              >
                {isRealtimePreviewLoading ? "불러오는 중" : badge.label}
              </button>
            ) : (
              <span
                key={badge.label}
                className={"shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold " + badge.className}
              >
                {badge.label}
              </span>
            )
          )}
        </div>
      </div>

      <Link
        href="/notifications"
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="알림"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-staccato" />
      </Link>


      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          className="inline-flex h-10 max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
          aria-label="계정 메뉴"
          aria-expanded={isAccountMenuOpen}
        >
          <span className="hidden rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-black text-sky-700 md:inline-flex">
            {getRoleLabel(authUser?.role)}
          </span>
          <span className="truncate">{displayName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>

        {isAccountMenuOpen ? (
          <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <Link
              href="/mypage"
              onClick={() => setIsAccountMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 no-underline transition hover:bg-slate-50"
            >
              <UserCircle className="h-4 w-4" aria-hidden="true" />
              마이페이지
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              로그아웃
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
