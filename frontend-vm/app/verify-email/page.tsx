"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { resendEmailVerification, verifyEmailCode } from "@/features/auth/api";

type VerifyStatus = "idle" | "submitting" | "success" | "error";

function getFriendlyVerifyError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "이메일 인증 중 오류가 발생했습니다.";

  if (message.toLowerCase().includes("already verified")) {
    return "이미 인증된 이메일입니다.";
  }

  return message;
}

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [message, setMessage] = useState("이메일로 받은 6자리 인증번호를 입력해주세요.");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const emailFromQuery = new URLSearchParams(window.location.search).get("email");

    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, []);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    if (!email || code.length !== 6) {
      setStatus("error");
      setMessage("이메일과 6자리 인증번호를 입력해주세요.");
      return;
    }

    try {
      await verifyEmailCode(email, code);
      setStatus("success");
      setMessage("이메일 인증이 완료되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다.");
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyVerifyError(error));
    }
  }

  async function handleResend() {
    if (!email) {
      setStatus("error");
      setMessage("인증번호를 재발송할 이메일을 입력해주세요.");
      return;
    }

    try {
      setIsResending(true);
      await resendEmailVerification({ email });
      setStatus("idle");
      setMessage("인증번호를 다시 발송했습니다. 이메일을 확인해주세요.");
    } catch (error) {
      setStatus("error");
      setMessage(getFriendlyVerifyError(error));
    } finally {
      setIsResending(false);
    }
  }

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
