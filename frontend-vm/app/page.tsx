/**
 * 파일 역할: 홈 경로의 화면 진입점으로, 필요한 데이터와 UI 컴포넌트를 조합합니다.
 * 유지보수 참고: 라우트 수준의 상태, 권한, 로딩 및 오류 흐름을 담당하고 세부 표현은 하위 컴포넌트에 위임합니다.
 */
"use client";

// 코드 설명: next/link 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import Link from "next/link";
// 코드 설명: react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useEffect, useRef, useState } from "react";
// 코드 설명: next/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { useRouter } from "next/navigation";
// 코드 설명: lucide-react 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { ChevronDown, FileText, Gauge, LogIn, LogOut, MessageSquareText, PanelsTopLeft, UserPlus, UserRound } from "lucide-react";
// 코드 설명: @/features/auth/api 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getMe } from "@/features/auth/api";
// 코드 설명: @/features/auth/types 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import type { AuthUser } from "@/features/auth/types";
// 코드 설명: @/config/navigation 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { getRoleLabel } from "@/config/navigation";
// 코드 설명: @/lib/constants 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import { MVP_DESCRIPTION } from "@/lib/constants";
// 코드 설명: @/lib/authStorage 모듈의 타입, 함수 또는 UI 요소를 현재 파일에서 사용하도록 가져옵니다.
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredAuthUser,
  getUserFromAuthResponse,
  setStoredAuthUser,
} from "@/lib/authStorage";

