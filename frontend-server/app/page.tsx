"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MVP_DESCRIPTION } from "@/lib/constants";

export default function Home() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasNavigated = useRef(false);

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
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
          router.push("/login");
        }, 900);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const boxOpacity = progress > 0.28 ? 1 : 0;
  const scanOpacity = progress > 0.38 ? 1 : 0;
  const detectTextOpacity = progress > 0.55 ? 1 : 0;

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

            <div className="flex gap-3">
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
                위험도 판단부터 관제 처리와 보고서 생성까지 연결합니다.
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
              스크롤 완료 시 관제 로그인 화면으로 이동합니다.
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