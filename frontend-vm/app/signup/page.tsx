"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/features/auth/api";

function getTokenFromVerificationLink(verificationLink?: string) {
  if (!verificationLink) return "";

  try {
    const url = new URL(verificationLink, window.location.origin);
    return url.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
}

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [requestedRole, setRequestedRole] = useState("CONTROL_ADMIN");
  const [reason, setReason] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !email || !password) {
      alert("이름, 이메일, 비밀번호를 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agreed) {
      alert("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await signup({
        name,
        phone,
        email,
        password,
        requestedRole,
        reason,
        agreed,
      });

      const emailVerification = response.data?.email_verification;
      const token =
        emailVerification?.token ??
        emailVerification?.verification_token ??
        getTokenFromVerificationLink(emailVerification?.verification_link);

      alert("회원가입 신청이 접수되었습니다. 이메일 인증을 진행해주세요.");

      if (token) {
        router.push(`/verify-email?token=${encodeURIComponent(token)}`);
        return;
      }

      router.push("/pending-approval");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "회원가입 신청 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/75" />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
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

        <h1 className="mt-3 text-3xl font-black">회원가입 신청</h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          회원가입 신청 후 최고관리자 승인을 거쳐 관제 시스템을 사용할 수 있습니다.
        </p>

        <form onSubmit={handleSubmitSignup} className="mt-8 grid gap-5">
          <div>
            <label className="text-sm font-semibold text-slate-300">이름</label>
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">연락처</label>
            <input
              type="tel"
              placeholder="010-1234-5678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">이메일</label>
            <input
              type="email"
              placeholder="staff@staccato.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />

            <p className="mt-2 text-xs text-slate-400">
              회원가입 신청 후 발송되는 인증 링크로 이메일 인증을 완료해주세요.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              요청 권한
            </label>
            <select
              value={requestedRole}
              onChange={(event) => setRequestedRole(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-sky-400"
            >
              <option value="CONTROL_ADMIN">관제관리자</option>
              <option value="MAINTENANCE_ADMIN">유지보수 담당자</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-300">
              신청 사유
            </label>
            <textarea
              placeholder="관제 시스템 사용 신청 사유를 입력해주세요."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-300">
                비밀번호
              </label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-1"
            />
            <span>
              개인정보 수집 및 이용에 동의합니다. 입력한 정보는 내부 직원 승인
              및 계정 관리를 위해 사용됩니다.
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isSubmitting ? "신청 중..." : "회원가입 신청"}
          </button>
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
