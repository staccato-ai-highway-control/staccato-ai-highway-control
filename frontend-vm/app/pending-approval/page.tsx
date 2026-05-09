import Link from "next/link";

export default function PendingApprovalPage() {
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

        <p className="mt-8 text-sm font-bold tracking-[0.24em] text-amber-300">
          APPROVAL PENDING
        </p>

        <h1 className="mt-4 text-3xl font-black">관리자 승인 대기 중</h1>

        <p className="mt-5 leading-7 text-slate-300">
          회원가입 신청이 접수되었습니다.
          <br />
          최고관리자 승인 후 관제 시스템 로그인이 가능합니다.
        </p>

        <div className="mt-8 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-left text-sm text-amber-100">
          <p className="font-bold">승인 절차</p>

          <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-300">
            <li>이메일 인증 완료</li>
            <li>회원가입 신청 접수</li>
            <li>최고관리자 계정 승인</li>
            <li>승인 후 로그인 가능</li>
          </ol>
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            메인으로
          </Link>

          <Link
            href="/login"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            로그인 화면
          </Link>
        </div>
      </section>
    </main>
  );
}