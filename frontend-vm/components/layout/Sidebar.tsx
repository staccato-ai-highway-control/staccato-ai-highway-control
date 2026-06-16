/**
 * 파일 역할: 애플리케이션 레이아웃 영역에서 사용하는 Sidebar UI 컴포넌트입니다.
 * 유지보수 참고: 상위 화면에서 전달받은 데이터와 이벤트를 화면 요소로 변환하며, 사용자 상호작용과 표시 상태를 한곳에서 관리합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
import { BrandLogo } from "@/components/common/BrandLogo";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { usePathname } from "next/navigation";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useState } from "react";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { X } from "lucide-react";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/config/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getUserRole, getVisibleNavigationSections } from "@/config/navigation";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getStoredAuthUser } from "@/lib/authStorage";
// 코드 설명: @/lib/utils 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { cn } from "@/lib/utils";

// 코드 설명: Sidebar 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export function Sidebar({
  isMobileOpen = false,
  onMobileClose,
}: {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  // 코드 설명: pathname 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const pathname = usePathname();
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(getStoredAuthUser());
  }, []);

  // 코드 설명: visibleSections 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const visibleSections = getVisibleNavigationSections(authUser);
  // 코드 설명: role 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const role = getUserRole(authUser) ?? "NO_ROLE";

  // 코드 설명: isActive 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function isActive(href: string) {
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: href === "/dashboard"
    if (href === "/dashboard") return pathname === href;
    // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: href === "/"
    if (href === "/") return pathname === href;
    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: pathname === href || pathname.startsWith(`${href}/`)
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 xl:hidden"
          aria-label="메뉴 닫기"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] border-r border-white/10 bg-slate-950 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.13),transparent_28%)] text-slate-200 shadow-2xl transition-transform duration-200 xl:w-60 xl:translate-x-0 xl:shadow-none",
          isMobileOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <BrandLogo onClick={onMobileClose} className="block no-underline" imageClassName="h-9" />

          <button
            type="button"
            onClick={onMobileClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 xl:hidden"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-scrollbar h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => (
            <div key={`${role}-${section.title}`} className="mb-5 last:mb-0">
              <p className="mb-2 px-2 text-xs font-black tracking-[0.18em] text-slate-500">
                {section.title}
              </p>
              <div className="grid gap-1">
                {section.items.map((item) => {
                  // 코드 설명: Icon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const Icon = item.icon;
                  // 코드 설명: active 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
                  const active = isActive(item.href);

                  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
                  return (
                    <Link
                      key={`${role}-${section.title}-${item.href}-${item.label}`}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 no-underline transition hover:bg-white/5 hover:text-white",
                        active && "bg-white/10 text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
