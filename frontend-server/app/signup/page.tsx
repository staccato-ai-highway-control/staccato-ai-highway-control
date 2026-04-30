"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSendCode = () => {
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }

    // TODO: 백엔드 연동 예정
    // POST /api/auth/email/send
    setIsCodeSent(true);
    alert("인증코드를 발송했습니다.");
  };

  const handleVerifyCode = () => {
    if (!verificationCode) {
      alert("인증코드를 입력해주세요.");
      return;
    }

    // TODO: 백엔드 연동 예정
    // POST /api/auth/email/verify
    setIsEmailVerified(true);
    alert("이메일 인증이 완료되었습니다.");
  };

  const handleSubmitSignup = () => {
    if (!isEmailVerified) {
      alert("이메일 인증을 먼저 완료해주세요.");
      return;
    }

    // TODO: 백엔드 연동 예정
    // POST /api/auth/signup
    // 성공 시 account_status = PENDING_APPROVAL

    alert("회원가입 신청이 접수되었습니다. 관리자 승인 후 로그인이 가능합니다.");
    router.push("/pending-approval");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/75" />

      <section className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        <Link href="/" className="block no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
          />
        </Link>

        <p className="mt-6 text-sm font-bold tracking-[0.24em] text-sky-300">
          STAFF ACCESS REQUEST
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          이메일 인증 후 최고관리자 승인을 거쳐 관제 시스템을 사용할 수 있습니다.
        </p>

        <form className="mt-8 grid gap-5">
        
            <div>
              <label className="text-sm font-semibold text-slate-300">
                이름
              </label>
              <input
                type="text"
                placeholder="홍길동"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>
          

          <div>
            <label className="text-sm font-semibold text-slate-300">
              연락처
            </label>
            <input
              type="tel"
              placeholder="010-1234-5678"
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              이메일
            </label>

            <div className="mt-2 flex gap-2">
              <input
                type="email"
                placeholder="staff@staccato.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setIsEmailVerified(false);
                  setIsCodeSent(false);
                  setVerificationCode("");
                }}
                disabled={isEmailVerified}
                className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 disabled:opacity-60 focus:border-sky-400"
              />

              <button
                type="button"
                onClick={handleSendCode}
                disabled={isEmailVerified}
                className="shrink-0 rounded-lg border border-sky-400/60 px-4 py-3 text-sm font-bold text-sky-300 transition hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                인증요청
              </button>
            </div>

            {isEmailVerified && (
              <p className="mt-2 text-sm font-semibold text-emerald-400">
                이메일 인증 완료
              </p>
            )}
          </div>

          {isCodeSent && !isEmailVerified && (
            <div>
              <label className="text-sm font-semibold text-slate-300">
                이메일 인증코드
              </label>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="6자리 인증코드"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  maxLength={6}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                />

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  className="shrink-0 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
                >
                  인증확인
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                이메일로 발송된 6자리 인증코드를 입력해주세요.
              </p>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                비밀번호
              </label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                비밀번호 확인
              </label>
              <input
                type="password"
                placeholder="비밀번호 재입력"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmitSignup}
            disabled={!isEmailVerified}
            className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            회원가입 신청
          </button>

          {!isEmailVerified && (
            <p className="text-center text-xs text-slate-400">
              이메일 인증 완료 후 회원가입 신청이 가능합니다.
            </p>
          )}
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            메인으로
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            로그인
          </Link>

        </div>
      </section>
    </main>
  );
}