"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, LogOut, MessageSquareText, UserRound } from "lucide-react";
import { getMe } from "@/features/auth/api";
import type { AuthUser } from "@/features/auth/types";
import { getRoleLabel } from "@/config/navigation";
import { MVP_DESCRIPTION } from "@/lib/constants";
import {
  clearStoredAuth,
  getStoredAccessToken,
  getStoredAuthUser,
  getUserFromAuthResponse,
  setStoredAuthUser,
} from "@/lib/authStorage";

export default function Home() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasNavigated = useRef(false);

  const [progress, setProgress] = useState(0);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isBoardMenuOpen, setIsBoardMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function syncAuthState() {
      const accessToken = getStoredAccessToken();

      if (!accessToken) {
        if (isMounted) setIsAuthReady(true);
        return;
      }

      setAuthUser(getStoredAuthUser());

      try {
        const response = await getMe(accessToken);
        const user = getUserFromAuthResponse(response);
        setStoredAuthUser(user);

        if (isMounted) {
          setAuthUser(user);
          setIsAuthReady(true);
        }
      } catch {
        clearStoredAuth();

        if (isMounted) {
          setAuthUser(null);
          setIsAuthReady(true);
        }
      }
    }

    syncAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleLogout() {
    clearStoredAuth();
    setAuthUser(null);
    hasNavigated.current = false;
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!isAuthReady) return;
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const scrollableHeight = rect.height - window.innerHeight;
      const currentProgress = Math.min(
        Math.max(Math.abs(rect.top) / scrollableHeight, 0),
        1
      );

      setProgress(currentProgress);

      if (currentProgress > 0.92 && !hasNavigated.current) {
        hasNavigated.current = true;

        setTimeout(() => {
          router.push(authUser ? "/dashboard" : "/login");
        }, 900);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [authUser, isAuthReady, router]);

  const boxOpacity = progress > 0.28 ? 1 : 0;
  const scanOpacity = progress > 0.38 ? 1 : 0;
  const detectTextOpacity = progress > 0.55 ? 1 : 0;
  const boardMenuLinks = [
    { href: "/bug-reports", label: "버그리포트", icon: MessageSquareText },
    { href: "/resources", label: "자료실", icon: FileText },
  ];
  const boardMenu = (
    <div
      className="relative"
      onMouseEnter={() => setIsBoardMenuOpen(true)}
      onMouseLeave={() => setIsBoardMenuOpen(false)}
      onFocus={() => setIsBoardMenuOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsBoardMenuOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setIsBoardMenuOpen((isOpen) => !isOpen)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-slate-950/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={isBoardMenuOpen}
      >
        게시판
        <ChevronDown className={`h-4 w-4 transition ${isBoardMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isBoardMenuOpen ? (
        <div role="menu" className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-lg border border-white/20 bg-slate-950/95 shadow-2xl backdrop-blur">
          {boardMenuLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} role="menuitem" onClick={() => setIsBoardMenuOpen(false)} className="flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-slate-100 no-underline transition hover:bg-white/10 hover:text-white">
                <Icon className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );

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

          <header className="relative z-20 flex items-center justify-between px-6 py-5">
            <Link href="/" className="block no-underline">
              <img
                src="/assets/images/logo_01.png"
                alt="STACCATO"
                className="h-10 w-auto object-contain"
              />
            </Link>

            {authUser ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="hidden min-w-0 items-center gap-3 rounded-lg border border-white/25 bg-slate-950/35 px-3 py-2 backdrop-blur md:flex">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-sky-400 text-sm font-black text-slate-950">
                    {(authUser.name || authUser.email || "S").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <strong className="block max-w-40 truncate text-sm text-white">
                      {authUser.name ?? authUser.email ?? "사용자"}
                    </strong>
                    <span className="block truncate text-xs font-semibold text-slate-300">
                      {getRoleLabel(authUser.role)}
                    </span>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                >
                  대시보드
                </Link>

                {boardMenu}

                <Link
                  href="/mypage"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  마이페이지
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-3">
                {boardMenu}

                <Link
                  href="/login"
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                >
                  로그인
                </Link>

                <Link
                  href="/signup"
                  className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
                >
                  회원가입 신청
                </Link>
              </div>
            )}
          </header>

          <div className="relative z-10 flex min-h-[calc(100vh-88px)] items-center px-6 md:px-12 lg:px-20 xl:px-28">
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