// 코드 설명: Home 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
export default function Home() {
  // 코드 설명: router 라우터를 준비해 처리 결과에 따라 다른 화면으로 이동합니다.
  const router = useRouter();
  // 코드 설명: sectionRef 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const sectionRef = useRef<HTMLElement | null>(null);
  // 코드 설명: hasNavigated 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const hasNavigated = useRef(false);

  // 코드 설명: [progress, setProgress] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [progress, setProgress] = useState(0);
  // 코드 설명: [authUser, setAuthUser] 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // 코드 설명: [isAuthReady, setIsAuthReady] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isAuthReady, setIsAuthReady] = useState(false);
  // 코드 설명: [isBoardMenuOpen, setIsBoardMenuOpen] 상태를 선언해 사용자 입력, 로딩 결과 또는 화면 표시 값을 렌더링 사이에 유지합니다.
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: isMounted 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    let isMounted = true;

    // 코드 설명: syncAuthState 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
    async function syncAuthState() {
      // 코드 설명: accessToken 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const accessToken = getStoredAccessToken();

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !accessToken
      if (!accessToken) {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMounted
        if (isMounted) setIsAuthReady(true);
        // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: 값 없음
        return;
      }

      // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setAuthUser(getStoredAuthUser());

      // 코드 설명: 비동기 요청이나 변환 중 발생할 수 있는 예외를 잡기 위해 보호된 실행 구간을 시작합니다.
      try {
        // 코드 설명: response 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const response = await getMe(accessToken);
        // 코드 설명: user 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
        const user = getUserFromAuthResponse(response);
        // 코드 설명: setStoredAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setStoredAuthUser(user);

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMounted
        if (isMounted) {
          // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setAuthUser(user);
          // 코드 설명: setIsAuthReady 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setIsAuthReady(true);
        }
      } catch {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
        clearStoredAuth();

        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: isMounted
        if (isMounted) {
          // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setAuthUser(null);
          // 코드 설명: setIsAuthReady 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setIsAuthReady(true);
        }
      }
    }

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: syncAuthState();
    syncAuthState();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => { isMounted = false; }
    return () => {
      // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: isMounted = false;
      isMounted = false;
    };
  }, []);

  // 코드 설명: handleLogout 함수가 입력값을 처리하고 호출부에 필요한 결과를 반환합니다.
  function handleLogout() {
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: clearStoredAuth();
    clearStoredAuth();
    // 코드 설명: setAuthUser 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
    setAuthUser(null);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: hasNavigated.current = false;
    hasNavigated.current = false;
  }

  // 코드 설명: 컴포넌트 생명주기 또는 의존성 변경에 맞춰 데이터 조회와 부수 효과를 실행합니다.
  useEffect(() => {
    // 코드 설명: handleScroll 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
    const handleScroll = () => {
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !isAuthReady
      if (!isAuthReady) return;
      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !sectionRef.current
      if (!sectionRef.current) return;

      // 코드 설명: rect 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const rect = sectionRef.current.getBoundingClientRect();
      // 코드 설명: scrollableHeight 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const scrollableHeight = rect.height - window.innerHeight;
      // 코드 설명: currentProgress 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
      const currentProgress = Math.min(
        Math.max(Math.abs(rect.top) / scrollableHeight, 0),
        1
      );

      // 코드 설명: setProgress 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
      setProgress(currentProgress);

      // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: currentProgress > 0.92 && !hasNavigated.current
      if (currentProgress > 0.92 && !hasNavigated.current) {
        // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: hasNavigated.current = true;
        hasNavigated.current = true;

        // 코드 설명: setTimeout 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
        setTimeout(() => {
          // 코드 설명: 처리가 끝난 뒤 라우터를 사용해 다음 화면으로 이동하거나 현재 경로를 교체합니다.
          router.push(authUser ? "/dashboard" : "/login");
        }, 900);
      }
    };

    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: window.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);
    // 코드 설명: 이 명령을 실행해 현재 단계의 부수 효과를 반영합니다: handleScroll();
    handleScroll();

    // 코드 설명: 계산 또는 요청 처리 결과를 호출부에 반환합니다: () => window.removeEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll);
  }, [authUser, isAuthReady, router]);

  // 코드 설명: boxOpacity 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const boxOpacity = progress > 0.28 ? 1 : 0;
  // 코드 설명: scanOpacity 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const scanOpacity = progress > 0.38 ? 1 : 0;
  // 코드 설명: detectTextOpacity 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const detectTextOpacity = progress > 0.55 ? 1 : 0;
  // 코드 설명: boardMenuLinks 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const boardMenuLinks = [
    { href: "/bug-reports", label: "버그리포트", icon: MessageSquareText },
    { href: "/resources", label: "자료실", icon: FileText },
  ];
  // 코드 설명: boardMenu 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
  const boardMenu = (
    <div
      className="relative"
      onMouseEnter={() => setIsBoardMenuOpen(true)}
      onMouseLeave={() => setIsBoardMenuOpen(false)}
      onFocus={() => setIsBoardMenuOpen(true)}
      onBlur={(event) => {
        // 코드 설명: 다음 조건이 참일 때만 분기 내부 로직을 실행합니다: !event.currentTarget.contains(event.relatedTarget)
        if (!event.currentTarget.contains(event.relatedTarget)) {
          // 코드 설명: setIsBoardMenuOpen 상태 갱신 함수로 새 값을 저장하고 React 재렌더링을 요청합니다.
          setIsBoardMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setIsBoardMenuOpen((isOpen) => !isOpen)}
        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 ${isBoardMenuOpen ? "bg-white/10 text-white" : ""}`}
        aria-haspopup="menu"
        aria-expanded={isBoardMenuOpen}
        aria-label="게시판 메뉴"
      >
        <PanelsTopLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">게시판</span>
        <ChevronDown className={`hidden h-3.5 w-3.5 transition sm:block ${isBoardMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isBoardMenuOpen ? (
        <div role="menu" className="absolute right-0 top-10 z-30 w-48 overflow-hidden rounded-xl border border-white/15 bg-slate-950/95 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <p className="px-3 pb-1.5 pt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">게시판</p>
          {boardMenuLinks.map((item) => {
            // 코드 설명: Icon 값을 선언해 이후 계산, 조건 판단 또는 화면 렌더링에서 재사용합니다.
            const Icon = item.icon;

            // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
            return (
              <Link key={item.href} href={item.href} role="menuitem" onClick={() => setIsBoardMenuOpen(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-200 no-underline transition hover:bg-white/10 hover:text-white">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/10 text-sky-300">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  // 코드 설명: 현재 상태와 권한 조건을 반영한 JSX 화면 구조를 호출한 React 렌더러에 반환합니다.
  return (
    <main className="bg-slate-950 text-white">
      <section ref={sectionRef} className="relative h-[220vh]">
        <div className="sticky top-0 min-h-screen overflow-hidden">
          <img
            src="/assets/images/hero-piano-road.png"
            alt="고속도로 관제 배경"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />

          <header className="relative z-20 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-8">
            <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-950/55 px-3 py-2.5 shadow-[0_18px_50px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:px-4">
              <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70">
                <img
                  src="/assets/images/logo_01.png"
                  alt="STACCATO"
                  className="h-8 w-auto shrink-0 object-contain sm:h-9"
                />
                <span className="hidden h-7 w-px bg-white/15 lg:block" aria-hidden="true" />
                <span className="hidden min-w-0 lg:block">
                  <strong className="block truncate text-xs font-black tracking-wide text-white">AI HIGHWAY CONTROL</strong>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">실시간 도로 안전 관제</span>
                </span>
              </Link>

              {authUser ? (
                <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
                  <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1" aria-label="메인 메뉴">
                    <Link
                      href="/dashboard"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-100 no-underline transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                      aria-label="대시보드"
                    >
                      <Gauge className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="hidden xl:inline">대시보드</span>
                    </Link>
                    {boardMenu}
                    <Link
                      href="/mypage"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-100 no-underline transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                      aria-label="마이페이지"
                    >
                      <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="hidden xl:inline">마이페이지</span>
                    </Link>
                  </nav>

                  <div className="hidden min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 lg:flex">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-300 to-sky-500 text-sm font-black text-slate-950 shadow-sm">
                      {(authUser.name || authUser.email || "S").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <strong className="block max-w-32 truncate text-xs font-black text-white">
                        {authUser.name ?? authUser.email ?? "사용자"}
                      </strong>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">
                        {getRoleLabel(authUser.role)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70 sm:w-auto sm:px-3"
                    aria-label="로그아웃"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="ml-2 hidden text-sm font-bold 2xl:inline">로그아웃</span>
                  </button>
                </div>
              ) : (
                <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
                  <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1" aria-label="메인 메뉴">
                    {boardMenu}
                    <Link
                      href="/login"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-100 no-underline transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                      aria-label="로그인"
                    >
                      <LogIn className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="hidden sm:inline">로그인</span>
                    </Link>
                  </nav>

                  <Link
                    href="/signup"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-slate-950 no-underline shadow-sm transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 sm:px-4"
                    aria-label="회원가입 신청"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">회원가입 신청</span>
                  </Link>
                </div>
              )}
            </div>
          </header>

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-[1480px] items-center px-4 sm:px-5">
            <div
              className="max-w-3xl border-l-4 border-orange-600 bg-slate-950/40 px-8 py-10 backdrop-blur-sm transition-all duration-500"
              style={{
                opacity: progress > 0.78 ? 0.15 : 1,
                transform: `translateX(${progress > 0.78 ? -40 : 0}px)`,
              }}
            >
              <p className="mb-4 text-sm font-bold tracking-[0.28em] text-sky-300">
                AI-X HIGHWAY CONTROL
              </p>

              <h1 className="text-5xl font-black leading-tight md:text-7xl">
                STACCATO
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                주행차로 정차와 갓길 정차를 AI가 탐지하고,
              </p>

              <p className="mt-2 max-w-2xl text-lg leading-8 text-slate-200">
                위험도 판단부터 관제 처리와 신고 관리까지 연결합니다.
              </p>

              <p className="mt-4 text-sm font-semibold text-slate-300">
                {MVP_DESCRIPTION}
              </p>
            </div>
          </div>

          {/* 차량 탐지 박스 */}
          <div
            className="absolute z-20 border-4 border-red-500 shadow-[0_0_28px_rgba(239,68,68,0.75)] transition-all duration-500"
            style={{
              opacity: boxOpacity,
              left: "60.5%",
              top: "36%",
              width: "12%",
              height: "30%",
              transform: `scale(${0.88 + progress * 0.14})`,
            }}
          >
            <div className="absolute -top-8 left-0 rounded bg-red-600 px-3 py-1 text-xs font-bold tracking-wider text-white">
              VEHICLE DETECTED
            </div>

            <div
              className="absolute left-0 h-1 w-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.9)] transition-all duration-300"
              style={{
                opacity: scanOpacity,
                top: `${Math.min(Math.max((progress - 0.35) * 180, 0), 95)}%`,
              }}
            />

            <div className="absolute -bottom-10 left-0 rounded bg-black/80 px-3 py-1 text-xs font-semibold text-red-300">
              CONF 0.94 · STOP RISK HIGH
            </div>
          </div>

          {/* 탐지 완료 패널 */}
          <div
              className="absolute right-12 top-1/2 z-20 w-80 -translate-y-1/2 rounded-2xl border border-red-500/50 bg-slate-950/80 p-5 shadow-2xl backdrop-blur transition-all duration-700"
              style={{
                opacity: detectTextOpacity,
                transform: `translateY(-50%) translateX(${detectTextOpacity ? 0 : 24}px)`,
              }}
            >
            <p className="text-xs font-bold tracking-[0.24em] text-red-400">
              AI ANALYSIS RESULT
            </p>

            <h2 className="mt-3 text-2xl font-black">정차 의심 차량 감지</h2>

            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>유형: 주행차로 정차</p>
              <p>위험도: HIGH</p>
              <p>상태: 관제 확인 필요</p>
            </div>

            <p className="mt-5 text-xs text-slate-400">
              스크롤 완료 시 {authUser ? "관제 대시보드" : "관제 로그인 화면"}으로 이동합니다.
            </p>
          </div>

          {/* 하단 스크롤 안내 */}
          <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-center text-xs font-semibold tracking-[0.24em] text-white/70">
            SCROLL TO DETECT
          </div>
        </div>
      </section>
    </main>
  );
}
