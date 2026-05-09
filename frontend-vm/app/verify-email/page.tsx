"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { verifyEmailToken } from "@/features/auth/api";

type VerifyStatus = "checking" | "success" | "error";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<VerifyStatus>("checking");
  const [message, setMessage] = useState("이메일 인증을 확인하는 중입니다.");

  useEffect(() => {
    let isMounted = true;

    async function verifyEmail() {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        setStatus("error");
        setMessage("이메일 인증 토큰이 없습니다.");
        return;
      }

      try {
        await verifyEmailToken({ token });

        if (isMounted) {
          setStatus("success");
          setMessage("이메일 인증이 완료되었습니다.");
        }
      } catch (error) {
        if (isMounted) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "이메일 인증 중 오류가 발생했습니다."
          );
        }
      }
    }

    verifyEmail();

    return () => {
      isMounted = false;
    };
  }, []);

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
          {status === "checking"
            ? "이메일 인증 확인 중"
            : status === "success"
              ? "이메일 인증 완료"
              : "이메일 인증 실패"}
        </h1>

        <p className="mt-5 leading-7 text-slate-300">{message}</p>

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
