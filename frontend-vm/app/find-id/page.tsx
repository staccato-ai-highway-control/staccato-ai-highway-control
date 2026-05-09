import Link from "next/link";

export default function FindIdPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-white">
      <img
        src="/assets/images/hero-piano-road.png"
        alt="고속도로 관제 배경"
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-35 blur-md"
      />

      <div className="absolute inset-0 bg-slate-950/80" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/75 p-8 shadow-2xl backdrop-blur-md">
        <Link href="/" className="block no-underline">
          <img
            src="/assets/images/logo_01.png"
            alt="STACCATO"
            className="h-10 w-auto object-contain"
          />
        </Link>

        <h1 className="mt-8 text-3xl font-black">아이디 찾기</h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          가입 시 등록한 이름과 연락처를 입력해주세요.
        </p>

        <form className="mt-8 space-y-5">
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

          <button
            type="button"
            className="w-full rounded-lg bg-sky-500 px-4 py-3 font-bold text-white transition hover:bg-sky-400"
          >
            아이디 찾기
          </button>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-white/20 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition hover:bg-white/10"
          >
            로그인
          </Link>

          <Link
            href="/signup"
            className="rounded-lg bg-sky-500 px-4 py-3 text-center text-sm font-bold text-white no-underline transition hover:bg-sky-400"
          >
            회원가입
          </Link>
        </div>
      </section>
    </main>
  );
}